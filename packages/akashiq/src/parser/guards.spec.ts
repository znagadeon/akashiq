import { describe, expect, it } from "vitest";
import { parseGuards } from "./guards.js";

describe("parseGuards", () => {
  it("finds the describe path and the line of the test around guards", () => {
    const source = [
      'describe("checkout", () => {',
      '  it("ships free above the threshold", () => {',
      "    guards(cartDecisions.freeShipping, () => {",
      "      expect(1).toBe(1);",
      "    });",
      "  });",
      "});",
    ].join("\n");
    expect(parseGuards("a.spec.ts", source)).toEqual([
      { decision: "cartDecisions.freeShipping", file: "a.spec.ts", line: 2, name: "checkout › ships free above the threshold" },
    ]);
  });

  it("finds guards inside it.each as that test", () => {
    const source = 'it.each([1])("case %i", () => guards(fooDecisions.a, () => {}));';
    expect(parseGuards("b.spec.ts", source)).toEqual([{ decision: "fooDecisions.a", file: "b.spec.ts", line: 1, name: "case %i" }]);
  });
});
