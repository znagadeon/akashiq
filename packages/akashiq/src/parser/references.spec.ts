import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scanProject } from "./project.ts";
import { missingDependencies, referencedIds, referrersOf } from "./references.ts";

const decision = (id: string, text: string, dependsOn: string[] = []) => ({ id, decision: text, dependsOn });

describe("references between decisions", () => {
  it("picks decision IDs out of text, punctuation, and parentheses", () => {
    expect(
      referencedIds("The tax (pricingDecisions.taxRate) follows regionDecisions.defaultRegion. See pricingDecisions.taxRate."),
    ).toEqual(["pricingDecisions.taxRate", "regionDecisions.defaultRegion"]);
  });

  it("does not treat bare names or file paths as decision IDs", () => {
    expect(referencedIds("taxRate, docs/pricing-plan.md, and regionNames")).toEqual([]);
  });

  it("lists A among the decisions relying on B when A depends on B", () => {
    const referrers = referrersOf([
      { id: "cartDecisions.minimumOrder", dependsOn: ["pricingDecisions.currency"] },
      { id: "cartDecisions.freeShipping", dependsOn: ["pricingDecisions.currency"] },
    ]);
    expect(referrers.get("pricingDecisions.currency")).toEqual(["cartDecisions.minimumOrder", "cartDecisions.freeShipping"]);
    expect(referrers.has("cartDecisions.minimumOrder")).toBe(false);
  });

  it("reports IDs mentioned in text but missing from dependsOn, ignoring the decision itself", () => {
    const decisions = [
      decision("cartDecisions.freeShipping", "Uses pricingDecisions.currency and pricingDecisions.taxRate", ["pricingDecisions.currency"]),
      decision("regionDecisions.defaultRegion", "regionDecisions.defaultRegion is the first region listed"),
    ];
    expect(missingDependencies(decisions)).toEqual(["cartDecisions.freeShipping → pricingDecisions.taxRate"]);
  });

  it("finds every decision ID mentioned in this repository's decisions in their dependsOn", () => {
    const { decisions } = scanProject(fileURLToPath(new URL("../../../../", import.meta.url)));
    expect(decisions.some((entry) => entry.dependsOn.length > 0)).toBe(true);
    expect(missingDependencies(decisions)).toEqual([]);
  });
});
