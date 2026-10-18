import type { AnyDecision, Decision } from "@akashiq/core";

export const configDecisions = {
  configFile: {
    decision: "Read project settings from an akashiq.config.json file at the project root",
  } satisfies Decision,
  ignoreGlobs: {
    decision: "Leave out of scans and commit warnings the paths matching the glob patterns in the config's ignore list",
    dependsOn: (): AnyDecision[] => [configDecisions.configFile],
  } satisfies Decision,
  gitIgnoredFiles: {
    decision:
      "Leave out of scans the files git ignores, instead of a built-in list of paths such as node_modules and dist. Outside a git repository or without git, scan every file but those in .git and the config's ignore list",
    reason:
      "Paths skipped by a built-in list that no setting shows would confuse users. Without git, adding back a built-in list would bring that back, and using Akashiq without git is rare",
    dependsOn: (): AnyDecision[] => [configDecisions.ignoreGlobs],
  } satisfies Decision,
  nodeVersion: {
    decision: "Require Node.js 22.17 or later, where Node's glob functions no longer print an experimental warning",
    dependsOn: (): AnyDecision[] => [configDecisions.ignoreGlobs],
  } satisfies Decision,
};
