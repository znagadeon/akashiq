import type { Decision } from "./types.ts";

export const coreDecisions = {
  separateAnyDecision: {
    decision: "Keep Decision<T>, for declaring a decision, separate from AnyDecision, for accepting any decision",
    reason: "Reading a value should not need a `!` every time",
  } satisfies Decision,
  unimplementedFlag: {
    decision:
      "Mark a decision the code doesn't follow yet with `unimplemented: true`, removed once the code follows it and a test guards it",
  } satisfies Decision,
};
