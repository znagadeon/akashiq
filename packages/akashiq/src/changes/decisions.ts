// Compares the decisions in a *.decision.ts file before and after a change. Pure; never runs git.
import { type DecisionEntry, parseDecisions } from "../parser/decisions.ts";

export interface TextChange {
  field: "decision" | "reason";
  before?: string;
  after?: string;
  /** The part of the old text that changed, without the shared start and end. */
  removed: string;
  /** The part of the new text that changed, without the shared start and end. */
  added: string;
}

export interface DecisionChange {
  id: string;
  /** The decision before the change. Missing if the change added it. */
  before?: DecisionEntry;
  /** The decision after the change. Missing if the change removed it. */
  after?: DecisionEntry;
  text: TextChange[];
  valueChanged: boolean;
}

/** Decisions whose text or value changed, or that were added or removed. A missing side means the file didn't exist there. */
export function changedDecisions(file: string, before: string | undefined, after: string | undefined): DecisionChange[] {
  const old = new Map((before === undefined ? [] : parseDecisions(file, before)).map((entry) => [entry.id, entry]));
  const next = new Map((after === undefined ? [] : parseDecisions(file, after)).map((entry) => [entry.id, entry]));
  const changes: DecisionChange[] = [];
  for (const id of new Set([...next.keys(), ...old.keys()])) {
    const [was, is] = [old.get(id), next.get(id)];
    const text = (["decision", "reason"] as const).flatMap((field): TextChange[] => {
      if (was?.[field] === is?.[field]) return [];
      return [{ field, before: was?.[field], after: is?.[field], ...textChange(was?.[field] ?? "", is?.[field] ?? "") }];
    });
    const valueChanged = was !== undefined && is !== undefined && was.value !== is.value;
    if (!was || !is || text.length > 0 || valueChanged) changes.push({ id, before: was, after: is, text, valueChanged });
  }
  return changes;
}

/** The changed middle of a text, so a sentence appended to a long reason shows on its own. */
export function textChange(before: string, after: string): { removed: string; added: string } {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
  let end = 0;
  while (end < before.length - start && end < after.length - start && before[before.length - 1 - end] === after[after.length - 1 - end]) {
    end += 1;
  }
  return { removed: before.slice(start, before.length - end), added: after.slice(start, after.length - end) };
}
