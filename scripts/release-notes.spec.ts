import { guards } from "@akashiq/core";
import { describe, expect, it } from "vitest";
import { packageDecisions } from "../packages/akashiq/src/package.decision.ts";
import { isVersionBumpOnly, previousTag, releaseNotes } from "./release-notes.ts";

describe("release notes", () => {
  it("list the commits that touched the package since its previous tag, with links to npm and the comparison", () => {
    guards(packageDecisions.releaseNotes, () => {
      const notes = releaseNotes({
        name: "@akashiq/core",
        version: "0.2.0",
        previous: "@akashiq/core@0.1.0",
        commits: [
          { hash: "b2", subject: "Add a second thing" },
          { hash: "a1", subject: "Add a thing" },
        ],
        repository: "owner/akashiq",
      });
      expect(notes).toBe(
        [
          "Changes since @akashiq/core@0.1.0:",
          "",
          "- Add a second thing (b2)",
          "- Add a thing (a1)",
          "",
          "[npm](https://www.npmjs.com/package/@akashiq/core/v/0.2.0) · [Compare with @akashiq/core@0.1.0](https://github.com/owner/akashiq/compare/%40akashiq%2Fcore%400.1.0...%40akashiq%2Fcore%400.2.0)",
          "",
        ].join("\n"),
      );
    });
  });

  it("leave out the comparison for a package's first release", () => {
    const notes = releaseNotes({ name: "akashiq", version: "0.1.0", commits: [], repository: "owner/akashiq" });
    expect(notes).toContain("- No changes to this package");
    expect(notes).not.toContain("Compare");
  });

  it("leave out commits that only change the package version", () => {
    guards(packageDecisions.releaseNotes, () => {
      const diff = (file: string, ...lines: string[]) =>
        [`diff --git a/${file} b/${file}`, "index 1..2 100644", `--- a/${file}`, `+++ b/${file}`, "@@ -3 +3 @@", ...lines].join("\n");
      const bump = diff("packages/akashiq/package.json", '-  "version": "0.1.1",', '+  "version": "0.2.0",');
      expect(isVersionBumpOnly(bump)).toBe(true);
      expect(isVersionBumpOnly(`${bump}\n${diff("packages/akashiq/package.json", '-    "node": ">=22"', '+    "node": ">=22.17"')}`)).toBe(
        false,
      );
      expect(isVersionBumpOnly(`${bump}\n${diff("packages/akashiq/README.md", "-old", "+new")}`)).toBe(false);
      expect(isVersionBumpOnly("")).toBe(false);
    });
  });

  it("take the newest tag of the same package other than the one being released", () => {
    expect(previousTag(["akashiq@0.2.0", "akashiq@0.1.1", "akashiq@0.1.0"], "akashiq@0.2.0")).toBe("akashiq@0.1.1");
    expect(previousTag(["akashiq@0.1.0"], "akashiq@0.1.0")).toBeUndefined();
  });
});
