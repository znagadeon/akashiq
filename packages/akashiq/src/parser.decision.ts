import type { AnyDecision, Decision } from "@akashiq/core";
import { configDecisions } from "./config.decision.ts";

export const parserDecisions = {
  decisionFilePatterns: {
    decision:
      "Find decision files by the glob patterns in the config's patterns list, *.decision.ts files anywhere in the project by default",
    value: ["**/*.decision.ts"],
    reason: "Projects differ in where they keep decisions: next to the code they concern, or gathered in a decisions directory",
    dependsOn: (): AnyDecision[] => [configDecisions.configFile],
  } satisfies Decision<string[]>,
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
