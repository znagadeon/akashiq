import type { Decision } from "@akashiq/core";

export const packageDecisions = {
  splitCore: {
    decision: "Ship the Decision types and guards as @akashiq/core, and the parser, dashboard, and CLI as akashiq",
  } satisfies Decision,
  englishSource: {
    decision: "Write source code, comments, tests, decisions, package metadata, and AGENTS.md in English",
    reason: "akashiq is meant to be distributed worldwide",
  } satisfies Decision,
};
