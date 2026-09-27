import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { normalizeCode, type ProofRecord } from "./stamp";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

const TIMEOUT_MS = 10_000;

/** A proof as the server knows it. `createdAt` is the server's clock, not the phone's. */
export type ServerProof = { code: string; createdAt: string; place: string | null };

export type SaveResult =
  | { ok: true; createdAt: string }
  | { ok: false; reason: "unconfigured" | "offline" | "duplicate" | "error"; message?: string };

export type LookupResult =
  | { status: "found"; proof: ServerProof }
  | { status: "not_found" }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

type ProofRow = { code: string; created_at: string; place: string | null };

function withTimeout(): { signal: AbortSignal; done: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

// postgrest-js reports fetch failures as an error whose message starts with the fetch error name.
function looksOffline(message: string): boolean {
  return /network request failed|failed to fetch|fetcherror|abort/i.test(message);
}

/**
 * Registers a clip's code, city and time. A few bytes; the video never leaves the phone.
 * The server stamps the time itself so it can't be backdated.
 */
export async function saveProof(rec: ProofRecord): Promise<SaveResult> {
  if (!supabase) return { ok: false, reason: "unconfigured" };
  const { signal, done } = withTimeout();
  try {
    const { data, error } = await supabase
      .rpc("register_proof", { p_code: normalizeCode(rec.code), p_place: rec.place })
      .abortSignal(signal);
    if (error) {
      if (error.code === "23505") return { ok: false, reason: "duplicate" };
      if (looksOffline(error.message)) return { ok: false, reason: "offline" };
      return { ok: false, reason: "error", message: error.message };
    }
    if (typeof data !== "string") return { ok: false, reason: "error", message: "Unexpected response" };
    return { ok: true, createdAt: data };
  } catch (e) {
    return { ok: false, reason: "offline", message: String(e) };
  } finally {
    done();
  }
}

export async function lookupProof(code: string): Promise<LookupResult> {
  if (!supabase) return { status: "unconfigured" };
  const { signal, done } = withTimeout();
  try {
    const { data, error } = await supabase
      .rpc("verify_proof", { p_code: normalizeCode(code) })
      .abortSignal(signal);
    if (error) return { status: "error", message: error.message };
    const rows = (Array.isArray(data) ? data : []) as ProofRow[];
    const row = rows[0];
    if (!row) return { status: "not_found" };
    return { status: "found", proof: { code: row.code, createdAt: row.created_at, place: row.place } };
  } catch (e) {
    return { status: "error", message: String(e) };
  } finally {
    done();
  }
}
