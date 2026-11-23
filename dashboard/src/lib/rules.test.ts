import { describe, expect, it } from "vitest";
import {
  boxShipAt,
  classifyOrder,
  decideBox,
  generatePickupCode,
  hostCutCents,
  normalizePickupCode,
  orderPriceCents,
  PICKUP_ALPHABET,
  payoutWeekStart,
  soloShipDate,
  unitStatus,
  type BoxFacts,
  type UnitFacts,
} from "./rules";

const d = (iso: string) => new Date(iso);

describe("prices", () => {
  it("School box $15 and Ship to me $19 per unit, quantity × unit price", () => {
    expect(orderPriceCents(1, "box")).toBe(1500);
    expect(orderPriceCents(1, "alone")).toBe(1900);
    expect(orderPriceCents(4, "box")).toBe(6000);
    expect(orderPriceCents(3, "alone")).toBe(5700);
  });

  it("rejects 0 or fractional quantities", () => {
    for (const bad of [0, -1, 1.5]) expect(() => orderPriceCents(bad, "box")).toThrow(RangeError);
  });
});

describe("incoming orders", () => {
  it("box order with a host joins the box", () => {
    expect(classifyOrder("box", true)).toEqual({ shipping: "box", flag: null });
  });

  it("box order without a host ships alone and is flagged", () => {
    expect(classifyOrder("box", false)).toEqual({ shipping: "alone", flag: "box_without_host" });
  });

  it("ship-to-me orders ship alone", () => {
    expect(classifyOrder("alone", true)).toEqual({ shipping: "alone", flag: null });
  });
});

describe("host cut", () => {
  it("$3 per box unit, $1.50 per solo unit", () => {
    expect(hostCutCents(1, "box", true)).toBe(300);
    expect(hostCutCents(4, "box", true)).toBe(1200);
    expect(hostCutCents(1, "alone", true)).toBe(150);
    expect(hostCutCents(3, "alone", true)).toBe(450);
  });

  it("nothing without a host code", () => {
    expect(hostCutCents(2, "alone", false)).toBe(0);
  });

});

describe("box timing", () => {
  const start = d("2027-02-20T15:00:00Z");
  const box = (over: Partial<BoxFacts>): BoxFacts => ({
    openedAt: d("2027-01-01T12:00:00Z"),
    gameStartsAt: start,
    filledAt: null,
    orderIds: ["o1"],
    ...over,
  });

  it("pre-game box ships 7 days before the start, however many orders", () => {
    expect(boxShipAt(box({}))).toEqual({ at: d("2027-02-13T15:00:00Z"), reason: "pre_game" });
    // filling up early doesn't ship it sooner
    expect(boxShipAt(box({ filledAt: d("2027-01-05T00:00:00Z") })).reason).toBe("pre_game");
  });

  it("in-game box: 24h after the 5th order when that's sooner", () => {
    const b = box({ openedAt: d("2027-03-01T12:00:00Z"), filledAt: d("2027-03-02T09:00:00Z") });
    expect(boxShipAt(b)).toEqual({ at: d("2027-03-03T09:00:00Z"), reason: "full" });
  });

  it("in-game box: 3 days after the first order when that's sooner", () => {
    const b = box({ openedAt: d("2027-03-01T12:00:00Z"), filledAt: d("2027-03-03T18:00:00Z") });
    expect(boxShipAt(b)).toEqual({ at: d("2027-03-04T12:00:00Z"), reason: "max_open" });
    expect(boxShipAt(box({ openedAt: d("2027-03-01T12:00:00Z") }))).toEqual({ at: d("2027-03-04T12:00:00Z"), reason: "max_open" });
  });

  it("box opened inside the last 7 days before the start uses the in-game rule", () => {
    expect(boxShipAt(box({ openedAt: d("2027-02-15T12:00:00Z") })).reason).toBe("max_open");
  });

  it("no start date set: in-game rule", () => {
    expect(boxShipAt(box({ gameStartsAt: null })).reason).toBe("max_open");
  });

  it("decideBox: wait, then ship even under 5; close an empty box", () => {
    const b = box({ gameStartsAt: null, orderIds: ["o1", "o2"] });
    expect(decideBox(b, d("2027-01-02T00:00:00Z"))).toEqual({ action: "wait", until: d("2027-01-04T12:00:00Z") });
    expect(decideBox(b, d("2027-01-04T12:00:00Z"))).toEqual({ action: "ship", reason: "max_open", orderIds: ["o1", "o2"] });
    expect(decideBox({ ...b, orderIds: [] }, d("2027-01-05T00:00:00Z"))).toEqual({ action: "close_empty" });
  });

});

