# @akashiq/core

The `Decision` types and `guards` for [Akashiq](https://github.com/znagadeon/akashiq#readme), a decision tracing tool that remembers why your code is the way it is. No dependencies.

```ts
import type { Decision } from "@akashiq/core";

export const shippingDecisions = {
  freeShippingThreshold: {
    decision: "Orders at or above the threshold ship free",
    value: 50,
    reason: "Most orders cluster just below $50, so the threshold nudges them over",
  } satisfies Decision<number>,
};
```

```ts
import { guards } from "@akashiq/core";

it("ships free from exactly the threshold", () => {
  guards(shippingDecisions.freeShippingThreshold, () => {
    // …
  });
});
```

Install it with [`akashiq`](https://www.npmjs.com/package/akashiq) to see decisions and the tests that guard them in a dashboard.

## License

MIT
