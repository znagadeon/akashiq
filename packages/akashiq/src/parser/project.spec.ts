import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { guards } from "@akashiq/core";
import { afterEach, describe, expect, it } from "vitest";
import { configDecisions } from "../config.decision.ts";
import { defaultConfig } from "../config.ts";
import { parserDecisions } from "../parser.decision.ts";
import { parseDecisions } from "./decisions.ts";
import { scanProject } from "./project.ts";

let root: string | undefined;
afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

const decision = (name: string) => `export const ${name}Decisions = { a: { decision: "${name}" } };`;

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
  it("finds *.decision.ts files anywhere by default", () => {
    guards(parserDecisions.decisionFilePatterns, () => {
      const inDecisionsDirectory = 'export const dirDecisions = { a: { decision: "In a decisions directory" } };';
      expect(parseDecisions("decisions/dir.ts", inDecisionsDirectory)).toHaveLength(1);

      const scan = scanProject(
        project({
          "src/deep/nested/cart.decision.ts": 'export const cartDecisions = { a: { decision: "Next to the code" } };',
          "decisions/dir.ts": inDecisionsDirectory,
        }),
      );
      expect(scan.decisions.map((decision) => [decision.id, decision.file])).toEqual([
        ["cartDecisions.a", "src/deep/nested/cart.decision.ts"],
      ]);
    });
  });

  it("finds decision files by the patterns in akashiq.config.json instead", () => {
    guards(parserDecisions.decisionFilePatterns, () => {
      const root = project({
        "decisions/cart.ts": decision("cart"),
        "decisions/deep/pricing.ts": decision("pricing"),
        "policies/legacy.ts": decision("legacy"),
        "src/shipping.decision.ts": decision("shipping"),
        "decisions/old/stale.ts": decision("stale"),
      });
      expect(scanProject(root).decisions.map((entry) => entry.id)).toEqual(["shippingDecisions.a"]);

      writeFileSync(
        join(root, "akashiq.config.json"),
        '{ "patterns": ["decisions/**/*.ts", "policies/*.ts", "decisions/*.ts"], "ignore": ["decisions/old/**"] }',
      );
      expect(scanProject(root).decisions.map((entry) => [entry.id, entry.file])).toEqual([
        ["cartDecisions.a", "decisions/cart.ts"],
        ["pricingDecisions.a", "decisions/deep/pricing.ts"],
        ["legacyDecisions.a", "policies/legacy.ts"],
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
      const root = project({
        "packages/app/src/app.decision.ts": decision("app"),
        "examples/minimal/src/shop.decision.ts": decision("shop"),
        "packages/app/test/fixtures/fixture.decision.ts": decision("fixture"),
        "examples/minimal/src/shop.test.ts": 'it("a", () => guards(shopDecisions.a, () => {}));',
      });
      expect(scanProject(root, defaultConfig).decisions).toHaveLength(3);

      writeFileSync(join(root, "akashiq.config.json"), '{ "ignore": ["examples/**", "**/fixtures/**"] }');
      const scan = scanProject(root);
      expect(scan.decisions.map((entry) => entry.id)).toEqual(["appDecisions.a"]);
      expect(scan.guards).toEqual([]);
    });
  });

  it("leaves out the files git ignores, and nothing else built in", () => {
    guards(configDecisions.gitIgnoredFiles, () => {
      const root = project({
        ".gitignore": "node_modules/\nbuild/\n",
        "node_modules/lib/lib.decision.ts": decision("lib"),
        "node_modules/lib/lib.test.ts": 'it("a", () => guards(libDecisions.a, () => {}));',
        "build/out.decision.ts": decision("out"),
        "dist/kept.decision.ts": decision("kept"),
        "packages/app/app.decision.ts": decision("app"),
      });
      execFileSync("git", ["init", "-q"], { cwd: root });
      execFileSync("git", ["add", "dist", ".gitignore"], { cwd: root });

      // Tracked or not, a file git doesn't ignore is scanned.
      const scan = scanProject(root);
      expect(scan.decisions.map((entry) => entry.file)).toEqual(["dist/kept.decision.ts", "packages/app/app.decision.ts"]);
      expect(scan.guards).toEqual([]);
      expect(scanProject(join(root, "packages/app")).decisions.map((entry) => entry.file)).toEqual(["app.decision.ts"]);
    });
  });

  it("scans every file but .git and the ignore list outside a git repository", () => {
    guards(configDecisions.gitIgnoredFiles, () => {
      const root = project({
        ".gitignore": "node_modules/\n",
        "node_modules/lib/lib.decision.ts": decision("lib"),
        "dist/kept.decision.ts": decision("kept"),
        "examples/shop.decision.ts": decision("shop"),
        ".git/hooks/hook.decision.ts": decision("hook"),
        "akashiq.config.json": '{ "ignore": ["examples/**"] }',
      });
      expect(() => execFileSync("git", ["rev-parse"], { cwd: root, stdio: "pipe" })).toThrow();
      expect(scanProject(root).decisions.map((entry) => entry.file)).toEqual(["dist/kept.decision.ts", "node_modules/lib/lib.decision.ts"]);
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
