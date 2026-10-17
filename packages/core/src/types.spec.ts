import { describe, expectTypeOf, it } from "vitest";
import { coreDecisions } from "./core.decision.ts";
import { guards } from "./guards.ts";
import type { AnyDecision, Decision } from "./types.ts";

// These check types only, so the type check (pnpm check) is what actually guards them. It fails once an @ts-expect-error no longer meets an error.
describe("Decision", () => {
  it("requires value on a decision with a value and forbids it on a decision without one", () => {
    guards(coreDecisions.separateAnyDecision, () => {
      const withValue = { decision: "has a value", value: 3 } satisfies Decision<number>;
      expectTypeOf(withValue.value).toEqualTypeOf<number>();

      // @ts-expect-error a decision with a value is missing its value
      const missingValue: Decision<number> = { decision: "value is missing" };
      // @ts-expect-error a decision without a value has one
      const unexpectedValue: Decision = { decision: "should have no value", value: 3 };
      void [missingValue, unexpectedValue];
    });
  });

  it("lets AnyDecision accept decisions with and without a value", () => {
    guards(coreDecisions.separateAnyDecision, () => {
      expectTypeOf<Decision>().toExtend<AnyDecision>();
      expectTypeOf<Decision<number>>().toExtend<AnyDecision>();
    });
  });
});
