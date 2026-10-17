// Relations between decisions. If A lists B in dependsOn, A relies on B, and A should be revisited when B changes.
import type { DecisionEntry } from "./decisions.js";

/** Decision IDs written as `xxxDecisions.key` in text, each once, in order of appearance. */
export function referencedIds(text: string): string[] {
  return [...new Set(text.match(/\b[a-z][A-Za-z0-9]*Decisions\.[A-Za-z_$][A-Za-z0-9_$]*/g) ?? [])];
}

/** For each decision, the decisions that list it in dependsOn. Decisions nothing relies on are left out. */
export function referrersOf(decisions: readonly Pick<DecisionEntry, "id" | "dependsOn">[]): Map<string, string[]> {
  const referrers = new Map<string, string[]>();
  for (const { id, dependsOn } of decisions) {
    for (const target of dependsOn) referrers.set(target, [...(referrers.get(target) ?? []), id]);
  }
  return referrers;
}

/** IDs mentioned in a decision's text but missing from its dependsOn, as "A → B", so the text and dependsOn don't drift apart. */
export function missingDependencies(decisions: readonly Pick<DecisionEntry, "id" | "decision" | "reason" | "dependsOn">[]): string[] {
  return decisions.flatMap(({ id, decision, reason, dependsOn }) =>
    referencedIds(`${decision ?? ""}\n${reason ?? ""}`)
      .filter((target) => target !== id && !dependsOn.includes(target))
      .map((target) => `${id} → ${target}`),
  );
}
