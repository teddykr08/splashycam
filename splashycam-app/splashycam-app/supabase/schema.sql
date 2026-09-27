-- ============================================================================
-- LATER: NOT USED BY THE APP RIGHT NOW.
-- The app currently has no backend: codes are generated on the phone and stay
-- there. This schema, plus the client code in later/server/, is kept for when
-- registering and checking codes comes back. See later/README.md.
-- ============================================================================

-- Splashy Cam: one row per stamped clip. No video, no accounts, no personal data.
--
-- The app never touches the table directly. It calls two functions:
--   register_proof(code, place) -> the server's timestamp
--   verify_proof(code)          -> at most one row
-- so the client can't set the timestamp and the table can't be listed.

create table if not exists public.proofs (
  code        text primary key,
  created_at  timestamptz not null default now(),
  place       text
);

-- Added separately so re-running this file on an existing table applies them too.
-- NOT VALID: enforced for new rows, existing rows aren't rechecked.
alter table public.proofs drop constraint if exists proofs_code_format;
alter table public.proofs add constraint proofs_code_format
  check (code ~ '^[0-9A-HJKMNP-TV-Z]{6}$') not valid;
alter table public.proofs drop constraint if exists proofs_place_length;
alter table public.proofs add constraint proofs_place_length
  check (place is null or char_length(place) <= 80) not valid;

alter table public.proofs enable row level security;

-- Earlier versions of this file let anon read and insert rows directly.
drop policy if exists "anyone can insert a proof" on public.proofs;
drop policy if exists "anyone can read a proof" on public.proofs;
revoke all on public.proofs from anon, authenticated;

create or replace function public.register_proof(p_code text, p_place text)
returns timestamptz
language sql
security definer
set search_path = public
as $$
  insert into public.proofs (code, place)
  values (upper(p_code), nullif(trim(p_place), ''))
  returning created_at;
$$;

create or replace function public.verify_proof(p_code text)
returns table (code text, created_at timestamptz, place text)
language sql
stable
security definer
set search_path = public
as $$
  select code, created_at, place from public.proofs where code = upper(p_code);
$$;

revoke all on function public.register_proof(text, text) from public;
revoke all on function public.verify_proof(text) from public;
grant execute on function public.register_proof(text, text) to anon;
grant execute on function public.verify_proof(text) to anon;
