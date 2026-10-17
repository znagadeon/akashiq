import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { guards } from "@akashiq/core";
import { afterEach, describe, expect, it } from "vitest";
import { configDecisions } from "../config.decision.ts";
import { parserDecisions } from "../parser.decision.ts";
import { parseDecisions } from "./decisions.ts";
import { scanProject } from "./project.ts";

let root: string | undefined;
afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

/** Writes files into a fresh temporary project and returns its root. */
function project(files: Record<string, string>): string {
  root = mkdtempSync(join(tmpdir(), "akashiq-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

describe("scanProject", () => {
  it("finds decision files by suffix anywhere, not by directory", () => {
    guards(parserDecisions.decisionFileSuffix, () => {
      const inDecisionsDirectory = 'export const dirDecisions = { a: { decision: "In a decisions directory" } };';
      expect(parseDecisions("decisions/dir.ts", inDecisionsDirectory)).toHaveLength(1);

      const scan = scanProject(
        project({
          "src/deep/nested/cart.decision.ts": 'export const cartDecisions = { a: { decision: "Next to the code" } };',
          "decisions/dir.ts": inDecisionsDirectory,
          "node_modules/lib/lib.decision.ts": 'export const libDecisions = { a: { decision: "From a dependency" } };',
        }),
      );
      expect(scan.decisions.map((decision) => [decision.id, decision.file])).toEqual([
        ["cartDecisions.a", "src/deep/nested/cart.decision.ts"],
      ]);
    });
  });

  it("reads decisions and tests that cannot run", () => {
    guards(parserDecisions.staticAnalysis, () => {
      const scan = scanProject(
        project({
          "src/broken.decision.ts": [
            'import { missing } from "./does-not-exist.ts";',
            'throw new Error("this file must not run");',
            'export const brokenDecisions = { a: { decision: "Still readable", value: 1 } };',
          ].join("\n"),
          "src/broken.spec.ts": [
            'import { notInstalled } from "not-installed-package";',
            'it("guards a decision", () => guards(brokenDecisions.a, () => notInstalled()));',
          ].join("\n"),
        }),
      );
      expect(scan.decisions).toEqual([expect.objectContaining({ id: "brokenDecisions.a", value: "1" })]);
      expect(scan.guards).toEqual([expect.objectContaining({ decision: "brokenDecisions.a", name: "guards a decision" })]);
      expect(scan.unknownGuards).toEqual([]);
    });
  });

  it("leaves out the paths that akashiq.config.json ignores", () => {
    guards(configDecisions.ignoreGlobs, () => {
      const decision = (name: string) => `export const ${name}Decisions = { a: { decision: "${name}" } };`;
      const root = project({
        "packages/app/src/app.decision.ts": decision("app"),
        "examples/minimal/src/shop.decision.ts": decision("shop"),
        "packages/app/test/fixtures/fixture.decision.ts": decision("fixture"),
        "examples/minimal/src/shop.test.ts": 'it("a", () => guards(shopDecisions.a, () => {}));',
      });
      expect(scanProject(root, []).decisions).toHaveLength(3);

      writeFileSync(join(root, "akashiq.config.json"), '{ "ignore": ["examples/**", "**/fixtures/**"] }');
      const scan = scanProject(root);
      expect(scan.decisions.map((entry) => entry.id)).toEqual(["appDecisions.a"]);
      expect(scan.guards).toEqual([]);
    });
  });

  it("reports guards whose decision no longer exists", () => {
    const scan = scanProject(
      project({
        "a.decision.ts": 'export const aDecisions = { kept: { decision: "Kept" } };',
        "a.test.ts": 'it("old", () => guards(aDecisions.renamed, () => {}));',
      }),
    );
    expect(scan.unknownGuards.map((guard) => guard.decision)).toEqual(["aDecisions.renamed"]);
  });
});
