import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buyerLinkUrl, signBuyerLink, verifyBuyerLink } from "./buyer-link";

const SECRET = "test-buyer-secret";

describe("buyer links", () => {
  it("signature is HMAC-SHA256 hex of the order id (what Shopify's hmac_sha256 filter makes)", () => {
    expect(signBuyerLink("5550001", SECRET)).toBe(createHmac("sha256", SECRET).update("5550001").digest("hex"));
    expect(signBuyerLink("5550001", SECRET)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("builds the link", () => {
    expect(buyerLinkUrl("5550001", SECRET)).toBe(`https://www.splashycam.shop/o/5550001/${signBuyerLink("5550001", SECRET)}`);
  });

  it("accepts the right signature only", () => {
    const sig = signBuyerLink("5550001", SECRET);
    expect(verifyBuyerLink("5550001", sig, SECRET)).toBe(true);
    expect(verifyBuyerLink("5550002", sig, SECRET)).toBe(false); // other order
    expect(verifyBuyerLink("5550001", sig, "other-secret")).toBe(false);
    expect(verifyBuyerLink("5550001", sig.toUpperCase(), SECRET)).toBe(false);
    expect(verifyBuyerLink("5550001", "abc", SECRET)).toBe(false);
  });

  it("rejects everything without a secret or with a malformed id", () => {
    expect(verifyBuyerLink("5550001", signBuyerLink("5550001", ""), "")).toBe(false);
    expect(verifyBuyerLink("55a0001", signBuyerLink("55a0001", SECRET), SECRET)).toBe(false);
  });
});
