import type { Decision } from "@akashiq/core";

export const packageDecisions = {
  splitCore: {
    decision: "Ship the Decision types and guards as @akashiq/core, and the parser, dashboard, and CLI as akashiq",
  } satisfies Decision,
  englishSource: {
    decision: "Write source code, comments, tests, decisions, package metadata, and AGENTS.md in English",
    reason: "akashiq is meant to be distributed worldwide",
  } satisfies Decision,
  tsImportExtensions: {
    decision: "Write relative imports with the .ts extension and let the compiler rewrite them to .js",
    reason: "Imports match the actual file names, and Node can run the sources directly without a build",
  } satisfies Decision,
};
