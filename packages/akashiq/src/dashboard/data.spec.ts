import { describe, expect, it } from "vitest";
import { dashboardData } from "./data.ts";

const decision = (id: string, dependsOn: string[] = []) => ({ id, file: "a.decision.ts", line: 1, decision: id, dependsOn });
const guard = (decision: string, name: string) => ({ decision, file: "a.spec.ts", line: 1, name });

describe("dashboardData", () => {
  it("attaches to each decision the tests that guard it and the decisions that rely on it", () => {
    const data = dashboardData("shop", {
      decisions: [decision("cartDecisions.freeShipping", ["pricingDecisions.currency"]), decision("pricingDecisions.currency")],
      guards: [guard("pricingDecisions.currency", "charges in USD"), guard("cartDecisions.renamed", "old test")],
      unknownGuards: [guard("cartDecisions.renamed", "old test")],
    });
    expect(data.project).toBe("shop");
    expect(data.decisions.map(({ id, tests, referrers }) => ({ id, tests: tests.map((test) => test.name), referrers }))).toEqual([
      { id: "cartDecisions.freeShipping", tests: [], referrers: [] },
      { id: "pricingDecisions.currency", tests: ["charges in USD"], referrers: ["cartDecisions.freeShipping"] },
    ]);
    expect(data.unknownGuards.map((test) => test.decision)).toEqual(["cartDecisions.renamed"]);
  });
});
