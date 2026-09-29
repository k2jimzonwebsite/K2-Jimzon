-- Assertions for the 20260929 publication review guard.
-- Run against the rehearsal fixture after the migration body. Every case is a
-- named postflight, not a smoke test. Six assertions, and case 6 asserts a
-- failure on purpose, because that failure is the operational consequence the
-- owner needs to know about before applying.
set search_path = public, pg_temp;

do $$
declare
  v_legacy_still_published integer;
  v_blocked integer;
begin
  -- 1. The migration must have landed the constraint NOT VALID, which is what
  --    let it apply at all while two rows already violate it. Asserting
  --    `convalidated = false` is what makes this a check of the migration's
  --    actual effect rather than a check of a constraint this file added.
  select count(*) into v_blocked
    from pg_constraint
   where conname = 'products_published_requires_human_review'
     and convalidated = false
     and contype = 'c';
  if v_blocked <> 1 then
    raise exception 'ASSERTION_FAILED: expected exactly one NOT VALID check constraint, found %', v_blocked;
  end if;

  -- 2. The legacy rows must still be readable. NOT VALID constrains writes, not
  --    history, which is what keeps the existing catalogue intact.
  select count(*) into v_legacy_still_published
    from public.products where published and not is_human_reviewed;
  if v_legacy_still_published <> 2 then
    raise exception 'ASSERTION_FAILED: expected 2 legacy unreviewed published rows, found %', v_legacy_still_published;
  end if;

  -- 3. Publishing an unreviewed product must be refused. This is the bypass that
  --    let 22 products reach customers without a staff review.
  begin
    update public.products set published = true where sku = 'K2-DRAFT-1';
    raise exception 'ASSERTION_FAILED: an unreviewed product was published';
  exception when check_violation then
    null; -- expected
  end;

  -- 4. Marking it reviewed and then publishing must succeed, so staff are not
  --    locked out of the legitimate path.
  update public.products set is_human_reviewed = true where sku = 'K2-DRAFT-1';
  update public.products set published = true where sku = 'K2-DRAFT-1';
  if not (select published and is_human_reviewed from public.products where sku = 'K2-DRAFT-1') then
    raise exception 'ASSERTION_FAILED: the reviewed publish path was blocked';
  end if;

  -- 5. Unpublishing must always be allowed, including for a legacy row. Without
  --    this the owner could not act on the 22 without first reviewing them, which
  --    would make the finding unfixable. Re-publishing it afterwards is not
  --    attempted, because the guard is supposed to refuse that too.
  update public.products set published = false where sku = 'K2-LEGACY-1';
  if (select published from public.products where sku = 'K2-LEGACY-1') then
    raise exception 'ASSERTION_FAILED: unpublishing a legacy row was blocked';
  end if;

  -- 6. Editing an unrelated column of an already-published legacy row is
  --    refused. Asserted deliberately so this is a known, rehearsed consequence
  --    rather than a production surprise.
  begin
    update public.products set name = 'Renamed' where sku = 'K2-LEGACY-2';
    v_blocked := 1;
  exception when check_violation then
    v_blocked := 0;
  end;
  if v_blocked <> 0 then
    raise exception 'ASSERTION_FAILED: expected the legacy row edit to be refused';
  end if;

  raise notice 'published review guard: all 6 assertions passed';
end $$;
