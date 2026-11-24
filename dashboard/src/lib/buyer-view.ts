/**
 * What a buyer sees on their order page (/o/[orderId]/[sig]). Pure, tested in
 * buyer-view.test.ts.
 */
import { boxShipAt, soloShipDate, type BuyerResponse, type Shipping } from "./rules";

export interface BuyerOrderRow {
  buyer_name: string;
  units: number;
  shipping: Shipping;
  status: string;
  pickup_code: string | null;
  handed_off_at: string | null;
  buyer_response: string;
  shipped_at: string | null;
  created_at: string;
}

export interface BuyerBoxRow {
  status: string;
  opened_at: string;
  filled_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

export type BuyerStage =
  | "cancelled"
  | "box_filling" // box still collecting orders
  | "box_on_the_way" // box shipped to the host
  | "at_host" // box arrived, ready for pickup
  | "handed_off" // host typed their code
  | "solo_preparing" // ship-to-me, not shipped yet
  | "solo_shipped";

export interface BuyerView {
  firstName: string;
  units: number;
  shipping: Shipping;
  stage: BuyerStage;
  pickupCode: string | null;
  /** Box filling: when it ships (ISO). Solo preparing: the ship date (YYYY-MM-DD). */
  shipsBy: string | null;
  /** Show the "got it?" yes/no buttons. */
  canConfirm: boolean;
  response: BuyerResponse;
  hostFirstName: string | null;
}

const asResponse = (s: string): BuyerResponse => (s === "yes" || s === "no" ? s : "none");
const firstName = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || null;

export function buildBuyerView(
  order: BuyerOrderRow,
  box: BuyerBoxRow | null,
  host: { name: string; game_starts_at: string | null } | null,
): BuyerView {
  let stage: BuyerStage;
  let shipsBy: string | null = null;

  if (order.status === "cancelled") stage = "cancelled";
  else if (order.shipping === "alone") {
    if (order.shipped_at) stage = "solo_shipped";
    else {
      stage = "solo_preparing";
      shipsBy = soloShipDate(new Date(order.created_at));
    }
  } else if (order.handed_off_at) stage = "handed_off";
  else if (box?.delivered_at) stage = "at_host";
  else if (box && (box.status === "shipped" || box.shipped_at)) stage = "box_on_the_way";
  else {
    stage = "box_filling";
    if (box) {
      shipsBy = boxShipAt({
        openedAt: new Date(box.opened_at),
        gameStartsAt: host?.game_starts_at ? new Date(host.game_starts_at) : null,
        filledAt: box.filled_at ? new Date(box.filled_at) : null,
      }).at.toISOString();
    }
  }

  return {
    firstName: firstName(order.buyer_name) ?? "there",
    units: order.units,
    shipping: order.shipping,
    stage,
    pickupCode: order.shipping === "box" ? order.pickup_code : null,
    shipsBy,
    canConfirm: stage === "at_host" || stage === "handed_off" || stage === "solo_shipped",
    response: asResponse(order.buyer_response),
    hostFirstName: firstName(host?.name),
  };
}
