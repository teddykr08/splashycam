-- DM leads: hosts who answer an Instagram DM (through the ManyChat flow) before
-- they fill in the /hosts form. POST /api/dm-yes writes here.
-- host_pipeline joins these with host_applications by Instagram handle, so DM
-- yeses and form signups read as one list.
-- Applied 2026-11-20 to the Supabase project. This file keeps the repo in sync;
-- don't run it again.

create table public.host_leads (
  id uuid primary key default gen_random_uuid(),
  instagram text not null unique check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  name text,
  email text,
  status text not null default 'yes' check (status in ('yes','more_info','not_now','asked_for_teddy')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.host_leads enable row level security;

create view public.host_pipeline with (security_invoker = true) as
select
  coalesce(a.instagram, l.instagram) as instagram,
  coalesce(a.name, l.name)           as name,
  coalesce(a.email, l.email)         as email,
  case when l.id is not null then 'dm' else 'form' end as source,
  l.status                           as dm_status,
  l.created_at                       as dm_at,
  (a.id is not null)                 as filled_form,
  a.school, a.game_starts_on, a.game_ends_on, a.player_count,
  a.created_at                       as form_at
from public.host_leads l
full outer join public.host_applications a
  on lower(a.instagram) = lower(l.instagram);
