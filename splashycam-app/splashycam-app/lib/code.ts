/**
 * Proof-code and stamp formatting. Pure functions, no React Native, so tests can run in Node.
 */

// Crockford-style alphabet: no I, L, O, U -> nothing gets misread.
export const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

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

const pad = (n: number) => String(n).padStart(2, "0");

/** Camcorder-style local time, fixed width so it doesn't jitter: "2026-09-27  17:04:12". */
export function stampTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Recording length as "00:12". */
export function stampDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
