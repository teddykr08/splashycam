-- Limit wrong pickup-code tries on the host dashboard: 5 per order per hour,
-- then the order locks (handoff_locked_at) and is flagged 'handoff_locked'
-- until the owner clears it.
-- NOT APPLIED YET. Run in the Supabase SQL editor.

alter table public.orders
  add column handoff_wrong_count int not null default 0 check (handoff_wrong_count >= 0),
  add column handoff_wrong_since timestamptz,   -- start of the current 1-hour window
  add column handoff_locked_at   timestamptz;   -- set on the 5th wrong try in a window
