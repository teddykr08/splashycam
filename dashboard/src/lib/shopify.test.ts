import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseOrder, parseVariantTitle, toCents, verifyShopifyHmac, type ShopifyOrder } from "./shopify";

const SECRET = "test-secret";
const sign = (body: string, secret = SECRET) => createHmac("sha256", secret).update(body, "utf8").digest("base64");

describe("verifyShopifyHmac", () => {
  const body = '{"id":1}';

  it("accepts the right signature", () => {
    expect(verifyShopifyHmac(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a changed body, a wrong secret, or no header", () => {
    expect(verifyShopifyHmac('{"id":2}', sign(body), SECRET)).toBe(false);
    expect(verifyShopifyHmac(body, sign(body, "other"), SECRET)).toBe(false);
    expect(verifyShopifyHmac(body, null, SECRET)).toBe(false);
    expect(verifyShopifyHmac(body, "not base64!!", SECRET)).toBe(false);
  });

  it("rejects everything when the secret isn't set", () => {
    expect(verifyShopifyHmac(body, sign(body, ""), "")).toBe(false);
  });
});

describe("parseVariantTitle", () => {
  it("reads the single Delivery option", () => {
    expect(parseVariantTitle("School box")).toEqual({ pack: 1, delivery: "box", old: false });
    expect(parseVariantTitle("Ship to me")).toEqual({ pack: 1, delivery: "alone", old: false });
  });

  it("still reads old two-option titles during the switchover", () => {
    expect(parseVariantTitle("2 / School box")).toEqual({ pack: 2, delivery: "box", old: true });
    expect(parseVariantTitle("Ship to me / 4")).toEqual({ pack: 4, delivery: "alone", old: true });
  });

  it("returns null for anything else", () => {
    expect(parseVariantTitle(null)).toBeNull();
    expect(parseVariantTitle("Default Title")).toBeNull();
    expect(parseVariantTitle("5 / School box")).toBeNull();
    expect(parseVariantTitle("Pickup")).toBeNull();
  });
});

describe("parseOrder", () => {
  const base: ShopifyOrder = {
    id: 5550001,
    email: "sam@example.com",
    current_subtotal_price: "18.90",
    note_attributes: [{ name: "host", value: "lincoln-hs" }],
    shipping_address: { name: "Sam Lee", address1: "1 Main St", city: "Austin", province_code: "TX", zip: "78701" },
    line_items: [{ variant_title: "School box", quantity: 1, properties: [] }],
  };

  it("reads a school box order", () => {
    expect(parseOrder(base)).toEqual({
      shopifyOrderId: "5550001",
      units: 1,
      delivery: "box",
      hostCode: "LINCOLN-HS",
      paidCents: 1890,
      buyerName: "Sam Lee",
      buyerEmail: "sam@example.com",
      shipTo: base.shipping_address,
      flags: [],
    });
  });


  it("no host attribute → hostCode null; bad code → flagged", () => {
    expect(parseOrder({ ...base, note_attributes: [] })?.hostCode).toBeNull();
    const bad = parseOrder({ ...base, note_attributes: [{ name: "host", value: "<script>" }] });
    expect(bad?.hostCode).toBeNull();
    expect(bad?.flags).toContain("bad_host_code");
  });

  it("quantity is the number of units (no flag)", () => {
    const r = parseOrder({ ...base, line_items: [{ variant_title: "Ship to me", quantity: 3 }] });
    expect(r?.units).toBe(3);
    expect(r?.delivery).toBe("alone");
    expect(r?.flags).toEqual([]);
  });

  it("flags several mount lines", () => {
    expect(
      parseOrder({ ...base, line_items: [{ variant_title: "Ship to me" }, { variant_title: "School box" }] })?.flags,
    ).toEqual(["check_items"]);
  });

  it("old variant: units = pack × quantity, flagged", () => {
    const r = parseOrder({ ...base, line_items: [{ variant_title: "2 / School box", quantity: 2 }] });
    expect(r?.units).toBe(4);
    expect(r?.flags).toEqual(["old_variant"]);
  });

  it("ignores orders with no mount", () => {
    expect(parseOrder({ ...base, line_items: [{ variant_title: "Default Title" }] })).toBeNull();
  });

  it("falls back to customer name when there's no address", () => {
    const order = { ...base, shipping_address: null, customer: { first_name: "Ana", last_name: "Diaz" } };
    expect(parseOrder(order)?.buyerName).toBe("Ana Diaz");
  });
});

describe("toCents", () => {
  it("converts Shopify price strings", () => {
    expect(toCents("60.48")).toBe(6048);
    expect(toCents("48.195")).toBe(4820);
    expect(toCents(null)).toBe(0);
    expect(toCents("abc")).toBe(0);
  });
});
