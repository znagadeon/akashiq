import type { AnyDecision, Decision } from "@akashiq/core";

export const parserDecisions = {
  decisionFileSuffix: {
    decision: "Find decision files by the *.decision.ts suffix, not by directory",
  } satisfies Decision,
  staticAnalysis: {
    decision: "Read decisions and tests by static analysis of the source, without executing project code",
    reason: "Akashiq should still run when the project's own code can't, such as before its development environment is set up",
  } satisfies Decision,
  literalValue: {
    decision:
      "Write a decision's value as a literal in place, and have the parser flag values that reference other code such as constants, spreads, or calls",
    dependsOn: (): AnyDecision[] => [parserDecisions.staticAnalysis],
  } satisfies Decision,
  typescriptSixParser: {
    decision:
      "Parse with the JavaScript API of TypeScript 6 as Akashiq's own dependency, independent of the TypeScript version the project compiles with",
    reason:
      "Moving to another parser such as oxc costs about the same now or later, so move only once TypeScript adds syntax that TypeScript 6 can't read",
  } satisfies Decision,
};
