/**
 * Server-only reads for the admin dashboard. Only call after isAdmin().
 */
import type { AdminBox, AdminHost, AdminOrder, AdminReservation } from "./admin-view";
import type { Database } from "./database.types";
import { createAdminClient } from "./supabase/admin";

export type PipelineRow = Database["public"]["Views"]["host_pipeline"]["Row"];

export interface AdminData {
  hosts: AdminHost[];
  boxes: AdminBox[];
  orders: AdminOrder[];
  pipeline: PipelineRow[];
  unitsMade: number;
  reservations: AdminReservation[];
  /** Emails from the old "notify me" waitlist (newest first). */
  waitlist: { email: string; created_at: string }[];
}

const HOST_COLS = "id, name, email, code, school, instagram, venmo_handle, boxes_enabled, game_starts_at, dashboard_token, ship_to, created_at";
const BOX_COLS = "id, host_id, status, opened_at, filled_at, shipped_at, delivered_at, tracking";
const ORDER_COLS =
  "id, shopify_order_id, host_id, box_id, shipping, units, buyer_name, buyer_email, ship_to, status, paid_cents, host_cut_cents, flag, pickup_code, handed_off_at, handoff_locked_at, buyer_response, shipped_at, tracking, payout_id, created_at";

export async function loadAdminData(): Promise<AdminData> {
  const db = createAdminClient();
  const [hosts, boxes, orders, pipeline, inv, reservations, waitlist] = await Promise.all([
    db.from("hosts").select(HOST_COLS).order("created_at", { ascending: false }),
    db.from("boxes").select(BOX_COLS),
    db.from("orders").select(ORDER_COLS).order("created_at", { ascending: false }),
    db.from("host_pipeline").select("*"),
    db.from("inventory").select("units_made").eq("id", 1).maybeSingle(),
    db
      .from("reservations")
      .select("id, name, instagram, email, school, delivery, host_code, host_id, created_at")
      .order("created_at", { ascending: false }),
    db.from("waitlist").select("email, created_at").order("created_at", { ascending: false }),
  ]);
  for (const r of [hosts, boxes, orders, pipeline, inv, reservations, waitlist]) if (r.error) throw r.error;

  return {
    hosts: (hosts.data ?? []) as AdminHost[],
    boxes: boxes.data ?? [],
    orders: (orders.data ?? []) as AdminOrder[],
    pipeline: pipeline.data ?? [],
    unitsMade: inv.data?.units_made ?? 0,
    reservations: reservations.data ?? [],
    waitlist: waitlist.data ?? [],
  };
}
