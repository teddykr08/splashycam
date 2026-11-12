/**
 * Every Splashy Cam box rule, as pure functions. No database, no clock, no I/O:
 * callers pass in the facts (and `now`) and get back a number or a decision.
 * The webhooks, the hourly cron and the dashboards all go through these.
 *
 * Money is integer cents. Rates are fractions (0.1 = 10%).
 *
 * How money moves:
 * - Checkout charges the variant price: pack size × delivery ("Ship to me" or
 *   "School box", which is 10% off). Buyers see the box discount at checkout.
 * - When a box reaches 5 orders, each buyer in it is refunded the top-up to 15%.
 * - Nothing is ever charged later. A box that ships small keeps its 10%.
 */

export const SOLO_PRICE_CENTS = 2100; // $21, shipping included
export const PACK_SIZES = [1, 2, 3, 4] as const; // a team pack is 2–4 units in one order

export const BOX_FULL_AT = 5; // orders, not units
export const BOX_MIN_TO_SHIP_NOW = 2; // the host's "ship now" button needs 2+ orders
export const BOX_CHECKOUT_DISCOUNT = 0.1; // the "School box" variant
export const BOX_FULL_DISCOUNT = 0.15; // what a box of 5+ ends up at

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEADLINE_BEFORE_GAME_DAYS = 5;
export const DEADLINE_AFTER_OPEN_DAYS = 3; // once the game is live
export const SHIP_AFTER_FULL_DAYS = 1; // a full box ships the next day
export const SHIP_ALONE_AFTER_DAYS = 3; // "ship mine alone if my box isn't full in 3 days"

export const POT_RATE = 0.1;

/** What the buyer picked at checkout (the variant's second option). */
export type Delivery = "box" | "alone";
/** How the order actually ships. */
export type Shipping = "box" | "alone";

// ---------------------------------------------------------------- prices

/** Team pack: one order with 2, 3 or 4 units gets 10 / 15 / 20% off. */
export function teamPackDiscount(units: number): number {
  assertUnits(units);
  return [0, 0, 0.1, 0.15, 0.2][units];
}

/** Full price before any discount. */
export function listCents(units: number): number {
  assertUnits(units);
  return SOLO_PRICE_CENTS * units;
}

/**
 * The variant price charged at checkout. "School box" is 10% off, on top of
 * the team pack (discounts multiply). These are the 8 variant prices in Shopify.
 */
export function checkoutPriceCents(units: number, delivery: Delivery): number {
  const box = delivery === "box" ? BOX_CHECKOUT_DISCOUNT : 0;
  return Math.round(listCents(units) * (1 - teamPackDiscount(units)) * (1 - box));
}

/** All 8 variants, for the Shopify product setup and the storefront list. */
export function variantPriceTable() {
  return PACK_SIZES.flatMap((units) =>
    (["alone", "box"] as const).map((delivery) => ({ units, delivery, cents: checkoutPriceCents(units, delivery) })),
  );
}

/**
 * What a box order finally costs once its box ships: 15% off (on top of the
 * team pack) if the box reached 5 orders, otherwise the 10%-off price they paid.
 */
export function finalBoxPriceCents(units: number, boxOrderCount: number): number {
  if (boxOrderCount < BOX_FULL_AT) return checkoutPriceCents(units, "box");
  return Math.round(listCents(units) * (1 - teamPackDiscount(units)) * (1 - BOX_FULL_DISCOUNT));
}

/**
 * Refund owed to a box order when its box ships: the top-up from 10% to 15%
 * if the box reached 5 orders ($1.05 on a single unit), else nothing.
 * Never negative, never more than was paid.
 */
export function boxRefundCents(units: number, paidCents: number, boxOrderCount: number): number {
  if (boxOrderCount < BOX_FULL_AT) return 0;
  return Math.min(paidCents, Math.max(0, paidCents - finalBoxPriceCents(units, boxOrderCount)));
}

// ---------------------------------------------------------------- incoming orders

/**
 * How a new order should be recorded. A "School box" order that arrives
 * without a host can't join a box: it ships alone and is flagged for the owner.
 */
export function classifyOrder(delivery: Delivery, hasHost: boolean): { shipping: Shipping; flag: string | null } {
  if (delivery === "box" && !hasHost) return { shipping: "alone", flag: "box_without_host" };
  return { shipping: delivery, flag: null };
}

