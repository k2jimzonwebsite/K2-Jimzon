-- K2 Jimzon — Globe showcase CMS
-- Tables for globe product visibility and customer reviews.
-- Public visitors can read; only authenticated admins can write.

create table if not exists public.globe_products (
  product_id text primary key,
  enabled boolean not null default true,
  hero_image text,
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text references public.globe_products (product_id) on delete set null,
  name text not null,
  channel text not null default '',
  stars integer not null check (stars between 1 and 5),
  text text not null,
  item text not null default '',
  review_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.globe_products enable row level security;
alter table public.reviews enable row level security;

create policy "Public read globe products"
  on public.globe_products for select
  using (true);

create policy "Admins manage globe products"
  on public.globe_products for all
  to authenticated
  using (true)
  with check (true);

create policy "Public read reviews"
  on public.reviews for select
  using (true);

create policy "Admins manage reviews"
  on public.reviews for all
  to authenticated
  using (true)
  with check (true);

-- Seed: every catalog product enabled on the globe.
-- hero_image stays null → storefront falls back to the catalog photo.
insert into public.globe_products (product_id, display_order) values
  ('pistachio-cream', 0),
  ('lavazza-oro', 1),
  ('nutella-biscuits', 2),
  ('nutella-jar', 3),
  ('rio-mare', 4),
  ('barilla-pesto', 5),
  ('barilla-spaghetti', 6),
  ('mutti-passata', 7),
  ('rana-sfogliavelo', 8),
  ('taralli', 9),
  ('pan-di-stelle', 10),
  ('baiocchi', 11),
  ('kinder-bueno', 12),
  ('loacker', 13),
  ('lotus-biscoff', 14),
  ('milano-21', 15),
  ('perlier-honey', 16)
on conflict (product_id) do nothing;

-- Seed: existing site reviews.
insert into public.reviews (product_id, name, channel, stars, text, item) values
  ('nutella-biscuits', 'Camille D.', 'Shopee · verified', 5,
   'Legit EU stock. The Nutella Biscuits pouch had 8 months left on the date — the ones from other sellers were nearly expired. Packed like it was going to war.',
   'Nutella Biscuits'),
  ('lavazza-oro', 'Bella Vita Trading', 'Wholesale client · 2 yrs', 5,
   'We reorder Lavazza and pesto monthly for the café. Same counts online as in their warehouse — I stopped texting to double-check stock a year ago.',
   'Lavazza Qualità Oro'),
  (null, 'Miguel R.', 'Lazada · verified', 5,
   'Requested Pan di Stelle through pasabuy after honeymooning in Rome. Quoted in a day, landed in three weeks, cheaper than my cousin’s balikbayan markup.',
   'Pasabuy request'),
  ('pistachio-cream', 'Anna L.', 'Shopee · verified', 4,
   'The pistachio cream is dangerous. Jar lasted four days. Only complaint is they keep selling out.',
   'Pistì pistachio cream');
