---
name: akashiq
description: Record policy decisions as typed Decision objects in *.decision.ts files and guard them with tests through guards(). Use when a change sets or alters a value, policy, or exception that the code alone can't explain; before adding or changing such a policy; when the user asks how something currently behaves; and when a commit touches a guards(…) block or a *.decision.ts file.
---

# Akashiq

Akashiq keeps the reasons behind code from getting lost. A policy judgment is recorded as a `Decision` with its reason, code reads its value from there, and tests that prove it wrap their body in `guards(decision, …)`. `akashiq dashboard` shows every decision, why it was made, and which tests guard it.

## What counts as a decision

A judgment the code alone can't explain: a chosen value (a threshold, a limit, a rate), a policy, an exception, a trade-off between alternatives. Don't write it straight into code. Record it in a `*.decision.ts` file next to the code it concerns, and have the code read it.

Not a decision: anything an external spec, library, or obvious correctness already dictates.

## Writing a decision

```ts
import type { AnyDecision, Decision } from "@akashiq/core";

export const shippingDecisions = {
  freeShippingThreshold: {
    decision: "Orders at or above the threshold ship free",
    value: 50,
    reason: "Most orders cluster just below $50, so the threshold nudges them over",
  } satisfies Decision<number>,
  thresholdAfterDiscount: {
    decision: "Compare the order total after coupons, not before, with the free shipping threshold",
    dependsOn: (): AnyDecision[] => [shippingDecisions.freeShippingThreshold],
  } satisfies Decision,
};
```

- Export decisions as an object named `xxxDecisions`. The key path, such as `shippingDecisions.freeShippingThreshold`, is the decision's ID. Akashiq finds `*.decision.ts` files anywhere in the project.
- If code reads a value, declare `Decision<ValueType>` and put it in `value`. Otherwise declare `Decision`, which forbids `value`.
- Write `value` as a literal in place. Akashiq reads decisions without running them, so a value that refers to a constant, spreads another object, or calls a function can't be shown or tracked. `as` and `satisfies` are fine.
- One decision holds one thing. If something was decided separately per place or item, make separate decisions.
- `decision` says what was decided in one or two sentences. Tests guard the detailed behavior.
- `reason` says only why. Alternatives considered and history go in the commit message; `git log` and blame recover them.
- `reason` holds only reasons the user gave. Never invent one. A reason you proposed counts once the user heard and accepted it. If you can't tell whether they accepted it, leave it out. If the user decided without a reason, omit `reason`; don't ask for one or write "not given yet". Don't record who decided or when.
- If a decision relies on another, list it in `dependsOn`. If `decision` or `reason` mentions another decision's ID, list that one too. Annotate the return type as `AnyDecision[]`.
- A decision you made rather than the user, including going ahead with your own recommendation, gets `unconfirmed: true`. Remove it once the user confirms.
- When a decision changes, rewrite `decision` and `reason` as the single current decision. Don't append to the old text.

## Before adding or changing a policy

1. Search the existing decisions for ones the request touches: `*.decision.ts` files, or the dashboard's search.
2. If the request may conflict with a decision, stop and show the user that decision (see below) with the tests that guard it, and ask whether to change it. You may point out a possible conflict; the user decides whether it is one.
3. Also show the decisions that depend on it (those listing it in `dependsOn`); they may no longer hold.
4. Once the user decides, change things in order: the decision, then the tests that guard it, then the implementation.

## Guarding decisions with tests

Wrap the body of a test that proves a decision in `guards`:

```ts
import { guards } from "@akashiq/core";

it("ships free from exactly the threshold", () => {
  guards(shippingDecisions.freeShippingThreshold, () => {
    const threshold = shippingDecisions.freeShippingThreshold.value;
    expect(shipsFree({ subtotal: threshold, discount: 0 })).toBe(true);
    expect(shipsFree({ subtotal: threshold - 0.01, discount: 0 })).toBe(false);
  });
});
```

- First assert that the situation the decision covers actually happened. Without that, a changed helper or setup can leave the test green in a situation unrelated to the decision.
- Test the policy's observable behavior, not implementation details or the value itself.
- When a commit touches a `guards` block, tell the user which decision it guards and ask whether the decision still holds. If the commit removed assertions from the block, say which.

When the user asks how something currently behaves, answer with a test. See [references/behavior-questions.md](references/behavior-questions.md).

## Showing decisions to the user

Whenever you point the user to a decision (asking them to confirm it, reporting a possible conflict, reporting a guards block a commit touched, listing unconfirmed decisions), show its content inline so they don't have to open files:

- the ID,
- the `decision` text,
- the `reason`, or that there is none,
- `unconfirmed` and `dependsOn` if present,
- for each guarding test, one line on what it checks.

An ID or file name alone is not enough.

## Tools

- `npx akashiq dashboard [root]` serves the dashboard on http://127.0.0.1:7357/ and reloads when decision or test files change. It flags guards that point to no decision and values that aren't literals.
