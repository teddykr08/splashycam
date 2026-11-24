/**
 * The Shopify product's one option and its variant titles, spelled exactly as in
 * Shopify. Shared by the webhook (reads them) and the buy/reserve forms (shows them).
 * No server-only imports here: client components use it.
 */
import type { Delivery } from "./rules";

export const DELIVERY_OPTION = "Delivery";
/** Cart attribute carrying the host code (order.note_attributes in the webhook). */
export const HOST_ATTRIBUTE = "host";
export const VARIANT_TITLES: Record<Delivery, string> = { box: "School box", alone: "Ship to me" };

/** Host codes look like "LINCOLN-7KX" (admin-view.makeHostCode). */
export const HOST_CODE = /^[A-Z0-9-]{2,32}$/;

/** "?host=lincoln-7kx " → "LINCOLN-7KX", or null if it can't be a host code. */
export function parseHostCode(raw: unknown): string | null {
  const code = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return HOST_CODE.test(code) ? code : null;
}
