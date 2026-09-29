-- Fixture for the 20260929 publication review guard rehearsal.
--
-- Named `products` on purpose: this is a disposable local-only rehearsal
-- database (k2_map017_rehearsal_published_review on a loopback port), so the
-- real migration file runs against it verbatim, preflight included. Nothing here
-- can reach the K2 catalogue.
--
-- Reproduces the live shape found on 29 September 2026: rows already published
-- with is_human_reviewed = false. That is exactly why the constraint must land
-- NOT VALID, and it is why this fixture exists.
drop table if exists public.products;
create table public.products (
  id integer primary key generated always as identity,
  sku text not null,
  name text not null,
  status text not null default 'Draft',
  published boolean not null default false,
  is_human_reviewed boolean not null default false
);

insert into public.products (sku, name, status, published, is_human_reviewed) values
  -- The legacy finding: live, customer-visible, and never reviewed.
  ('K2-LEGACY-1', 'Legacy published without review', 'Live', true, false),
  ('K2-LEGACY-2', 'Legacy published without review', 'Live', true, false),
  -- The legitimate path the guard must leave open.
  ('K2-DRAFT-1',  'Draft awaiting review',           'Draft', false, false),
  ('K2-OK-1',     'Reviewed and published',          'Live',  true,  true);
