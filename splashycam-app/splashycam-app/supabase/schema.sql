-- Splashy Cam: one row per stamped clip. No video, no accounts, no personal data.
create table if not exists public.proofs (
  code        text primary key,
  created_at  timestamptz not null default now(),
  place       text
);

alter table public.proofs enable row level security;

-- Anyone may create a proof (the app is anonymous) ...
create policy "anyone can insert a proof"
  on public.proofs for insert to anon with check (true);

-- ... and anyone may look one up, because that is the whole point.
create policy "anyone can read a proof"
  on public.proofs for select to anon using (true);
