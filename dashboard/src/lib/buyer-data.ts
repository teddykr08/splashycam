/**
 * Server-only data access for the buyer order page (/o/[orderId]/[sig]).
 * Callers must verify the link signature (verifyBuyerLink) first.
 */
import { buildBuyerView, type BuyerView } from "./buyer-view";
import { createAdminClient } from "./supabase/admin";

/**
 * The buyer's order by Shopify order id. null = we haven't recorded it yet
 * (the webhook can lag a moment behind the confirmation email).
 */
export async function loadBuyerView(shopifyOrderId: string): Promise<BuyerView | null> {
  const db = createAdminClient();
  const { data: order, error } = await db
    .from("orders")
    .select("buyer_name, units, shipping, status, pickup_code, handed_off_at, buyer_response, shipped_at, created_at, box_id, host_id")
    .eq("shopify_order_id", shopifyOrderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;

  const [box, host] = await Promise.all([
    order.box_id
      ? db.from("boxes").select("status, opened_at, filled_at, shipped_at, delivered_at").eq("id", order.box_id).maybeSingle()
      : null,
    order.host_id ? db.from("hosts").select("name, game_starts_at").eq("id", order.host_id).maybeSingle() : null,
  ]);
  if (box?.error) throw box.error;
  if (host?.error) throw host.error;

  return buildBuyerView(order, box?.data ?? null, host?.data ?? null);
}
