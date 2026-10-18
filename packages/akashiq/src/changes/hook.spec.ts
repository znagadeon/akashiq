import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { guards } from "@akashiq/core";
import { afterEach, describe, expect, it } from "vitest";
import { changesDecisions } from "../changes.decision.ts";
import { hookCommand, installHook } from "./hook.ts";
import { type TestRepository, testRepository } from "./test-repository.ts";

let repository: TestRepository | undefined;
afterEach(() => {
  repository?.remove();
  repository = undefined;
});

describe("installHook", () => {
  it("adds an executable post-commit hook that runs akashiq changes, and never overwrites a hook", () => {
    guards(changesDecisions.commands, () => {
      repository = testRepository();
      const path = join(repository.root, ".git/hooks/post-commit");
      expect(installHook(repository.root)).toEqual({ status: "installed", path });
      expect(readFileSync(path, "utf8")).toContain(hookCommand);
      expect(statSync(path).mode & 0o111).not.toBe(0);
      expect(installHook(repository.root).status).toBe("already-installed");

      writeFileSync(path, "#!/bin/sh\necho mine\n");
      expect(installHook(repository.root).status).toBe("exists");
      expect(readFileSync(path, "utf8")).toBe("#!/bin/sh\necho mine\n");
    });
  });

  it("skips the hook outside a git repository", () => {
    guards(changesDecisions.hookOutsideRepository, () => {
      const directory = mkdtempSync(join(tmpdir(), "akashiq-"));
      try {
        expect(() => execFileSync("git", ["rev-parse"], { cwd: directory, stdio: "pipe" })).toThrow();
        expect(installHook(directory)).toEqual({ status: "not-a-repository" });
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });
  });

  it("uses core.hooksPath, relative to the top of the work tree, when it is set", () => {
    repository = testRepository();
    repository.git("config", "core.hooksPath", ".husky");
    expect(installHook(join(repository.root))).toEqual({ status: "installed", path: join(repository.root, ".husky/post-commit") });
  });
});
