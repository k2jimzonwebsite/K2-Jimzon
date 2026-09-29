-- Assertions for the 20260929 channel listing slices.
-- Run against the rehearsal fixture after the migration body. Every case is a
-- named postflight. Cases 5, 6, 8, 9 and 11 assert refusal paths for SKU
-- edits, concurrent/oversell allocations, stock corrections, and bad grams.
set search_path = public, pg_temp;

do $$
declare
  v_count integer;
  v_shop_a uuid;
  v_shop_b uuid;
begin
  -- 1. All six footer shops are seeded, still not_connected.
  select count(*) into v_count from public.channel_shops
    where shop_code in ('pasabuy-lazada', 'pasabuy-shopee', 'pasabuy-tiktok',
                        'jworld-lazada', 'jworld-shopee', 'jworld-tiktok')
      and status = 'not_connected';
  if v_count <> 6 then
    raise exception 'ASSERTION_FAILED: expected 6 not_connected seed shops, found %', v_count;
  end if;

  -- 2. The projection includes Live and direct-link Unlisted Website members;
  -- non-Website and unpublished SKUs stay out. The UI hides Unlisted from browse.
  select count(*) into v_count from public.v_storefront_visible_skus;
  if v_count <> 2 then
    raise exception 'ASSERTION_FAILED: expected 2 Website-eligible SKUs, found %', v_count;
  end if;
  if not exists (select 1 from public.v_storefront_visible_skus where sku = 'K2-SLICE-1') then
    raise exception 'ASSERTION_FAILED: K2-SLICE-1 should be visible';
  end if;
  if not exists (select 1 from public.v_storefront_visible_skus where sku = 'K2-SLICE-2') then
    raise exception 'ASSERTION_FAILED: Website-listed Unlisted SKU should remain direct-link eligible';
  end if;
  if exists (select 1 from public.v_storefront_visible_skus where sku in ('K2-SLICE-3', 'K2-SLICE-4', 'K2-SLICE-5')) then
    raise exception 'ASSERTION_FAILED: non-Website or unpublished SKU is visible';
  end if;
  if has_table_privilege('anon', 'public.channel_listings', 'SELECT') then
    raise exception 'ASSERTION_FAILED: anon can read the staff-only channel_listings table';
  end if;
  if not has_table_privilege('anon', 'public.v_storefront_visible_skus', 'SELECT') then
    raise exception 'ASSERTION_FAILED: anon cannot read the public Website SKU view';
  end if;

  -- 3. The safe Website view is readable without anonymous base-table access.
  -- 4. Booking 10 of 12 available units to one shop succeeds.
  select id into v_shop_a from public.channel_shops where shop_code = 'pasabuy-shopee';
  select id into v_shop_b from public.channel_shops where shop_code = 'jworld-shopee';
  insert into public.channel_shop_allocations (shop_id, sku, allocated_units)
    values (v_shop_a, 'K2-SLICE-1', 10);

  -- 5. A SKU edit rechecks the destination even if allocated units stay fixed.
  begin
    update public.channel_shop_allocations set sku = 'K2-SLICE-2'
      where shop_id = v_shop_a and sku = 'K2-SLICE-1';
    raise exception 'ASSERTION_FAILED: changing SKU bypassed the oversell guard';
  exception when check_violation then
    if SQLERRM <> 'K2_SHOP_OVERSELL_REFUSED' then raise; end if;
  end;

  -- 6. Booking 3 more is refused: 10 + 3 exceeds the 12 master slice.
  begin
    insert into public.channel_shop_allocations (shop_id, sku, allocated_units)
      values (v_shop_b, 'K2-SLICE-1', 3);
    raise exception 'ASSERTION_FAILED: oversell was allowed';
  exception when check_violation then
    if SQLERRM <> 'K2_SHOP_OVERSELL_REFUSED' then raise; end if;
  end;

  -- 7. Lowering the first shop to 9 frees room for the second shop's 3.
  update public.channel_shop_allocations set allocated_units = 9
    where shop_id = v_shop_a and sku = 'K2-SLICE-1';
  insert into public.channel_shop_allocations (shop_id, sku, allocated_units)
    values (v_shop_b, 'K2-SLICE-1', 3);

  -- 8. Raising the second shop past the cap is refused on update too.
  begin
    update public.channel_shop_allocations set allocated_units = 4
      where shop_id = v_shop_b and sku = 'K2-SLICE-1';
    raise exception 'ASSERTION_FAILED: oversell on update was allowed';
  exception when check_violation then
    if SQLERRM <> 'K2_SHOP_OVERSELL_REFUSED' then raise; end if;
  end;

  -- 9. A count correction cannot drop master availability below shop offers.
  begin
    update public.inventory_balances set on_hand = 11
      where sku = 'K2-SLICE-1' and location_code = 'MANILA_MAIN';
    raise exception 'ASSERTION_FAILED: master stock fell below live shop offers';
  exception when check_violation then
    if SQLERRM <> 'K2_MASTER_STOCK_BELOW_SHOP_OFFERS' then raise; end if;
  end;
  update public.channel_shop_allocations set allocated_units = 2
    where shop_id = v_shop_b and sku = 'K2-SLICE-1';
  update public.inventory_balances set on_hand = 11
    where sku = 'K2-SLICE-1' and location_code = 'MANILA_MAIN';
  if (select available from public.inventory_balances where sku = 'K2-SLICE-1') <> 11 then
    raise exception 'ASSERTION_FAILED: stock correction did not retain 11 available';
  end if;

  -- 10. Lot grams default null and accept a positive value.
  update public.product_batches set net_weight_g = 500
    where sku = 'K2-SLICE-1' and box_code = 'BOX-WEB-01';
  if (select net_weight_g from public.product_batches where box_code = 'BOX-WEB-01') <> 500 then
    raise exception 'ASSERTION_FAILED: lot grams were not stored';
  end if;

  -- 11. Negative lot grams are refused.
  begin
    update public.product_batches set net_weight_g = -5
      where sku = 'K2-SLICE-1' and box_code = 'BOX-SHP-02';
    raise exception 'ASSERTION_FAILED: negative lot grams were allowed';
  exception when check_violation then
    null; -- expected
  end;

  raise notice 'channel listing slices: all 11 assertions passed';
end $$;

-- Exercise the narrow public projection under the actual anonymous role.
set role anon;
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.v_storefront_visible_skus;
  if v_count <> 2 or not exists (
    select 1 from public.v_storefront_visible_skus where sku = 'K2-SLICE-1'
  ) then
    raise exception 'ASSERTION_FAILED: anonymous Website view returned an unexpected set';
  end if;
end $$;
reset role;
