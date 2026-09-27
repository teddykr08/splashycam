/**
 * Splashy Cam - proof codes.
 *
 * A code is what makes a clip checkable. It is short enough to survive being
 * re-compressed by iMessage or TikTok and still be readable, and random enough
 * that nobody can guess someone else's.
 */
import { getRandomValues } from "expo-crypto";

// Crockford-style alphabet: no I, L, O, U -> nothing gets misread.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export type ProofRecord = {
  code: string;        // display form, e.g. "HX7-42K"
  createdAt: string;   // ISO timestamp
  place: string | null; // city / region only - never a street address
};

export function generateCode(): string {
  // 256 is a multiple of 32, so `b % 32` has no bias.
  const bytes = getRandomValues(new Uint8Array(6));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return formatCode(chars.join(""));
}

/**
 * What people type -> what the server stores. Forgives case, spaces, dashes, and the
 * look-alikes Crockford maps back (O -> 0, I/L -> 1).
 */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

export function formatCode(raw: string): string {
  const c = normalizeCode(raw);
  return c.length > 3 ? `${c.slice(0, 3)}-${c.slice(3)}` : c;
}

export function isCompleteCode(input: string): boolean {
  const c = normalizeCode(input);
  return c.length === 6 && [...c].every((ch) => ALPHABET.includes(ch));
}

/** What gets drawn on screen and written into the record. */
export function stampLines(rec: ProofRecord): string[] {
  const d = new Date(rec.createdAt);
  const when = d.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
  return [
    `SPLASHY CAM  ${rec.code}`,
    rec.place ? `${when}  ·  ${rec.place}` : when,
  ];
}
