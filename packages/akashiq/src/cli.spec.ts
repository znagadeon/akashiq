import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { guards } from "@akashiq/core";
import { afterEach, describe, expect, it } from "vitest";
import { changesDecisions } from "./changes.decision.ts";
import { cliDecisions } from "./cli.decision.ts";

const cli = fileURLToPath(new URL("./cli.ts", import.meta.url));

let directory: string | undefined;
afterEach(() => {
  if (directory) rmSync(directory, { recursive: true, force: true });
  directory = undefined;
});

/** Runs the CLI in a fresh directory outside any git repository. */
function run(...args: string[]) {
  directory = mkdtempSync(join(tmpdir(), "akashiq-"));
  const { status, stdout, stderr } = spawnSync(process.execPath, [cli, ...args], { cwd: directory, encoding: "utf8" });
  return { status, stdout, stderr };
}

describe("akashiq", () => {
  it("prints every command's usage, or one command's", () => {
    guards(cliDecisions.help, () => {
      const all = run("help");
      expect(all.status).toBe(0);
      for (const usage of ["akashiq dashboard", "akashiq skill install", "akashiq changes", "akashiq hook install", "akashiq help"]) {
        expect(all.stdout).toContain(usage);
      }
      expect(run("--help").stdout).toBe(all.stdout);

      const skill = run("help", "skill");
      expect(skill.status).toBe(0);
      expect(skill.stdout).toContain("Usage: akashiq skill install");
      expect(skill.stdout).not.toContain("akashiq dashboard");
      expect(run("skill", "install", "--help").stdout).toBe(skill.stdout);
      expect(run("dashboard", "--help").stdout).toContain("Usage: akashiq dashboard");

      const unknown = run("help", "nope");
      expect(unknown.status).toBe(1);
      expect(unknown.stderr).toContain("Unknown command: nope");
    });
  });

  it("skips the hook outside a git repository without failing", () => {
    guards(changesDecisions.hookOutsideRepository, () => {
      const result = run("hook", "install");
      expect(result.stdout).toContain("Not in a git repository");
      expect(result.status).toBe(0);
    });
  });
});
