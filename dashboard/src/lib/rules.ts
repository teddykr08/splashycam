/**
 * Every Splashy Cam box rule, as pure functions. No database, no clock, no I/O:
 * callers pass in the facts (and `now`) and get back a number or a decision.
 * The cron job, the webhooks and the dashboards all go through these.
 *
 * Money is integer cents. Rates are fractions (0.1 = 10%).
 * Lines marked ASSUMPTION are guesses still waiting on a decision.
 */

export const SOLO_PRICE_CENTS = 2100; // $21, shipping included
export const MAX_UNITS_PER_ORDER = 4; // a team pack is 2–4 units in one order

export const BOX_FULL_AT = 5; // orders, not units
export const BOX_MIN_TO_SHIP_NOW = 2; // the host's "ship now" button needs 2+ orders

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEADLINE_BEFORE_GAME_DAYS = 5;
export const DEADLINE_AFTER_OPEN_DAYS = 3; // once the game is live
export const SHIP_AFTER_FULL_DAYS = 1; // a full box ships the next day

export const POT_RATE = 0.1;

export type Shipping = "box" | "alone";

// ---------------------------------------------------------------- prices

/** Team pack: one order with 2, 3 or 4 units gets 10 / 15 / 20% off. */
export function teamPackDiscount(units: number): number {
  assertUnits(units);
  return [0, 0, 0.1, 0.15, 0.2][units];
}

/** Box discount by how many ORDERS are in the box: 1 → none, 2–4 → 10%, 5+ → 15%. */
export function boxDiscount(orderCount: number): number {
  if (orderCount >= BOX_FULL_AT) return 0.15;
  if (orderCount >= 2) return 0.1;
  return 0;
}

/**
 * What one order costs. Team-pack and box discounts multiply:
 * 4 units in a full box = $21 × 0.80 × 0.85 = $14.28 each.
 * Shipping alone never gets the box discount. Buyers are charged when the
 * box ships, so `boxOrderCount` is the box's final size.
 */
export function orderPrice(units: number, shipping: Shipping, boxOrderCount: number) {
  const team = teamPackDiscount(units);
  const box = shipping === "box" ? boxDiscount(boxOrderCount) : 0;
  const listCents = SOLO_PRICE_CENTS * units;
  const totalCents = Math.round(listCents * (1 - team) * (1 - box));
  return { listCents, teamDiscount: team, boxDiscount: box, totalCents };
}

// ---------------------------------------------------------------- cuts

/**
 * Host's cut, a share of the $21 list price (before any discounts):
 * box of 2–4 → 10%, box of 5+ → 15%, shipping alone on their code → 5%.
 * ASSUMPTION: a box that ships with only 1 order pays the host 5%, the
 * same as shipping alone, since it gets no box discount either.
 */
export function hostCutRate(shipping: Shipping, boxOrderCount: number): number {
  if (shipping === "alone" || boxOrderCount < 2) return 0.05;
  return boxOrderCount >= BOX_FULL_AT ? 0.15 : 0.1;
}

export function hostCutCents(units: number, shipping: Shipping, boxOrderCount: number): number {
  assertUnits(units);
  return Math.round(SOLO_PRICE_CENTS * units * hostCutRate(shipping, boxOrderCount));
}

/** The game's pot: 10% of what the buyer actually paid, only if the game has a pot. */
export function potCents(paidCents: number, gameHasPot: boolean): number {
  return gameHasPot ? Math.round(paidCents * POT_RATE) : 0;
}

// ---------------------------------------------------------------- timing

/**
 * When a box ships at the latest if it never fills.
 * Before the game: 5 days before it starts. Once it's live, or for a box opened
 * inside that window: 3 days after the box opened.
 * ASSUMPTION: no start date set yet → treated as live (3 days after opening).
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

export interface BoxOrderFacts {
  id: string;
  /** The buyer's "ship it anyway if my box doesn't fill" checkbox. */
  autoShip: boolean;
}

export interface BoxFacts {
  openedAt: Date;
  gameStartsAt: Date | null;
  /** When the 5th order arrived, if it has. */
  filledAt: Date | null;
  orders: BoxOrderFacts[];
}

export type BoxDecision =
  | { action: "wait"; until: Date }
  | { action: "ship"; reason: "full" | "deadline"; orderIds: string[] }
  | { action: "expire"; orderIds: string[] };

/**
 * What the hourly cron should do with an open box right now.
 * - 5+ orders: ship the day after it filled.
 * - At the deadline with 2+ orders: ship.
 * - At the deadline with 1 order: ship it (no box discount, still to the host)
 *   if the buyer ticked auto-ship; otherwise it expires and is never charged.
 * - Empty box at the deadline: expire.
 */
export function decideBox(box: BoxFacts, now: Date): BoxDecision {
  const ids = box.orders.map((o) => o.id);

  if (box.orders.length >= BOX_FULL_AT && box.filledAt) {
    const shipAt = new Date(box.filledAt.getTime() + SHIP_AFTER_FULL_DAYS * DAY_MS);
    return now >= shipAt ? { action: "ship", reason: "full", orderIds: ids } : { action: "wait", until: shipAt };
  }

  const deadline = boxDeadline(box.openedAt, box.gameStartsAt);
  if (now < deadline) return { action: "wait", until: deadline };

  if (box.orders.length >= 2) return { action: "ship", reason: "deadline", orderIds: ids };
  if (box.orders.length === 1 && box.orders[0].autoShip) return { action: "ship", reason: "deadline", orderIds: ids };
  return { action: "expire", orderIds: ids };
}

// ---------------------------------------------------------------- helpers

function assertUnits(units: number) {
  if (!Number.isInteger(units) || units < 1 || units > MAX_UNITS_PER_ORDER) {
    throw new RangeError(`An order has 1–${MAX_UNITS_PER_ORDER} units, got ${units}`);
  }
}
