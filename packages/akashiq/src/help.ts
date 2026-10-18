// The CLI's usage text, for every command at once or for one.
import { dashboardDecisions } from "./dashboard.decision.ts";
import { defaultSkillDirectories } from "./skill/install.ts";

interface Command {
  /** The name in the command list, with its subcommand. */
  label: string;
  usage: string;
  description: string[];
}

/** Keyed by the first word of the command. */
const commands: Record<string, Command> = {
  dashboard: {
    label: "dashboard",
    usage: "akashiq dashboard [root] [--port <port>]",
    description: [
      "Serve the decision dashboard for the project at root (default: .)",
      `on --port (default: ${dashboardDecisions.defaultPort.value}; 0 picks a free port)`,
    ],
  },
  skill: {
    label: "skill install",
    usage: "akashiq skill install [root] [--dir <dir>]...",
    description: [
      "Copy the Akashiq agent skill into root (default: .) under each --dir",
      `(default: ${defaultSkillDirectories.join(", ")}). Use --dir .claude/skills for Claude Code.`,
    ],
  },
  changes: {
    label: "changes",
    usage: "akashiq changes [--from <rev>] [--to <rev>]",
    description: [
      "Warn about decisions the commits from --from (default: HEAD~1) to --to",
      "(default: HEAD) may have affected. Prints nothing when there are none.",
    ],
  },
  hook: {
    label: "hook install",
    usage: "akashiq hook install",
    description: ["Run `akashiq changes` after every commit through the git post-commit hook."],
  },
  help: {
    label: "help",
    usage: "akashiq help [command]",
    description: ["Print the usage of command, or of every command.", "`akashiq <command> --help` does the same."],
  },
};

/** The usage of the command named by its first word, or of every command when there is none. Undefined for an unknown command. */
export function helpText(command?: string): string | undefined {
  if (command === undefined) {
    const list = Object.values(commands);
    return [
      "Usage:",
      ...list.map(({ usage }) => `  ${usage}`),
      "",
      "Commands:",
      ...list.flatMap(({ label, description }) => description.map((line, i) => `  ${(i === 0 ? label : "").padEnd(16)}${line}`)),
    ].join("\n");
  }
  const found = Object.hasOwn(commands, command) ? commands[command] : undefined;
  return found && [`Usage: ${found.usage}`, "", ...found.description].join("\n");
}
