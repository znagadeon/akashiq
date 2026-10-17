#!/usr/bin/env node
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { startDashboard } from "./dashboard/server.ts";

const usage = `Usage: akashiq dashboard [root] [--port <port>]

Commands:
  dashboard   Serve the decision dashboard for the project at root (default: .)`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { port: { type: "string" }, help: { type: "boolean", short: "h" } },
});
const [command, root = "."] = positionals;

if (values.help || command !== "dashboard") {
  console.log(usage);
  process.exit(values.help ? 0 : 1);
}

const port = values.port === undefined ? undefined : Number(values.port);
if (port !== undefined && !(Number.isInteger(port) && port >= 0 && port < 65536)) {
  console.error(`Invalid port: ${values.port}`);
  process.exit(1);
}

const dashboard = await startDashboard(resolve(root), port);
console.log(`akashiq dashboard: ${dashboard.url}`);
