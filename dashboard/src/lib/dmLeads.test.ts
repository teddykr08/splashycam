import { describe, expect, it } from "vitest";
import { checkSecret, parseDmLead } from "./dmLeads";

describe("checkSecret", () => {
  it("accepts only an exact match", () => {
    expect(checkSecret("s3cret", "s3cret")).toBe(true);
    expect(checkSecret("s3cret!", "s3cret")).toBe(false);
    expect(checkSecret("nope", "s3cret")).toBe(false);
  });

  it("fails closed when either side is missing", () => {
    expect(checkSecret(null, "s3cret")).toBe(false);
    expect(checkSecret("s3cret", undefined)).toBe(false);
    expect(checkSecret("", "")).toBe(false);
  });
});

describe("parseDmLead", () => {
  it("normalizes the handle and email, defaults status to yes", () => {
    expect(parseDmLead({ instagram: "@Some.Host", email: " Sam@Example.com ", name: "Sam" })).toEqual({
      ok: true,
      lead: { instagram: "Some.Host", status: "yes", email: "sam@example.com", name: "Sam" },
      ignored: [],
    });
  });

  it("keeps the yes when the email is bad, and says so", () => {
    const r = parseDmLead({ instagram: "host_1", status: "yes", email: "not an email" });
    expect(r).toEqual({ ok: true, lead: { instagram: "host_1", status: "yes" }, ignored: ["email"] });
  });

  it("drops unfilled ManyChat placeholders", () => {
    const r = parseDmLead({ instagram: "host_1", status: "more_info", email: "{{email}}", name: "{{full_name}}" });
    expect(r).toEqual({ ok: true, lead: { instagram: "host_1", status: "more_info" }, ignored: [] });
  });

  it("rejects a missing handle, unknown status or non-object body", () => {
    expect(parseDmLead({ status: "yes" }).ok).toBe(false);
    expect(parseDmLead({ instagram: "two words" }).ok).toBe(false);
    expect(parseDmLead({ instagram: "host_1", status: "maybe" }).ok).toBe(false);
    expect(parseDmLead("hi").ok).toBe(false);
    expect(parseDmLead(null).ok).toBe(false);
  });
});
