"use server";

/**
 * Host dashboard actions. The host is identified only by their secret token;
 * every write is checked against that host's id.
 */
import { revalidatePath } from "next/cache";
import { findHostByToken } from "@/lib/host-data";
import { normalizePickupCode, PICKUP_CODE_LENGTH } from "@/lib/rules";
import { createAdminClient } from "@/lib/supabase/admin";

export type HandoffState = { status: "idle" | "done" } | { status: "error"; message: string };

/** The host types the buyer's pickup code at handoff → handed_off_at is set. */
export async function confirmHandoff(token: string, orderId: string, _prev: HandoffState, fd: FormData): Promise<HandoffState> {
  const code = normalizePickupCode(String(fd.get("code") ?? ""));
  if (code.length !== PICKUP_CODE_LENGTH) return { status: "error", message: `Pickup codes are ${PICKUP_CODE_LENGTH} characters.` };

  try {
    const host = await findHostByToken(token);
    if (!host) return { status: "error", message: "This link isn't valid anymore." };

    const db = createAdminClient();
    const { data: order, error } = await db
      .from("orders")
      .select("id, pickup_code, handed_off_at, status")
      .eq("id", orderId)
      .eq("host_id", host.id)
      .maybeSingle();
    if (error) throw error;
    if (!order || order.status === "cancelled" || !order.pickup_code) return { status: "error", message: "Order not found." };
    if (order.handed_off_at) return { status: "done" };
    if (code !== order.pickup_code) return { status: "error", message: "That code doesn't match. Check it with the buyer." };

    const update = await db
      .from("orders")
      .update({ handed_off_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("host_id", host.id)
      .is("handed_off_at", null);
    if (update.error) throw update.error;

    revalidatePath(`/h/${token}`);
    return { status: "done" };
  } catch (err) {
    console.error("[handoff]", err);
    return { status: "error", message: "Something went wrong. Try again in a minute." };
  }
}
