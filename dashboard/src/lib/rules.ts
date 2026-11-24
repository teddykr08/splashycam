/**
 * Every Splashy Cam business rule, as pure functions. No database, no clock, no I/O:
 * callers pass in the facts (and `now`) and get back a number or a decision.
 * The webhooks, the hourly cron and the dashboards all go through these.
 *
 * Money is integer cents.
 *
 * How it works (2026-11-22 rules):
 * - Two Shopify variants, one option "Delivery": "School box" $15/unit and
 *   "Ship to me" $19/unit. Quantity is the number of units; no pack discounts.
 * - Host cut: $3 per box unit, $1.50 per solo unit, only on orders with a host.
 *   It's owed only once the unit counts as delivered (see unitStatus).
 * - Boxes: before the game, one box collects everything and ships 7 days before
 *   the start. During the game, a box ships 24h after its 5th order or 3 days
 *   after its first, whichever is first, even if under 5.
 * - Solo orders ship the next business day (US Pacific).
 * - Payouts are weekly (Venmo), weeks starting Monday, US Pacific.
 * - No pot. No "ship mine alone" checkbox (anyone in a hurry picks Ship to me).
 */

// ---------------------------------------------------------------- prices

export const UNIT_PRICE_CENTS = { box: 1500, alone: 1900 } as const;
export const HOST_CUT_CENTS = { box: 300, alone: 150 } as const;

/** What the buyer picked (the variant). */
export type Delivery = "box" | "alone";
/** How the order actually ships (a box order with no host ships alone). */
export type Shipping = "box" | "alone";

/** Expected order price: quantity × unit price. */
export function orderPriceCents(units: number, delivery: Delivery): number {
  assertUnits(units);
  return units * UNIT_PRICE_CENTS[delivery];
}

/**
 * How a new order should be recorded. A "School box" order that arrives
 * without a host can't join a box: it ships alone and is flagged for the owner.
 */
export function classifyOrder(delivery: Delivery, hasHost: boolean): { shipping: Shipping; flag: string | null } {
  if (delivery === "box" && !hasHost) return { shipping: "alone", flag: "box_without_host" };
  return { shipping: delivery, flag: null };
}

/**
 * Host cut for an order: $3 per box unit, $1.50 per solo unit, 0 without a host.
 * Based on how it ships: a box order with no host has no host, so 0 anyway.
 * This is the amount that becomes owed once the units are delivered.
 */
export function hostCutCents(units: number, shipping: Shipping, hasHost: boolean): number {
  assertUnits(units);
  return hasHost ? units * HOST_CUT_CENTS[shipping] : 0;
}


// ---------------------------------------------------------------- box timing

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const BOX_FULL_AT = 5; // orders, not units
export const FULL_GRACE_HOURS = 24; // add-on window after the 5th order
export const BOX_MAX_OPEN_DAYS = 3; // in-game box ships 3 days after its first order at the latest
export const PRE_GAME_SHIP_DAYS = 7; // the pre-game box ships 7 days before the start

export interface BoxFacts {
  /** When the box's first order arrived (boxes.opened_at). */
  openedAt: Date;
  /** The host's game start (hosts.game_starts_at), if set. */
  gameStartsAt: Date | null;
  /** When the 5th order arrived (boxes.filled_at), if it has. */
  filledAt: Date | null;
  /** Orders still in the box (after any have left to ship alone). */
  orderIds: string[];
}

/**
 * When a box ships.
 * - Pre-game box (opened more than 7 days before the start): collects every
 *   order and ships 7 days before the start. Size doesn't matter.
 * - Otherwise (game on, inside the last 7 days, or no start date set): ships
 *   24h after the 5th order or 3 days after the first, whichever is first.
 */
export function boxShipAt(box: Omit<BoxFacts, "orderIds">): { at: Date; reason: "pre_game" | "full" | "max_open" } {
  if (box.gameStartsAt) {
    const preGameShip = new Date(box.gameStartsAt.getTime() - PRE_GAME_SHIP_DAYS * DAY_MS);
    if (box.openedAt < preGameShip) return { at: preGameShip, reason: "pre_game" };
  }
  const maxOpen = new Date(box.openedAt.getTime() + BOX_MAX_OPEN_DAYS * DAY_MS);
  if (box.filledAt) {
    const afterGrace = new Date(box.filledAt.getTime() + FULL_GRACE_HOURS * HOUR_MS);
    if (afterGrace < maxOpen) return { at: afterGrace, reason: "full" };
  }
  return { at: maxOpen, reason: "max_open" };
}

export type BoxDecision =
  | { action: "wait"; until: Date }
  | { action: "ship"; reason: "pre_game" | "full" | "max_open"; orderIds: string[] }
  | { action: "close_empty" };

/**
 * What the hourly cron should do with an open box right now.
 */
export function decideBox(box: BoxFacts, now: Date): BoxDecision {
  const { at, reason } = boxShipAt(box);
  if (now < at) return { action: "wait", until: at };
  if (box.orderIds.length === 0) return { action: "close_empty" };
  return { action: "ship", reason, orderIds: box.orderIds };
}