// ---------------------------------------------------------------- cuts

/**
 * Host's cut, a share of the full price (before any discount):
 * box of 5+ → 15%, box of 2–4 → 10%, anything that ships alone on their
 * code (including a box that ships with 1 order) → 5%. No host → nothing.
 */
export function hostCutRate(shipping: Shipping, boxOrderCount: number, hasHost = true): number {
  if (!hasHost) return 0;
  if (shipping === "alone" || boxOrderCount < 2) return 0.05;
  return boxOrderCount >= BOX_FULL_AT ? 0.15 : 0.1;
}

export function hostCutCents(units: number, shipping: Shipping, boxOrderCount: number, hasHost = true): number {
  return Math.round(listCents(units) * hostCutRate(shipping, boxOrderCount, hasHost));
}

/** The game's pot: 10% of what the buyer actually paid (after refunds), only if the game has a pot. */
export function potCents(paidCents: number, gameHasPot: boolean): number {
  return gameHasPot ? Math.round(paidCents * POT_RATE) : 0;
}

// ---------------------------------------------------------------- timing

/**
 * When a box ships at the latest.
 * Before the game: 5 days before it starts. Once it's live, or for a box opened
 * inside that window: 3 days after the box opened.
 * No start date set yet → treated as live (3 days after opening).
 */
export function boxDeadline(openedAt: Date, gameStartsAt: Date | null): Date {
  const afterOpen = new Date(openedAt.getTime() + DEADLINE_AFTER_OPEN_DAYS * DAY_MS);
  if (!gameStartsAt) return afterOpen;
  const beforeGame = new Date(gameStartsAt.getTime() - DEADLINE_BEFORE_GAME_DAYS * DAY_MS);
  return openedAt < beforeGame ? beforeGame : afterOpen;
}

/** The host may press "ship now" once the box has 2+ orders. */
export function canShipNow(orderCount: number): boolean {
  return orderCount >= BOX_MIN_TO_SHIP_NOW;
}

/**
 * "Ship mine alone if my box isn't full in 3 days": true once 3 days have passed
 * since this order and its box still has fewer than 5 orders. The order then
 * leaves the box and ships alone at the price it paid.
 */
export function shouldLeaveBox(
  order: { createdAt: Date; shipAloneIfNotFull: boolean },
  boxOrderCount: number,
  now: Date,
): boolean {
  if (!order.shipAloneIfNotFull || boxOrderCount >= BOX_FULL_AT) return false;
  return now.getTime() >= order.createdAt.getTime() + SHIP_ALONE_AFTER_DAYS * DAY_MS;
}

export interface BoxFacts {
  openedAt: Date;
  gameStartsAt: Date | null;
  /** When the 5th order arrived, if it has. */
  filledAt: Date | null;
  /** Orders still in the box (after any have left to ship alone). */
  orderIds: string[];
}

export type BoxDecision =
  | { action: "wait"; until: Date }
  | { action: "ship"; reason: "full" | "deadline"; orderIds: string[] }
  | { action: "close_empty" };

/**
 * What the hourly cron should do with an open box right now. Run shouldLeaveBox
 * on its orders first, then decide with the orders that are left.
 * - 5+ orders: ship the day after it filled.
 * - At the deadline: ship with whatever it has, even 1 order. Boxes never expire.
 * - Empty at the deadline (everyone left): close it, nothing to ship.
 */
export function decideBox(box: BoxFacts, now: Date): BoxDecision {
  const count = box.orderIds.length;

  if (count >= BOX_FULL_AT && box.filledAt) {
    const shipAt = new Date(box.filledAt.getTime() + SHIP_AFTER_FULL_DAYS * DAY_MS);
    return now >= shipAt ? { action: "ship", reason: "full", orderIds: box.orderIds } : { action: "wait", until: shipAt };
  }

  const deadline = boxDeadline(box.openedAt, box.gameStartsAt);
  if (now < deadline) return { action: "wait", until: deadline };
  if (count === 0) return { action: "close_empty" };
  return { action: "ship", reason: "deadline", orderIds: box.orderIds };
}

// ---------------------------------------------------------------- helpers

function assertUnits(units: number) {
  if (!Number.isInteger(units) || units < 1 || units > PACK_SIZES.length) {
    throw new RangeError(`An order has 1–${PACK_SIZES.length} units, got ${units}`);
  }
}
