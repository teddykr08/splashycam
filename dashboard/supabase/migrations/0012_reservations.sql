-- Free reservations on "/" ("reserve yours, pay at launch").
-- NOT APPLIED YET. Run in the Supabase SQL editor.

create table public.reservations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 100),
  instagram   text not null check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),  -- stored without the @
  email       text check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  school      text not null check (char_length(school) between 1 and 120),
  delivery    text not null check (delivery in ('box', 'alone')),       -- 'box' = School box, 'alone' = Ship to me
  host_code   text,                                                     -- the ?host= code they came through, if any
  host_id     uuid references public.hosts (id) on delete set null,
  created_at  timestamptz not null default now(),
  -- A School box is only offered through a host link.
  check (delivery = 'alone' or host_id is not null)
);

-- One reservation per Instagram handle per school (case-insensitive).
create unique index reservations_instagram_school_unique on public.reservations (lower(instagram), lower(school));
create index reservations_school_idx on public.reservations (lower(school));
create index reservations_host_idx on public.reservations (host_id);

-- Server-only, like every other table: RLS on, no policies, no anon/authenticated access.
alter table public.reservations enable row level security;
revoke all on public.reservations from anon, authenticated;
