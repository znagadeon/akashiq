import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { guards } from "@akashiq/core";
import { afterEach, describe, expect, it } from "vitest";
import { skillDecisions } from "../skill.decision.ts";
import { installSkill, skillSource } from "./install.ts";

let root: string | undefined;
afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

/** Name and description from SKILL.md frontmatter. */
function frontmatter(path: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(path, "utf8"));
  if (!match?.[1]) throw new Error(`no frontmatter in ${path}`);
  return Object.fromEntries(
    match[1].split("\n").map((line) => [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1).trim()]),
  );
}

describe("akashiq skill", () => {
  it("ships a SKILL.md with the name and description Agent Skills require", () => {
    guards(skillDecisions.shipAsSkill, () => {
      const { name, description } = frontmatter(join(skillSource, "SKILL.md"));
      expect(name).toBe("akashiq");
      expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(description?.length).toBeGreaterThan(0);
      expect(description?.length).toBeLessThanOrEqual(1024);
    });
  });

  it("copies the skill into .agents/skills by default and replaces an earlier copy", () => {
    guards(skillDecisions.installByCopy, () => {
      root = mkdtempSync(join(tmpdir(), "akashiq-"));
      const stale = join(root, ".agents/skills/akashiq/removed.md");
      mkdirSync(join(root, ".agents/skills/akashiq"), { recursive: true });
      writeFileSync(stale, "left over from an older version");

      expect(installSkill(root)).toEqual([join(".agents/skills", "akashiq")]);
      const installed = join(root, ".agents/skills/akashiq");
      expect(readFileSync(join(installed, "SKILL.md"), "utf8")).toBe(readFileSync(join(skillSource, "SKILL.md"), "utf8"));
      expect(existsSync(join(installed, "references/behavior-questions.md"))).toBe(true);
      expect(existsSync(stale)).toBe(false);
    });
  });

  it("installs into the directories given", () => {
    root = mkdtempSync(join(tmpdir(), "akashiq-"));
    installSkill(root, [".claude/skills", ".agents/skills"]);
    expect(existsSync(join(root, ".claude/skills/akashiq/SKILL.md"))).toBe(true);
    expect(existsSync(join(root, ".agents/skills/akashiq/SKILL.md"))).toBe(true);
  });
});
