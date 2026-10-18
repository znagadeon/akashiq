// Reads akashiq.config.json at the project root. JSON, so it is read without running anything.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parserDecisions } from "./parser.decision.ts";

export const configFile = "akashiq.config.json";

export interface Config {
  /** Glob patterns, relative to the project root, of paths to leave out of scans, on top of node_modules, dist, and .git. */
  ignore: string[];
  /** Glob patterns, relative to the project root, of decision files. */
  patterns: string[];
}

export const defaultConfig: Config = { ignore: [], patterns: parserDecisions.decisionFilePatterns.value };

/** The project's config, or the defaults when there is no config file. Throws on a malformed file rather than guessing. */
export function loadConfig(root: string): Config {
  const path = join(root, configFile);
  if (!existsSync(path)) return defaultConfig;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${configFile} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error(`${configFile} must contain an object`);
  const { ignore = defaultConfig.ignore, patterns = defaultConfig.patterns, ...unknown } = parsed as Record<string, unknown>;
  const keys = Object.keys(unknown);
  if (keys.length > 0) throw new Error(`${configFile} has unknown settings: ${keys.join(", ")}`);
  if (!Array.isArray(ignore) || !ignore.every((pattern) => typeof pattern === "string")) {
    throw new Error(`${configFile}: "ignore" must be an array of glob patterns`);
  }
  if (!Array.isArray(patterns) || patterns.length === 0 || !patterns.every((glob) => typeof glob === "string")) {
    throw new Error(`${configFile}: "patterns" must be a non-empty array of glob patterns`);
  }
  return { ignore, patterns };
}
