// @ts-check
// The decision dashboard. Shows every decision, whether a test guards it, and the decisions it relies on.
// Data comes from /data.json and reloads whenever /events reports that decision or test files changed.

/** @typedef {import("../data.ts").DashboardData} DashboardData */
/** @typedef {import("../data.ts").DashboardDecision} DashboardDecision */

/** @param {string} id */
const byId = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

const query = /** @type {HTMLInputElement} */ (byId("query"));
const tested = /** @type {HTMLSelectElement} */ (byId("tested"));
const confirm = /** @type {HTMLSelectElement} */ (byId("confirm"));

/** @type {DashboardData | undefined} */
let data;
/** Files whose section is open. Kept across reloads. @type {Set<string>} */
const expanded = new Set();

/**
 * Creates an element. Children are appended as text or nodes; false and undefined are skipped, so `condition && child` works.
 * @param {string} tag
 * @param {Record<string, string | ((event: Event) => void)>} [attributes] `onClick` and the like become listeners.
 * @param {...(Node | string | false | undefined)} children
 */
function h(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === "function") element.addEventListener(name.slice(2).toLowerCase(), value);
    else element.setAttribute(name, value);
  }
  for (const child of children) if (child !== false && child !== undefined) element.append(child);
  return element;
}

async function load() {
  try {
    const response = await fetch("/data.json");
    if (!response.ok) throw new Error(await response.text());
    data = await response.json();
    byId("error").hidden = true;
  } catch (error) {
    byId("error").textContent = String(error);
    byId("error").hidden = false;
  }
  render();
}

/** @param {DashboardDecision} entry */
function matches(entry) {
  const words = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const text = `${entry.id} ${entry.decision ?? ""} ${entry.reason ?? ""} ${entry.value ?? ""}`.toLowerCase();
  return (
    (tested.value === "all" || (tested.value === "guarded") === entry.tests.length > 0) &&
    (confirm.value === "all" || entry.unconfirmed === true) &&
    words.every((word) => text.includes(word))
  );
}

/** @param {DashboardDecision[]} entries */
const guardedCount = (entries) => `${entries.filter((entry) => entry.tests.length > 0).length} / ${entries.length}`;

function render() {
  if (!data) return;
  const { decisions, unknownGuards } = data;
  byId("project").textContent = data.project;
  document.title = `${data.project} · akashiq`;

  byId("summary").replaceChildren(
    summaryItem("Guarded", guardedCount(decisions)),
    summaryItem("Unconfirmed", String(decisions.filter((entry) => entry.unconfirmed).length)),
    summaryItem("Non-literal values", String(decisions.filter((entry) => entry.nonLiteralValue).length)),
  );

  byId("unknown").hidden = unknownGuards.length === 0;
  byId("unknown-list").replaceChildren(
    ...unknownGuards.map((test) =>
      h("li", {}, h("code", {}, test.decision), ` ${test.name} `, h("span", { class: "path" }, `${test.file}:${test.line}`)),
    ),
  );

  const shown = decisions.filter(matches);
  byId("count").textContent = `${shown.length} shown`;
  const files = [...new Set(shown.map((entry) => entry.file))];
  byId("files").replaceChildren(
    ...(files.length === 0
      ? [h("p", { class: "muted" }, decisions.length === 0 ? "No *.decision.ts files found." : "No decisions match.")]
      : []),
    ...files.map((file) => {
      const entries = shown.filter((entry) => entry.file === file);
      const section = h(
        "details",
        { class: "file" },
        h("summary", {}, h("h2", {}, file, " ", h("span", { class: "count" }, guardedCount(entries)))),
        ...entries.map(decisionRow),
      );
      /** @type {HTMLDetailsElement} */ (section).open = expanded.has(file);
      section.addEventListener("toggle", () => {
        if (/** @type {HTMLDetailsElement} */ (section).open) expanded.add(file);
        else expanded.delete(file);
      });
      return section;
    }),
  );
}

/** @param {string} label @param {string} value */
const summaryItem = (label, value) => h("div", {}, h("dt", {}, label), h("dd", {}, value));

/** @param {DashboardDecision} entry */
function decisionRow(entry) {
  const tests = entry.tests.length;
  return h(
    "article",
    { class: "entry", id: entry.id },
    h(
      "header",
      { class: "entry-head" },
      h("code", { class: "id" }, entry.id),
      entry.unconfirmed &&
        h("span", { class: "badge badge-unconfirmed", title: "An agent made this decision; the user hasn't confirmed it" }, "unconfirmed"),
      entry.nonLiteralValue &&
        h(
          "span",
          { class: "badge badge-warning", title: "The value refers to other code, so its text doesn't show the actual value" },
          "non-literal value",
        ),
      h("span", { class: tests > 0 ? "tests tests-ok" : "tests" }, tests > 0 ? `${tests} ${tests === 1 ? "test" : "tests"}` : "no tests"),
      h("span", { class: "path" }, `${entry.file}:${entry.line}`),
    ),
    h(
      "div",
      { class: "detail" },
      entry.decision !== undefined && h("p", { class: "decision" }, entry.decision),
      entry.reason !== undefined && h("p", { class: "reason" }, h("span", { class: "label" }, "Reason"), entry.reason),
      entry.value !== undefined && h("pre", { class: "value" }, entry.value),
      links("Relies on", entry.dependsOn),
      links("Relied on by", entry.referrers),
      tests > 0 &&
        h(
          "ul",
          { class: "test-list" },
          ...entry.tests.map((test) => h("li", {}, `${test.name} `, h("span", { class: "path" }, `${test.file}:${test.line}`))),
        ),
    ),
  );
}

/** Links to related decisions. Clicking one jumps to it. @param {string} label @param {string[]} ids */
function links(label, ids) {
  if (ids.length === 0) return undefined;
  return h(
    "p",
    { class: "links" },
    h("span", { class: "label" }, label),
    ...ids.map((id) => h("button", { type: "button", class: "link", onClick: () => jump(id) }, id)),
  );
}

/** Clears the filters, opens the decision's file, and scrolls to it. @param {string} id */
function jump(id) {
  const target = data?.decisions.find((entry) => entry.id === id);
  if (!target) return;
  query.value = "";
  tested.value = "all";
  confirm.value = "all";
  expanded.add(target.file);
  render();
  document.getElementById(id)?.scrollIntoView({ block: "start" });
}

/** @param {boolean} open */
function setAllExpanded(open) {
  expanded.clear();
  if (open && data) for (const entry of data.decisions) expanded.add(entry.file);
  render();
}

query.addEventListener("input", render);
tested.addEventListener("change", render);
confirm.addEventListener("change", render);
byId("expand").addEventListener("click", () => setAllExpanded(true));
byId("collapse").addEventListener("click", () => setAllExpanded(false));

const live = byId("live");
const events = new EventSource("/events");
events.addEventListener("open", () => {
  live.textContent = "live";
  live.classList.remove("live-off");
});
events.addEventListener("error", () => {
  live.textContent = "disconnected";
  live.classList.add("live-off");
});
events.addEventListener("change", load);

load();
