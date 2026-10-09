-- ===========================================================================
-- MAP-018: require a staff review before a product can be published.
--
-- The customer storefront filters on `products.published`. Three database
-- functions already refuse a status change to Live with K2_PUBLICATION_NOT_READY
-- when the product is not human-reviewed, so the review rule exists -- but it
-- was never attached to the flag the storefront actually reads. A direct
-- `update products set published = true` therefore exposed an unreviewed
-- product to every customer. The admin sheet is now guarded in source; this
-- closes the same hole for every other writer, including the undeclared
-- k2-jimzon-vert.vercel.app surface.
--
-- Added NOT VALID on purpose. 22 products are already published without review,
-- and validating the constraint would fail on them. NOT VALID still enforces the
-- rule on every future insert and update, which is the bypass being closed.
--
-- Unapplied. Activation belongs to the MAP-018 window with backup, preflight,
-- rehearsal and exact-host checks per the database runbook.
--
-- OPERATIONAL CONSEQUENCE, read before applying: the 22 existing
-- published-and-unreviewed rows now fail this constraint on UPDATE. Any staff
-- edit to one of those products that touches any column will be rejected until
-- either the row is marked human-reviewed or it is unpublished. That is the
-- intended pressure, not a bug, but it is a behaviour change and belongs to the
-- owner decision on those 22 products, not to this file.
-- ===========================================================================

begin;

-- Preflight: the table and both columns this rule depends on must already exist.
do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'PREFLIGHT_FAILED: public.products not found';
  end if;
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'products' and column_name = 'published'
  ) then
    raise exception 'PREFLIGHT_FAILED: public.products.published not found';
  end if;
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'products' and column_name = 'is_human_reviewed'
  ) then
    raise exception 'PREFLIGHT_FAILED: public.products.is_human_reviewed not found';
  end if;
end $$;

-- The only change in this migration.
alter table public.products
  add constraint products_published_requires_human_review
  check (not published or is_human_reviewed) not valid;

notify pgrst, 'reload schema';
commit;
