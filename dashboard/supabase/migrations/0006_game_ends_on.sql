-- Estimated game end date on affiliate applications (/hosts form).
-- Applied 2026-11-20 by the owner in the Supabase SQL editor. This file keeps the
-- repo in sync; don't run it again.
-- Nullable in the database (earlier applications have no end date); the form and
-- the server action require it and check it's on or after game_starts_on.

alter table public.host_applications add column game_ends_on date;
