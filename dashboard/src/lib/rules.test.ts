import { describe, expect, it } from "vitest";
import {
  boxDeadline,
  boxDiscount,
  canShipNow,
  decideBox,
  hostCutCents,
  orderPrice,
  potCents,
  teamPackDiscount,
  type BoxFacts,
} from "./rules";

const d = (iso: string) => new Date(iso);

describe("prices", () => {
  it("solo is $21", () => {
    expect(orderPrice(1, "alone", 0).totalCents).toBe(2100);
  });

  it("team packs: 2/3/4 units get 10/15/20% off", () => {
    expect(teamPackDiscount(1)).toBe(0);
    expect(orderPrice(2, "alone", 0).totalCents).toBe(3780); // 2 × 21 × 0.90
    expect(orderPrice(3, "alone", 0).totalCents).toBe(5355); // 3 × 21 × 0.85
    expect(orderPrice(4, "alone", 0).totalCents).toBe(6720); // 4 × 21 × 0.80
  });

  it("rejects 0, 5+ or fractional units", () => {
    for (const bad of [0, 5, 1.5]) expect(() => orderPrice(bad, "box", 2)).toThrow(RangeError);
  });

  it("box discount counts orders: 1 none, 2–4 10%, 5+ 15%", () => {
    expect(boxDiscount(1)).toBe(0);
    expect(boxDiscount(2)).toBe(0.1);
    expect(boxDiscount(4)).toBe(0.1);
    expect(boxDiscount(5)).toBe(0.15);
    expect(boxDiscount(40)).toBe(0.15);
  });

  it("team pack and box discounts multiply", () => {
    // 4 units × $21 × 0.80 × 0.85 = $57.12
    expect(orderPrice(4, "box", 5).totalCents).toBe(5712);
    expect(orderPrice(1, "box", 3).totalCents).toBe(1890);
  });

  it("a box that ships with 1 order gets no box discount", () => {
    expect(orderPrice(1, "box", 1).totalCents).toBe(2100);
  });

  it("shipping alone never gets the box discount", () => {
    expect(orderPrice(1, "alone", 9).totalCents).toBe(2100);
  });
});

describe("cuts", () => {
  it("host cut is on the $21 list price", () => {
    expect(hostCutCents(1, "box", 3)).toBe(210); // 10%
    expect(hostCutCents(1, "box", 5)).toBe(315); // 15%
    expect(hostCutCents(1, "alone", 0)).toBe(105); // 5%
    expect(hostCutCents(4, "box", 5)).toBe(1260); // 15% of $84, not of the discounted price
  });

  it("1-order box pays the host 5% (assumption)", () => {
    expect(hostCutCents(1, "box", 1)).toBe(105);
  });

  it("pot is 10% of what was paid, only if the game has one", () => {
    expect(potCents(5712, true)).toBe(571);
    expect(potCents(5712, false)).toBe(0);
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

describe("decideBox", () => {
  const orders = (n: number, autoShip = false) =>
    Array.from({ length: n }, (_, i) => ({ id: `o${i + 1}`, autoShip }));
  const box = (over: Partial<BoxFacts>): BoxFacts => ({
    openedAt: d("2026-12-01T00:00:00Z"),
    gameStartsAt: null, // deadline 2026-12-04
    filledAt: null,
    orders: [],
    ...over,
  });

  it("a full box ships the day after the 5th order", () => {
    const b = box({ orders: orders(5), filledAt: d("2026-12-02T10:00:00Z") });
    expect(decideBox(b, d("2026-12-03T09:00:00Z"))).toEqual({ action: "wait", until: d("2026-12-03T10:00:00Z") });
    expect(decideBox(b, d("2026-12-03T10:00:00Z"))).toMatchObject({ action: "ship", reason: "full" });
  });

  it("a full box ships even before the deadline", () => {
    const b = box({ orders: orders(6), filledAt: d("2026-12-01T01:00:00Z") });
    expect(decideBox(b, d("2026-12-02T01:00:00Z"))).toMatchObject({ action: "ship", reason: "full" });
  });

  it("waits until the deadline when not full", () => {
    expect(decideBox(box({ orders: orders(3) }), d("2026-12-03T00:00:00Z"))).toEqual({
      action: "wait",
      until: d("2026-12-04T00:00:00Z"),
    });
  });

  it("2–4 orders ship at the deadline", () => {
    expect(decideBox(box({ orders: orders(2) }), d("2026-12-04T00:00:00Z"))).toEqual({
      action: "ship",
      reason: "deadline",
      orderIds: ["o1", "o2"],
    });
  });

  it("1 order with auto-ship ships at the deadline", () => {
    expect(decideBox(box({ orders: orders(1, true) }), d("2026-12-04T00:00:00Z"))).toMatchObject({ action: "ship" });
  });

  it("1 order without auto-ship expires (never charged)", () => {
    expect(decideBox(box({ orders: orders(1, false) }), d("2026-12-04T00:00:00Z"))).toEqual({
      action: "expire",
      orderIds: ["o1"],
    });
  });

  it("an empty box expires at the deadline", () => {
    expect(decideBox(box({}), d("2026-12-05T00:00:00Z"))).toEqual({ action: "expire", orderIds: [] });
  });
});
