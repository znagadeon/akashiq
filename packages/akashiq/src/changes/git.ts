// A Repository backed by the git command line.
import { execFileSync, spawnSync } from "node:child_process";
import type { Repository } from "./report.ts";

export function gitRepository(cwd: string): Repository & { root: string; exists(revision: string): boolean } {
  const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  return {
    root: git("rev-parse", "--show-toplevel").trim(),
    exists: (revision) => spawnSync("git", ["rev-parse", "--verify", "--quiet", `${revision}^{commit}`], { cwd }).status === 0,
    diff: (from, to) =>
      git(
        "-c",
        "core.quotePath=false",
        "diff",
        "-M",
        "--unified=0",
        "--no-color",
        "--no-ext-diff",
        from,
        to,
        "--",
        "*.ts",
        "*.tsx",
        "*.mts",
        "*.cts",
      ),
    show: (revision, path) => {
      const result = spawnSync("git", ["show", `${revision}:${path}`], { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
      return result.status === 0 ? result.stdout : undefined;
    },
    files: (revision) => git("-c", "core.quotePath=false", "ls-tree", "-r", "--name-only", revision).split("\n").filter(Boolean),
  };
}
