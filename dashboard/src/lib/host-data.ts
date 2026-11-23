/**
 * Server-only data access for the private host dashboard (/h/[token]).
 * Everything is looked up by the host's secret dashboard_token, and every query
 * is scoped to that host's id, so a host only ever sees their own rows.
 */
import { buildHostDashboard, type HostDashboard } from "./host-dashboard";
import { createAdminClient } from "./supabase/admin";

/** dashboard_token is 36 lowercase hex characters (migration 0009). */
const TOKEN = /^[0-9a-f]{36}$/;

export interface DashboardHost {
  id: string;
  name: string;
  code: string;
  game_starts_at: string | null;
}

export async function findHostByToken(token: string): Promise<DashboardHost | null> {
  if (!TOKEN.test(token)) return null;
  const { data, error } = await createAdminClient()
    .from("hosts")
    .select("id, name, code, game_starts_at")
    .eq("dashboard_token", token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadHostDashboard(token: string): Promise<{ host: DashboardHost; dashboard: HostDashboard } | null> {
  const host = await findHostByToken(token);
  if (!host) return null;

  const db = createAdminClient();
  const [orders, boxes, payouts] = await Promise.all([
    db
      .from("orders")
      .select("id, buyer_name, units, shipping, status, box_id, pickup_code, handed_off_at, buyer_response, host_cut_cents, shipped_at, created_at")
      .eq("host_id", host.id),
    db.from("boxes").select("id, status, opened_at, filled_at, delivered_at").eq("host_id", host.id),
    db.from("payouts").select("amount_cents, paid_at").eq("host_id", host.id),
  ]);
  for (const r of [orders, boxes, payouts]) if (r.error) throw r.error;

  return {
    host,
    dashboard: buildHostDashboard(host, orders.data ?? [], boxes.data ?? [], payouts.data ?? [], new Date()),
  };
}
