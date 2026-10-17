import { describe, expect, it } from "vitest";
import { changedDecisions, textChange } from "./decisions.ts";

const file = (body: string) => `export const fooDecisions = {\n${body}\n};\n`;
const decision = (key: string, fields: string) => `  ${key}: { ${fields} } satisfies Decision,`;
const ids = (before: string | undefined, after: string | undefined) => changedDecisions("foo.decision.ts", before, after);

describe("changedDecisions", () => {
  it("reports changes to decision and reason separately, with the changed part", () => {
    const before = file(decision("a", 'decision: "Ship free above 50", reason: "Carts cluster below 50"'));
    const after = file(decision("a", 'decision: "Ship free above 40", reason: "Carts cluster below 50"'));
    expect(ids(before, after)).toEqual([
      expect.objectContaining({
        id: "fooDecisions.a",
        text: [{ field: "decision", before: "Ship free above 50", after: "Ship free above 40", removed: "5", added: "4" }],
        valueChanged: false,
      }),
    ]);
  });

  it("ignores changes around a decision that leave its text and value alone", () => {
    const before = file(decision("a", 'decision: "A", value: 1'));
    const moved = `\n\n${file(decision("a", 'value: 1, decision: "A"')).replace("satisfies Decision", "satisfies Decision<number>")}`;
    expect(ids(before, moved)).toEqual([]);
  });

  it("reports a changed value", () => {
    expect(ids(file(decision("a", 'decision: "A", value: [1, 2]')), file(decision("a", 'decision: "A", value: [1, 3]')))).toEqual([
      expect.objectContaining({ id: "fooDecisions.a", text: [], valueChanged: true }),
    ]);
  });

  it("reports added and removed decisions, including when the file itself is added or removed", () => {
    const one = file(decision("a", 'decision: "A"'));
    const two = file(`${decision("a", 'decision: "A"')}\n${decision("b", 'decision: "B"')}`);
    expect(ids(one, two).map(({ id, before, after }) => [id, before?.id, after?.id])).toEqual([
      ["fooDecisions.b", undefined, "fooDecisions.b"],
    ]);
    expect(ids(two, one).map(({ id, before, after }) => [id, before?.id, after?.id])).toEqual([
      ["fooDecisions.b", "fooDecisions.b", undefined],
    ]);
    expect(ids(undefined, one)).toHaveLength(1);
    expect(ids(one, undefined)).toHaveLength(1);
  });
});

describe("textChange", () => {
  it.each([
    ["shows only text appended to a long reason", `${"x".repeat(5000)}. More.`, `${"x".repeat(5000)}. More. Even more.`, "", " Even more."],
    [
      "shows only the changed middle",
      "Decided by the user. Same as before.",
      "Decided by the user. Different now.",
      "Same as before",
      "Different now",
    ],
    ["shows deleted text as removed", "Reason. How it works.", "Reason.", " How it works.", ""],
  ])("%s", (_, before, after, removed, added) => {
    expect(textChange(before, after)).toEqual({ removed, added });
  });
});
