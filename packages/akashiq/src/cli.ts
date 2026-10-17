#!/usr/bin/env node
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { gitRepository } from "./changes/git.ts";
import { hookCommand, installHook } from "./changes/hook.ts";
import { collectWarnings, formatWarnings } from "./changes/report.ts";
import { loadConfig } from "./config.ts";
import { startDashboard } from "./dashboard/server.ts";
import { dashboardDecisions } from "./dashboard.decision.ts";
import { defaultSkillDirectories, installSkill } from "./skill/install.ts";

const usage = `Usage:
  akashiq dashboard [root] [--port <port>]
  akashiq skill install [root] [--dir <dir>]...
  akashiq changes [--from <rev>] [--to <rev>]
  akashiq hook install

Commands:
  dashboard       Serve the decision dashboard for the project at root (default: .)
                  on --port (default: ${dashboardDecisions.defaultPort.value}; 0 picks a free port)
  skill install   Copy the Akashiq agent skill into root (default: .) under each --dir
                  (default: ${defaultSkillDirectories.join(", ")}). Use --dir .claude/skills for Claude Code.
  changes         Warn about decisions the commits from --from (default: HEAD~1) to --to
                  (default: HEAD) may have affected. Prints nothing when there are none.
  hook install    Run \`akashiq changes\` after every commit through the git post-commit hook.`;

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
if (values.help) {
  console.log(usage);
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
    const report = formatWarnings(collectWarnings(repository, from, values.to ?? "HEAD", loadConfig(repository.root).ignore));
    if (report) console.warn(report);
  }
} else if (command === "hook" && rest[0] === "install") {
  const result = installHook(process.cwd());
  if (result.status === "installed") console.log(`Installed the post-commit hook at ${result.path}`);
  if (result.status === "already-installed") console.log(`The post-commit hook at ${result.path} already runs akashiq`);
  if (result.status === "exists") fail(`A post-commit hook already exists at ${result.path}. Add this line to it:\n  ${hookCommand}`);
} else {
  fail(usage);
}
