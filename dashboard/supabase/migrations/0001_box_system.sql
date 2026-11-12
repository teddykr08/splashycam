-- Splashy Cam box system: hosts, boxes, orders, payouts.
-- Applied 2026-11-11 to Supabase project "Splashy Cam" (yopyqygtwcdixximpxit).
-- Prices, discounts, cuts and deadlines are NOT stored as settings here;
-- they live in src/lib/rules.ts. The database only records what happened.

-- A host runs a school's game and has a share code. Logs in with a Supabase magic link.
create table public.hosts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references auth.users (id) on delete set null,
  name            text not null,
  email           text not null unique,
  code            text not null unique,            -- the code buyers enter / the share link
  ship_to         jsonb,                           -- boxes ship here (name, address lines, city, state, zip)
  game_starts_at  timestamptz,                     -- set by the host on /host
  game_has_pot    boolean not null default false,
  created_at      timestamptz not null default now()
);

-- A box collects orders on one host's code. Each host has at most one open box.
create type public.box_status as enum ('open', 'shipped', 'expired');

create table public.boxes (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references public.hosts (id),
  token       text not null unique default encode(gen_random_bytes(12), 'hex'), -- /box/[token]
  status      public.box_status not null default 'open',
  opened_at   timestamptz not null default now(),
  filled_at   timestamptz,                         -- when the 5th order arrived
  shipped_at  timestamptz,
  tracking    text,
  created_at  timestamptz not null default now()
);
create unique index boxes_one_open_per_host on public.boxes (host_id) where status = 'open';

-- One row per Shopify order. Always credits a host, in a box or shipping alone.
create type public.shipping as enum ('box', 'alone');
create type public.order_status as enum ('waiting', 'charged', 'shipped', 'expired', 'cancelled');

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  shopify_order_id  text not null unique,           -- so a repeated webhook can't add it twice
  host_id           uuid not null references public.hosts (id),
  box_id            uuid references public.boxes (id), -- null when shipping alone
  shipping          public.shipping not null,
  units             int not null check (units between 1 and 4),
  auto_ship         boolean not null default true,  -- "ship anyway if my box doesn't fill"
  buyer_name        text not null,
  buyer_email       text not null,
  ship_to           jsonb,                          -- only for orders shipping alone
  status            public.order_status not null default 'waiting',
  -- Filled in when the order is charged, using rules.ts with the box's final size:
  paid_cents        int,
  host_cut_cents    int,
  pot_cents         int,
  created_at        timestamptz not null default now(),
  constraint box_matches_shipping check ((shipping = 'box') = (box_id is not null))
);
create index orders_box_id on public.orders (box_id);
create index orders_host_id on public.orders (host_id);

-- What we owe each host: one row per shipped box or alone order. Paid by Venmo,
-- then marked paid on /admin.
create table public.payouts (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references public.hosts (id),
  box_id        uuid unique references public.boxes (id),
  order_id      uuid unique references public.orders (id),
  amount_cents  int not null check (amount_cents >= 0),
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  constraint payout_for_one_thing check ((box_id is null) <> (order_id is null))
);
create index payouts_host_id on public.payouts (host_id);

-- Security: the browser can't touch any table directly. The Next.js server
-- reads and writes with the service-role key, after checking who is asking.
-- One exception: a logged-in host can read their own host row.
alter table public.hosts   enable row level security;
alter table public.boxes   enable row level security;
alter table public.orders  enable row level security;
alter table public.payouts enable row level security;

create policy "host reads own row" on public.hosts
  for select to authenticated using (user_id = auth.uid());
