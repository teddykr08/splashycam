import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseOrder, parseVariantTitle, SHIP_ALONE_PROPERTY, toCents, verifyShopifyHmac, type ShopifyOrder } from "./shopify";

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
  it("reads pack and delivery", () => {
    expect(parseVariantTitle("2 / School box")).toEqual({ units: 2, delivery: "box" });
    expect(parseVariantTitle("4 / Ship to me")).toEqual({ units: 4, delivery: "alone" });
    expect(parseVariantTitle("School box / 3")).toEqual({ units: 3, delivery: "box" });
  });

  it("returns null for anything else", () => {
    expect(parseVariantTitle(null)).toBeNull();
    expect(parseVariantTitle("Default Title")).toBeNull();
    expect(parseVariantTitle("5 / School box")).toBeNull();
    expect(parseVariantTitle("1 / Pickup")).toBeNull();
  });
});

describe("parseOrder", () => {
  const base: ShopifyOrder = {
    id: 5550001,
    email: "sam@example.com",
    current_subtotal_price: "18.90",
    note_attributes: [{ name: "host", value: "lincoln-hs" }],
    shipping_address: { name: "Sam Lee", address1: "1 Main St", city: "Austin", province_code: "TX", zip: "78701" },
    line_items: [{ variant_title: "1 / School box", quantity: 1, properties: [] }],
  };

  it("reads a school box order", () => {
    expect(parseOrder(base)).toEqual({
      shopifyOrderId: "5550001",
      units: 1,
      delivery: "box",
      hostCode: "LINCOLN-HS",
      shipAloneIfNotFull: false,
      paidCents: 1890,
      buyerName: "Sam Lee",
      buyerEmail: "sam@example.com",
      shipTo: base.shipping_address,
      flags: [],
    });
  });

  it("reads the ship-alone checkbox", () => {
    const order = { ...base, line_items: [{ variant_title: "1 / School box", properties: [{ name: SHIP_ALONE_PROPERTY, value: "Yes" }] }] };
    expect(parseOrder(order)?.shipAloneIfNotFull).toBe(true);
  });

  it("no host attribute → hostCode null; bad code → flagged", () => {
    expect(parseOrder({ ...base, note_attributes: [] })?.hostCode).toBeNull();
    const bad = parseOrder({ ...base, note_attributes: [{ name: "host", value: "<script>" }] });
    expect(bad?.hostCode).toBeNull();
    expect(bad?.flags).toContain("bad_host_code");
  });

  it("flags several mount lines or quantity above 1", () => {
    expect(parseOrder({ ...base, line_items: [{ variant_title: "1 / Ship to me", quantity: 2 }] })?.flags).toEqual(["check_items"]);
    expect(
      parseOrder({ ...base, line_items: [{ variant_title: "1 / Ship to me" }, { variant_title: "2 / Ship to me" }] })?.flags,
    ).toEqual(["check_items"]);
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
