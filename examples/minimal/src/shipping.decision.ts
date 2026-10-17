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
  giftCardsExcluded: {
    decision: "Gift cards in the order don't count toward the free shipping threshold",
    dependsOn: (): AnyDecision[] => [shippingDecisions.freeShippingThreshold],
    unconfirmed: true,
  } satisfies Decision,
  flatFee: {
    decision: "Orders that don't ship free pay one flat shipping fee",
    value: 5,
    reason: "A flat fee is easier for customers to predict than rates by weight",
  } satisfies Decision<number>,
};
