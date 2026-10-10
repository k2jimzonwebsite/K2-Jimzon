-- Disposable native setup only; not canonical creation or production acceptance.
create function public.k2_fixture_tariff_setup_v1()
returns jsonb language plpgsql security definer set search_path = '' as $fixture$
declare v_path text[];v_custodian text;
begin
 if not public.is_admin() or coalesce(auth.jwt()->>'aal','') <> 'aal2' then
  raise exception using errcode='42501',message='K2_FIXTURE_ADMIN_AAL2_REQUIRED';
 end if;
 if exists(select 1 from public.products where sku='MAP018-TARIFF-ORDER-01') then
  raise exception 'K2_FIXTURE_ALREADY_SEEDED';
 end if;
 perform pg_catalog.pg_advisory_xact_lock_shared(1261585232,1347374169);
 insert into k2_private.category_policy_command_config(singleton,maximum_depth) values(true,8)
 on conflict(singleton) do update set maximum_depth=excluded.maximum_depth;
 perform k2_private.start_category_lot_context_v1(8);
 -- The captured fixture has no operational central hub. Add synthetic fixture
 -- prerequisites without altering an existing hub or weakening lot eligibility.
 insert into public.hubs(id,name,code,country,role)
 values('HUB-MNL-CENTRAL','Synthetic local Manila qualification hub','MAP018-TARIFF-MNL','PH','warehouse')
 on conflict(id) do nothing;
 if not exists(select 1 from public.hubs where id='HUB-MNL-CENTRAL' and country='PH') then
  raise exception 'K2_FIXTURE_CENTRAL_HUB_INVALID';
 end if;
 v_custodian:='MAP018-TARIFF-CUSTODIAN';
 insert into public.custodians(id,name,role,hub_id)
 values(v_custodian,'Synthetic local tariff custodian','warehouse','HUB-MNL-CENTRAL');
 insert into public.categories(id,name) values('76000000-0000-4000-8000-000000000020','Synthetic tariff runtime category');
 insert into public.products(sku,name,status,is_human_reviewed,primary_image_url,srp,shipping_weight_g,category_id)
 values('MAP018-TARIFF-ORDER-01','Synthetic tariff runtime product','Unlisted',true,
  'https://example.test/synthetic-tariff.png',100,1000,'76000000-0000-4000-8000-000000000020');
 insert into public.product_batches(id,sku,quantity,expiry_date,hub,custodian,inventory_status,source_type)
 values('76000000-0000-4000-8000-000000000010','MAP018-TARIFF-ORDER-01',10,
  current_date+365,'HUB-MNL-CENTRAL',v_custodian,'available','opening_balance');
 insert into public.inventory_balances(sku,location_code,on_hand,reserved)
 values('MAP018-TARIFF-ORDER-01','MANILA_MAIN',10,0);
 insert into public.channel_listings(sku,channel_source,shop_id,status,publication_status,validation_errors)
 values('MAP018-TARIFF-ORDER-01','website',null,'Active','ready','[]'::jsonb);
 insert into k2_private.guest_bff_secrets(singleton,request_secret,contact_secret)
 values(true,pg_catalog.decode(pg_catalog.repeat('ac',32),'hex'),pg_catalog.decode(pg_catalog.repeat('ad',32),'hex'))
 on conflict(singleton) do update set request_secret=excluded.request_secret,contact_secret=excluded.contact_secret;
 with recursive paths as (
  select n.code,n.level,n.area,array[n.code]::text[] path from k2_private.delivery_psgc_locations n
   where n.parent_code is null and n.source_version='psgc-2026-06-30'
  union all
  select n.code,n.level,n.area,p.path||n.code from k2_private.delivery_psgc_locations n join paths p on n.parent_code=p.code
   where n.source_version='psgc-2026-06-30' and pg_catalog.cardinality(p.path)<5
 ) select path into v_path from paths where level='Bgy' and area='NCR' and pg_catalog.cardinality(path)>=3
 order by path limit 1;
 if v_path is null then raise exception 'K2_FIXTURE_NCR_DESTINATION_ABSENT';end if;
 if not k2_private.lot_is_eligible_v1((select b from public.product_batches b
  where id='76000000-0000-4000-8000-000000000010')) then raise exception 'K2_FIXTURE_LOT_NOT_ELIGIBLE';end if;
 perform k2_private.clear_category_lot_context_v1();
 return jsonb_build_object('sourceVersion','psgc-2026-06-30','path',v_path);
end $fixture$;
revoke all on function public.k2_fixture_tariff_setup_v1() from public,anon,authenticated;
grant execute on function public.k2_fixture_tariff_setup_v1() to authenticated;
