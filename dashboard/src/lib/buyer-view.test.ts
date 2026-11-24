import { describe, expect, it } from "vitest";
import { buildBuyerView, type BuyerBoxRow, type BuyerOrderRow } from "./buyer-view";

const order = (over: Partial<BuyerOrderRow>): BuyerOrderRow => ({
  buyer_name: "Sam Lee",
  units: 1,
  shipping: "box",
  status: "charged",
  pickup_code: "ABC123",
  handed_off_at: null,
  buyer_response: "none",
  shipped_at: null,
  created_at: "2027-03-01T18:00:00Z",
  ...over,
});
const box = (over: Partial<BuyerBoxRow>): BuyerBoxRow => ({
  status: "open",
  opened_at: "2027-03-01T12:00:00Z",
  filled_at: null,
  shipped_at: null,
  delivered_at: null,
  ...over,
});
const host = { name: "Jordan Park", game_starts_at: null };

describe("buyer view", () => {
  it("box filling: pickup code, ship-by date, no buttons yet", () => {
    const v = buildBuyerView(order({}), box({}), host);
    expect(v).toMatchObject({ firstName: "Sam", stage: "box_filling", pickupCode: "ABC123", canConfirm: false, hostFirstName: "Jordan" });
    expect(v.shipsBy).toBe("2027-03-04T12:00:00.000Z");
  });

  it("box on the way, then at the host (buttons appear)", () => {
    expect(buildBuyerView(order({}), box({ status: "shipped", shipped_at: "2027-03-04T00:00:00Z" }), host).stage).toBe("box_on_the_way");
    const v = buildBuyerView(order({}), box({ status: "shipped", delivered_at: "2027-03-07T00:00:00Z" }), host);
    expect(v).toMatchObject({ stage: "at_host", canConfirm: true });
  });

  it("handed off → buttons, keeps their answer", () => {
    const v = buildBuyerView(order({ handed_off_at: "2027-03-08T00:00:00Z", buyer_response: "yes" }), box({}), host);
    expect(v).toMatchObject({ stage: "handed_off", canConfirm: true, response: "yes" });
  });

  it("ship to me: no pickup code; ship date, then buttons once shipped", () => {
    const solo = order({ shipping: "alone", pickup_code: null });
    const v = buildBuyerView(solo, null, null);
    expect(v).toMatchObject({ stage: "solo_preparing", pickupCode: null, shipsBy: "2027-03-02", canConfirm: false, hostFirstName: null });
    expect(buildBuyerView({ ...solo, shipped_at: "2027-03-02T20:00:00Z" }, null, null)).toMatchObject({ stage: "solo_shipped", canConfirm: true });
  });

  it("cancelled", () => {
    expect(buildBuyerView(order({ status: "cancelled" }), box({}), host)).toMatchObject({ stage: "cancelled", canConfirm: false });
  });
});
