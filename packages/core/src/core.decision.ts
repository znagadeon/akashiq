import type { Decision } from "./types.ts";

export const coreDecisions = {
  separateAnyDecision: {
    decision: "Keep Decision<T>, for declaring a decision, separate from AnyDecision, for accepting any decision",
    reason: "Reading a value should not need a `!` every time",
  } satisfies Decision,
};
