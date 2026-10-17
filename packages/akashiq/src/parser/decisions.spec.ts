import { guards } from "@akashiq/core";
import { describe, expect, it } from "vitest";
import { parserDecisions } from "../parser.decision.ts";
import { parseDecisions } from "./decisions.ts";

const lines = (...source: string[]) => source.join("\n");

describe("parseDecisions", () => {
  it("collects each decision under an exported object with its ID and line", () => {
    const source = lines(
      "export const fooDecisions = {",
      '  freeShipping: { decision: "Ship free above a threshold", value: 2, reason: "Customers asked" } satisfies Decision<number>,',
      "  policy: {",
      '    decision: "Decided without a reason",',
      "  } satisfies Decision,",
      "};",
    );
    expect(parseDecisions("foo.decision.ts", source)).toEqual([
      {
        id: "fooDecisions.freeShipping",
        file: "foo.decision.ts",
        line: 2,
        decision: "Ship free above a threshold",
        reason: "Customers asked",
        value: "2",
        dependsOn: [],
      },
      { id: "fooDecisions.policy", file: "foo.decision.ts", line: 3, decision: "Decided without a reason", dependsOn: [] },
    ]);
  });

  it("uses the export name as the ID when the exported object is itself a decision", () => {
    const source = 'export const names = {\n  decision: "Names", value: ["a"],\n};';
    expect(parseDecisions("names.decision.ts", source)).toEqual([expect.objectContaining({ id: "names", line: 1 })]);
  });

  it("skips objects that are not exported", () => {
    expect(parseDecisions("a.decision.ts", 'const hiddenDecisions = { a: { decision: "Hidden" } };')).toEqual([]);
  });

  it("marks decisions the user has not confirmed", () => {
    const source = 'export const fooDecisions = {\n  a: { decision: "A", unconfirmed: true },\n  b: { decision: "B" },\n};';
    const [a, b] = parseDecisions("foo.decision.ts", source);
    expect(a?.unconfirmed).toBe(true);
    expect(b?.unconfirmed).toBeUndefined();
  });

  it("reads the IDs a decision depends on", () => {
    const source = lines(
      "export const fooDecisions = {",
      '  a: { decision: "A", dependsOn: (): AnyDecision[] => [barDecisions.b, fooDecisions.c] },',
      "};",
    );
    expect(parseDecisions("foo.decision.ts", source)[0]?.dependsOn).toEqual(["barDecisions.b", "fooDecisions.c"]);
  });

  it("shows a multi-line value without the indentation it had in the file", () => {
    const source = lines(
      "export const fooDecisions = {",
      "  a: {",
      '    decision: "A",',
      "    value: {",
      "      weak: 1 / 8,",
      "    } as Record<string, number>,",
      "  } satisfies Decision<Record<string, number>>,",
      "};",
    );
    expect(parseDecisions("foo.decision.ts", source)[0]?.value).toBe("{\n  weak: 1 / 8,\n}");
  });

  it("flags values that refer to other code and accepts values readable from their own text", () => {
    guards(parserDecisions.literalValue, () => {
      const values = {
        number: "-1",
        arithmetic: "1 / 8",
        string: '"USD"',
        nested: '{ currencies: ["USD", "EUR"], limit: 50, 2: true }',
        cast: "{ a: [1] } as Record<string, number[]>",
        constant: "MAX_ITEMS",
        member: "Currency.Usd",
        spread: "{ ...defaults, x: 1 }",
        arraySpread: "[...base, 1]",
        call: "compute()",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: the source text of a template literal, not a template
        template: "`${prefix}-a`",
        shorthand: "{ limit }",
      };
      const source = `export const fooDecisions = {\n${Object.entries(values)
        .map(([key, value]) => `  ${key}: { decision: "${key}", value: ${value} },`)
        .join("\n")}\n};`;
      const decisions = parseDecisions("foo.decision.ts", source);
      expect(decisions.map((decision) => decision.id)).toEqual(Object.keys(values).map((key) => `fooDecisions.${key}`));
      expect(decisions.every((decision) => decision.value !== undefined)).toBe(true);
      expect(decisions.filter((decision) => decision.nonLiteralValue).map((decision) => decision.decision)).toEqual([
        "constant",
        "member",
        "spread",
        "arraySpread",
        "call",
        "template",
        "shorthand",
      ]);
      expect(decisions.find((decision) => decision.decision === "cast")?.value).toBe("{ a: [1] }");
    });
  });
});
