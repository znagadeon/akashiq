import { readFileSync } from "node:fs";
import { guards } from "@akashiq/core";
import { describe, expect, it } from "vitest";
import { packageDecisions } from "./package.decision.ts";

const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

describe("package layout", () => {
  it("keeps @akashiq/core free of dependencies", () => {
    guards(packageDecisions.splitCore, () => {
      const core = JSON.parse(read("packages/core/package.json"));
      expect(core.name).toBe("@akashiq/core");
      expect(core.dependencies ?? {}).toEqual({});
      expect(core.peerDependencies ?? {}).toEqual({});
    });
  });
});
