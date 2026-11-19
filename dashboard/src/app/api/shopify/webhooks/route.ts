/**
 * Shopify order webhooks: POST /api/shopify/webhooks
 * Subscribe both topics to this URL: orders/create and orders/cancelled.
 *
 * 1. Verify X-Shopify-Hmac-Sha256 against the raw body (SHOPIFY_WEBHOOK_SECRET,
 *    the app's client secret). Anything unsigned gets 401 and is ignored.
 * 2. orders/create → put the order in its host's box or record it as shipping alone.
 *    orders/cancelled → take it out of its box.
 * 3. Answer 200 quickly. A 5xx makes Shopify retry, which is safe: both steps
 *    are idempotent.
 */
import { NextResponse } from "next/server";
import { cancelOrder, recordOrder } from "@/lib/orders";
import { parseOrder, verifyShopifyHmac, type ShopifyOrder } from "@/lib/shopify";
import { createAdminClient } from "@/lib/supabase/admin";

// No route segment config: cacheComponents rejects `runtime` and `dynamic`.
// Route handlers run on Node by default (needed for node:crypto), and reading
// the request body already keeps this route dynamic.

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";
  if (!verifyShopifyHmac(rawBody, request.headers.get("x-shopify-hmac-sha256"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic");
  let order: ShopifyOrder;
  try {
    order = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  try {
    const db = createAdminClient();

    if (topic === "orders/create") {
      const parsed = parseOrder(order);
      if (!parsed) return NextResponse.json({ ok: true, skipped: "no mount in order" });
      const result = await recordOrder(db, parsed);
      console.info("[webhook] orders/create", parsed.shopifyOrderId, result);
      return NextResponse.json({ ok: true, ...result });
    }

    if (topic === "orders/cancelled") {
      if (order.id === undefined) return NextResponse.json({ error: "no order id" }, { status: 400 });
      const result = await cancelOrder(db, String(order.id));
      console.info("[webhook] orders/cancelled", order.id, result);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ ok: true, skipped: `topic ${topic}` });
  } catch (error) {
    console.error("[webhook]", topic, order.id, error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
