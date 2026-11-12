import { describe, expect, it } from "vitest";
import {
  boxDeadline,
  boxRefundCents,
  canShipNow,
  checkoutPriceCents,
  classifyOrder,
  decideBox,
  finalBoxPriceCents,
  hostCutCents,
  potCents,
  shouldLeaveBox,
  teamPackDiscount,
  variantPriceTable,
  type BoxFacts,
} from "./rules";

const d = (iso: string) => new Date(iso);

describe("checkout prices (the 8 variants)", () => {
  it("Ship to me: $21 / $37.80 / $53.55 / $67.20", () => {
    expect([1, 2, 3, 4].map((u) => checkoutPriceCents(u, "alone"))).toEqual([2100, 3780, 5355, 6720]);
  });

  it("School box (×0.9): $18.90 / $34.02 / $48.20 / $60.48", () => {
    expect([1, 2, 3, 4].map((u) => checkoutPriceCents(u, "box"))).toEqual([1890, 3402, 4820, 6048]);
  });

  it("variant table lists all 8", () => {
    expect(variantPriceTable()).toHaveLength(8);
  });

  it("team pack discounts 10/15/20%", () => {
    expect([1, 2, 3, 4].map(teamPackDiscount)).toEqual([0, 0.1, 0.15, 0.2]);
  });

  it("rejects 0, 5+ or fractional units", () => {
    for (const bad of [0, 5, 1.5]) expect(() => checkoutPriceCents(bad, "box")).toThrow(RangeError);
  });
});

describe("box refunds", () => {
  it("box under 5: final price is what they paid, no refund", () => {
    for (const n of [1, 2, 4]) {
      expect(finalBoxPriceCents(1, n)).toBe(1890);
      expect(boxRefundCents(1, 1890, n)).toBe(0);
    }
  });

  it("box of 5+: a single unit gets $1.05 back (15% off $21 = $17.85)", () => {
    expect(finalBoxPriceCents(1, 5)).toBe(1785);
    expect(boxRefundCents(1, 1890, 5)).toBe(105);
    expect(boxRefundCents(1, 1890, 12)).toBe(105);
  });

  it("box of 5+ with a team pack: discounts multiply", () => {
    // 4-pack: $84 × 0.80 × 0.85 = $57.12; paid $60.48 → $3.36 back
    expect(finalBoxPriceCents(4, 5)).toBe(5712);
    expect(boxRefundCents(4, 6048, 5)).toBe(336);
  });

  it("never refunds more than was paid or a negative amount", () => {
    expect(boxRefundCents(1, 50, 5)).toBe(0);
    expect(boxRefundCents(1, 0, 5)).toBe(0);
  });
});

describe("incoming orders", () => {
  it("box order with a host joins the box", () => {
    expect(classifyOrder("box", true)).toEqual({ shipping: "box", flag: null });
  });

  it("box order without a host ships alone and is flagged", () => {
    expect(classifyOrder("box", false)).toEqual({ shipping: "alone", flag: "box_without_host" });
  });

  it("ship-to-me orders ship alone, host or not", () => {
    expect(classifyOrder("alone", true)).toEqual({ shipping: "alone", flag: null });
    expect(classifyOrder("alone", false)).toEqual({ shipping: "alone", flag: null });
  });
});

describe("cuts", () => {
  it("host cut is on the full $21 price", () => {
    expect(hostCutCents(1, "box", 3)).toBe(210); // 10%
    expect(hostCutCents(1, "box", 5)).toBe(315); // 15%
    expect(hostCutCents(4, "box", 5)).toBe(1260); // 15% of $84
  });

  it("anything that ships alone on a host's code pays 5%", () => {
    expect(hostCutCents(1, "alone", 0)).toBe(105);
    expect(hostCutCents(1, "box", 1)).toBe(105); // a box that ships with 1 order
  });

  it("no host, no cut", () => {
    expect(hostCutCents(1, "alone", 0, false)).toBe(0);
  });

  it("pot is 10% of what was paid, only if the game has one", () => {
    expect(potCents(1785, true)).toBe(179);
    expect(potCents(1785, false)).toBe(0);
  });
});

describe("timing", () => {
  const start = d("2026-12-20T00:00:00Z");

  it("before the game: deadline is 5 days before it starts", () => {
    expect(boxDeadline(d("2026-12-01T00:00:00Z"), start)).toEqual(d("2026-12-15T00:00:00Z"));
  });

  it("box opened inside that window or after the start: 3 days after opening", () => {
    expect(boxDeadline(d("2026-12-17T00:00:00Z"), start)).toEqual(d("2026-12-20T00:00:00Z"));
    expect(boxDeadline(d("2026-12-25T00:00:00Z"), start)).toEqual(d("2026-12-28T00:00:00Z"));
  });

  it("no start date: 3 days after opening", () => {
    expect(boxDeadline(d("2026-12-01T00:00:00Z"), null)).toEqual(d("2026-12-04T00:00:00Z"));
  });

  it("ship now needs 2+ orders", () => {
    expect(canShipNow(1)).toBe(false);
    expect(canShipNow(2)).toBe(true);
  });
});

describe("ship mine alone if my box isn't full in 3 days", () => {
  const order = { createdAt: d("2026-12-01T12:00:00Z"), shipAloneIfNotFull: true };

  it("leaves after 3 days from that order when the box has under 5", () => {
    expect(shouldLeaveBox(order, 3, d("2026-12-04T11:59:00Z"))).toBe(false);
    expect(shouldLeaveBox(order, 3, d("2026-12-04T12:00:00Z"))).toBe(true);
  });

  it("stays if the box is full", () => {
    expect(shouldLeaveBox(order, 5, d("2026-12-10T00:00:00Z"))).toBe(false);
  });

  it("stays if the buyer didn't tick it", () => {
    expect(shouldLeaveBox({ ...order, shipAloneIfNotFull: false }, 1, d("2026-12-10T00:00:00Z"))).toBe(false);
  });
});

describe("decideBox", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `o${i + 1}`);
  const box = (over: Partial<BoxFacts>): BoxFacts => ({
    openedAt: d("2026-12-01T00:00:00Z"),
    gameStartsAt: null, // deadline 2026-12-04
    filledAt: null,
    orderIds: [],
    ...over,
  });

  it("a full box ships the day after the 5th order", () => {
    const b = box({ orderIds: ids(5), filledAt: d("2026-12-02T10:00:00Z") });
    expect(decideBox(b, d("2026-12-03T09:00:00Z"))).toEqual({ action: "wait", until: d("2026-12-03T10:00:00Z") });
    expect(decideBox(b, d("2026-12-03T10:00:00Z"))).toMatchObject({ action: "ship", reason: "full" });
  });

  it("waits until the deadline when not full", () => {
    expect(decideBox(box({ orderIds: ids(3) }), d("2026-12-03T00:00:00Z"))).toEqual({
      action: "wait",
      until: d("2026-12-04T00:00:00Z"),
    });
  });

  it("ships with whatever it has at the deadline, even 1 order", () => {
    expect(decideBox(box({ orderIds: ids(1) }), d("2026-12-04T00:00:00Z"))).toEqual({
      action: "ship",
      reason: "deadline",
      orderIds: ["o1"],
    });
    expect(decideBox(box({ orderIds: ids(3) }), d("2026-12-04T00:00:00Z"))).toMatchObject({ action: "ship" });
  });

  it("closes a box everyone left", () => {
    expect(decideBox(box({}), d("2026-12-05T00:00:00Z"))).toEqual({ action: "close_empty" });
  });
});
