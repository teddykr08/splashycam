/**
 * Server-only Supabase client with the service-role key. It bypasses row-level
 * security, so only import it from route handlers and server code, never from
 * a client component.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export type Db = ReturnType<typeof createAdminClient>;

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL or service role key missing in .env.local");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