// ---------------------------------------------------------------- solo shipping

/** The shop's time zone for "business day" and payout weeks: US Pacific. */
export const SHOP_TIME_ZONE = "America/Los_Angeles";

/** The calendar date (YYYY-MM-DD) of an instant in the shop's time zone. */
export function shopDate(at: Date, timeZone = SHOP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Solo orders ship the next business day (Mon–Fri) after the order date. Holidays aren't skipped. */
export function soloShipDate(orderedAt: Date, timeZone = SHOP_TIME_ZONE): string {
  let day = addDays(shopDate(orderedAt, timeZone), 1);
  while ([0, 6].includes(new Date(`${day}T12:00:00Z`).getUTCDay())) day = addDays(day, 1);
  return day;
}

// ---------------------------------------------------------------- handoff

/** Crockford-style alphabet: no I, L, O, U, so codes are easy to read aloud and type. */
export const PICKUP_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const PICKUP_CODE_LENGTH = 6;

/** A new pickup code. `randomInt(n)` returns 0..n-1 (crypto.randomInt in production). */
export function generatePickupCode(randomInt: (max: number) => number): string {
  let code = "";
  for (let i = 0; i < PICKUP_CODE_LENGTH; i++) code += PICKUP_ALPHABET[randomInt(PICKUP_ALPHABET.length)];
  return code;
}

/** What a host typed → the stored form: uppercase, no spaces/dashes, O→0, I/L→1. */
export function normalizePickupCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

/** Wrong pickup-code tries allowed per order per hour before the order locks. */
export const HANDOFF_MAX_WRONG = 5;
export const HANDOFF_WINDOW_MS = HOUR_MS;

export interface HandoffAttempts {
  /** Wrong tries counted in the current window. */
  count: number;
  /** When the current window started (first wrong try in it). */
  since: Date | null;
}

/**
 * Records one wrong pickup-code try. The window is 1 hour from the first wrong
 * try in it; 5 wrong tries inside a window lock the order (until the owner
 * clears it) and flag it.
 */
export function recordWrongCode(attempts: HandoffAttempts, now: Date): HandoffAttempts & { lock: boolean } {
  const fresh = !attempts.since || now.getTime() - attempts.since.getTime() >= HANDOFF_WINDOW_MS;
  const next = fresh ? { count: 1, since: now } : { count: attempts.count + 1, since: attempts.since };
  return { ...next, lock: next.count >= HANDOFF_MAX_WRONG };
}

export type BuyerResponse = "yes" | "no" | "none";
export const DELIVERED_AFTER_DAYS = 7;

export interface UnitFacts {
  shipping: Shipping;
  /** Host typed the buyer's pickup code (box orders). */
  handedOffAt: Date | null;
  buyerResponse: BuyerResponse;
  /** Box orders: when the box reached the host (boxes.delivered_at). */
  boxDeliveredAt: Date | null;
  /** Solo orders: when it shipped to the buyer (orders.shipped_at). */
  shippedAt: Date | null;
}

export type UnitFlag = "buyer_says_not_received" | "buyer_disputes_handoff";

/**
 * Whether an order's units count as delivered, whether the host cut is owed,
 * and anything the owner should look at.
 * - The buyer saying "yes" counts as delivered right away.
 * - Box: delivered if the host typed the code, or 7 days after the box arrived
 *   without the buyer saying no.
 *   Buyer says no, no code typed → not delivered, not owed, flagged.
 *   Buyer says no, code typed → still owed, flagged for review.
 * - Solo (no handoff): delivered 7 days after it shipped unless the buyer says no.
 */
export function unitStatus(u: UnitFacts, now: Date): { delivered: boolean; owed: boolean; flag: UnitFlag | null } {
  const said = u.buyerResponse;
  if (u.shipping === "box" && u.handedOffAt) {
    return { delivered: true, owed: true, flag: said === "no" ? "buyer_disputes_handoff" : null };
  }
  if (said === "no") return { delivered: false, owed: false, flag: "buyer_says_not_received" };
  if (said === "yes") return { delivered: true, owed: true, flag: null };

  const arrived = u.shipping === "box" ? u.boxDeliveredAt : u.shippedAt;
  const delivered = !!arrived && now.getTime() >= arrived.getTime() + DELIVERED_AFTER_DAYS * DAY_MS;
  return { delivered, owed: delivered, flag: null };
}

// ---------------------------------------------------------------- payouts

/** The Monday (YYYY-MM-DD, shop time zone) of the payout week an instant falls in. */
export function payoutWeekStart(at: Date, timeZone = SHOP_TIME_ZONE): string {
  const day = shopDate(at, timeZone);
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}

// ---------------------------------------------------------------- helpers

function assertUnits(units: number) {
  if (!Number.isInteger(units) || units < 1) throw new RangeError(`An order has at least 1 unit, got ${units}`);
}
