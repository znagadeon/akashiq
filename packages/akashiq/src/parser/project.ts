// Scans a project for decisions and the tests that guard them. Reads files only; never runs project code.
import { globSync, readFileSync } from "node:fs";
import { join, matchesGlob, sep } from "node:path";
import { type Config, defaultConfig, loadConfig } from "../config.ts";
import { type DecisionEntry, parseDecisions } from "./decisions.ts";
import { type GuardingTest, parseGuards } from "./guards.ts";

export interface ProjectScan {
  decisions: DecisionEntry[];
  guards: GuardingTest[];
  /** guards whose decision matches no decision ID, usually because a decision was renamed and the test didn't follow. */
  unknownGuards: GuardingTest[];
}

const testFiles = "**/*.{spec,test}.{ts,tsx,mts,cts}";
const ignored = (path: string) => /(^|\/)(node_modules|dist|\.git)$/.test(path);

/** Whether a project-relative path is outside node_modules, dist, and .git, and matches none of the ignore patterns. */
export const isScanned = (path: string, ignore: readonly string[] = []) =>
  !/(^|\/)(node_modules|dist|\.git)\//.test(path) && !ignore.some((pattern) => matchesGlob(path, pattern));

/** Whether a project-relative path is a decision file that scans read. */
export const isDecisionFile = (path: string, { patterns, ignore }: Config = defaultConfig) =>
  patterns.some((glob) => matchesGlob(path, glob)) && isScanned(path, ignore);

/** Scans the project at root with its akashiq.config.json: decision files by its patterns, leaving out the paths it ignores. */
export function scanProject(root: string, config: Config = loadConfig(root)): ProjectScan {
  const files = (pattern: string | string[]) =>
    globSync(pattern, { cwd: root, exclude: ignored })
      .map((file) => file.split(sep).join("/"))
      .filter((file) => isScanned(file, config.ignore))
      .sort();
  const read = (file: string) => readFileSync(join(root, file), "utf8");
  const decisions = files(config.patterns).flatMap((file) => parseDecisions(file, read(file)));
  const guards = files(testFiles).flatMap((file) => parseGuards(file, read(file)));
  const ids = new Set(decisions.map((decision) => decision.id));
  return { decisions, guards, unknownGuards: guards.filter((guard) => !ids.has(guard.decision)) };
}
