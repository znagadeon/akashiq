# AGENTS.md

Akashiq records why code exists as typed decisions and links each decision to the tests that guard it. This repository is developed with Akashiq itself.

## Local instructions

If `AGENTS.local.md` exists, read it and follow it too. It holds the current developer's personal instructions and is not committed. Where it conflicts with this file, it wins only for how you talk to that developer, never for what goes into the repository.

@AGENTS.local.md

## Language

Everything in the repository is written in English: source code, comments, tests, decisions (`decision` and `reason`), package metadata, and this file. Commit messages are in English too.

The one exception is `README.ko.md`, a Korean translation of `README.md`. `README.md` is the source: when you change it, update `README.ko.md` to match in the same commit.

## Imports

Write relative imports with the `.ts` extension (`./types.ts`). The compiler rewrites them to `.js` on build, and Node runs the sources directly.

## Decisions and tests

Follow the Akashiq skill for recording decisions, guarding them with tests, checking for conflicts before changing a policy, answering behavior questions with tests, and showing decisions to the user. Its source is `packages/akashiq/skills/akashiq/SKILL.md`; `.claude/skills/akashiq` and `.agents/skills/akashiq` link to it, so editing the source updates what agents load here. Read it before working on decisions or tests if your agent hasn't loaded it.

The skill is also the guide Akashiq ships to its users, so keep it about using Akashiq in any project. Rules that apply only to this repository belong in this file.

## Verification

There is no commit hook yet. The CI workflow (`.github/workflows/ci.yml`) runs the same checks on Node.js 22 and 24 for every push to `develop` and `master` and for pull requests. Before committing, run:

```bash
pnpm check   # type check; type-only tests are guarded here
pnpm test
pnpm lint
```

## Releasing

Packages are versioned and released one at a time.

1. Bump the version in the package's `package.json` and commit.
2. Tag that commit on `master` as `<package name>@<version>`, such as `akashiq@0.2.0` or `@akashiq/core@0.1.1`, and push the tag.

The Release workflow (`.github/workflows/release.yml`) finds the package the tag names under `packages/`, checks that its version matches, runs the checks, and publishes that package through trusted publishing. Each package needs a trusted publisher set up on npmjs.com. A new package is published once by hand first (from a `pnpm pack` tarball), since its trusted publisher can only be set up once it exists. Don't publish by hand with `npm publish` from a package directory; it would ship the source entry points.