describe("solo shipping", () => {
  it("next business day in shop time", () => {
    expect(soloShipDate(d("2027-01-04T15:00:00Z"))).toBe("2027-01-05"); // Mon → Tue
    expect(soloShipDate(d("2027-01-08T15:00:00Z"))).toBe("2027-01-11"); // Fri → Mon
    expect(soloShipDate(d("2027-01-09T15:00:00Z"))).toBe("2027-01-11"); // Sat → Mon
    expect(soloShipDate(d("2027-01-10T15:00:00Z"))).toBe("2027-01-11"); // Sun → Mon
  });

  it("uses the shop's date (US Pacific), not UTC's", () => {
    // Friday 11pm Pacific = Saturday 07:00 UTC → still Friday's order → Monday
    expect(soloShipDate(d("2027-01-09T07:00:00Z"))).toBe("2027-01-11");
    // Thursday 9pm Pacific = Friday 05:00 UTC → Thursday's order → Friday
    expect(soloShipDate(d("2027-01-08T05:00:00Z"))).toBe("2027-01-08");
  });
});

describe("pickup codes", () => {
  it("6 characters from the readable alphabet", () => {
    let i = 0;
    const code = generatePickupCode(() => i++ % PICKUP_ALPHABET.length);
    expect(code).toBe("012345");
    const n = 31;
    expect(generatePickupCode(() => n)).toBe("ZZZZZZ");
    expect(PICKUP_ALPHABET).not.toMatch(/[ILOU]/);
  });

  it("normalizes what a host types", () => {
    expect(normalizePickupCode(" ab-c 1o9 ")).toBe("ABC109");
    expect(normalizePickupCode("lixo")).toBe("11X0"); // L→1, I→1, X stays, O→0
  });
});

describe("delivery and payout eligibility", () => {
  const now = d("2027-03-20T00:00:00Z");
  const box = (over: Partial<UnitFacts>): UnitFacts => ({
    shipping: "box",
    handedOffAt: null,
    buyerResponse: "none",
    boxDeliveredAt: null,
    shippedAt: null,
    ...over,
  });

  it("host typed the code → delivered and owed", () => {
    expect(unitStatus(box({ handedOffAt: d("2027-03-01T00:00:00Z") }), now)).toEqual({ delivered: true, owed: true, flag: null });
  });

  it("7 days after the box arrived with no complaint → delivered", () => {
    expect(unitStatus(box({ boxDeliveredAt: d("2027-03-13T00:00:00Z") }), now).owed).toBe(true);
    expect(unitStatus(box({ boxDeliveredAt: d("2027-03-14T00:00:00Z") }), now).owed).toBe(false);
    expect(unitStatus(box({}), now).owed).toBe(false); // box hasn't arrived
  });

  it("buyer says no and no code typed → not owed, flagged", () => {
    expect(unitStatus(box({ buyerResponse: "no", boxDeliveredAt: d("2027-01-01T00:00:00Z") }), now)).toEqual({
      delivered: false,
      owed: false,
      flag: "buyer_says_not_received",
    });
  });

  it("buyer says no but the code was typed → still owed, flagged for review", () => {
    expect(unitStatus(box({ buyerResponse: "no", handedOffAt: d("2027-03-01T00:00:00Z") }), now)).toEqual({
      delivered: true,
      owed: true,
      flag: "buyer_disputes_handoff",
    });
  });

  it("buyer says yes → delivered right away (box or solo)", () => {
    expect(unitStatus(box({ buyerResponse: "yes" }), now)).toEqual({ delivered: true, owed: true, flag: null });
    expect(unitStatus(box({ shipping: "alone", buyerResponse: "yes" }), now).owed).toBe(true);
  });

  it("solo: 7 days after shipping unless the buyer says no", () => {
    const solo = box({ shipping: "alone", shippedAt: d("2027-03-10T00:00:00Z") });
    expect(unitStatus(solo, now).owed).toBe(true);
    expect(unitStatus({ ...solo, buyerResponse: "no" }, now).flag).toBe("buyer_says_not_received");
  });
});

describe("payout weeks", () => {
  it("week starts Monday, US Pacific", () => {
    expect(payoutWeekStart(d("2027-01-06T15:00:00Z"))).toBe("2027-01-04"); // Wed
    expect(payoutWeekStart(d("2027-01-04T15:00:00Z"))).toBe("2027-01-04"); // Mon
    expect(payoutWeekStart(d("2027-01-10T15:00:00Z"))).toBe("2027-01-04"); // Sun
    expect(payoutWeekStart(d("2027-01-11T06:00:00Z"))).toBe("2027-01-04"); // Sun 10pm Pacific
  });
});
