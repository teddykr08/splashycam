-- The affiliate signup on /hosts no longer asks about a buy-in.
-- NOT APPLIED YET. Waiting for approval.
-- Deletes the buy_in answer from existing applications (1 row as of 2026-11-19).

alter table public.host_applications drop column buy_in;
