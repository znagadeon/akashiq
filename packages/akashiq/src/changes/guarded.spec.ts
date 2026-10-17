import { guards } from "@akashiq/core";
import { describe, expect, it } from "vitest";
import { changesDecisions } from "../changes.decision.ts";
import { assertionChange, guardedRanges, touchedRanges } from "./guarded.ts";

const source = `import { guards } from "@akashiq/core";

const order = (subtotal: number) => ({ subtotal, discount: 0 });
const nearThreshold = () => order(49);
const unused = () => order(2);
function withCoupon() {
  return order(60);
}

it("charges shipping just below the threshold", () => {
  guards(shippingDecisions.freeShippingThreshold, () => {
    const result = quote(nearThreshold(), withCoupon());
    expect(result.unused).toBe(1);
  });
});

it("is unrelated to any decision", () => {
  const nearThreshold = () => order(3);
  expect(nearThreshold()).toBe(1);
});

it.each([[1], [2]])("row %i of a table", (count) => {
  guards(shippingDecisions.flatFee, () => {
    expect(count).toBe(1);
  });
});
`;

const decisionsTouchedAt = (line: number) => [
  ...new Set(touchedRanges(source, [{ start: line, count: 1 }]).map((range) => range.decision)),
];

describe("guarded ranges", () => {
  it("cover the whole it around guards and the helpers it uses in the same file, followed transitively", () => {
    guards(changesDecisions.guardHelpers, () => {
      expect(guardedRanges(source).filter((range) => range.decision === "shippingDecisions.freeShippingThreshold")).toEqual([
        { decision: "shippingDecisions.freeShippingThreshold", start: 10, end: 15 },
        { decision: "shippingDecisions.freeShippingThreshold", start: 4, end: 4, helper: "nearThreshold" },
        { decision: "shippingDecisions.freeShippingThreshold", start: 6, end: 8, helper: "withCoupon" },
        { decision: "shippingDecisions.freeShippingThreshold", start: 3, end: 3, helper: "order" },
      ]);
    });
  });

  it.each([
    ["a line inside the guards block", 13, ["shippingDecisions.freeShippingThreshold"]],
    ["the test name", 10, ["shippingDecisions.freeShippingThreshold"]],
    ["a helper the test uses", 4, ["shippingDecisions.freeShippingThreshold"]],
    ["a helper declared with function", 7, ["shippingDecisions.freeShippingThreshold"]],
    ["a helper used by a helper", 3, ["shippingDecisions.freeShippingThreshold"]],
    ["a declaration whose name only appears as a property (result.unused)", 5, []],
    ["a same-named helper inside another test", 18, []],
    ["the table of an it.each", 22, ["shippingDecisions.flatFee"]],
  ])("changing %s", (_, line, decisions) => {
    expect(decisionsTouchedAt(line)).toEqual(decisions);
  });
});

describe("assertionChange", () => {
  const test = (body: string) => `\nit("charges shipping when a coupon brings the total below the threshold", () => {\n${body}\n});\n`;
  const below = "  expect(discounted.subtotal).toBeGreaterThanOrEqual(50);\n  expect(shipsFree(discounted)).toBe(false);";
  const above = "\n  expect(shipsFree(full)).toBe(true);";
  const wrapped = (body: string) => `  guards(shippingDecisions.thresholdAfterDiscount, () => {\n${body}\n  });`;
  const count = (before: string, after: string) => assertionChange(before, after).get("shippingDecisions.thresholdAfterDiscount");

  it("counts the expect calls in the tests guarding a decision, before and after", () => {
    guards(changesDecisions.assertionCount, () => {
      expect(count(test(wrapped(below)), test(wrapped(below + above)))).toEqual({ from: 2, to: 3 });
    });
  });

  it("shows fewer assertions when a test is newly wrapped in guards but loses one", () => {
    guards(changesDecisions.assertionCount, () => {
      expect(count(test(below + above), test(wrapped(below)))).toEqual({ from: 3, to: 2 });
    });
  });

  it("keeps the count when only the test name changes", () => {
    const renamed = test(wrapped(below)).replace("when a coupon brings", "when coupons bring");
    expect(count(test(wrapped(below)), renamed)).toEqual({ from: 2, to: 2 });
  });

  it("ignores expect calls in tests that guard nothing", () => {
    expect(Object.fromEntries(assertionChange(source, source))).toEqual({
      "shippingDecisions.freeShippingThreshold": { from: 1, to: 1 },
      "shippingDecisions.flatFee": { from: 1, to: 1 },
    });
  });
});
