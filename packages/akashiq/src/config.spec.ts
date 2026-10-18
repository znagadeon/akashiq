import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { guards } from "@akashiq/core";
import { afterEach, describe, expect, it } from "vitest";
import { configDecisions } from "./config.decision.ts";
import { configFile, loadConfig } from "./config.ts";
import { parserDecisions } from "./parser.decision.ts";

let root: string | undefined;
afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

function withConfig(content: string | undefined): string {
  root = mkdtempSync(join(tmpdir(), "akashiq-"));
  if (content !== undefined) writeFileSync(join(root, configFile), content);
  return root;
}

describe("loadConfig", () => {
  it("ignores nothing and looks for *.decision.ts files when there is no config file", () => {
    expect(loadConfig(withConfig(undefined))).toEqual({ ignore: [], patterns: parserDecisions.decisionFilePatterns.value });
  });

  it("reads akashiq.config.json at the project root", () => {
    guards(configDecisions.configFile, () => {
      expect(configFile).toBe("akashiq.config.json");
      expect(loadConfig(withConfig('{ "ignore": ["examples/**"] }'))).toEqual({
        ignore: ["examples/**"],
        patterns: parserDecisions.decisionFilePatterns.value,
      });
      expect(loadConfig(withConfig('{ "patterns": ["decisions/**/*.ts"] }'))).toEqual({ ignore: [], patterns: ["decisions/**/*.ts"] });
    });
  });

  it.each([
    ["invalid JSON", "{ ignore: [] }", "not valid JSON"],
    ["a non-object", "[]", "must contain an object"],
    ["a misspelled setting", '{ "ignores": [] }', "unknown settings: ignores"],
    ["ignore that isn't a list of strings", '{ "ignore": "examples/**" }', '"ignore" must be an array'],
    ["patterns that isn't a list of strings", '{ "patterns": "decisions/**/*.ts" }', '"patterns" must be a non-empty array'],
    ["empty patterns", '{ "patterns": [] }', '"patterns" must be a non-empty array'],
  ])("rejects %s instead of guessing", (_, content, message) => {
    expect(() => loadConfig(withConfig(content))).toThrow(message);
  });
});
