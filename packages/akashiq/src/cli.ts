#!/usr/bin/env node
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { gitRepository } from "./changes/git.ts";
import { hookCommand, installHook } from "./changes/hook.ts";
import { collectWarnings, formatWarnings } from "./changes/report.ts";
import { loadConfig } from "./config.ts";
import { startDashboard } from "./dashboard/server.ts";
import { helpText } from "./help.ts";
import { installSkill } from "./skill/install.ts";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: "string" },
    dir: { type: "string", multiple: true },
    from: { type: "string" },
    to: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const [command, ...rest] = positionals;
if (command === "help" || values.help) {
  const name = command === "help" ? rest[0] : command;
  const text = helpText(name);
  if (text === undefined) fail(`Unknown command: ${name}\n\n${helpText()}`);
  console.log(text);
} else if (command === "dashboard") {
  const port = values.port === undefined ? undefined : Number(values.port);
  if (port !== undefined && !(Number.isInteger(port) && port >= 0 && port < 65536)) fail(`Invalid port: ${values.port}`);
  const dashboard = await startDashboard(resolve(rest[0] ?? "."), port);
  console.log(`Akashiq dashboard: ${dashboard.url}`);
} else if (command === "skill" && rest[0] === "install") {
  for (const path of installSkill(resolve(rest[1] ?? "."), values.dir)) console.log(`Installed the Akashiq skill in ${path}`);
} else if (command === "changes") {
  const repository = gitRepository(process.cwd());
  const from = values.from ?? "HEAD~1";
  // The first commit has nothing to compare with.
  if (repository.exists(from)) {
    const report = formatWarnings(collectWarnings(repository, from, values.to ?? "HEAD", loadConfig(repository.root)));
    if (report) console.warn(report);
  }
} else if (command === "hook" && rest[0] === "install") {
  const result = installHook(process.cwd());
  if (result.status === "installed") console.log(`Installed the post-commit hook at ${result.path}`);
  if (result.status === "already-installed") console.log(`The post-commit hook at ${result.path} already runs akashiq`);
  if (result.status === "not-a-repository") console.log("Not in a git repository, so no post-commit hook was installed");
  if (result.status === "exists") fail(`A post-commit hook already exists at ${result.path}. Add this line to it:\n  ${hookCommand}`);
} else {
  fail(helpText() ?? "");
}
