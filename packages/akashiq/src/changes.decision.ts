import type { AnyDecision, Decision } from "@akashiq/core";

export const changesDecisions = {
  warnAfterCommit: {
    decision:
      "After a commit, warn without blocking it when it changed a test that guards a decision, a decision's text, or the value of a decision others depend on",
  } satisfies Decision,
  guardHelpers: {
    decision: "Count the helpers a guarding test uses in the same file, followed transitively, as part of what guards the decision",
    dependsOn: (): AnyDecision[] => [changesDecisions.warnAfterCommit],
  } satisfies Decision,
  assertionCount: {
    decision: "Show how many expect calls the tests guarding a decision had before and after the commit",
    dependsOn: (): AnyDecision[] => [changesDecisions.warnAfterCommit],
  } satisfies Decision,
  showDecisionText: {
    decision: "Print each warned decision's text and reason with the warning, not only its ID",
    reason: "Reading what to recheck shouldn't require opening files",
    dependsOn: (): AnyDecision[] => [changesDecisions.warnAfterCommit],
  } satisfies Decision,
  commands: {
    decision:
      "`akashiq changes` reports a range of commits, HEAD~1 to HEAD by default, and `akashiq hook install` adds it to the post-commit hook without overwriting an existing hook",
    dependsOn: (): AnyDecision[] => [changesDecisions.warnAfterCommit],
  } satisfies Decision,
};
