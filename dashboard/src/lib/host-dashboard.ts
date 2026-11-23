/**
 * What a host sees on their private dashboard (/h/[token]), computed from their
 * own rows. Pure (no database), tested in host-dashboard.test.ts.
 */
import { BOX_FULL_AT, boxShipAt, unitStatus, type BuyerResponse, type Shipping } from "./rules";

export interface HostOrderRow {
  id: string;
  buyer_name: string;
  units: number;
  shipping: Shipping;
  status: string;
  box_id: string | null;
  pickup_code: string | null;
  handed_off_at: string | null;
  buyer_response: string;
  host_cut_cents: number | null;
  shipped_at: string | null;
  created_at: string;
}

export interface HostBoxRow {
  id: string;
  status: string;
  opened_at: string;
  filled_at: string | null;
  delivered_at: string | null;
}

export interface HostPayoutRow {
  amount_cents: number;
  paid_at: string | null;
}

export interface HostOrderView {
  id: string;
  buyerName: string;
  units: number;
  shipping: Shipping;
  /** Box orders still waiting for the host to type the buyer's code. */
  needsHandoff: boolean;
  handedOff: boolean;
  owed: boolean;
  createdAt: string;
}

export interface HostDashboard {
  /** Host cut on delivered units (owed or already paid). */
  earnedCents: number;
  paidCents: number;
  /** Host cut on units not delivered yet. */
  pendingCents: number;
  openBox: null | {
    orders: number;
    fullAt: number;
    shipsAt: string; // ISO
    reason: "pre_game" | "full" | "max_open";
  };
  orders: HostOrderView[];
}

const asDate = (s: string | null) => (s ? new Date(s) : null);
const asResponse = (s: string): BuyerResponse => (s === "yes" || s === "no" ? s : "none");

export function buildHostDashboard(
  host: { game_starts_at: string | null },
  orders: HostOrderRow[],
  boxes: HostBoxRow[],
  payouts: HostPayoutRow[],
  now: Date,
): HostDashboard {
  const boxById = new Map(boxes.map((b) => [b.id, b]));
  const live = orders.filter((o) => o.status !== "cancelled");

  let earnedCents = 0;
  let pendingCents = 0;
  const views: HostOrderView[] = live.map((o) => {
    const box = o.box_id ? boxById.get(o.box_id) : undefined;
    const { owed } = unitStatus(
      {
        shipping: o.shipping,
        handedOffAt: asDate(o.handed_off_at),
        buyerResponse: asResponse(o.buyer_response),
        boxDeliveredAt: asDate(box?.delivered_at ?? null),
        shippedAt: asDate(o.shipped_at),
      },
      now,
    );
    const cut = o.host_cut_cents ?? 0;
    if (owed) earnedCents += cut;
    else pendingCents += cut;
    return {
      id: o.id,
      buyerName: o.buyer_name,
      units: o.units,
      shipping: o.shipping,
      needsHandoff: o.shipping === "box" && !!o.pickup_code && !o.handed_off_at,
      handedOff: !!o.handed_off_at,
      owed,
      createdAt: o.created_at,
    };
  });

  // Newest first, but orders waiting for a handoff on top.
  views.sort((a, b) => Number(b.needsHandoff) - Number(a.needsHandoff) || b.createdAt.localeCompare(a.createdAt));

  const open = boxes.find((b) => b.status === "open");
  let openBox: HostDashboard["openBox"] = null;
  if (open) {
    const inBox = live.filter((o) => o.box_id === open.id && o.shipping === "box").length;
    const ship = boxShipAt({
      openedAt: new Date(open.opened_at),
      gameStartsAt: asDate(host.game_starts_at),
      filledAt: asDate(open.filled_at),
    });
    openBox = { orders: inBox, fullAt: BOX_FULL_AT, shipsAt: ship.at.toISOString(), reason: ship.reason };
  }

  const paidCents = payouts.filter((p) => p.paid_at).reduce((sum, p) => sum + p.amount_cents, 0);
  return { earnedCents, paidCents, pendingCents, openBox, orders: views };
}

/** "$12.50" */
export function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
