"use server";

/** Admin actions. Every one checks the admin session first. */
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, signIn, signOut } from "@/lib/admin-auth";
import { loadAdminData } from "@/lib/admin-data";
import { makeHostCode, owedByHost } from "@/lib/admin-view";
import { parseEmail, parseInstagram } from "@/lib/launch";
import { payoutWeekStart } from "@/lib/rules";
import { createAdminClient } from "@/lib/supabase/admin";

const UNIQUE_VIOLATION = "23505";
const done = () => revalidatePath("/admin");
const must = (r: { error: unknown }) => {
  if (r.error) throw r.error;
};
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ---------------------------------------------------------------- session

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const ok = await signIn(String(fd.get("password") ?? ""));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
    return { error: "Wrong password." };
  }
  redirect("/admin");
}

export async function logout() {
  await signOut();
  redirect("/admin/login");
}

// ---------------------------------------------------------------- shipping

/** Box sent to the host: status shipped (+ tracking); its orders are shipped too. */
export async function markBoxShipped(boxId: string, fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const now = new Date().toISOString();
  must(
    await db
      .from("boxes")
      .update({ status: "shipped", shipped_at: now, tracking: text(fd, "tracking") || null })
      .eq("id", boxId)
      .eq("status", "open"),
  );
  must(await db.from("orders").update({ status: "shipped" }).eq("box_id", boxId).eq("shipping", "box").neq("status", "cancelled"));
  done();
}

/** Box reached the host: starts the 7-day "no complaint" clock. */
export async function markBoxArrived(boxId: string) {
  await requireAdmin();
  must(
    await createAdminClient().from("boxes").update({ delivered_at: new Date().toISOString() }).eq("id", boxId).is("delivered_at", null),
  );
  done();
}

/** Ship-to-me order sent (+ tracking). */
export async function markSoloShipped(orderId: string, fd: FormData) {
  await requireAdmin();
  must(
    await createAdminClient()
      .from("orders")
      .update({ status: "shipped", shipped_at: new Date().toISOString(), tracking: text(fd, "tracking") || null })
      .eq("id", orderId)
      .eq("shipping", "alone")
      .is("shipped_at", null),
  );
  done();
}

// ---------------------------------------------------------------- inventory

export async function setUnitsMade(fd: FormData) {
  await requireAdmin();
  const n = Number(text(fd, "units_made"));
  if (!Number.isInteger(n) || n < 0 || n > 1_000_000) return;
  must(await createAdminClient().from("inventory").upsert({ id: 1, units_made: n, updated_at: new Date().toISOString() }));
  done();
}

// ---------------------------------------------------------------- hosts

export type AddHostState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; name: string; code: string; shareUrl: string; dashboardUrl: string };

const SITE = "https://www.splashycam.shop";

