import { describe, expect, it } from "vitest";
import { checkGameDates, DATE_MESSAGES, isBot, parseDate, parseHostApplication, parseInstagram, parseWaitlist } from "./launch";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe("waitlist", () => {
  it("accepts and lowercases a valid email", () => {
    expect(parseWaitlist(form({ email: "  Sam@Example.COM " }))).toEqual({ ok: true, data: { email: "sam@example.com" } });
  });

  it("rejects missing or malformed email", () => {
    for (const email of ["", "sam", "sam@", "sam@example", "a b@c.d"]) {
      expect(parseWaitlist(form({ email })).ok).toBe(false);
    }
  });

  it("honeypot filled → bot", () => {
    expect(isBot(form({ website: "http://spam" }))).toBe(true);
    expect(isBot(form({ website: "" }))).toBe(false);
    expect(isBot(form({}))).toBe(false);
  });
});

describe("instagram", () => {
  it("normalizes handles and profile links", () => {
    expect(parseInstagram("@splashycam.shop")).toBe("splashycam.shop");
    expect(parseInstagram("https://www.instagram.com/some_one/")).toBe("some_one");
    expect(parseInstagram("plain")).toBe("plain");
  });

  it("rejects spaces, symbols and too-long handles", () => {
    expect(parseInstagram("two words")).toBeNull();
    expect(parseInstagram("<script>")).toBeNull();
    expect(parseInstagram("a".repeat(31))).toBeNull();
    expect(parseInstagram("@")).toBeNull();
  });
});

describe("dates", () => {
  it("accepts real dates in range", () => {
    expect(parseDate("2027-01-15")).toBe("2027-01-15");
  });

  it("rejects impossible or out-of-range dates", () => {
    expect(parseDate("2027-02-30")).toBeNull();
    expect(parseDate("1999-01-01")).toBeNull();
    expect(parseDate("15/01/2027")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("host application", () => {
  const good = {
    name: "Jordan Park",
    email: "Jordan@School.org",
    instagram: "@jordan.p",
    school: "Lincoln High",
    game_starts_on: "2027-02-01",
    game_ends_on: "2027-03-15",
    player_count: "120",
  };

  it("parses a complete application", () => {
    expect(parseHostApplication(form(good))).toEqual({
      ok: true,
      data: {
        name: "Jordan Park",
        email: "jordan@school.org",
        instagram: "jordan.p",
        school: "Lincoln High",
        game_starts_on: "2027-02-01",
        game_ends_on: "2027-03-15",
        player_count: 120,
      },
    });
  });


  it("reports every bad field at once", () => {
    const r = parseHostApplication(
      form({ name: "", email: "x", instagram: "no spaces", school: "", game_starts_on: "soon", game_ends_on: "", player_count: "lots" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(
        ["email", "game_ends_on", "game_starts_on", "instagram", "name", "player_count", "school"].sort(),
      );
    }
  });

  it("player count must be a whole number 1–5000", () => {
    for (const n of ["0", "5001", "12.5", "-3"]) {
      expect(parseHostApplication(form({ ...good, player_count: n })).ok).toBe(false);
    }
  });
});

describe("game dates", () => {
  it("both required", () => {
    expect(checkGameDates("", "").errors).toEqual({ game_starts_on: DATE_MESSAGES.start, game_ends_on: DATE_MESSAGES.end });
    expect(checkGameDates("2027-02-01", "").errors).toEqual({ game_ends_on: DATE_MESSAGES.end });
    expect(checkGameDates("", "2027-02-01").errors).toEqual({ game_starts_on: DATE_MESSAGES.start });
  });

  it("end on or after start", () => {
    expect(checkGameDates("2027-02-01", "2027-02-01").errors).toEqual({});
    expect(checkGameDates("2027-02-01", "2027-03-01").errors).toEqual({});
    expect(checkGameDates("2027-02-01", "2027-01-31").errors).toEqual({ game_ends_on: DATE_MESSAGES.order });
  });

  it("invalid dates are treated as missing", () => {
    expect(checkGameDates("2027-02-30", "2027-13-01").errors).toEqual({
      game_starts_on: DATE_MESSAGES.start,
      game_ends_on: DATE_MESSAGES.end,
    });
  });

  it("the full form rejects an end before the start", () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ name: "A", email: "a@b.co", instagram: "a", school: "S", game_starts_on: "2027-03-01", game_ends_on: "2027-02-01", player_count: "10" })) fd.set(k, v);
    const r = parseHostApplication(fd);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual({ game_ends_on: DATE_MESSAGES.order });
  });
});
