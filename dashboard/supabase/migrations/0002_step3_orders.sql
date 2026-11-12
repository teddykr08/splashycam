-- Step 3 order rules. Approved 2026-11-12.
-- Applied to Supabase project "Splashy Cam" (yopyqygtwcdixximpxit).

-- A "Ship to me" order bought without a host link has no host.
alter table public.orders alter column host_id drop not null;

-- The checkout note "ship mine alone if my box isn't full in 3 days"
-- (3 days from this order; full = 5 orders). Replaces the old auto-ship flag.
alter table public.orders rename column auto_ship to ship_alone_if_not_full;
alter table public.orders alter column ship_alone_if_not_full set default false;

-- What we've refunded on this order (the top-up to 15% when its box reaches 5).
alter table public.orders add column refunded_cents int not null default 0
  check (refunded_cents >= 0);

-- Something for the owner to look at, e.g. 'box_without_host'. Null when fine.
alter table public.orders add column flag text;

-- An order that left its box to ship alone keeps box_id as a record of which box
-- it was in. Only box orders must have a box now.
alter table public.orders drop constraint box_matches_shipping;
alter table public.orders add constraint box_order_has_box
  check (shipping <> 'box' or box_id is not null);

-- The 'expired' values in box_status and order_status are no longer used:
-- boxes always ship at their deadline. Left in place (Postgres can't drop enum values).
