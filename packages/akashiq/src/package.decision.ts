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
  koreanReadme: {
    decision: "Keep a Korean translation of the README as README.ko.md, with README.md as the source",
    dependsOn: (): AnyDecision[] => [packageDecisions.englishSource],
  } satisfies Decision,
  packWithPnpm: {
    decision:
      "Pack releases with pnpm, which applies publishConfig to point bin and exports at the built files and replaces workspace: versions, and publish the packed tarballs; packing with npm would ship the source entry points",
  } satisfies Decision,
  releaseNotes: {
    decision:
      "Write each GitHub release's notes from the subjects of the commits that touched the package since its previous tag, instead of GitHub's generated notes",
    reason:
      "GitHub's generated notes list merged pull requests, which this repository doesn't use, and can't tell the packages of a monorepo apart",
    dependsOn: (): AnyDecision[] => [packageDecisions.releaseOnTag],
  } satisfies Decision,
  releaseOnTag: {
    decision:
      "Version each package on its own, and publish a package to npm from GitHub Actions when a `<package name>@<version>` tag is pushed, authenticating with npm trusted publishing",
    reason: "Publishing on a tag is more convenient than publishing by hand, and packages such as a search adapter may be added later",
    dependsOn: (): AnyDecision[] => [packageDecisions.packWithPnpm],
  } satisfies Decision,
};
