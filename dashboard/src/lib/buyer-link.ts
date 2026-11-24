/**
 * Buyer order links: https://www.splashycam.shop/o/<shopify order id>/<sig>
 * where sig = HMAC-SHA256(BUYER_LINK_SECRET, "<order id>") as lowercase hex.
 *
 * Shopify can build the same link in the order confirmation email with its
 * Liquid filter:  {{ order.id | append: "" | hmac_sha256: "<BUYER_LINK_SECRET>" }}
 * so nothing has to be sent from here. Without the secret, a link can't be
 * guessed or changed to another order.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const BUYER_LINK_BASE = "https://www.splashycam.shop/o";

const ORDER_ID = /^\d{1,20}$/;
const SIG = /^[0-9a-f]{64}$/;

export function signBuyerLink(shopifyOrderId: string, secret: string): string {
  return createHmac("sha256", secret).update(shopifyOrderId, "utf8").digest("hex");
}

export function buyerLinkUrl(shopifyOrderId: string, secret: string): string {
  return `${BUYER_LINK_BASE}/${shopifyOrderId}/${signBuyerLink(shopifyOrderId, secret)}`;
}

/** True only for a well-formed order id with its exact signature. Constant-time. */
export function verifyBuyerLink(shopifyOrderId: string, sig: string, secret: string): boolean {
  if (!secret || !ORDER_ID.test(shopifyOrderId) || !SIG.test(sig)) return false;
  const expected = Buffer.from(signBuyerLink(shopifyOrderId, secret), "hex");
  return timingSafeEqual(expected, Buffer.from(sig, "hex"));
}
