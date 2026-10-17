// Copies the Akashiq skill shipped with this package into a project, so agents working there can load it.
import { cpSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const skillSource = fileURLToPath(new URL("../../skills/akashiq", import.meta.url));

/** Skill directories most agents read. Tools with their own directory, such as .claude/skills, can be given instead. */
export const defaultSkillDirectories = [".agents/skills"];

/**
 * Installs the skill as `<dir>/akashiq` under root for each directory, replacing an earlier install so files removed from the skill don't linger.
 * Returns the installed paths.
 */
export function installSkill(root: string, directories: readonly string[] = defaultSkillDirectories): string[] {
  return directories.map((directory) => {
    const target = resolve(root, directory, "akashiq");
    if (existsSync(target)) rmSync(target, { recursive: true });
    cpSync(skillSource, target, { recursive: true });
    return join(directory, "akashiq");
  });
}
