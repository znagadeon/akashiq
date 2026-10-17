import type { AnyDecision } from "./types.js";

/**
 * Marks a test body as guarding this decision. akashiq uses the mark to find, for each decision, the tests that guard it. It only runs the body; the decision is an ID that follows the test even if the test is moved or renamed.
 * When a commit changes this block, ask the user whether the decision still holds.
 */
export function guards<T>(_decision: AnyDecision, body: () => T): T {
  return body();
}
