/**
 * Shopify webhook helpers: signature check and order parsing. Pure functions,
 * no network or database, so they're unit-tested in shopify.test.ts.
 *
 * The mount is one product with two variant options, spelled exactly:
 *   Pack:     1 | 2 | 3 | 4
 *   Delivery: Ship to me | School box
 * The host code arrives as the cart attribute "host" (order.note_attributes),
 * set by the theme's splashy-host snippet. The checkbox arrives as a line item
 * property.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Delivery } from "./rules";

export const HOST_ATTRIBUTE = "host";
export const SHIP_ALONE_PROPERTY = "Ship mine alone if my box isn't full in 3 days";
const DELIVERY_VALUES: Record<string, Delivery> = { "School box": "box", "Ship to me": "alone" };
const HOST_CODE = /^[A-Z0-9-]{2,32}$/;

/**
 * True when `hmacHeader` (X-Shopify-Hmac-Sha256) is the base64 HMAC-SHA256 of the
 * exact raw request body with the app's secret. Constant-time comparison.
 */
export function verifyShopifyHmac(rawBody: string, hmacHeader: string | null, secret: string): boolean {
  if (!hmacHeader || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  let given: Buffer;
  try {
    given = Buffer.from(hmacHeader, "base64");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// The parts of Shopify's order payload we read. Everything optional: Shopify
// omits fields, and protected customer data can be stripped.
interface NameValue {
  name?: string;
  value?: unknown;
}
interface ShopifyAddress {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province_code?: string | null;
  zip?: string | null;
  country_code?: string | null;
  phone?: string | null;
}
export interface ShopifyOrder {
  id?: number | string;
  email?: string | null;
  contact_email?: string | null;
  current_subtotal_price?: string | null;
  subtotal_price?: string | null;
  note_attributes?: NameValue[] | null;
  customer?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
  shipping_address?: ShopifyAddress | null;
  line_items?: {
    variant_title?: string | null;
    quantity?: number;
    properties?: NameValue[] | null;
  }[];
}

export interface ParsedOrder {
  shopifyOrderId: string;
  units: number;
  delivery: Delivery;
  hostCode: string | null;
  shipAloneIfNotFull: boolean;
  paidCents: number;
  buyerName: string;
  buyerEmail: string;
  shipTo: ShopifyAddress | null;
  /** Problems worth the owner's attention, e.g. "check_items". */
  flags: string[];
}

/** Reads "2 / School box" (any order of the two option values). */
export function parseVariantTitle(title: string | null | undefined): { units: number; delivery: Delivery } | null {
  if (!title) return null;
  const parts = title.split(" / ").map((p) => p.trim());
  const pack = parts.find((p) => /^[1-4]$/.test(p));
  const delivery = parts.map((p) => DELIVERY_VALUES[p]).find(Boolean);
  if (!pack || !delivery) return null;
  return { units: Number(pack), delivery };
}

/**
 * Turns an order webhook payload into what we store, or null if the order has
 * no mount in it (e.g. only a gift card). One order = one row: if there are
 * several mount lines or a quantity above 1, the first line is used and the
 * order is flagged "check_items".
 */
export function parseOrder(order: ShopifyOrder): ParsedOrder | null {
  const lines = (order.line_items ?? [])
    .map((line) => ({ line, variant: parseVariantTitle(line.variant_title) }))
    .filter((x) => x.variant !== null);
  if (lines.length === 0 || order.id === undefined) return null;

  const flags: string[] = [];
  if (lines.length > 1 || (lines[0].line.quantity ?? 1) > 1) flags.push("check_items");

  const { line, variant } = lines[0];
  const rawHost = String(findValue(order.note_attributes, HOST_ATTRIBUTE) ?? "").trim().toUpperCase();
  const hostCode = HOST_CODE.test(rawHost) ? rawHost : null;
  if (rawHost && !hostCode) flags.push("bad_host_code");

  const ship = order.shipping_address ?? null;
  const name =
    ship?.name ||
    [ship?.first_name, ship?.last_name].filter(Boolean).join(" ") ||
    [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") ||
    "Unknown";

  return {
    shopifyOrderId: String(order.id),
    units: variant!.units,
    delivery: variant!.delivery,
    hostCode,
    shipAloneIfNotFull: String(findValue(line.properties, SHIP_ALONE_PROPERTY) ?? "").toLowerCase() === "yes",
    paidCents: toCents(order.current_subtotal_price ?? order.subtotal_price),
    buyerName: name,
    buyerEmail: order.email || order.contact_email || order.customer?.email || "",
    shipTo: ship,
    flags,
  };
}

function findValue(list: NameValue[] | null | undefined, name: string): unknown {
  return list?.find((x) => x.name === name)?.value;
}

/** "18.90" → 1890. Missing or unreadable → 0. */
export function toCents(price: string | null | undefined): number {
  const n = Number(price);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
