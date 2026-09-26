import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import type { ProofRecord } from "./stamp";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

/**
 * We store a few bytes per clip: the code, when, and roughly where.
 * We never upload the video - that would cost money and it is not ours to keep.
 */
export async function saveProof(rec: ProofRecord): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("proofs").insert({
    code: rec.code.replace("-", ""),
    created_at: rec.createdAt,
    place: rec.place,
  });
  return !error;
}

export async function lookupProof(code: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("proofs")
    .select("code, created_at, place")
    .eq("code", code.replace("-", "").toUpperCase())
    .maybeSingle();
  return data;
}
