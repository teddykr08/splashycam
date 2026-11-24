/**
 * The buy flow on "/": which delivery choices a visitor gets, and the Shopify
 * cart permalink that sends them to checkout. Pure functions (env passed in),
 * tested in store.test.ts. The site is the storefront; Shopify is checkout only.
 *
 * Env vars (server only):
 *   STORE_OPEN=true                   shows the buy flow (anything else: reservations)
 *   SHOPIFY_VARIANT_SCHOOL_BOX=<id>   numeric variant id of "School box"
 *   SHOPIFY_VARIANT_SHIP_TO_ME=<id>   numeric variant id of "Ship to me"
 *   SHOPIFY_STORE_DOMAIN=<domain>     optional, default splashy-cam.myshopify.com
 */
import type { Delivery } from "./rules";
import { HOST_ATTRIBUTE } from "./variants";

export const MAX_QUANTITY = 10;
export const DEFAULT_STORE_DOMAIN = "splashy-cam.myshopify.com";

export interface HostForLink {
  code: string;
  school: string | null;
  boxes_enabled: boolean;
}

/**
 * School box only through a host link, and only if that host hands out boxes.
 * Everyone else gets Ship to me.
 */
export function deliveryOptions(host: Pick<HostForLink, "boxes_enabled"> | null): Delivery[] {
  return host?.boxes_enabled ? ["box", "alone"] : ["alone"];
}

/** A whole number from 1 to MAX_QUANTITY, or null. */
export function parseQuantity(raw: unknown): number | null {
  const s = String(raw ?? "").trim();
  if (!/^\d{1,3}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && n <= MAX_QUANTITY ? n : null;
}

export interface StoreConfig {
  domain: string;
  variants: Record<Delivery, string>;
}

/**
 * The store config when the buy flow should show, else null: STORE_OPEN isn't
 * "true", or a variant id is missing (logged so it's obvious why it's hidden).
 */
export function readStoreConfig(env: Record<string, string | undefined>): StoreConfig | null {
  if (env.STORE_OPEN?.trim().toLowerCase() !== "true") return null;
  const box = env.SHOPIFY_VARIANT_SCHOOL_BOX?.trim() ?? "";
  const alone = env.SHOPIFY_VARIANT_SHIP_TO_ME?.trim() ?? "";
  if (!/^\d+$/.test(box) || !/^\d+$/.test(alone)) {
    console.error("[store] STORE_OPEN is on but SHOPIFY_VARIANT_SCHOOL_BOX / SHOPIFY_VARIANT_SHIP_TO_ME aren't numeric ids");
    return null;
  }
  const domain = env.SHOPIFY_STORE_DOMAIN?.trim() || DEFAULT_STORE_DOMAIN;
  return { domain, variants: { box, alone } };
}

/**
 * https://<domain>/cart/<variantId>:<quantity>?attributes[host]=<CODE>
 * Shopify builds a cart with that line and the "host" cart attribute (which the
 * order webhook reads from note_attributes) and goes straight to checkout.
 */
export function cartPermalink(config: StoreConfig, delivery: Delivery, quantity: number, hostCode: string | null): string {
  const url = new URL(`https://${config.domain}/cart/${config.variants[delivery]}:${quantity}`);
  if (hostCode) url.searchParams.set(`attributes[${HOST_ATTRIBUTE}]`, hostCode);
  return url.toString();
}
