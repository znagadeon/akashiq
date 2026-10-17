import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { guards } from "@akashiq/core";
import { afterEach, describe, expect, it } from "vitest";
import { dashboardDecisions } from "../dashboard.decision.ts";
import type { DashboardData } from "./data.ts";
import { type Dashboard, startDashboard } from "./server.ts";

let root: string | undefined;
let dashboard: Dashboard | undefined;
afterEach(async () => {
  await dashboard?.close();
  if (root) rmSync(root, { recursive: true, force: true });
  dashboard = undefined;
  root = undefined;
});

function write(path: string, content: string) {
  if (!root) throw new Error("no project");
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

async function serve(files: Record<string, string>): Promise<Dashboard> {
  root = mkdtempSync(join(tmpdir(), "akashiq-"));
  for (const [path, content] of Object.entries(files)) write(path, content);
  dashboard = await startDashboard(root, 0);
  return dashboard;
}

const decisionIds = async (url: string) =>
  ((await (await fetch(`${url}data.json`)).json()) as DashboardData).decisions.map((entry) => entry.id);

describe("dashboard server", () => {
  it("serves the dashboard page, its files, and the project scan", async () => {
    await guards(dashboardDecisions.staticFiles, async () => {
      const { url } = await serve({
        "src/cart.decision.ts": 'export const cartDecisions = { freeShipping: { decision: "Ship free above 50" } };',
        "src/cart.spec.ts": 'it("ships free", () => guards(cartDecisions.freeShipping, () => {}));',
      });
      const page = await fetch(url);
      expect(page.headers.get("content-type")).toContain("text/html");
      const html = await page.text();
      for (const asset of ["/app.js", "/style.css"]) {
        expect(html).toContain(asset);
        expect((await fetch(new URL(asset, url))).status).toBe(200);
      }
      const data = (await (await fetch(`${url}data.json`)).json()) as DashboardData;
      expect(data.decisions).toEqual([
        expect.objectContaining({ id: "cartDecisions.freeShipping", tests: [expect.objectContaining({ name: "ships free" })] }),
      ]);
    });
  });

  it("tells open dashboards when a decision file changes", async () => {
    await guards(dashboardDecisions.liveData, async () => {
      const { url } = await serve({ "src/cart.decision.ts": 'export const cartDecisions = { a: { decision: "A" } };' });
      const response = await fetch(`${url}events`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("no event stream");
      const decoder = new TextDecoder();
      let received = "";
      const until = async (text: string) => {
        while (!received.includes(text)) {
          const { value, done } = await reader.read();
          if (done) throw new Error(`stream ended before ${text}`);
          received += decoder.decode(value);
        }
      };
      await until(": connected");
      expect(await decisionIds(url)).toEqual(["cartDecisions.a"]);

      write("src/pricing.decision.ts", 'export const pricingDecisions = { currency: { decision: "Charge in USD" } };');
      await until("event: change");
      expect(await decisionIds(url)).toEqual(["cartDecisions.a", "pricingDecisions.currency"]);
      await reader.cancel();
    });
  });
});
