-- New business rules (2026-11-22): flat prices, flat host cuts, handoff
-- confirmation with pickup codes, weekly Venmo payouts.
-- NOT APPLIED YET. The owner runs this in the Supabase SQL editor.
-- Assumes payouts is still empty (it was, with orders and boxes, on 2026-11-22);
-- adding week_start NOT NULL fails if payouts has rows.

-- Hosts: where weekly payouts go.
alter table public.hosts
  add column venmo_handle text check (venmo_handle ~ '^[A-Za-z0-9_-]{1,40}$');  -- stored without the @

-- Boxes: when the box reached the host. Starts the 7-day "no complaint" clock.
alter table public.boxes
  add column delivered_at timestamptz;

-- Orders: quantity is now the unit count (no 1–4 pack limit).
alter table public.orders drop constraint orders_units_check;
alter table public.orders add constraint orders_units_check check (units >= 1);

-- Orders: handoff confirmation, solo shipping, which payout paid the cut.
alter table public.orders
  add column pickup_code        text unique,                 -- box orders, 6 chars, set at order time
  add column handed_off_at      timestamptz,                 -- host typed the buyer's code
  add column buyer_response     text not null default 'none'
    check (buyer_response in ('yes', 'no', 'none')),
  add column buyer_responded_at timestamptz,
  add column shipped_at         timestamptz,                 -- solo orders: shipped to the buyer
  add column payout_id          uuid;                        -- the weekly payout that covered this cut

-- Payouts: one row per host per week (Monday), paid by Venmo.
-- Replaces the old one-row-per-box/order shape.
alter table public.payouts drop constraint payout_for_one_thing;
alter table public.payouts drop column box_id;
alter table public.payouts drop column order_id;
alter table public.payouts
  add column week_start   date not null check (extract(isodow from week_start) = 1),  -- a Monday
  add column venmo_handle text,   -- where it was sent, copied from the host when paid
  add column note         text;
alter table public.payouts add constraint payouts_one_per_host_week unique (host_id, week_start);

alter table public.orders
  add constraint orders_payout_id_fkey foreign key (payout_id) references public.payouts (id);
create index orders_payout_id on public.orders (payout_id);
