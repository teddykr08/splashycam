-- Pre-launch landing page forms (dashboard/src/app/page.tsx).
-- Applied 2026-11-19 to Supabase project "Splashy Cam" (yopyqygtwcdixximpxit).
--
-- Written only by the Next.js server with the service-role key (src/app/actions.ts).
-- Row-level security is on with no policies, and anon/authenticated have no
-- grants, so the browser can't read or write either table.

-- Launch-updates email list. One row per email (case-insensitive).
create table public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source      text not null default 'landing',
  created_at  timestamptz not null default now()
);
create unique index waitlist_email_unique on public.waitlist (lower(email));

-- Founding host applications. Someone can apply more than once; each is kept.
create table public.host_applications (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 100),
  email           text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  instagram       text not null check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),  -- stored without the @
  school          text not null check (char_length(school) between 1 and 120),
  game_starts_on  date not null,
  player_count    int  not null check (player_count between 1 and 5000),
  buy_in          boolean not null,
  created_at      timestamptz not null default now()
);

alter table public.waitlist          enable row level security;
alter table public.host_applications enable row level security;
revoke all on public.waitlist, public.host_applications from anon, authenticated;
