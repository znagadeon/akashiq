import { describe, expect, it } from "vitest";
import { guards } from "./guards.ts";

describe("guards", () => {
  it("runs the body and returns its result", () => {
    expect(guards({ decision: "any decision" }, () => 42)).toBe(42);
  });
});
