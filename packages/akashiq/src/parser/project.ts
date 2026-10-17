// Scans a project for decisions and the tests that guard them. Reads files only; never runs project code.
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type DecisionEntry, parseDecisions } from "./decisions.ts";
import { type GuardingTest, parseGuards } from "./guards.ts";

export interface ProjectScan {
  decisions: DecisionEntry[];
  guards: GuardingTest[];
  /** guards whose decision matches no decision ID, usually because a decision was renamed and the test didn't follow. */
  unknownGuards: GuardingTest[];
}

const decisionFiles = "**/*.decision.ts";
const testFiles = "**/*.{spec,test}.{ts,tsx,mts,cts}";
const ignored = (path: string) => /(^|\/)(node_modules|dist|\.git)$/.test(path);

export function scanProject(root: string): ProjectScan {
  const files = (pattern: string) => globSync(pattern, { cwd: root, exclude: ignored }).sort();
  const read = (file: string) => readFileSync(join(root, file), "utf8");
  const decisions = files(decisionFiles).flatMap((file) => parseDecisions(file, read(file)));
  const guards = files(testFiles).flatMap((file) => parseGuards(file, read(file)));
  const ids = new Set(decisions.map((decision) => decision.id));
  return { decisions, guards, unknownGuards: guards.filter((guard) => !ids.has(guard.decision)) };
}
