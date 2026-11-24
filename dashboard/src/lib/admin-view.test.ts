import { describe, expect, it } from "vitest";
import {
  buildShipQueue,
  inventory,
  makeHostCode,
  NO_SCHOOL,
  ordersForAdmin,
  owedByHost,
  type AdminBox,
  type AdminHost,
  type AdminOrder,
} from "./admin-view";

const now = new Date("2027-03-20T20:00:00Z");
const host = (over: Partial<AdminHost>): AdminHost => ({
  id: "h1",
  name: "Jordan Park",
  email: "j@example.test",
  code: "LINCOLN-ABC",
  school: "Lincoln High",
  instagram: "jordan",
  venmo_handle: "jordan-p",
  boxes_enabled: true,
  game_starts_at: null,
  dashboard_token: "t".repeat(36),
  ship_to: null,
  created_at: "2027-01-01T00:00:00Z",
  ...over,
});
const box = (over: Partial<AdminBox>): AdminBox => ({
  id: "b1",
  host_id: "h1",
  status: "open",
  opened_at: "2027-03-15T00:00:00Z",
  filled_at: null,
  shipped_at: null,
  delivered_at: null,
  tracking: null,
  ...over,
});
const order = (over: Partial<AdminOrder>): AdminOrder => ({
  id: "o1",
  shopify_order_id: "1",
  host_id: "h1",
  box_id: "b1",
  shipping: "box",
  units: 1,
  buyer_name: "Sam",
  buyer_email: "s@example.test",
  ship_to: null,
  status: "charged",
  paid_cents: 1500,
  host_cut_cents: 300,
  flag: null,
  pickup_code: "ABC123",
  handed_off_at: null,
  handoff_locked_at: null,
  buyer_response: "none",
  shipped_at: null,
  tracking: null,
  payout_id: null,
  created_at: "2027-03-15T00:00:00Z",
  ...over,
});

describe("ship queue", () => {
  it("open box past its ship time is ready; a newer one is filling", () => {
    const q = buildShipQueue(
      [host({})],
      [box({ id: "old" }), box({ id: "new", opened_at: "2027-03-19T00:00:00Z" })],
      [order({ id: "a", box_id: "old", units: 2 }), order({ id: "b", box_id: "old" }), order({ id: "c", box_id: "new" })],
      now,
    );
    expect(q.readyBoxes.map((r) => [r.box.id, r.orders, r.units])).toEqual([["old", 2, 3]]);
    expect(q.fillingBoxes.map((r) => [r.box.id, r.shipsAt])).toEqual([["new", "2027-03-22T00:00:00.000Z"]]);
  });

  it("shipped boxes without delivered_at are in transit", () => {
    const q = buildShipQueue([host({})], [box({ status: "shipped", shipped_at: "2027-03-18T00:00:00Z" })], [order({})], now);
    expect(q.inTransit).toHaveLength(1);
    expect(q.readyBoxes).toHaveLength(0);
  });

  it("solo orders not shipped yet, earliest ship date first; cancelled ignored", () => {
    const q = buildShipQueue(
      [host({})],
      [],
      [
        order({ id: "late", shipping: "alone", box_id: null, created_at: "2027-03-19T20:00:00Z" }),
        order({ id: "early", shipping: "alone", box_id: null, created_at: "2027-03-17T20:00:00Z" }),
        order({ id: "gone", shipping: "alone", box_id: null, status: "cancelled" }),
        order({ id: "sent", shipping: "alone", box_id: null, shipped_at: "2027-03-18T00:00:00Z" }),
      ],
      now,
    );
    expect(q.soloWaiting.map((s) => [s.order.id, s.shipDate])).toEqual([
      ["early", "2027-03-18"],
      ["late", "2027-03-22"],
    ]);
  });
});

describe("payouts owed", () => {
  it("delivered, unpaid cuts per host", () => {
    const owed = owedByHost(
      [host({}), host({ id: "h2", name: "Nobody" })],
      [box({})],
      [
        order({ id: "a", handed_off_at: "2027-03-18T00:00:00Z" }),
        order({ id: "b", buyer_response: "yes", host_cut_cents: 600 }),
        order({ id: "c" }), // not delivered
        order({ id: "d", handed_off_at: "2027-03-18T00:00:00Z", payout_id: "p1" }), // already paid
        order({ id: "e", handed_off_at: "2027-03-18T00:00:00Z", status: "cancelled" }),
      ],
      now,
    );
    expect(owed.map((o) => [o.host.id, o.cents, o.orderIds])).toEqual([["h1", 900, ["a", "b"]]]);
  });
});

describe("inventory", () => {
  it("made vs sold vs left, cancelled not counted", () => {
    expect(inventory(100, [order({ units: 3 }), order({ units: 2, status: "cancelled" }), order({ units: 1 })])).toEqual({
      made: 100,
      sold: 4,
      left: 96,
    });
  });
});

describe("orders list", () => {
  const hosts = [host({}), host({ id: "h2", school: "Roosevelt" })];
  const orders = [
    order({ id: "plain", created_at: "2027-03-19T00:00:00Z" }),
    order({ id: "flagged", flag: "unexpected_price", created_at: "2027-03-10T00:00:00Z" }),
    order({ id: "said-no", buyer_response: "no", created_at: "2027-03-11T00:00:00Z" }),
    order({ id: "locked", handoff_locked_at: "2027-03-12T00:00:00Z", created_at: "2027-03-12T00:00:00Z" }),
    order({ id: "rose", host_id: "h2", created_at: "2027-03-18T00:00:00Z" }),
    order({ id: "nohost", host_id: null, box_id: null, shipping: "alone", created_at: "2027-03-17T00:00:00Z" }),
  ];

  it("flagged first (stored + live flags), then newest", () => {
    const list = ordersForAdmin(hosts, [box({})], orders, now);
    expect(list.map((v) => v.order.id)).toEqual(["locked", "said-no", "flagged", "plain", "rose", "nohost"]);
    expect(list.find((v) => v.order.id === "said-no")?.flags).toEqual(["buyer_says_not_received"]);
    expect(list.find((v) => v.order.id === "locked")?.flags).toEqual(["handoff_locked"]);
  });

  it("filters by school, including orders with no school", () => {
    expect(ordersForAdmin(hosts, [], orders, now, "Roosevelt").map((v) => v.order.id)).toEqual(["rose"]);
    expect(ordersForAdmin(hosts, [], orders, now, NO_SCHOOL).map((v) => v.order.id)).toEqual(["nohost"]);
  });
});

describe("host codes", () => {
  it("first real word of the school + 3 random characters", () => {
    expect(makeHostCode("Lincoln High School", () => 0)).toBe("LINCOLN-000");
    expect(makeHostCode("The Harker School", () => 31)).toBe("HARKER-ZZZ");
    expect(makeHostCode("St. Ignatius College Prep", () => 10)).toBe("ST-AAA");
    expect(makeHostCode("Woodrow Wilson Classical High", () => 1)).toBe("WOODROW-111");
    expect(makeHostCode("!!!", () => 2)).toBe("HOST-222");
  });
});
