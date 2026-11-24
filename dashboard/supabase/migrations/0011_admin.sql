-- Admin dashboard (/admin): host school + Instagram, solo tracking, inventory.
-- NOT APPLIED YET. Run in the Supabase SQL editor.

-- Hosts: which school they run (orders are filtered by it; reservations prefill
-- it from the host link) and their Instagram. ship_to (already there) holds the
-- box shipping address.
alter table public.hosts
  add column school    text check (char_length(school) between 1 and 120),
  add column instagram text check (instagram ~ '^[A-Za-z0-9._]{1,30}$');  -- without the @

-- Hosts can opt out of handing out boxes: their link only offers Ship to me,
-- and they earn the solo cut.
alter table public.hosts
  add column boxes_enabled boolean not null default true;

-- Solo orders: tracking number when shipped (boxes already have tracking).
alter table public.orders
  add column tracking text;

-- Inventory: one row, units made (sold is counted from orders).
create table public.inventory (
  id          int primary key default 1 check (id = 1),
  units_made  int not null default 0 check (units_made >= 0),
  updated_at  timestamptz not null default now()
);
insert into public.inventory (id) values (1);
alter table public.inventory enable row level security;
revoke all on public.inventory from anon, authenticated;
