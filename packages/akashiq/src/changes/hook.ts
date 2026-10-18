// Adds `akashiq changes` to the repository's post-commit hook.
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

export const hookCommand = "npx --no-install akashiq changes";

export type HookResult =
  | { status: "installed"; path: string }
  | { status: "already-installed"; path: string }
  /** A post-commit hook exists and doesn't run akashiq. It's left alone; add hookCommand to it by hand. */
  | { status: "exists"; path: string }
  /** cwd is not in a git repository, so there is no hook to install. */
  | { status: "not-a-repository" };

/** Writes a post-commit hook that runs `akashiq changes`, in the hooks directory git uses (core.hooksPath included). Never overwrites a hook. */
export function installHook(cwd: string): HookResult {
  // Relative hook paths, including a relative core.hooksPath, are relative to the top of the work tree.
  let root: string;
  try {
    root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8", stdio: "pipe" }).trim();
  } catch (error) {
    // Without git itself, whether cwd is a repository is unknown, so say that git is missing instead.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw error;
    return { status: "not-a-repository" };
  }
  const hooks = execFileSync("git", ["rev-parse", "--git-path", "hooks"], { cwd: root, encoding: "utf8" }).trim();
  const path = join(isAbsolute(hooks) ? hooks : join(root, hooks), "post-commit");
  if (existsSync(path)) {
    return readFileSync(path, "utf8").includes("akashiq changes") ? { status: "already-installed", path } : { status: "exists", path };
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `#!/bin/sh\n# Warns about decisions this commit may have affected. Never blocks the commit.\n${hookCommand}\n`);
  chmodSync(path, 0o755);
  return { status: "installed", path };
}
