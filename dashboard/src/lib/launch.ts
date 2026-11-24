/**
 * Validation for the pre-launch forms. Pure functions (no database), tested in
 * launch.test.ts. The server actions in src/app/actions.ts call these before
 * writing anything. The rules mirror the checks in migration 0004.
 */

import type { Delivery } from "./rules";

export const HONEYPOT_FIELD = "website"; // hidden field; bots fill it, people don't

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const INSTAGRAM = /^[A-Za-z0-9._]{1,30}$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type FieldErrors<K extends string> = Partial<Record<K, string>>;
export type Parsed<T, K extends string> = { ok: true; data: T } | { ok: false; errors: FieldErrors<K> };

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** True when the hidden honeypot field was filled in: treat as a bot. */
export function isBot(fd: FormData): boolean {
  return text(fd, HONEYPOT_FIELD) !== "";
}

export function parseEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

export interface HostApplication {
  name: string;
  email: string;
  instagram: string;
  school: string;
  game_starts_on: string; // YYYY-MM-DD, an estimate
  game_ends_on: string; // YYYY-MM-DD, an estimate; on or after game_starts_on
  player_count: number;
}
export type HostField = keyof HostApplication;

/**
 * Accepts a handle with or without "@", stray spaces, or a full profile URL
 * ("https://www.instagram.com/some.handle/?hl=en", "instagram.com/some.handle")
 * and returns just "some.handle" (case kept), or null if it isn't a valid handle.
 */
export function parseInstagram(raw: string): string | null {
  const handle = raw
    .replace(/\s+/g, "")
    .replace(/^(https?:\/\/)?(www\.|m\.)?instagram\.com\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .replace(/^@+/, "");
  return INSTAGRAM.test(handle) ? handle : null;
}

/** A real calendar date in YYYY-MM-DD, between 2025 and 2035. */
export function parseDate(raw: string): string | null {
  const m = DATE.exec(raw.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  const real = date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
  return real && y >= 2025 && y <= 2035 ? m[0] : null;
}

export const DATE_MESSAGES = {
  start: "Add an estimated start date (a rough guess is fine).",
  end: "Add an estimated end date (a rough guess is fine).",
  order: "The end date can't be before the start date.",
} as const;

/**
 * Both game dates are required estimates, and the end is on or after the start.
 * Shared by the form (in the browser) and the server action, so both say the same thing.
 */
export function checkGameDates(startRaw: string, endRaw: string): {
  start: string | null;
  end: string | null;
  errors: FieldErrors<"game_starts_on" | "game_ends_on">;
} {
  const start = parseDate(startRaw);
  const end = parseDate(endRaw);
  const errors: FieldErrors<"game_starts_on" | "game_ends_on"> = {};
  if (!start) errors.game_starts_on = DATE_MESSAGES.start;
  if (!end) errors.game_ends_on = DATE_MESSAGES.end;
  // YYYY-MM-DD strings compare correctly as text.
  if (start && end && end < start) errors.game_ends_on = DATE_MESSAGES.order;
  return { start, end, errors };
}

export function parseHostApplication(fd: FormData): Parsed<HostApplication, HostField> {
  const errors: FieldErrors<HostField> = {};

  const name = text(fd, "name");
  if (name.length < 1 || name.length > 100) errors.name = "Enter your name.";

  const email = parseEmail(text(fd, "email"));
  if (!email) errors.email = "Enter a valid email.";

  const instagram = parseInstagram(text(fd, "instagram"));
  if (!instagram) errors.instagram = "Enter your Instagram handle, like @yourhandle.";

  const school = text(fd, "school");
  if (school.length < 1 || school.length > 120) errors.school = "Enter your school.";

  const dates = checkGameDates(text(fd, "game_starts_on"), text(fd, "game_ends_on"));
  Object.assign(errors, dates.errors);

  const playersRaw = text(fd, "player_count");
  const player_count = Number(playersRaw);
  if (!/^\d+$/.test(playersRaw) || player_count < 1 || player_count > 5000) {
    errors.player_count = "Enter a number of players (1–5000).";
  }


  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name,
      email: email!,
      instagram: instagram!,
      school,
      game_starts_on: dates.start!,
      game_ends_on: dates.end!,
      player_count,
    },
  };
}

export interface Reservation {
  name: string;
  instagram: string;
  email: string | null;
  school: string;
  delivery: Delivery;
}
export type ReservationField = keyof Reservation;

/** "  Lincoln   High " → "Lincoln High", so the one-per-school check isn't fooled by spacing. */
export function normalizeSchool(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * The free reservation form on "/". Through a host link the school comes from
 * the host (the field is locked; whatever was posted is ignored). `options` are
 * the delivery choices that visitor was offered (store.deliveryOptions).
 */
export function parseReservation(
  fd: FormData,
  ctx: { hostSchool: string | null; options: Delivery[] },
): Parsed<Reservation, ReservationField> {
  const errors: FieldErrors<ReservationField> = {};

  const name = text(fd, "name");
  if (name.length < 1 || name.length > 100) errors.name = "Enter your name.";

  const instagram = parseInstagram(text(fd, "instagram"));
  if (!instagram) errors.instagram = "Enter your Instagram handle, like @yourhandle.";

  const emailRaw = text(fd, "email");
  const email = emailRaw ? parseEmail(emailRaw) : null;
  if (emailRaw && !email) errors.email = "Enter a valid email, or leave it blank.";

  const school = ctx.hostSchool ?? normalizeSchool(text(fd, "school"));
  if (school.length < 1 || school.length > 120) errors.school = "Enter your school.";

  let delivery: Delivery | undefined = ctx.options.length === 1 ? ctx.options[0] : undefined;
  if (!delivery) {
    const picked = text(fd, "delivery") as Delivery;
    if (ctx.options.includes(picked)) delivery = picked;
    else errors.delivery = "Pick School box or Ship to me.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { name, instagram: instagram!, email, school, delivery: delivery! } };
}
