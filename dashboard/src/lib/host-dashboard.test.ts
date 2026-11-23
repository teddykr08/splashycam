import { describe, expect, it } from "vitest";
import { buildHostDashboard, dollars, type HostBoxRow, type HostOrderRow } from "./host-dashboard";

const now = new Date("2027-03-20T00:00:00Z");
const order = (over: Partial<HostOrderRow>): HostOrderRow => ({
  id: "o",
  buyer_name: "Sam",
  units: 1,
  shipping: "box",
  status: "charged",
  box_id: "b1",
  pickup_code: "ABC123",
  handed_off_at: null,
  buyer_response: "none",
  host_cut_cents: 300,
  shipped_at: null,
  created_at: "2027-03-18T00:00:00Z",
  ...over,
});
const openBox: HostBoxRow = { id: "b1", status: "open", opened_at: "2027-03-18T00:00:00Z", filled_at: null, delivered_at: null };

describe("host dashboard", () => {
  it("earned = delivered cuts, pending = the rest, cancelled ignored", () => {
    const d = buildHostDashboard(
      { game_starts_at: null },
      [
        order({ id: "a", handed_off_at: "2027-03-19T00:00:00Z" }), // owed
        order({ id: "b" }), // pending
        order({ id: "c", buyer_response: "yes" }), // owed
        order({ id: "d", status: "cancelled" }), // ignored
        order({ id: "e", shipping: "alone", box_id: null, pickup_code: null, host_cut_cents: 150, shipped_at: "2027-03-01T00:00:00Z" }), // owed
      ],
      [openBox],
      [{ amount_cents: 300, paid_at: "2027-03-15T00:00:00Z" }, { amount_cents: 999, paid_at: null }],
      now,
    );
    expect(d.earnedCents).toBe(750);
    expect(d.pendingCents).toBe(300);
    expect(d.paidCents).toBe(300);
    expect(d.orders.map((o) => o.id)).not.toContain("d");
  });

  it("orders waiting for a handoff come first", () => {
    const d = buildHostDashboard(
      { game_starts_at: null },
      [
        order({ id: "done", handed_off_at: "2027-03-19T00:00:00Z", created_at: "2027-03-19T12:00:00Z" }),
        order({ id: "wait", created_at: "2027-03-18T00:00:00Z" }),
      ],
      [openBox],
      [],
      now,
    );
    expect(d.orders.map((o) => o.id)).toEqual(["wait", "done"]);
    expect(d.orders[0].needsHandoff).toBe(true);
    expect(d.orders[1].needsHandoff).toBe(false);
  });

  it("open box progress and ship date", () => {
    const d = buildHostDashboard({ game_starts_at: null }, [order({ id: "a" }), order({ id: "b" }), order({ id: "c" })], [openBox], [], now);
    expect(d.openBox).toEqual({ orders: 3, fullAt: 5, shipsAt: "2027-03-21T00:00:00.000Z", reason: "max_open" });
  });

  it("pre-game box ships 7 days before the start", () => {
    const d = buildHostDashboard({ game_starts_at: "2027-05-10T17:00:00Z" }, [order({})], [openBox], [], now);
    expect(d.openBox?.reason).toBe("pre_game");
    expect(d.openBox?.shipsAt).toBe("2027-05-03T17:00:00.000Z");
  });

  it("no open box → null", () => {
    expect(buildHostDashboard({ game_starts_at: null }, [], [], [], now).openBox).toBeNull();
  });

  it("formats dollars", () => {
    expect(dollars(1250)).toBe("$12.50");
    expect(dollars(0)).toBe("$0.00");
  });
});
