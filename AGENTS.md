# AGENTS.md

akashiq records why code exists as typed decisions and links each decision to the tests that guard it. This repository is developed with akashiq itself.

## Local instructions

If `AGENTS.local.md` exists, read it and follow it too. It holds the current developer's personal instructions and is not committed. Where it conflicts with this file, it wins only for how you talk to that developer, never for what goes into the repository.

@AGENTS.local.md

## Language

Everything in the repository is written in English: source code, comments, tests, decisions (`decision` and `reason`), package metadata, and this file. Commit messages are in English too.

## Imports

Write relative imports with the `.ts` extension (`./types.ts`). The compiler rewrites them to `.js` on build, and Node runs the sources directly.

## Decisions live in `*.decision.ts`

A policy judgment that the code alone cannot explain (a chosen value, a policy, an exception, a design trade-off) is not written straight into code. Record it with its reason in a `*.decision.ts` file next to the code it concerns, and let the code read it.

- Declare each decision as a `Decision`. If code reads a value from it, declare it as `Decision<ValueType>` and put the value in `value`. The type is in `packages/core/src/types.ts`.
- Export decisions as an object named `xxxDecisions`. Its key path, such as `coreDecisions.separateAnyDecision`, is the decision's ID.
- Write `value` as a literal in place. akashiq reads decisions without running them, so a value that references a constant, spreads another object, or calls a function can't be shown or tracked. `as` and `satisfies` are fine.
- One decision holds one thing. If something was decided separately per place or item, make separate decisions.
- `decision` says what was decided in one or two sentences. Tests guard the detailed behavior.
- `reason` says only why. Alternatives considered and history go in the commit message.
- `reason` holds only reasons the user gave. Do not invent reasons. A reason an agent proposed counts as the user's once the user heard and accepted it. If you can't tell whether they accepted it (they picked an option without saying why), leave it out of `reason`. If the user decided without a reason, omit `reason`; don't ask for one or write "not given yet". Don't record who decided or when; that is what blame is for.
- If a decision relies on another, declare it with `dependsOn: (): AnyDecision[] => [xxxDecisions.key]`. If `decision` or `reason` mentions another decision's ID, list it in `dependsOn` too.
- A decision the agent made rather than the user (including going ahead with a recommended option) gets `unconfirmed: true`. Remove it once the user confirms.
- When a decision changes, rewrite `decision` and `reason` as the single current decision. Don't append to the old text.

## Showing decisions to the user

Whenever you point the user to a decision (asking them to confirm it, reporting a guards block a commit touched, listing unconfirmed decisions), show its content inline so they don't have to open files: the `decision` text, the `reason` if any, and, for a guarding test, one line on what the test checks. An ID or file name alone is not enough.

## Answer behavior questions with tests

When the user asks how something currently behaves ("does it work like this?"), don't answer from memory or by reading code alone. Write the claim as a test, run it, and answer from the result.

- If a test already checks that behavior, answer with its name and location.
- Don't write obvious tests: tests that restate a decision value or constant (`expect(decision.value).toBe(0.75)`), behavior an external library already guarantees, or tests that overlap existing ones. If reading a single value answers the question, point to its location without a test.
- Write the test from the question, not from the implementation. Check only the property asked about, and don't pin values unrelated to the question.
- If it passes, keep the test. If it passed from the start, confirm it can actually fail: invert the decision or the code by hand once, see the test fail, and revert. Make sure the change hit code the test actually exercises; if nothing fails, suspect the change before the test.
- If it fails, don't lock it in as a test. Show how it behaves now and ask the user whether that is intended. Keep the test or fix the code after they answer. If the answer is a decision, record it in a `*.decision.ts` file.
- A test that guards a decision first asserts that the situation the decision covers actually happened. Without that assertion, a changed helper or setup can leave the test green in a situation unrelated to the decision.
- Wrap the body of a test that guards a decision in `guards(decision, () => { … })`. When a commit touches such a block, tell the user which decision it guards and ask whether it still holds.

## Verification

There is no commit hook yet. After changes, run:

```bash
pnpm check   # type check; type-only tests are guarded here
pnpm test
pnpm lint
```
