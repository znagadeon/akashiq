// Serves the dashboard's static files and the project scan, and tells open dashboards when decision or test files change.
// Scans on every /data.json request, so a reload always shows the files as they are now.
import { type FSWatcher, readFileSync, watch } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { basename } from "node:path";
import { scanProject } from "../parser/project.ts";
import { dashboardData } from "./data.ts";

const assets: Record<string, { file: string; type: string }> = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
  "/style.css": { file: "style.css", type: "text/css; charset=utf-8" },
};

/** Files whose change can change what the dashboard shows. Same suffixes scanProject reads. */
const watched = /\.decision\.ts$|\.(spec|test)\.(ts|tsx|mts|cts)$/;
const ignored = /(^|[\\/])(node_modules|dist|\.git)([\\/]|$)/;

export interface Dashboard {
  url: string;
  close(): Promise<void>;
}

/** Starts the dashboard for the project at root. Listens on localhost only. Port 0 picks a free port. */
export async function startDashboard(root: string, port = 7357): Promise<Dashboard> {
  const clients = new Set<ServerResponse>();
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    if (path === "/data.json") {
      try {
        const data = dashboardData(basename(root), scanProject(root));
        response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" }).end(JSON.stringify(data));
      } catch (error) {
        response
          .writeHead(500, { "Content-Type": "text/plain; charset=utf-8" })
          .end(error instanceof Error ? (error.stack ?? error.message) : String(error));
      }
      return;
    }
    if (path === "/events") {
      response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      response.write(": connected\n\n");
      clients.add(response);
      request.on("close", () => clients.delete(response));
      return;
    }
    const asset = assets[path];
    if (!asset) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "Content-Type": asset.type }).end(readFileSync(new URL(`./ui/${asset.file}`, import.meta.url)));
  });

  // Saving a file often fires several events at once, so wait for them to settle before telling the dashboards.
  let timer: NodeJS.Timeout | undefined;
  const watcher: FSWatcher = watch(root, { recursive: true }, (_event, file) => {
    if (!file || ignored.test(file) || !watched.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      for (const client of clients) client.write("event: change\ndata: {}\n\n");
    }, 100);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () => {
      clearTimeout(timer);
      watcher.close();
      for (const client of clients) client.end();
      server.closeAllConnections();
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
