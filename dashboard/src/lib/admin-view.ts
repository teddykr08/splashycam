/**
 * The owner's admin dashboard (/admin), computed from raw rows. Pure (no
 * database), tested in admin-view.test.ts.
 */
import { decideBox, PICKUP_ALPHABET, soloShipDate, unitStatus, type BuyerResponse, type Shipping } from "./rules";

export interface AdminHost {
  id: string;
  name: string;
  email: string;
  code: string;
  school: string | null;
  instagram: string | null;
  venmo_handle: string | null;
  boxes_enabled: boolean;
  game_starts_at: string | null;
  dashboard_token: string;
  ship_to: unknown;
  created_at: string;
}

export interface AdminBox {
  id: string;
  host_id: string;
  status: string;
  opened_at: string;
  filled_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  tracking: string | null;
}

export interface AdminOrder {
  id: string;
  shopify_order_id: string;
  host_id: string | null;
  box_id: string | null;
  shipping: Shipping;
  units: number;
  buyer_name: string;
  buyer_email: string;
  ship_to: unknown;
  status: string;
  paid_cents: number | null;
  host_cut_cents: number | null;
  flag: string | null;
  pickup_code: string | null;
  handed_off_at: string | null;
  handoff_locked_at: string | null;
  buyer_response: string;
  shipped_at: string | null;
  tracking: string | null;
  payout_id: string | null;
  created_at: string;
}

const asDate = (s: string | null | undefined) => (s ? new Date(s) : null);
const asResponse = (s: string): BuyerResponse => (s === "yes" || s === "no" ? s : "none");
const live = (o: AdminOrder) => o.status !== "cancelled";

// ---------------------------------------------------------------- ship queue

export interface QueueBox {
  box: AdminBox;
  host: AdminHost | undefined;
  orders: number;
  units: number;
  shipsAt: string | null; // ISO, for boxes still filling
}

export interface ShipQueue {
  /** Open boxes whose ship time has come. */
  readyBoxes: QueueBox[];
  /** Open boxes still collecting orders, soonest first. */
  fillingBoxes: QueueBox[];
  /** Shipped boxes that haven't been marked as arrived. */
  inTransit: QueueBox[];
  /** Ship-to-me orders not shipped yet, earliest ship date first. */
  soloWaiting: { order: AdminOrder; shipDate: string }[];
}

export function buildShipQueue(hosts: AdminHost[], boxes: AdminBox[], orders: AdminOrder[], now: Date): ShipQueue {
  const hostById = new Map(hosts.map((h) => [h.id, h]));
  const inBox = (boxId: string) => orders.filter((o) => live(o) && o.box_id === boxId && o.shipping === "box");
  const row = (box: AdminBox, shipsAt: string | null = null): QueueBox => {
    const os = inBox(box.id);
    return { box, host: hostById.get(box.host_id), orders: os.length, units: os.reduce((n, o) => n + o.units, 0), shipsAt };
  };

  const readyBoxes: QueueBox[] = [];
  const fillingBoxes: QueueBox[] = [];
  for (const box of boxes.filter((b) => b.status === "open")) {
    const host = hostById.get(box.host_id);
    const decision = decideBox(
      {
        openedAt: new Date(box.opened_at),
        gameStartsAt: asDate(host?.game_starts_at),
        filledAt: asDate(box.filled_at),
        orderIds: inBox(box.id).map((o) => o.id),
      },
      now,
    );
    if (decision.action === "ship") readyBoxes.push(row(box));
    else if (decision.action === "wait") fillingBoxes.push(row(box, decision.until.toISOString()));
  }
  fillingBoxes.sort((a, b) => (a.shipsAt ?? "").localeCompare(b.shipsAt ?? ""));

  const inTransit = boxes.filter((b) => b.status === "shipped" && !b.delivered_at).map((b) => row(b));

  const soloWaiting = orders
    .filter((o) => live(o) && o.shipping === "alone" && !o.shipped_at)
    .map((order) => ({ order, shipDate: soloShipDate(new Date(order.created_at)) }))
    .sort((a, b) => a.shipDate.localeCompare(b.shipDate) || a.order.created_at.localeCompare(b.order.created_at));

  return { readyBoxes, fillingBoxes, inTransit, soloWaiting };
}

// ---------------------------------------------------------------- payouts

export interface HostOwed {
  host: AdminHost;
  cents: number;
  orderIds: string[];
}

