import { describe, expect, it } from "vitest";
import { cartPermalink, deliveryOptions, parseQuantity, readStoreConfig } from "./store";
import { parseHostCode } from "./variants";

const ENV = { STORE_OPEN: "true", SHOPIFY_VARIANT_SCHOOL_BOX: "111", SHOPIFY_VARIANT_SHIP_TO_ME: "222" };

describe("store", () => {
  it("School box only through a host link whose boxes are on", () => {
    expect(deliveryOptions(null)).toEqual(["alone"]);
    expect(deliveryOptions({ boxes_enabled: true })).toEqual(["box", "alone"]);
    expect(deliveryOptions({ boxes_enabled: false })).toEqual(["alone"]);
  });

  it("STORE_OPEN must be exactly on, with both variant ids", () => {
    expect(readStoreConfig({})).toBeNull();
    expect(readStoreConfig({ ...ENV, STORE_OPEN: "false" })).toBeNull();
    expect(readStoreConfig({ ...ENV, STORE_OPEN: "1" })).toBeNull();
    expect(readStoreConfig({ ...ENV, SHOPIFY_VARIANT_SHIP_TO_ME: "" })).toBeNull();
    expect(readStoreConfig({ ...ENV, SHOPIFY_VARIANT_SCHOOL_BOX: "gid://shopify/ProductVariant/1" })).toBeNull();
    expect(readStoreConfig(ENV)).toEqual({ domain: "splashy-cam.myshopify.com", variants: { box: "111", alone: "222" } });
    expect(readStoreConfig({ ...ENV, STORE_OPEN: " TRUE ", SHOPIFY_STORE_DOMAIN: "shop.example.com" })?.domain).toBe("shop.example.com");
  });

  it("cart permalink carries variant, quantity and the host attribute", () => {
    const config = readStoreConfig(ENV)!;
    const box = new URL(cartPermalink(config, "box", 3, "LINCOLN-7KX"));
    expect(box.origin + box.pathname).toBe("https://splashy-cam.myshopify.com/cart/111:3");
    expect(box.searchParams.get("attributes[host]")).toBe("LINCOLN-7KX");
    expect(cartPermalink(config, "alone", 1, null)).toBe("https://splashy-cam.myshopify.com/cart/222:1");
  });

  it("quantity is a whole number from 1 to 10", () => {
    expect(parseQuantity("1")).toBe(1);
    expect(parseQuantity(" 10 ")).toBe(10);
    for (const bad of ["0", "11", "2.5", "-1", "", "abc", null]) expect(parseQuantity(bad)).toBeNull();
  });

  it("host codes from the URL are tidied or rejected", () => {
    expect(parseHostCode(" lincoln-7kx ")).toBe("LINCOLN-7KX");
    expect(parseHostCode("a")).toBeNull();
    expect(parseHostCode("bad code!")).toBeNull();
    expect(parseHostCode(["LINCOLN-7KX"])).toBeNull();
    expect(parseHostCode(undefined)).toBeNull();
  });
});
