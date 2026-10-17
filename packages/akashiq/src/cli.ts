#!/usr/bin/env node
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { startDashboard } from "./dashboard/server.ts";
import { dashboardDecisions } from "./dashboard.decision.ts";
import { defaultSkillDirectories, installSkill } from "./skill/install.ts";

const usage = `Usage:
  akashiq dashboard [root] [--port <port>]
  akashiq skill install [root] [--dir <dir>]...

Commands:
  dashboard       Serve the decision dashboard for the project at root (default: .)
                  on --port (default: ${dashboardDecisions.defaultPort.value}; 0 picks a free port)
  skill install   Copy the Akashiq agent skill into root (default: .) under each --dir
                  (default: ${defaultSkillDirectories.join(", ")}). Use --dir .claude/skills for Claude Code.`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: "string" },
    dir: { type: "string", multiple: true },
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
} else {
  fail(usage);
}
