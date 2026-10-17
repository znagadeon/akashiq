import type { AnyDecision, Decision } from "@akashiq/core";
import { skillDecisions } from "./skill.decision.ts";

export const packageDecisions = {
  splitCore: {
    decision: "Ship the Decision types and guards as @akashiq/core, and the parser, dashboard, and CLI as akashiq",
  } satisfies Decision,
  englishSource: {
    decision: "Write source code, comments, tests, decisions, package metadata, and AGENTS.md in English",
    reason: "Akashiq is meant to be distributed worldwide",
  } satisfies Decision,
  tsImportExtensions: {
    decision: "Write relative imports with the .ts extension and let the compiler rewrite them to .js",
    reason: "Imports match the actual file names, and Node can run the sources directly without a build",
  } satisfies Decision,
  mitLicense: {
    decision: "License Akashiq under MIT",
  } satisfies Decision,
  productName: {
    decision: "Call the product Akashiq in prose, and keep packages, the command, and the skill lowercase as akashiq",
  } satisfies Decision,
  unscopedCli: {
    decision: "Publish the CLI package unscoped as akashiq, with the skill inside it, rather than under the @akashiq scope",
    reason: "The package and the command share a name, so `npx akashiq` runs it directly",
    dependsOn: (): AnyDecision[] => [packageDecisions.splitCore, skillDecisions.shipAsSkill],
  } satisfies Decision,
};
