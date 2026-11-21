/**
 * Parsing and auth for POST /api/dm-yes, the endpoint ManyChat's External
 * Request calls when a host taps a button in the Instagram DM flow.
 * Pure functions (no database), tested in dmLeads.test.ts.
 */
import { timingSafeEqual } from "node:crypto";
import { parseEmail, parseInstagram } from "./launch";

export const DM_STATUSES = ["yes", "more_info", "not_now", "asked_for_teddy"] as const;
export type DmStatus = (typeof DM_STATUSES)[number];

/** What gets upserted into host_leads. Absent fields are left as they are. */
export interface DmLead {
  instagram: string;
  status: DmStatus;
  name?: string;
  email?: string;
  note?: string;
}

export type DmParsed = { ok: true; lead: DmLead; ignored: string[] } | { ok: false; error: string };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** True only when the header matches the configured secret (constant-time). */
export function checkSecret(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * ManyChat sends `{ instagram, status, name?, email?, note? }`.
 * A missing or bad handle or status is an error. A bad email or an unfilled
 * ManyChat placeholder is dropped (listed in `ignored`) so the yes still lands.
 */
export function parseDmLead(body: unknown): DmParsed {
  if (!body || typeof body !== "object") return { ok: false, error: "body must be a JSON object" };
  const b = body as Record<string, unknown>;

  const instagram = parseInstagram(str(b.instagram));
  if (!instagram) return { ok: false, error: "instagram handle missing or invalid" };

  const status = str(b.status) || "yes";
  if (!(DM_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "unknown status" };

  const lead: DmLead = { instagram, status: status as DmStatus };
  const ignored: string[] = [];
  // ManyChat leaves "{{field}}" in place when a field is empty.
  const filled = (v: string) => v !== "" && !/^\{\{.*\}\}$/.test(v);

  const name = str(b.name);
  if (filled(name)) {
    if (name.length <= 100) lead.name = name;
    else ignored.push("name");
  }

  const emailRaw = str(b.email);
  if (filled(emailRaw)) {
    const email = parseEmail(emailRaw);
    if (email) lead.email = email;
    else ignored.push("email");
  }

  const note = str(b.note);
  if (filled(note)) lead.note = note.slice(0, 500);

  return { ok: true, lead, ignored };
}
