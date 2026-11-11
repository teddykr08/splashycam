/**
 * Splashy Cam - proof codes.
 *
 * A code is what makes a clip checkable. It is short enough to survive being
 * re-compressed by iMessage or TikTok and still be readable, and random enough
 * that nobody can guess someone else's.
 */
import { getRandomValues } from "expo-crypto";
import { ALPHABET, formatCode } from "./code";

export { normalizeCode, formatCode, isCompleteCode, extractCode, stampTime, stampDuration } from "./code";

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
