import { describe, expect, it } from "vitest";
import {
  checkGameDates,
  DATE_MESSAGES,
  isBot,
  normalizeSchool,
  parseDate,
  parseEmail,
  parseHostApplication,
  parseInstagram,
  parseReservation,
} from "./launch";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe("email", () => {
  it("accepts and lowercases a valid email", () => {
    expect(parseEmail("  Sam@Example.COM ")).toBe("sam@example.com");
  });

  it("rejects missing or malformed email", () => {
    for (const email of ["", "sam", "sam@", "sam@example", "a b@c.d"]) {
      expect(parseEmail(email)).toBeNull();
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
    expect(parseInstagram("  @ some_one  ")).toBe("some_one");
    expect(parseInstagram("instagram.com/some_one")).toBe("some_one");
    expect(parseInstagram("www.instagram.com/some.one/?hl=en")).toBe("some.one");
    expect(parseInstagram("https://m.instagram.com/some.one#top")).toBe("some.one");
    expect(parseInstagram("@@doubled")).toBe("doubled");
  });

  it("rejects spaces, symbols and too-long handles", () => {
    expect(parseInstagram("two words")).toBe("twowords"); // spaces are stripped
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
      form({ name: "", email: "x", instagram: "<bad>", school: "", game_starts_on: "soon", game_ends_on: "", player_count: "lots" }),
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

describe("reservation", () => {
  const good = { name: "Sam Lee", instagram: "https://instagram.com/sam.lee/", email: "", school: "  Lincoln   High " };
  const anyone = { hostSchool: null, options: ["alone" as const] };
  const boxHost = { hostSchool: "Lincoln High", options: ["box" as const, "alone" as const] };

  it("no host link: typed school (tidied), Ship to me, handle stripped, email optional", () => {
    expect(parseReservation(form(good), anyone)).toEqual({
      ok: true,
      data: { name: "Sam Lee", instagram: "sam.lee", email: null, school: "Lincoln High", delivery: "alone" },
    });
  });

  it("no host link: a posted School box is ignored, only Ship to me is possible", () => {
    const r = parseReservation(form({ ...good, delivery: "box" }), anyone);
    expect(r.ok && r.data.delivery).toBe("alone");
  });

  it("host link: school comes from the host, whatever was posted", () => {
    const r = parseReservation(form({ ...good, school: "Somewhere Else", delivery: "box" }), boxHost);
    expect(r.ok && r.data).toMatchObject({ school: "Lincoln High", delivery: "box" });
  });

  it("host link with boxes on: must pick one of the two", () => {
    const r = parseReservation(form(good), boxHost);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.delivery).toBeTruthy();
    expect(parseReservation(form({ ...good, delivery: "pickup" }), boxHost).ok).toBe(false);
  });

  it("host link with boxes off: Ship to me only", () => {
    const r = parseReservation(form({ ...good, delivery: "box" }), { hostSchool: "Lincoln High", options: ["alone"] });
    expect(r.ok && r.data.delivery).toBe("alone");
  });

  it("instagram and name required; a bad email is an error, a blank one isn't", () => {
    const r = parseReservation(form({ name: "", instagram: "@", email: "nope", school: "" }), anyone);
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["email", "instagram", "name", "school"]);
    const ok = parseReservation(form({ ...good, email: " Sam@Example.com " }), anyone);
    expect(ok.ok && ok.data.email).toBe("sam@example.com");
  });

  it("normalizeSchool collapses spaces", () => {
    expect(normalizeSchool("  a 	 b  ")).toBe("a b");
  });
});
