/**
 * What the order webhooks do to the database. Every step is safe to repeat:
 * Shopify can deliver the same webhook more than once.
 */
import { BOX_FULL_AT, classifyOrder } from "./rules";
import type { ParsedOrder } from "./shopify";
import type { Json } from "./database.types";
import type { Db } from "./supabase/admin";

const UNIQUE_VIOLATION = "23505";

export type RecordResult =
  | { result: "duplicate" }
  | { result: "recorded"; orderId: string; shipping: "box" | "alone"; boxId: string | null; flag: string | null };

/** orders/create: store the order, in its host's open box or as shipping alone. */
export async function recordOrder(db: Db, parsed: ParsedOrder): Promise<RecordResult> {
  const existing = await db.from("orders").select("id").eq("shopify_order_id", parsed.shopifyOrderId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return { result: "duplicate" };

  const flags = [...parsed.flags];
  let hostId: string | null = null;
  if (parsed.hostCode) {
    const host = await db.from("hosts").select("id").eq("code", parsed.hostCode).maybeSingle();
    if (host.error) throw host.error;
    if (host.data) hostId = host.data.id;
    else flags.push("unknown_host_code");
  }

  const { shipping, flag } = classifyOrder(parsed.delivery, hostId !== null);
  if (flag) flags.push(flag);

  const boxId = shipping === "box" ? await openBoxFor(db, hostId!) : null;

  const inserted = await db
    .from("orders")
    .insert({
      shopify_order_id: parsed.shopifyOrderId,
      host_id: hostId,
      box_id: boxId,
      shipping,
      units: parsed.units,
      ship_alone_if_not_full: parsed.shipAloneIfNotFull,
      buyer_name: parsed.buyerName,
      buyer_email: parsed.buyerEmail,
      // A box ships to the host; only orders shipping alone need the buyer's address.
      ship_to: shipping === "alone" ? ((parsed.shipTo ?? null) as Json) : null,
      status: "charged",
      paid_cents: parsed.paidCents,
      flag: flags.length ? flags.join(",") : null,
    })
    .select("id")
    .single();
  if (inserted.error) {
    if (inserted.error.code === UNIQUE_VIOLATION) return { result: "duplicate" }; // same webhook, in parallel
    throw inserted.error;
  }

  if (boxId) await syncFilledAt(db, boxId);
  return { result: "recorded", orderId: inserted.data.id, shipping, boxId, flag: flags.length ? flags.join(",") : null };
}

export type CancelResult = { result: "not_found" } | { result: "cancelled"; boxId: string | null };

/** orders/cancelled: mark the order cancelled so it no longer counts in its box. */
export async function cancelOrder(db: Db, shopifyOrderId: string): Promise<CancelResult> {
  const updated = await db
    .from("orders")
    .update({ status: "cancelled" })
    .eq("shopify_order_id", shopifyOrderId)
    .select("box_id, shipping")
    .maybeSingle();
  if (updated.error) throw updated.error;
  if (!updated.data) return { result: "not_found" };

  const boxId = updated.data.shipping === "box" ? updated.data.box_id : null;
  if (boxId) await syncFilledAt(db, boxId);
  return { result: "cancelled", boxId };
}

/** The host's open box, opening a new one if there isn't one. */
async function openBoxFor(db: Db, hostId: string): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const open = await db.from("boxes").select("id").eq("host_id", hostId).eq("status", "open").maybeSingle();
    if (open.error) throw open.error;
    if (open.data) return open.data.id;

    const created = await db.from("boxes").insert({ host_id: hostId }).select("id").single();
    if (!created.error) return created.data.id;
    // Another webhook opened it a moment ago (one open box per host): read it again.
    if (created.error.code !== UNIQUE_VIOLATION) throw created.error;
  }
  throw new Error(`Could not open a box for host ${hostId}`);
}

/**
 * Keeps boxes.filled_at in step with the box's live order count while it's open:
 * set when it reaches 5 orders, cleared if a cancellation drops it below 5.
 */
async function syncFilledAt(db: Db, boxId: string): Promise<void> {
  const box = await db.from("boxes").select("status, filled_at").eq("id", boxId).single();
  if (box.error) throw box.error;
  if (box.data.status !== "open") return;

  const count = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("box_id", boxId)
    .eq("shipping", "box")
    .neq("status", "cancelled");
  if (count.error) throw count.error;

  const full = (count.count ?? 0) >= BOX_FULL_AT;
  if (full && !box.data.filled_at) {
    await must(db.from("boxes").update({ filled_at: new Date().toISOString() }).eq("id", boxId).is("filled_at", null));
  } else if (!full && box.data.filled_at) {
    await must(db.from("boxes").update({ filled_at: null }).eq("id", boxId));
  }
}

async function must(query: PromiseLike<{ error: unknown }>) {
  const { error } = await query;
  if (error) throw error;
}
