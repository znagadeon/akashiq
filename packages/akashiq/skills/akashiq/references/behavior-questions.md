# Answering behavior questions with tests

When the user asks how something currently behaves ("does it work like this?"), don't answer from memory or by reading code alone. Write the claim as a test, run it, and answer from the result.

- If a test already checks that behavior, answer with its name and location.
- Don't write obvious tests: tests that restate a decision value or constant (`expect(decision.value).toBe(0.75)`), behavior an external library already guarantees, or tests that overlap existing ones. If reading a single value answers the question, point to its location without a test.
- Write the test from the question, not from the implementation. Check only the property asked about, and don't pin values unrelated to the question.

## If the test passes

Keep it. If it passed from the start, confirm it can actually fail:

1. Invert the decision or the code by hand once, as if the opposite had been decided.
2. See the test fail.
3. Revert.

Make sure the change hit code the test actually exercises. If nothing fails, suspect the change before the test. If the project has mutation testing, run it on the lines the question is about; a surviving mutant there means the test doesn't guard that behavior.

## If the test fails

Don't lock it in as a test. Show how it behaves now and ask the user whether that is intended. After they answer, keep the test or fix the code. If the answer is a decision, record it in a `*.decision.ts` file and guard the test with it.

## Why

Each question that turns into a test leaves behind a check that keeps answering it. Each answer that turns out to be a policy becomes a decision with its reason. Over time the tests explain what the code does and the decisions explain why.
