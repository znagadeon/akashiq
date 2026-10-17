# AGENTS.md

Akashiq records why code exists as typed decisions and links each decision to the tests that guard it. This repository is developed with Akashiq itself.

## Local instructions

If `AGENTS.local.md` exists, read it and follow it too. It holds the current developer's personal instructions and is not committed. Where it conflicts with this file, it wins only for how you talk to that developer, never for what goes into the repository.

@AGENTS.local.md

## Language

Everything in the repository is written in English: source code, comments, tests, decisions (`decision` and `reason`), package metadata, and this file. Commit messages are in English too.

## Imports

Write relative imports with the `.ts` extension (`./types.ts`). The compiler rewrites them to `.js` on build, and Node runs the sources directly.

## Decisions and tests

Follow the Akashiq skill for recording decisions, guarding them with tests, checking for conflicts before changing a policy, answering behavior questions with tests, and showing decisions to the user. Its source is `packages/akashiq/skills/akashiq/SKILL.md`; `.claude/skills/akashiq` and `.agents/skills/akashiq` link to it, so editing the source updates what agents load here. Read it before working on decisions or tests if your agent hasn't loaded it.

The skill is also the guide Akashiq ships to its users, so keep it about using Akashiq in any project. Rules that apply only to this repository belong in this file.

## Verification

There is no commit hook yet. After changes, run:

```bash
pnpm check   # type check; type-only tests are guarded here
pnpm test
pnpm lint
```
