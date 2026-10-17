// A throwaway git repository for tests.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export interface TestRepository {
  root: string;
  git(...args: string[]): string;
  /** Writes the files, deleting those set to null, and commits everything. */
  commit(files: Record<string, string | null>): void;
  remove(): void;
}

export function testRepository(): TestRepository {
  // Resolved so it matches the paths git reports, such as /private/var rather than /var on macOS.
  const root = realpathSync(mkdtempSync(join(tmpdir(), "akashiq-git-")));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  git("init", "-q", "-b", "main");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.com");
  git("config", "commit.gpgsign", "false");
  return {
    root,
    git,
    commit(files) {
      for (const [path, content] of Object.entries(files)) {
        if (content === null) rmSync(join(root, path), { force: true });
        else {
          mkdirSync(dirname(join(root, path)), { recursive: true });
          writeFileSync(join(root, path), content);
        }
      }
      git("add", "-A");
      git("commit", "-q", "--allow-empty", "-m", "change");
    },
    remove: () => rmSync(root, { recursive: true, force: true }),
  };
}
