"use server";

/**
 * Host dashboard actions. The host is identified only by their secret token;
 * every write is checked against that host's id.
 */
import { revalidatePath } from "next/cache";
import { findHostByToken } from "@/lib/host-data";
import { HANDOFF_MAX_WRONG, normalizePickupCode, PICKUP_CODE_LENGTH, recordWrongCode } from "@/lib/rules";
import { createAdminClient } from "@/lib/supabase/admin";

export type HandoffState = { status: "idle" | "done" } | { status: "error"; message: string };

const LOCKED = "Too many wrong codes. This order is locked; Splashy Cam will sort it out with you.";

/** Adds a flag to an order's comma-separated flag list (once). */
const withFlag = (flags: string | null, flag: string) => {
  const list = (flags ?? "").split(",").filter(Boolean);
  return list.includes(flag) ? list.join(",") : [...list, flag].join(",");
};

/**
 * The host types the buyer's pickup code at handoff → handed_off_at is set.
 * 5 wrong codes per order within an hour lock the order and flag it for the owner.
 */
export async function confirmHandoff(token: string, orderId: string, _prev: HandoffState, fd: FormData): Promise<HandoffState> {
  const code = normalizePickupCode(String(fd.get("code") ?? ""));
  if (code.length !== PICKUP_CODE_LENGTH) return { status: "error", message: `Pickup codes are ${PICKUP_CODE_LENGTH} characters.` };

  try {
    const host = await findHostByToken(token);
    if (!host) return { status: "error", message: "This link isn't valid anymore." };

    const db = createAdminClient();
    const { data: order, error } = await db
      .from("orders")
      .select("id, pickup_code, handed_off_at, status, flag, handoff_wrong_count, handoff_wrong_since, handoff_locked_at")
      .eq("id", orderId)
      .eq("host_id", host.id)
      .maybeSingle();
    if (error) throw error;
    if (!order || order.status === "cancelled" || !order.pickup_code) return { status: "error", message: "Order not found." };
    if (order.handed_off_at) return { status: "done" };
    if (order.handoff_locked_at) return { status: "error", message: LOCKED };

    if (code !== order.pickup_code) {
      const now = new Date();
      const next = recordWrongCode(
        { count: order.handoff_wrong_count, since: order.handoff_wrong_since ? new Date(order.handoff_wrong_since) : null },
        now,
      );
      const save = await db
        .from("orders")
        .update({
          handoff_wrong_count: next.count,
          handoff_wrong_since: next.since?.toISOString() ?? null,
          ...(next.lock ? { handoff_locked_at: now.toISOString(), flag: withFlag(order.flag, "handoff_locked") } : {}),
        })
        .eq("id", order.id)
        .eq("host_id", host.id);
      if (save.error) throw save.error;
      if (next.lock) {
        revalidatePath(`/h/${token}`);
        return { status: "error", message: LOCKED };
      }
      const left = HANDOFF_MAX_WRONG - next.count;
      return { status: "error", message: `That code doesn't match. Check it with the buyer. ${left} ${left === 1 ? "try" : "tries"} left this hour.` };
    }

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
