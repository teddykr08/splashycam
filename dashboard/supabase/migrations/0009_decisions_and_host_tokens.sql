-- Owner decisions of 2026-11-22 + the private host dashboard (/h/[token]).
-- NOT APPLIED YET. Run after 0007 in the Supabase SQL editor.

-- No "ship mine alone if my box isn't full" checkbox anymore.
alter table public.orders drop column ship_alone_if_not_full;

-- No pot.
alter table public.orders drop column pot_cents;
alter table public.hosts drop column game_has_pot;

-- Each host's private dashboard link: https://www.splashycam.shop/h/<dashboard_token>.
-- 36 random hex characters; secret, so it's the only thing that opens the page.
alter table public.hosts
  add column dashboard_token text not null unique
    default encode(extensions.gen_random_bytes(18), 'hex');
