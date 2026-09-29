-- Emergency rollback for the MAP-018 publication review guard.
-- Restores the previous behaviour: the published flag is writable without a
-- staff review. Run only to unblock an unintended failure, and re-apply the
-- forward migration as soon as the cause is understood.
begin;
alter table public.products
  drop constraint if exists products_published_requires_human_review;
notify pgrst, 'reload schema';
commit;
