import type { AnyDecision, Decision } from "@akashiq/core";

export const configDecisions = {
  configFile: {
    decision: "Read project settings from an akashiq.config.json file at the project root",
  } satisfies Decision,
  ignoreGlobs: {
    decision:
      "Leave out of scans and commit warnings the paths matching the glob patterns in the config's ignore list, on top of node_modules, dist, and .git",
    dependsOn: (): AnyDecision[] => [configDecisions.configFile],
  } satisfies Decision,
  nodeVersion: {
    decision: "Require Node.js 22.17 or later, where Node's glob functions no longer print an experimental warning",
    dependsOn: (): AnyDecision[] => [configDecisions.ignoreGlobs],
  } satisfies Decision,
};
