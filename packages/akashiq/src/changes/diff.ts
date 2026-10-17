// Reads which lines a unified diff changed, per file. Pure; never runs git.

export interface Hunk {
  /** First changed line, 1-based. With count 0, the line after which lines were added or removed. */
  start: number;
  count: number;
}

export interface FileDiff {
  /** Path before the change. Missing for an added file. */
  oldPath?: string;
  /** Path after the change. Missing for a deleted file. */
  newPath?: string;
  oldHunks: Hunk[];
  newHunks: Hunk[];
}

/** Parses `git diff --unified=0` output. Renames keep both paths. */
export function parseDiff(diff: string): FileDiff[] {
  const files: FileDiff[] = [];
  let current: FileDiff | undefined;
  for (const text of diff.split("\n")) {
    if (text.startsWith("diff --git ")) {
      const paths = /^diff --git a\/(.*) b\/(.*)$/.exec(text);
      current = { oldPath: paths?.[1], newPath: paths?.[2], oldHunks: [], newHunks: [] };
      files.push(current);
    } else if (!current) {
    } else if (text.startsWith("new file mode")) {
      current.oldPath = undefined;
    } else if (text.startsWith("deleted file mode")) {
      current.newPath = undefined;
    } else if (text.startsWith("rename from ")) {
      current.oldPath = text.slice("rename from ".length);
    } else if (text.startsWith("rename to ")) {
      current.newPath = text.slice("rename to ".length);
    } else {
      const hunk = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(text);
      if (hunk) {
        current.oldHunks.push({ start: Number(hunk[1]), count: hunk[2] === undefined ? 1 : Number(hunk[2]) });
        current.newHunks.push({ start: Number(hunk[3]), count: hunk[4] === undefined ? 1 : Number(hunk[4]) });
      }
    }
  }
  return files;
}

/** Whether a hunk changed a line in the range. A hunk with count 0 adds or removes lines right after its start line. */
export function touches(range: { start: number; end: number }, hunk: Hunk): boolean {
  if (hunk.count === 0) return range.start <= hunk.start && hunk.start < range.end;
  return hunk.start <= range.end && range.start <= hunk.start + hunk.count - 1;
}
