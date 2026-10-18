import type { Decision } from "@akashiq/core";

export const cliDecisions = {
  help: {
    decision:
      "`akashiq help` and `akashiq --help` print the usage of every command, and `akashiq help <command>` and `akashiq <command> --help` print only that command's",
    reason: "The CLI keeps gaining commands",
  } satisfies Decision,
};