/** Host cut on delivered units not yet covered by a payout, per host (hosts owed nothing left out). */
export function owedByHost(hosts: AdminHost[], boxes: AdminBox[], orders: AdminOrder[], now: Date): HostOwed[] {
  const boxById = new Map(boxes.map((b) => [b.id, b]));
  const result: HostOwed[] = [];
  for (const host of hosts) {
    let cents = 0;
    const orderIds: string[] = [];
    for (const o of orders) {
      if (o.host_id !== host.id || !live(o) || o.payout_id || !o.host_cut_cents) continue;
      const { owed } = unitStatus(
        {
          shipping: o.shipping,
          handedOffAt: asDate(o.handed_off_at),
          buyerResponse: asResponse(o.buyer_response),
          boxDeliveredAt: asDate(o.box_id ? boxById.get(o.box_id)?.delivered_at : null),
          shippedAt: asDate(o.shipped_at),
        },
        now,
      );
      if (owed) {
        cents += o.host_cut_cents;
        orderIds.push(o.id);
      }
    }
    if (cents > 0) result.push({ host, cents, orderIds });
  }
  return result.sort((a, b) => b.cents - a.cents);
}

// ---------------------------------------------------------------- inventory

export function inventory(unitsMade: number, orders: AdminOrder[]) {
  const sold = orders.filter(live).reduce((n, o) => n + o.units, 0);
  return { made: unitsMade, sold, left: unitsMade - sold };
}

// ---------------------------------------------------------------- orders

export interface AdminOrderView {
  order: AdminOrder;
  school: string | null;
  hostName: string | null;
  /** Stored flags plus live ones (buyer said no, locked handoff). */
  flags: string[];
}

export const NO_SCHOOL = "(no school)";

/** All orders with their school, flagged ones first, then newest first. Optional school filter. */
export function ordersForAdmin(
  hosts: AdminHost[],
  boxes: AdminBox[],
  orders: AdminOrder[],
  now: Date,
  school?: string | null,
): AdminOrderView[] {
  const hostById = new Map(hosts.map((h) => [h.id, h]));
  const boxById = new Map(boxes.map((b) => [b.id, b]));
  const views = orders.map((order) => {
    const host = order.host_id ? hostById.get(order.host_id) : undefined;
    const flags = (order.flag ?? "").split(",").filter(Boolean);
    if (live(order)) {
      const { flag } = unitStatus(
        {
          shipping: order.shipping,
          handedOffAt: asDate(order.handed_off_at),
          buyerResponse: asResponse(order.buyer_response),
          boxDeliveredAt: asDate(order.box_id ? boxById.get(order.box_id)?.delivered_at : null),
          shippedAt: asDate(order.shipped_at),
        },
        now,
      );
      if (flag && !flags.includes(flag)) flags.push(flag);
      if (order.handoff_locked_at && !order.handed_off_at && !flags.includes("handoff_locked")) flags.push("handoff_locked");
    }
    return { order, school: host?.school ?? null, hostName: host?.name ?? null, flags };
  });

  return views
    .filter((v) => !school || (school === NO_SCHOOL ? !v.school : v.school === school))
    .sort((a, b) => Number(b.flags.length > 0) - Number(a.flags.length > 0) || b.order.created_at.localeCompare(a.order.created_at));
}

/** Schools that appear on hosts or orders, for the filter. */
export function schoolOptions(hosts: AdminHost[]): string[] {
  return [...new Set(hosts.map((h) => h.school).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b));
}

// ---------------------------------------------------------------- hosts

const FILLER = new Set(["THE", "HIGH", "SCHOOL", "HS", "SENIOR", "ACADEMY", "OF", "AND"]);

/**
 * A new host code from the school name: its first real word (max 10 letters)
 * plus 3 random characters, e.g. "Lincoln High School" → "LINCOLN-7KX".
 * Matches the code format the webhook accepts (A–Z, 0–9, dashes).
 */
export function makeHostCode(school: string, randomInt: (max: number) => number): string {
  const words = school
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const word = (words.find((w) => !FILLER.has(w)) ?? words[0] ?? "HOST").slice(0, 10);
  let suffix = "";
  for (let i = 0; i < 3; i++) suffix += PICKUP_ALPHABET[randomInt(PICKUP_ALPHABET.length)];
  return `${word}-${suffix}`;
}
