import { guards } from "@akashiq/core";
import { describe, expect, it } from "vitest";
import { shippingDecisions } from "./shipping.decision.ts";
import { shipsFree } from "./shipping.ts";

const threshold = shippingDecisions.freeShippingThreshold.value;
const order = (subtotal: number, { discount = 0, giftCards = 0 } = {}) => ({ subtotal, discount, giftCards });

describe("free shipping", () => {
  it("ships free from exactly the threshold", () => {
    guards(shippingDecisions.freeShippingThreshold, () => {
      expect(shipsFree(order(threshold))).toBe(true);
      expect(shipsFree(order(threshold - 0.01))).toBe(false);
    });
  });

  it("charges shipping when a coupon brings the total below the threshold", () => {
    guards(shippingDecisions.thresholdAfterDiscount, () => {
      const discounted = order(threshold + 5, { discount: 10 });
      // Before the coupon, this order would ship free.
      expect(discounted.subtotal).toBeGreaterThanOrEqual(threshold);
      expect(shipsFree(discounted)).toBe(false);
    });
  });

  it("charges shipping when only gift cards bring the order up to the threshold", () => {
    guards(shippingDecisions.giftCardsExcluded, () => {
      const withGiftCard = order(threshold + 5, { giftCards: 25 });
      // Counting the gift card, this order would ship free.
      expect(withGiftCard.subtotal).toBeGreaterThanOrEqual(threshold);
      expect(shipsFree(withGiftCard)).toBe(false);
    });
  });
});
