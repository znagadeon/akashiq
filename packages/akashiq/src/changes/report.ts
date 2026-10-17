// Turns the changes between two revisions into warnings about decisions, and prints them. Reads through a Repository, so it can run without git.
import { type DecisionEntry, parseDecisions } from "../parser/decisions.ts";
import { isDecisionFile, isScanned } from "../parser/project.ts";
import { referrersOf } from "../parser/references.ts";
import { changedDecisions, type DecisionChange, type TextChange } from "./decisions.ts";
import { parseDiff } from "./diff.ts";
import { assertionChange, touchedRanges } from "./guarded.ts";

export interface Repository {
  /** `git diff --unified=0` output between two revisions, for TypeScript files. */
  diff(from: string, to: string): string;
  /** A file's content at a revision, or undefined if it doesn't exist there. */
  show(revision: string, path: string): string | undefined;
  /** Every tracked file at a revision. */
  files(revision: string): string[];
}

export interface GuardChange {
  file: string;
  line: number;
  /** Set when the change was to a helper the test uses. */
  helper?: string;
  /** expect(…) calls in the tests guarding the decision in this file, before and after. */
  expects: { from: number; to: number };
}

export interface DecisionWarning {
  id: string;
  /** The decision as it is after the change, or before it if the change removed it. */
  entry?: DecisionEntry;
  added: boolean;
  removed: boolean;
  /** Changes to tests that guard the decision. */
  guards: GuardChange[];
  text: TextChange[];
  /** Reported only when other decisions depend on this one. */
  valueChanged: boolean;
  /** Decisions that list this one in dependsOn, so they may no longer hold. */
  referrers: DecisionEntry[];
}

const isTypeScript = (path: string | undefined) => path !== undefined && /\.(ts|tsx|mts|cts)$/.test(path) && isScanned(path);

/** Warnings for decisions a change between two revisions may have affected, in the order they come up. */
export function collectWarnings(repository: Repository, from: string, to: string): DecisionWarning[] {
  const guards = new Map<string, Map<string, GuardChange>>();
  const changes = new Map<string, DecisionChange>();

  for (const file of parseDiff(repository.diff(from, to))) {
    if (!isTypeScript(file.oldPath) && !isTypeScript(file.newPath)) continue;
    const before = file.oldPath ? repository.show(from, file.oldPath) : undefined;
    const after = file.newPath ? repository.show(to, file.newPath) : undefined;

    const expects = assertionChange(before ?? "", after ?? "");
    const record = (path: string, source: string | undefined, hunks: typeof file.oldHunks) => {
      if (source === undefined) return;
      for (const range of touchedRanges(source, hunks)) {
        const byPlace = guards.get(range.decision) ?? new Map<string, GuardChange>();
        guards.set(range.decision, byPlace);
        // One line per decision, file, and helper. When both sides match, the side after the change wins, since that's what the user sees now.
        byPlace.set(`${path} ${range.helper ?? ""}`, {
          file: path,
          line: range.start,
          ...(range.helper ? { helper: range.helper } : {}),
          expects: expects.get(range.decision) ?? { from: 0, to: 0 },
        });
      }
    };
    if (file.oldPath) record(file.oldPath, before, file.oldHunks);
    if (file.newPath) record(file.newPath, after, file.newHunks);

    if (isDecisionFile(file.oldPath ?? "") || isDecisionFile(file.newPath ?? "")) {
      for (const change of changedDecisions(file.newPath ?? file.oldPath ?? "", before, after)) changes.set(change.id, change);
    }
  }

  const current = repository
    .files(to)
    .filter(isDecisionFile)
    .flatMap((path) => parseDecisions(path, repository.show(to, path) ?? ""));
  const byId = new Map(current.map((entry) => [entry.id, entry]));
  const referrers = referrersOf(current);

  const warnings: DecisionWarning[] = [];
  for (const id of new Set([...guards.keys(), ...changes.keys()])) {
    const change = changes.get(id);
    const dependents = (referrers.get(id) ?? []).flatMap((referrer) => byId.get(referrer) ?? []);
    const valueChanged = (change?.valueChanged ?? false) && dependents.length > 0;
    const text = change?.text ?? [];
    const added = change !== undefined && change.before === undefined;
    const removed = change !== undefined && change.after === undefined;
    if (!guards.has(id) && text.length === 0 && !valueChanged && !added && !removed) continue;
    warnings.push({
      id,
      entry: byId.get(id) ?? change?.before,
      added,
      removed,
      guards: [...(guards.get(id)?.values() ?? [])],
      text,
      valueChanged,
      referrers: dependents,
    });
  }
  return warnings;
}

/** Prints warnings with each decision's own text and reason, so nobody has to open a file to see what to recheck. */
export function formatWarnings(warnings: DecisionWarning[]): string {
  if (warnings.length === 0) return "";
  const lines: string[] = [];
  for (const warning of warnings) {
    const { entry } = warning;
    lines.push(`⚠ ${warning.id}${entry ? ` (${entry.file}:${entry.line})` : ""}`);
    if (entry?.decision !== undefined) lines.push(`    ${entry.decision}`);
    if (entry?.reason !== undefined) lines.push(`    Why: ${entry.reason}`);
    if (entry?.unconfirmed) lines.push("    Unconfirmed");
    if (warning.added) lines.push("  - New decision");
    if (warning.removed) lines.push("  - Removed");
    for (const guard of warning.guards) {
      const { from, to } = guard.expects;
      const where = `${guard.file}:${guard.line}${guard.helper ? `, helper ${guard.helper}` : ""}`;
      lines.push(`  - A test guarding it changed: ${where}, expect ${from} → ${to}${to < from ? " (fewer)" : ""}`);
    }
    if (!warning.added && !warning.removed) {
      for (const change of warning.text) {
        const length = (text: string | undefined) => (text === undefined ? "none" : `${text.length} chars`);
        lines.push(`  - Its ${change.field} changed: ${length(change.before)} → ${length(change.after)}`);
        if (change.removed) lines.push(`      removed: ${change.removed}`);
        if (change.added) lines.push(`      added: ${change.added}`);
      }
    }
    if (warning.valueChanged) lines.push("  - Its value changed");
    for (const referrer of warning.referrers) {
      lines.push(`  - Depended on by ${referrer.id} (${referrer.file}:${referrer.line}): ${referrer.decision ?? ""}`);
    }
  }
  lines.push("", "Check with the person who owns these decisions that they still hold.");
  return lines.join("\n");
}
