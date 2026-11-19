/**
 * Validation for the pre-launch forms. Pure functions (no database), tested in
 * launch.test.ts. The server actions in src/app/actions.ts call these before
 * writing anything. The rules mirror the checks in migration 0004.
 */

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

export function parseWaitlist(fd: FormData): Parsed<{ email: string }, "email"> {
  const email = parseEmail(text(fd, "email"));
  return email ? { ok: true, data: { email } } : { ok: false, errors: { email: "Enter a valid email." } };
}

export interface HostApplication {
  name: string;
  email: string;
  instagram: string;
  school: string;
  game_starts_on: string; // YYYY-MM-DD
  player_count: number;
}
export type HostField = keyof HostApplication;

/** "@Some.Handle" or "instagram.com/some.handle/" → "Some.Handle". */
export function parseInstagram(raw: string): string | null {
  const handle = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");
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

  const game_starts_on = parseDate(text(fd, "game_starts_on"));
  if (!game_starts_on) errors.game_starts_on = "Pick the game's start date.";

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
      game_starts_on: game_starts_on!,
      player_count,
    },
  };
}
