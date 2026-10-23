// A policy judgment that the code alone cannot explain. Decisions live in *.decision.ts files so their reasons don't get lost.

interface DecisionText {
  /** What was decided, in one or two sentences. Tests guard the detailed behavior. */
  decision: string;
  /** Why, as the user stated it. Omitted when the user decided without giving a reason. */
  reason?: string;
  /** An agent made this decision and the user has not confirmed it yet. Remove once the user confirms. */
  unconfirmed?: true;
  /** The code doesn't follow this decision yet. Remove once it does and a test guards it. */
  unimplemented?: true;
  /**
   * Decisions this one relies on. When one of them changes, this decision should be revisited too. If the text mentions another decision's ID, list it here as well.
   * Declared as a function so it can point within the same object or across files that import each other. Annotate the return type: `(): AnyDecision[] => [pricingDecisions.currency]`.
   */
  dependsOn?: () => readonly AnyDecision[];
}

/** A decision. If code reads a value from it, declare it as Decision<ValueType> and put the value in `value`. Changing only `value` changes behavior. */
export type Decision<T = never> = DecisionText & ([T] extends [never] ? { value?: never } : { value: T });

/** Any decision, with or without a value. Use it where a decision is accepted, such as guards or dependsOn. */
export type AnyDecision = Decision | Decision<unknown>;
