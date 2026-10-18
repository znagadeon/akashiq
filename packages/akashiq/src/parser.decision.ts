import type { AnyDecision, Decision } from "@akashiq/core";
import { configDecisions } from "./config.decision.ts";

export const parserDecisions = {
  decisionFilePatterns: {
    decision:
      "Find decision files by the glob patterns in the config's patterns list, by default *.decision files in TypeScript or JavaScript anywhere in the project",
    value: ["**/*.decision.{ts,mts,cts,js,mjs,cjs}"],
    reason:
      "Projects differ in where they keep decisions: next to the code they concern, or gathered in a decisions directory. Projects written only in JavaScript should be able to use Akashiq too",
    dependsOn: (): AnyDecision[] => [configDecisions.configFile],
  } satisfies Decision<string[]>,
  testFiles: {
    decision: "Read tests from *.spec and *.test files in TypeScript or JavaScript, JSX included",
    value: ["**/*.{spec,test}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
    reason: "Projects written only in JavaScript should be able to use Akashiq too",
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
