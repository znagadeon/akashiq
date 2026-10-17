import { shippingDecisions } from "./shipping.decision.ts";

export interface Order {
  subtotal: number;
  /** Total of the coupons applied to the order. */
  discount: number;
  /** Part of the subtotal spent on gift cards. */
  giftCards: number;
}

export function shipsFree(order: Order): boolean {
  return order.subtotal - order.discount - order.giftCards >= shippingDecisions.freeShippingThreshold.value;
}

export function shippingFee(order: Order): number {
  return shipsFree(order) ? 0 : shippingDecisions.flatFee.value;
}
