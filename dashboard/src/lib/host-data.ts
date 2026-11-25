/**
 * Server-only data access for the private host dashboard (/h/[token]).
 * Everything is looked up by the host's secret dashboard_token, and every query
 * is scoped to that host's id, so a host only ever sees their own rows.
 */
import { buildHostDashboard, type HostDashboard } from "./host-dashboard";
import { schoolKey } from "./launch";
import type { HostForLink } from "./store";
import { createAdminClient, type Db } from "./supabase/admin";
import { parseHostCode } from "./variants";

/** dashboard_token is 36 lowercase hex characters (migration 0009). */
const TOKEN = /^[0-9a-f]{36}$/;

export interface DashboardHost {
  id: string;
  name: string;
  code: string;
  school: string | null;
  game_starts_at: string | null;
  boxes_enabled: boolean;
}

export async function findHostByToken(token: string): Promise<DashboardHost | null> {
  if (!TOKEN.test(token)) return null;
  const { data, error } = await createAdminClient()
    .from("hosts")
    .select("id, name, code, school, game_starts_at, boxes_enabled")
    .eq("dashboard_token", token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** The host behind a ?host= code on "/", or null for a missing/unknown code. */
export async function findHostByCode(raw: unknown): Promise<(HostForLink & { id: string }) | null> {
  const code = parseHostCode(raw);
  if (!code) return null;
  const { data, error } = await createAdminClient()
    .from("hosts")
    .select("id, code, school, boxes_enabled")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Reservations for this host: every one made through their link (host_id), plus
 * ones made without any host link whose school matches theirs (schoolKey).
 */
export async function countSchoolReservations(db: Db, host: Pick<DashboardHost, "id" | "school">): Promise<number> {
  const [linked, unlinked] = await Promise.all([
    db.from("reservations").select("id", { count: "exact", head: true }).eq("host_id", host.id),
    host.school ? db.from("reservations").select("school").is("host_id", null) : Promise.resolve({ data: [], error: null }),
  ]);
  if (linked.error) throw linked.error;
  if (unlinked.error) throw unlinked.error;
  const key = host.school ? schoolKey(host.school) : null;
  const matched = key ? (unlinked.data ?? []).filter((r) => schoolKey(r.school) === key).length : 0;
  return (linked.count ?? 0) + matched;
}

export async function loadHostDashboard(
  token: string,
): Promise<{ host: DashboardHost; dashboard: HostDashboard; reservations: number } | null> {
  const host = await findHostByToken(token);
  if (!host) return null;

  const db = createAdminClient();
  const [orders, boxes, payouts, reservations] = await Promise.all([
    db
      .from("orders")
      .select("id, buyer_name, units, shipping, status, box_id, pickup_code, handed_off_at, handoff_locked_at, buyer_response, host_cut_cents, shipped_at, created_at")
      .eq("host_id", host.id),
    db.from("boxes").select("id, status, opened_at, filled_at, delivered_at").eq("host_id", host.id),
    db.from("payouts").select("amount_cents, paid_at").eq("host_id", host.id),
    countSchoolReservations(db, host),
  ]);
  for (const r of [orders, boxes, payouts]) if (r.error) throw r.error;

  return {
    host,
    dashboard: buildHostDashboard(host, orders.data ?? [], boxes.data ?? [], payouts.data ?? [], new Date()),
    reservations,
  };
}
