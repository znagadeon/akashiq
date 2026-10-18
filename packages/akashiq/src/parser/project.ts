// Scans a project for decisions and the tests that guard them. Reads files and asks git which it ignores; never runs project code.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, globSync, readFileSync } from "node:fs";
import { basename, join, matchesGlob, sep } from "node:path";
import { type Config, defaultConfig, loadConfig } from "../config.ts";
import { parserDecisions } from "../parser.decision.ts";
import { type DecisionEntry, parseDecisions } from "./decisions.ts";
import { type GuardingTest, parseGuards } from "./guards.ts";

export interface ProjectScan {
  decisions: DecisionEntry[];
  guards: GuardingTest[];
  /** guards whose decision matches no decision ID, usually because a decision was renamed and the test didn't follow. */
  unknownGuards: GuardingTest[];
}

/** Extensions of the TypeScript and JavaScript files Akashiq reads. */
export const sourceExtensions = ["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"];

export const isSourceFile = (path: string) => sourceExtensions.some((extension) => path.endsWith(`.${extension}`));

/** Whether a project-relative path is a test file that scans read. */
export const isTestFile = (path: string) => parserDecisions.testFiles.value.some((pattern) => matchesGlob(path, pattern));

/** Whether a project-relative path matches none of the ignore patterns. */
export const isScanned = (path: string, ignore: readonly string[] = []) => !ignore.some((pattern) => matchesGlob(path, pattern));

/** Whether a project-relative path is a decision file by the config's patterns and ignore list. Doesn't ask git, so callers pass only files git tracks. */
export const isDecisionFile = (path: string, { patterns, ignore }: Config = defaultConfig) =>
  patterns.some((glob) => matchesGlob(path, glob)) && isScanned(path, ignore);

/** Whether git ignores a path relative to root. False outside a git repository or without git. */
export const isGitIgnored = (root: string, path: string) =>
  spawnSync("git", ["check-ignore", "--quiet", "--", path], { cwd: root, stdio: "ignore" }).status === 0;

/** Files under root that git doesn't ignore, tracked or not, relative to root. Undefined outside a git repository or without git. */
function gitFiles(root: string): string[] | undefined {
  try {
    const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 1024 * 1024 * 1024,
    });
    return output.split("\0").filter((file) => file !== "");
  } catch {
    return undefined;
  }
}

/** Scans the project at root with its akashiq.config.json: decision files by its patterns, leaving out the paths git and the config ignore. */
export function scanProject(root: string, config: Config = loadConfig(root)): ProjectScan {
  const listed = gitFiles(root);
  const files = (patterns: string[]) =>
    (listed
      ? // Tracked files deleted from the work tree are still listed.
        listed.filter((file) => patterns.some((pattern) => matchesGlob(file, pattern)) && existsSync(join(root, file)))
      : globSync(patterns, { cwd: root, exclude: (path) => basename(path) === ".git" }).map((file) => file.split(sep).join("/"))
    )
      .filter((file) => isScanned(file, config.ignore))
      .sort();
  const read = (file: string) => readFileSync(join(root, file), "utf8");
  const decisions = files(config.patterns).flatMap((file) => parseDecisions(file, read(file)));
  const guards = files(parserDecisions.testFiles.value).flatMap((file) => parseGuards(file, read(file)));
  const ids = new Set(decisions.map((decision) => decision.id));
  return { decisions, guards, unknownGuards: guards.filter((guard) => !ids.has(guard.decision)) };
}
