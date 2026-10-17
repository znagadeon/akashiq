import { describe, expect, it } from "vitest";
import { parseDiff, touches } from "./diff.ts";

describe("parseDiff", () => {
  it("reads the changed lines before and after, per file, following renames and deletions", () => {
    const diff = [
      "diff --git a/old.spec.ts b/new.spec.ts",
      "similarity index 90%",
      "rename from old.spec.ts",
      "rename to new.spec.ts",
      "--- a/old.spec.ts",
      "+++ b/new.spec.ts",
      "@@ -6 +6,2 @@ it(",
      "-    expect(result).toBe(1);",
      "+    expect(result).toBe(2);",
      "+    expect(result).not.toBe(1);",
      "diff --git a/gone.spec.ts b/gone.spec.ts",
      "deleted file mode 100644",
      "--- a/gone.spec.ts",
      "+++ /dev/null",
      "@@ -1,3 +0,0 @@",
      "diff --git a/added.decision.ts b/added.decision.ts",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/added.decision.ts",
      "@@ -0,0 +1,2 @@",
    ].join("\n");

    expect(parseDiff(diff)).toEqual([
      { oldPath: "old.spec.ts", newPath: "new.spec.ts", oldHunks: [{ start: 6, count: 1 }], newHunks: [{ start: 6, count: 2 }] },
      { oldPath: "gone.spec.ts", newPath: undefined, oldHunks: [{ start: 1, count: 3 }], newHunks: [{ start: 0, count: 0 }] },
      { oldPath: undefined, newPath: "added.decision.ts", oldHunks: [{ start: 0, count: 0 }], newHunks: [{ start: 1, count: 2 }] },
    ]);
  });

  it("keeps both paths of a rename with no content change", () => {
    const diff = ["diff --git a/a.spec.ts b/b.spec.ts", "similarity index 100%", "rename from a.spec.ts", "rename to b.spec.ts"].join("\n");
    expect(parseDiff(diff)).toEqual([{ oldPath: "a.spec.ts", newPath: "b.spec.ts", oldHunks: [], newHunks: [] }]);
  });
});

describe("touches", () => {
  it.each([
    ["a changed line inside the range", { start: 12, count: 1 }, true],
    ["lines added right after a line inside the range", { start: 12, count: 0 }, true],
    ["lines added right after the range ends", { start: 15, count: 0 }, false],
    ["a change before the range", { start: 5, count: 4 }, false],
  ])("%s", (_, hunk, touched) => {
    expect(touches({ start: 10, end: 15 }, hunk)).toBe(touched);
  });
});