export async function addHost(_prev: AddHostState, fd: FormData): Promise<AddHostState> {
  await requireAdmin();
  const name = text(fd, "name");
  const email = parseEmail(text(fd, "email"));
  const school = text(fd, "school");
  const igRaw = text(fd, "instagram");
  const instagram = igRaw ? parseInstagram(igRaw) : null;
  const venmo = text(fd, "venmo").replace(/^@/, "");
  const boxesEnabled = fd.get("boxes_enabled") === "on";
  const start = text(fd, "game_starts_on");
  const addr = {
    name,
    address1: text(fd, "address1"),
    address2: text(fd, "address2") || null,
    city: text(fd, "city"),
    province_code: text(fd, "state").toUpperCase(),
    zip: text(fd, "zip"),
    country_code: "US",
  };

  if (!name || name.length > 100) return { status: "error", message: "Add their name." };
  if (!email) return { status: "error", message: "Add a valid email." };
  if (!school || school.length > 120) return { status: "error", message: "Add their school." };
  if (igRaw && !instagram) return { status: "error", message: "That Instagram handle doesn't look right." };
  if (venmo && !/^[A-Za-z0-9_-]{1,40}$/.test(venmo)) return { status: "error", message: "That Venmo handle doesn't look right." };
  if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) return { status: "error", message: "Pick a game start date." };
  const hasAddress = addr.address1 && addr.city && addr.province_code && addr.zip;

  const db = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeHostCode(school, randomInt);
    const { data, error } = await db
      .from("hosts")
      .insert({
        name,
        email,
        school,
        instagram,
        venmo_handle: venmo || null,
        boxes_enabled: boxesEnabled,
        // Noon Pacific-ish (20:00 UTC) on the start date: a calendar day, not a moment.
        game_starts_at: start ? `${start}T20:00:00Z` : null,
        ship_to: hasAddress ? addr : null,
        code,
      })
      .select("code, dashboard_token")
      .single();
    if (!error) {
      done();
      return {
        status: "done",
        name,
        code: data.code,
        shareUrl: `${SITE}/?host=${data.code}`,
        dashboardUrl: `${SITE}/h/${data.dashboard_token}`,
      };
    }
    if (error.code !== UNIQUE_VIOLATION) {
      console.error("[addHost]", error);
      return { status: "error", message: "Couldn't save. Try again." };
    }
    if (/email/.test(`${error.message} ${error.details ?? ""}`)) {
      return { status: "error", message: "A host with that email already exists." };
    }
    // code collision: try another suffix
  }
  return { status: "error", message: "Couldn't make a unique code. Try again." };
}

/** Turn a host's school boxes on or off. Off: their link only offers Ship to me. */
export async function setBoxesEnabled(hostId: string, enabled: boolean) {
  await requireAdmin();
  must(await createAdminClient().from("hosts").update({ boxes_enabled: enabled }).eq("id", hostId));
  done();
}

// ---------------------------------------------------------------- payouts

/**
 * Records a Venmo payment of everything currently owed to a host: adds it to
 * this week's payout row (Monday, Pacific) and ties those orders to it.
 */
export async function markPaid(hostId: string) {
  await requireAdmin();
  const data = await loadAdminData();
  const owed = owedByHost(data.hosts, data.boxes, data.orders, new Date()).find((o) => o.host.id === hostId);
  if (!owed) return;

  const db = createAdminClient();
  const week = payoutWeekStart(new Date());
  const existing = await db.from("payouts").select("id, amount_cents").eq("host_id", hostId).eq("week_start", week).maybeSingle();
  must(existing);
  const now = new Date().toISOString();
  let payoutId: string;
  if (existing.data) {
    payoutId = existing.data.id;
    must(
      await db
        .from("payouts")
        .update({ amount_cents: existing.data.amount_cents + owed.cents, paid_at: now, venmo_handle: owed.host.venmo_handle })
        .eq("id", payoutId),
    );
  } else {
    const ins = await db
      .from("payouts")
      .insert({ host_id: hostId, week_start: week, amount_cents: owed.cents, paid_at: now, venmo_handle: owed.host.venmo_handle })
      .select("id")
      .single();
    must(ins);
    payoutId = ins.data!.id;
  }
  must(await db.from("orders").update({ payout_id: payoutId }).in("id", owed.orderIds).is("payout_id", null));
  done();
}

// ---------------------------------------------------------------- orders

/** Clears a pickup-code lock so the host can try again. */
export async function unlockHandoff(orderId: string) {
  await requireAdmin();
  const db = createAdminClient();
  const { data, error } = await db.from("orders").select("flag").eq("id", orderId).maybeSingle();
  if (error) throw error;
  const flag = (data?.flag ?? "")
    .split(",")
    .filter((f) => f && f !== "handoff_locked")
    .join(",");
  must(
    await db
      .from("orders")
      .update({ handoff_locked_at: null, handoff_wrong_count: 0, handoff_wrong_since: null, flag: flag || null })
      .eq("id", orderId),
  );
  done();
}
