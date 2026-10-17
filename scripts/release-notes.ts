// Prints the GitHub release notes for a package tag: the subjects of the commits that touched the package since its previous tag.
// GitHub's generated notes list merged pull requests, and this repository is worked on without them.
// Usage: node scripts/release-notes.ts <tag> <package directory>
import { execFileSync } from "node:child_process";

export interface Commit {
  hash: string;
  subject: string;
}

export interface Release {
  /** Package name, such as akashiq or @akashiq/core. */
  name: string;
  version: string;
  /** The package's previous tag, if it has one. */
  previous?: string;
  /** Commits that touched the package since the previous tag, newest first. */
  commits: Commit[];
  /** owner/name on GitHub. */
  repository: string;
}

export function releaseNotes({ name, version, previous, commits, repository }: Release): string {
  const tag = `${name}@${version}`;
  const lines = commits.length > 0 ? commits.map((commit) => `- ${commit.subject} (${commit.hash})`) : ["- No changes to this package"];
  const links = [`[npm](https://www.npmjs.com/package/${name}/v/${version})`];
  if (previous) {
    const compare = `${encodeURIComponent(previous)}...${encodeURIComponent(tag)}`;
    links.push(`[Compare with ${previous}](https://github.com/${repository}/compare/${compare})`);
  }
  return [previous ? `Changes since ${previous}:` : "Changes:", "", ...lines, "", links.join(" · "), ""].join("\n");
}

/** The latest tag of the same package that the tag's commit contains, other than the tag itself. */
export function previousTag(tags: string[], tag: string): string | undefined {
  return tags.find((candidate) => candidate !== tag);
}

if (import.meta.main) {
  const [tag, directory] = process.argv.slice(2);
  if (!tag || !directory) throw new Error("Usage: node scripts/release-notes.ts <tag> <package directory>");
  const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });
  const at = tag.lastIndexOf("@");
  const name = tag.slice(0, at);
  const tags = git("tag", "--list", `${name}@*`, "--merged", tag, "--sort=-v:refname").split("\n").filter(Boolean);
  const previous = previousTag(tags, tag);
  const range = previous ? `${previous}..${tag}` : tag;
  const commits = git("log", "--no-merges", "--format=%h%x09%s", range, "--", directory)
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash = "", ...subject] = line.split("\t");
      return { hash, subject: subject.join("\t") };
    });
  const repository = process.env.GITHUB_REPOSITORY ?? "znagadeon/akashiq";
  process.stdout.write(releaseNotes({ name, version: tag.slice(at + 1), previous, commits, repository }));
}
