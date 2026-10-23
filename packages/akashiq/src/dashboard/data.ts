// What the dashboard shows: each decision with the tests that guard it and the decisions that rely on it.
import type { DecisionEntry } from "../parser/decisions.ts";
import type { GuardingTest } from "../parser/guards.ts";
import type { ProjectScan } from "../parser/project.ts";
import { referrersOf } from "../parser/references.ts";

export interface DashboardDecision extends DecisionEntry {
  tests: GuardingTest[];
  /** Decisions that list this one in dependsOn. */
  referrers: string[];
}

export interface DashboardData {
  /** Name of the project directory. */
  project: string;
  decisions: DashboardDecision[];
  /** guards whose decision matches no decision ID. */
  unknownGuards: GuardingTest[];
  /** IDs of decisions still marked unimplemented that a test already guards, so the flag was likely left behind. */
  guardedUnimplemented: string[];
}

export function dashboardData(project: string, scan: ProjectScan): DashboardData {
  const referrers = referrersOf(scan.decisions);
  const decisions = scan.decisions.map((decision) => ({
    ...decision,
    tests: scan.guards.filter((guard) => guard.decision === decision.id),
    referrers: referrers.get(decision.id) ?? [],
  }));
  return {
    project,
    decisions,
    unknownGuards: scan.unknownGuards,
    guardedUnimplemented: decisions.filter((decision) => decision.unimplemented && decision.tests.length > 0).map(({ id }) => id),
  };
}
