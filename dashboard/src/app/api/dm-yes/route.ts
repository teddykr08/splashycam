/**
 * Instagram DM leads: POST /api/dm-yes
 * Called by ManyChat's External Request step when a host taps a button in the
 * DM flow (I'm in, Tell me more, Not now, Talk to Teddy).
 *
 * 1. Header `x-dm-secret` must equal DM_WEBHOOK_SECRET, or 401.
 * 2. Body `{ instagram, status, name?, email?, note? }` (see lib/dmLeads.ts).
 * 3. Upsert into host_leads on the handle. Fields not sent are left as they
 *    are, so a later "Not now" never wipes an email collected earlier.
 *    Safe to retry.
 */
import { NextResponse } from "next/server";
import { checkSecret, parseDmLead } from "@/lib/dmLeads";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!checkSecret(request.headers.get("x-dm-secret"), process.env.DM_WEBHOOK_SECRET)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const parsed = parseDmLead(body);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });

  try {
    const { error } = await createAdminClient()
      .from("host_leads")
      .upsert({ ...parsed.lead, updated_at: new Date().toISOString() }, { onConflict: "instagram" });
    if (error) throw error;
    console.info("[dm-yes]", parsed.lead.instagram, parsed.lead.status, parsed.ignored);
    return NextResponse.json({ ok: true, status: parsed.lead.status, ignored: parsed.ignored });
  } catch (error) {
    console.error("[dm-yes]", parsed.lead.instagram, error);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
