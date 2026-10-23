import { guards } from "@akashiq/core";
import { describe, expect, it } from "vitest";
import { dashboardDecisions } from "../dashboard.decision.ts";
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

  it("lists the decisions still marked unimplemented that a test already guards", () => {
    guards(dashboardDecisions.warnGuardedUnimplemented, () => {
      const data = dashboardData("shop", {
        decisions: [
          { ...decision("cartDecisions.guarded"), unimplemented: true as const },
          { ...decision("cartDecisions.pending"), unimplemented: true as const },
          decision("cartDecisions.done"),
        ],
        guards: [guard("cartDecisions.guarded", "applies the rule"), guard("cartDecisions.done", "applies the other rule")],
        unknownGuards: [],
      });
      expect(data.decisions.find((entry) => entry.id === "cartDecisions.guarded")?.tests).toHaveLength(1);
      expect(data.guardedUnimplemented).toEqual(["cartDecisions.guarded"]);
    });
  });
});
