"use server";

/**
 * Server actions for the pre-launch page. They run only on the server and write
 * with the service-role client; the browser never talks to Supabase directly.
 */
import { redirect } from "next/navigation";
import { findHostByCode } from "@/lib/host-data";
import {
  isBot,
  parseHostApplication,
  parseReservation,
  schoolKey,
  type FieldErrors,
  type HostField,
  type ReservationField,
} from "@/lib/launch";
import type { Delivery } from "@/lib/rules";
import { cartPermalink, deliveryOptions, MAX_QUANTITY, parseQuantity, readStoreConfig } from "@/lib/store";
import { createAdminClient } from "@/lib/supabase/admin";

const UNIQUE_VIOLATION = "23505";

export type HostState =
  | { status: "idle" | "done" }
  | { status: "error"; message: string; errors?: FieldErrors<HostField>; values?: Partial<Record<HostField, string>> };

const HOST_FIELDS: HostField[] = ["name", "email", "instagram", "school", "game_starts_on", "game_ends_on", "player_count"];
/** What the person typed, so the form can refill after an error (React resets forms after an action). */
const typed = (fd: FormData) =>
  Object.fromEntries(HOST_FIELDS.map((k) => [k, String(fd.get(k) ?? "").slice(0, 200)])) as Partial<Record<HostField, string>>;

export async function applyAsHost(_prev: HostState, fd: FormData): Promise<HostState> {
  if (isBot(fd)) return { status: "done" };
  const parsed = parseHostApplication(fd);
  if (!parsed.ok) return { status: "error", message: "Check the highlighted fields.", errors: parsed.errors, values: typed(fd) };

  try {
    const { error } = await createAdminClient().from("host_applications").insert(parsed.data);
    if (error) throw error;
    return { status: "done" };
  } catch (error) {
    console.error("[host_applications]", error);
    return { status: "error", message: "Something went wrong. Try again in a minute.", values: typed(fd) };
  }
}

export type ReserveState =
  | { status: "idle" }
  | { status: "done"; already: boolean }
  | {
      status: "error";
      message: string;
      errors?: FieldErrors<ReservationField>;
      values?: Partial<Record<ReservationField, string>>;
    };

const RESERVE_FIELDS: ReservationField[] = ["name", "instagram", "email", "school", "delivery"];

/**
 * The free reservation on "/". The host code comes from a hidden field, but the
 * host (and so the school and whether School box is allowed) is looked up again
 * here, never trusted from the form.
 */
export async function reserve(_prev: ReserveState, fd: FormData): Promise<ReserveState> {
  if (isBot(fd)) return { status: "done", already: false };
  const values = Object.fromEntries(RESERVE_FIELDS.map((k) => [k, String(fd.get(k) ?? "").slice(0, 200)]));

  try {
    const host = await findHostByCode(fd.get("host"));
    const parsed = parseReservation(fd, { hostSchool: host?.school ?? null, options: deliveryOptions(host) });
    if (!parsed.ok) return { status: "error", message: "Check the highlighted fields.", errors: parsed.errors, values };

    const db = createAdminClient();
    // One per Instagram handle per school, with the school matched loosely
    // ("Lincoln HS" = "Lincoln High School"). The unique index backs up exact repeats.
    // "_" is a wildcard in ILIKE and allowed in handles, so escape it.
    const same = await db.from("reservations").select("school").ilike("instagram", parsed.data.instagram.replace(/_/g, "\\_"));
    if (same.error) throw same.error;
    const key = schoolKey(parsed.data.school);
    if ((same.data ?? []).some((r) => schoolKey(r.school) === key)) return { status: "done", already: true };

    const { error } = await db
      .from("reservations")
      .insert({ ...parsed.data, host_id: host?.id ?? null, host_code: host?.code ?? null });
    // Same Instagram handle at the same school: they're already reserved.
    if (error?.code === UNIQUE_VIOLATION) return { status: "done", already: true };
    if (error) throw error;
    return { status: "done", already: false };
  } catch (error) {
    console.error("[reservations]", error);
    return { status: "error", message: "Something went wrong. Try again in a minute.", values };
  }
}

export type CheckoutState = { status: "idle" } | { status: "error"; message: string };

/** The buy flow: validate, then send them to Shopify checkout via a cart permalink. */
export async function startCheckout(_prev: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const config = readStoreConfig(process.env);
  if (!config) return { status: "error", message: "The store isn't open yet." };

  const quantity = parseQuantity(fd.get("quantity"));
  if (!quantity) return { status: "error", message: `Pick a quantity from 1 to ${MAX_QUANTITY}.` };

  let host;
  try {
    host = await findHostByCode(fd.get("host"));
  } catch (error) {
    console.error("[checkout]", error);
    return { status: "error", message: "Something went wrong. Try again in a minute." };
  }
  const options = deliveryOptions(host);
  const picked = String(fd.get("delivery") ?? "") as Delivery;
  const delivery = options.length === 1 ? options[0] : options.includes(picked) ? picked : null;
  if (!delivery) return { status: "error", message: "Pick School box or Ship to me." };

  redirect(cartPermalink(config, delivery, quantity, host?.code ?? null));
}
