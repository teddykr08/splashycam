import { File, Paths } from "expo-file-system";
import { saveProof, lookupProof, serverEnabled, type SaveResult } from "./supabase";
import type { ProofRecord } from "./stamp";

/**
 * Codes that couldn't be registered (usually: no signal at the game). Kept in a small
 * JSON file on the phone and retried later. Only code + city + phone time are kept:
 * the same things that go to the server anyway.
 */
const file = () => new File(Paths.document, "pending-proofs.json");

function read(): ProofRecord[] {
  try {
    const f = file();
    if (!f.exists) return [];
    const data: unknown = JSON.parse(f.textSync());
    return Array.isArray(data) ? (data as ProofRecord[]) : [];
  } catch {
    return [];
  }
}

function write(list: ProofRecord[]) {
  try {
    const f = file();
    if (!f.exists) f.create();
    f.write(JSON.stringify(list));
  } catch {
    // Best effort. If the phone can't write a few bytes, there's nothing better to do.
  }
}

export function queueProof(rec: ProofRecord) {
  const list = read().filter((r) => r.code !== rec.code);
  write([...list, rec]);
}

/** Registers one code; queues it if offline, un-queues it once it's settled. */
export async function registerProof(rec: ProofRecord): Promise<SaveResult> {
  let r = await saveProof(rec);
  if (!r.ok && r.reason === "duplicate") {
    // Almost always our own earlier attempt that landed but whose reply was lost (timeout,
    // signal drop). A true random clash is ~1 in a billion per clip. Treat it as registered.
    const found = await lookupProof(rec.code);
    if (found.status === "found") r = { ok: true, createdAt: found.proof.createdAt };
  }
  if (r.ok || r.reason === "duplicate" || r.reason === "error") {
    write(read().filter((p) => p.code !== rec.code));
  } else if (r.reason === "offline") {
    queueProof(rec);
  }
  return r;
}

/** Retry everything queued. Returns how many are still waiting. */
export async function flushPending(): Promise<number> {
  if (!serverEnabled) return 0;
  const list = read();
  for (const rec of list) {
    const r = await registerProof(rec);
    if (!r.ok && r.reason === "offline") break; // still no signal; try again later
  }
  return read().length;
}
