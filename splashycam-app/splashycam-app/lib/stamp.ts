/**
 * Splashy Cam - proof codes.
 *
 * A code is what makes a clip checkable. It is short enough to survive being
 * re-compressed by iMessage or TikTok and still be readable, and random enough
 * that nobody can guess someone else's.
 */

// Crockford-style alphabet: no I, L, O, U -> nothing gets misread.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export type ProofRecord = {
  code: string;
  createdAt: string;   // ISO timestamp
  place: string | null; // city / region only - never a street address
};

export function generateCode(): string {
  const bytes = new Uint8Array(6);
  // expo/react-native provides global crypto.getRandomValues
  (globalThis.crypto ?? require("expo-crypto")).getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `${chars.slice(0, 3).join("")}-${chars.slice(3).join("")}`;
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

export function verifyUrl(code: string): string {
  return `https://splashycam.app/v/${code.replace("-", "")}`;
}
