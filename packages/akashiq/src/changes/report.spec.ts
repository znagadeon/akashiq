import { guards } from "@akashiq/core";
import { afterEach, describe, expect, it } from "vitest";
import { changesDecisions } from "../changes.decision.ts";
import { gitRepository } from "./git.ts";
import { collectWarnings, formatWarnings } from "./report.ts";
import { type TestRepository, testRepository } from "./test-repository.ts";

let repository: TestRepository | undefined;
afterEach(() => {
  repository?.remove();
  repository = undefined;
});

const decisions = (threshold: string, extra = "") => `import type { AnyDecision, Decision } from "@akashiq/core";

export const shippingDecisions = {
  freeShippingThreshold: {
    decision: "Orders at or above the threshold ship free",
    value: ${threshold},
    reason: "Most orders cluster just below $50",
  } satisfies Decision<number>,
  thresholdAfterDiscount: {
    decision: "Compare the total after coupons with the threshold",
    dependsOn: (): AnyDecision[] => [shippingDecisions.freeShippingThreshold],
  } satisfies Decision,${extra}
};
`;

const test = (assertions: string) => `it("ships free from exactly the threshold", () => {
  guards(shippingDecisions.freeShippingThreshold, () => {
${assertions}
  });
});
`;

const twoAssertions = "    expect(shipsFree(threshold)).toBe(true);\n    expect(shipsFree(threshold - 0.01)).toBe(false);";

/** Commits the starting files, then the change, and returns the warnings for the change. */
function warningsFor(change: Record<string, string | null>) {
  repository = testRepository();
  repository.commit({ "src/shipping.decision.ts": decisions("50"), "src/shipping.test.ts": test(twoAssertions) });
  repository.commit(change);
  return collectWarnings(gitRepository(repository.root), "HEAD~1", "HEAD");
}

describe("warnings after a commit", () => {
  it("warns when a commit changes a test that guards a decision, and counts its assertions", () => {
    guards(changesDecisions.warnAfterCommit, () => {
      const [warning, ...others] = warningsFor({ "src/shipping.test.ts": test("    expect(shipsFree(threshold)).toBe(true);") });
      expect(others).toEqual([]);
      expect(warning).toMatchObject({
        id: "shippingDecisions.freeShippingThreshold",
        guards: [{ file: "src/shipping.test.ts", line: 1, expects: { from: 2, to: 1 } }],
        text: [],
      });
    });
  });

  it("warns when a decision's text changes, and lists the decisions that depend on it", () => {
    guards(changesDecisions.warnAfterCommit, () => {
      const changed = decisions("50").replace("just below $50", "just below $50 on weekdays");
      const [warning] = warningsFor({ "src/shipping.decision.ts": changed });
      expect(warning).toMatchObject({
        id: "shippingDecisions.freeShippingThreshold",
        text: [{ field: "reason", removed: "", added: " on weekdays" }],
        referrers: [{ id: "shippingDecisions.thresholdAfterDiscount" }],
      });
    });
  });

  it("warns about a changed value only when other decisions depend on it", () => {
    const withLonely = (value: string) =>
      decisions("50", `\n  flatFee: { decision: "One flat fee", value: ${value} } satisfies Decision<number>,`);
    repository = testRepository();
    repository.commit({ "src/shipping.decision.ts": withLonely("5") });
    repository.commit({ "src/shipping.decision.ts": withLonely("6").replace("value: 50", "value: 40") });
    const warnings = collectWarnings(gitRepository(repository.root), "HEAD~1", "HEAD");
    expect(warnings.map((warning) => [warning.id, warning.valueChanged])).toEqual([["shippingDecisions.freeShippingThreshold", true]]);
  });

  it("stays quiet when a commit touches neither decisions nor the tests that guard them", () => {
    expect(warningsFor({ "src/shipping.ts": "export const shipsFree = () => true;\n" })).toEqual([]);
  });

  it("prints each decision's text and reason with its warning", () => {
    guards(changesDecisions.showDecisionText, () => {
      const warnings = warningsFor({ "src/shipping.test.ts": test("    expect(shipsFree(threshold)).toBe(true);") });
      expect(warnings).toHaveLength(1);
      const report = formatWarnings(warnings);
      expect(report).toContain("⚠ shippingDecisions.freeShippingThreshold (src/shipping.decision.ts:4)");
      expect(report).toContain("    Orders at or above the threshold ship free");
      expect(report).toContain("    Why: Most orders cluster just below $50");
      expect(report).toContain("src/shipping.test.ts:1, expect 2 → 1 (fewer)");
    });
  });
});
