import type { AnyDecision, Decision } from "@akashiq/core";

export const parserDecisions = {
  decisionFileSuffix: {
    decision: "Find decision files by the *.decision.ts suffix, not by directory",
  } satisfies Decision,
  staticAnalysis: {
    decision: "Read decisions and tests by static analysis of the source, without executing project code",
    reason: "akashiq should still run when the project's own code can't, such as before its development environment is set up",
  } satisfies Decision,
  literalValue: {
    decision:
      "Write a decision's value as a literal in place, and have the parser flag values that reference other code such as constants, spreads, or calls",
    dependsOn: (): AnyDecision[] => [parserDecisions.staticAnalysis],
  } satisfies Decision,
};
