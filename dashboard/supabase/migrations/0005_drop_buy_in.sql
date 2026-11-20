-- The affiliate signup on /hosts no longer asks about a buy-in.
-- Applied 2026-11-19 by the owner in the Supabase SQL editor (the MCP migration
-- tool declined this destructive statement).
-- Deletes the buy_in answer from existing applications (1 row as of 2026-11-19).

alter table public.host_applications drop column buy_in;
