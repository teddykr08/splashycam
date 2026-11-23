-- host_leads + host_pipeline: created in Supabase outside the repo.
-- Already exists in the "Splashy Cam" project (inspected 2026-11-22). This file
-- only records it so the repo matches the database. Don't run it again.
--
-- host_leads: hosts found through Instagram DMs (vs. the /hosts form).
-- host_pipeline: one row per Instagram handle across leads and applications.

create table public.host_leads (
  id          uuid primary key default gen_random_uuid(),
  instagram   text not null unique check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  name        text,
  email       text,
  status      text not null default 'yes'
    check (status = any (array['yes', 'more_info', 'not_now', 'asked_for_teddy'])),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Row-level security on with no policies: only the service role can read or
-- write. (anon/authenticated keep Supabase's default table grants, but RLS
-- blocks them.)
alter table public.host_leads enable row level security;

-- security_invoker: the view runs with the caller's rights, so RLS on the
-- underlying tables still applies.
create view public.host_pipeline
with (security_invoker = true) as
select
  coalesce(a.instagram, l.instagram) as instagram,
  coalesce(a.name, l.name)           as name,
  coalesce(a.email, l.email)         as email,
  case when l.id is not null then 'dm' else 'form' end as source,
  l.status       as dm_status,
  l.created_at   as dm_at,
  a.id is not null as filled_form,
  a.school,
  a.game_starts_on,
  a.game_ends_on,
  a.player_count,
  a.created_at   as form_at
from public.host_leads l
full join public.host_applications a on lower(a.instagram) = lower(l.instagram);
