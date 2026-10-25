-- MAP-023 / IDEA-20261025-04. Exact owner-confirmed duplicate correction.
-- Prepared source. Installation and each signed Admin decision are separate steps.
begin;

create function k2_private.product_sku_merge_group_v1(p_group text)
returns text[] language sql immutable set search_path='' as $$
 select case p_group
  when 'one-fragrance' then array['K2-SKU-001145','K2-SKU-001146','K2-SKU-001147','K2-SKU-001148']
  when 'borella-carne' then array['K2-SKU-001017','K2-SKU-001016','K2-SKU-001018']
  when 'borella-prosciutto' then array['K2-SKU-001020','K2-SKU-001019','K2-SKU-001021'] end;
$$;
revoke all on function k2_private.product_sku_merge_group_v1(text) from public,anon,authenticated,service_role;

create table k2_private.product_sku_merge_events (
 group_id text primary key check(group_id in ('one-fragrance','borella-carne','borella-prosciutto')),
 actor_id uuid not null,request_id uuid not null,reason text not null,
 canonical_sku text not null,source_skus text[] not null,
 before_state jsonb not null,after_state jsonb not null,result jsonb not null,
 created_at timestamptz not null default clock_timestamp(),
 unique(actor_id,request_id)
);
alter table k2_private.product_sku_merge_events enable row level security;
alter table k2_private.product_sku_merge_events force row level security;
revoke all on k2_private.product_sku_merge_events from public,anon,authenticated,service_role;

-- One MVCC snapshot, complete rows, deterministic order. No client stock authority.
create function k2_private.product_sku_merge_state_v1(p_group text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s text[]:=k2_private.product_sku_merge_group_v1(p_group);v jsonb;b text;
begin
 if s is null then raise exception 'K2_SKU_MERGE_INVALID';end if;
 if to_regclass('public.channel_shop_allocations') is not null
  or to_regclass('public.inventory_transfer_requests') is not null then
  raise exception 'K2_SKU_MERGE_SCHEMA_CHANGED';
 end if;
 select jsonb_build_object(
  'products',coalesce((select jsonb_agg(to_jsonb(p) order by p.sku) from public.products p where p.sku=any(s)),'[]'),
  'lots',coalesce((select jsonb_agg(to_jsonb(l) order by l.id) from public.product_batches l where l.sku=any(s)),'[]'),
  'balances',coalesce((select jsonb_agg(to_jsonb(x) order by x.sku,x.location_code) from public.inventory_balances x where x.sku=any(s)),'[]'),
  'listings',coalesce((select jsonb_agg(to_jsonb(x) order by x.id) from public.channel_listings x where x.sku=any(s)),'[]')
 ) into v;
 if jsonb_array_length(v->'products')<>cardinality(s) then b:='PRODUCTS_INCOMPLETE';
 elsif jsonb_array_length(v->'lots')>200 then b:='TOO_MANY_LOTS';
 elsif exists(select 1 from public.products p join public.products c on c.sku=s[1]
    where p.sku=any(s) and (p.brand_id is distinct from c.brand_id or p.category_id is distinct from c.category_id
     or p.net_weight is distinct from c.net_weight or p.unit_of_measure is distinct from c.unit_of_measure
     or p.package_type is distinct from c.package_type or p.size is distinct from c.size
     or p.brand_id is null or p.category_id is null or nullif(btrim(p.size),'') is null
     or nullif(btrim(p.package_type),'') is null)) then b:='PACKAGE_IDENTITY';
 elsif exists(select 1 from public.product_family_members m join public.products p on p.id=m.product_id where p.sku=any(s)) then b:='FAMILY_MEMBERSHIP';
 elsif exists(select 1 from public.inventory_reservations r where r.sku=any(s)
    or r.batch_id in(select id from public.product_batches where sku=any(s))
    group by r.status having r.status is null or r.status not in ('released','fulfilled','cancelled','expired')) then b:='ACTIVE_RESERVATION';
 elsif exists(select 1 from public.order_request_items i left join public.order_requests o on o.id=i.order_request_id
    where i.sku=any(s) and (o.id is null or not (o.status='cancelled' or
     o.status='fulfilled' and o.delivery_status in ('delivered','returned','cancelled') and o.exception_status in ('none','resolved')))) then b:='ACTIVE_ORDER';
 elsif exists(select 1 from public.orders o where o.sku=any(s) and o.order_status::text is distinct from 'Cancelled') then b:='LEGACY_ORDER';
 elsif exists(select 1 from public.consignment_items i left join public.consignments c on c.id=i.consignment_id
    where i.sku=any(s) and c.status is distinct from 'Completed') then b:='ACTIVE_CONSIGNMENT';
 elsif exists(select 1 from public.po_lines l left join public.purchase_orders o on o.id=l.po_id
    where l.sku=any(s) and (o.id is null or o.status::text not in ('Received','Cancelled'))) then b:='ACTIVE_PURCHASE_ORDER';
 elsif exists(select 1 from public.product_intake_sessions i where (i.assigned_sku=any(s)
    or i.product_id in(select id from public.products where sku=any(s))) and i.status is distinct from 'completed' and i.status is distinct from 'abandoned') then b:='ACTIVE_INTAKE';
 elsif exists(select 1 from public.staff_allocations x where x.sku=any(s) and (x.stock is null or x.stock<>0)) then b:='STAFF_ALLOCATION';
 elsif exists(select 1 from public.channel_listings l where l.sku=any(s) and l.channel_source<>'website'
    and l.status is distinct from 'Unlinked') then b:='CHANNEL_ASSIGNMENT';
 elsif exists(select 1 from unnest(s) requested(sku) where (select count(*) from public.channel_listings l
    where l.sku=requested.sku and l.channel_source='website' and l.status='Active')<>1) then b:='WEBSITE_ASSIGNMENT';
 elsif not exists(select 1 from public.products p where p.sku=s[1] and p.published and p.status in ('Live','Active','Unlisted')) then b:='CANONICAL_NOT_PUBLISHED';
 elsif exists(select 1 from public.product_batches l where l.sku=any(s) and (l.reserved_quantity is distinct from 0 or l.quantity is null or l.quantity<0))
    or exists(select 1 from public.inventory_balances x where x.sku=any(s) and (x.location_code<>'MANILA_MAIN'
     or x.reserved is distinct from 0 or x.in_transit is distinct from 0)) then b:='RESERVED_OR_TRANSIT_STOCK';
 elsif exists(select 1 from public.products p where p.sku=any(s) and (
    p.stock_available is distinct from (select coalesce(sum(quantity_available),0)::int from public.product_batches where sku=p.sku)
    or p.total_stock is distinct from p.stock_available
    or (select coalesce(sum(on_hand),0) from public.inventory_balances where sku=p.sku)
       is distinct from (select coalesce(sum(quantity),0) from public.product_batches where sku=p.sku))) then b:='STOCK_PROJECTION';
 end if;
 return jsonb_build_object('state',v,'stateHash',encode(extensions.digest(convert_to(v::text,'UTF8'),'sha256'),'hex'),'blocker',b);
end $$;
revoke all on function k2_private.product_sku_merge_state_v1(text) from public,anon,authenticated,service_role;

create function public.read_admin_product_sku_merge_v1(p_group text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v jsonb;s text[]:=k2_private.product_sku_merge_group_v1(p_group);
begin
 if not coalesce(public.is_admin(),false) or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'K2_ADMIN_REQUIRED';end if;
 v:=k2_private.product_sku_merge_state_v1(p_group);
 return (v-'state')||jsonb_build_object('groupId',p_group,'canonicalSku',s[1],
  'recorded',exists(select 1 from k2_private.product_sku_merge_events where group_id=p_group),
  'products',(select jsonb_agg(jsonb_build_object('sku',p.sku,'name',p.name,'size',p.size,'packageType',p.package_type,'status',p.status,
    'quantity',(select coalesce(sum(quantity),0) from public.product_batches where sku=p.sku),
    'available',(select coalesce(sum(quantity_available),0) from public.product_batches where sku=p.sku)) order by array_position(s,p.sku::text))
    from public.products p where p.sku=any(s)),
  'lots',v->'state'->'lots');
end $$;
revoke all on function public.read_admin_product_sku_merge_v1(text) from public,anon,authenticated,service_role;
grant execute on function public.read_admin_product_sku_merge_v1(text) to authenticated;

create function k2_private.execute_product_sku_merge_v1(p_payload jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s text[];v jsonb;a jsonb;r jsonb;l public.product_batches;n public.product_batches;
 v_depth int;v_instant timestamptz;v_sku text;v_total int;v_available int;v_old_setting text;
 v_before jsonb;v_after jsonb;v_target text;v_status text;
begin
 if not coalesce(public.is_admin(),false) or coalesce(auth.jwt()->>'aal','')<>'aal2'
  or not exists(select 1 from k2_private.admin_command_receipts where actor_id=auth.uid()
    and action='product_sku_merge' and idempotency_key=p_key and result is null) then raise exception 'K2_ADMIN_REQUIRED';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or not(p_payload ?& array['groupId','expectedStateHash','reason'])
  or p_payload-array['groupId','expectedStateHash','reason']<>'{}'::jsonb
  or jsonb_typeof(p_payload->'groupId') is distinct from 'string'
  or jsonb_typeof(p_payload->'expectedStateHash') is distinct from 'string'
  or (p_payload->>'expectedStateHash')!~'^[a-f0-9]{64}$'
  or jsonb_typeof(p_payload->'reason') is distinct from 'string'
  or length(btrim(p_payload->>'reason')) not between 8 and 500 then raise exception 'K2_SKU_MERGE_INVALID';end if;
 s:=k2_private.product_sku_merge_group_v1(p_payload->>'groupId');
 if s is null then raise exception 'K2_SKU_MERGE_INVALID';end if;
 -- Rare one-time operation: exclude concurrent canonical writers first. Bounded
 -- NOWAIT relation locks also exclude legacy writers/new dependency phantoms.
 perform k2_private.lock_category_policy_v1(true);
 lock table public.inventory_balances,public.products,public.product_batches,
  public.channel_listings,public.inventory_reservations,public.order_requests,
  public.order_request_items,public.orders,public.product_family_members,
  public.staff_allocations,public.consignments,public.consignment_items,
  public.purchase_orders,public.po_lines,public.product_intake_sessions in share row exclusive mode nowait;
 perform 1 from public.inventory_balances where sku=any(s) order by sku,location_code for update;
 perform 1 from public.products where sku=any(s) order by sku for update;
 perform 1 from public.product_batches where sku=any(s) order by id for update;
 if exists(select 1 from k2_private.product_sku_merge_events where group_id=p_payload->>'groupId') then raise exception 'K2_SKU_MERGE_ALREADY_RECORDED';end if;
 v:=k2_private.product_sku_merge_state_v1(p_payload->>'groupId');
 if v->>'blocker' is not null then raise exception 'K2_SKU_MERGE_BLOCKED';end if;
 if v->>'stateHash' is distinct from p_payload->>'expectedStateHash' then raise exception 'K2_SKU_MERGE_VERSION_CONFLICT';end if;
 select maximum_depth into v_depth from k2_private.category_policy_command_config where singleton;
 if v_depth is null or v_depth<1 then raise exception 'K2_CATEGORY_POLICY_NOT_CONFIGURED';end if;
 v_instant:=k2_private.start_category_lot_context_v1(v_depth);
 for l in select * from public.product_batches where sku=any(s[2:cardinality(s)]) order by id loop
  update public.product_batches set sku=s[1],updated_at=v_instant where id=l.id returning * into n;
  if (to_jsonb(l)-'sku'-'updated_at') is distinct from (to_jsonb(n)-'sku'-'updated_at') then raise exception 'K2_SKU_MERGE_LOT_CONSERVATION';end if;
  insert into public.batch_change_events(id,batch_id,sku,reason,old_data,new_data,actor_id,created_at)
   values(gen_random_uuid(),n.id,n.sku,btrim(p_payload->>'reason'),to_jsonb(l),to_jsonb(n),auth.uid(),v_instant);
  -- Clearance history is SKU-bound. A change in current eligibility is refused,
  -- never repaired by fabricating/re-dating an approval.
  if n.quantity_available is distinct from (case when k2_private.lot_is_eligible_for_category_v1(n,v_depth,v_instant)
    then greatest(n.quantity-n.reserved_quantity,0) else 0 end) then raise exception 'K2_SKU_MERGE_LOT_CONSERVATION';end if;
 end loop;
 select coalesce(sum(quantity),0)::int,coalesce(sum(quantity_available),0)::int into v_total,v_available
  from public.product_batches where sku=s[1];
 -- Sum all balance buckets; source zero rows remain for historical references.
 insert into public.inventory_balances(sku,location_code,on_hand,reserved,in_transit,damaged,expired,unaccounted,updated_at)
 select s[1],'MANILA_MAIN',coalesce(sum(on_hand),0)::int,coalesce(sum(reserved),0)::int,coalesce(sum(in_transit),0)::int,
  coalesce(sum(damaged),0)::int,coalesce(sum(expired),0)::int,coalesce(sum(unaccounted),0)::int,v_instant
 from public.inventory_balances where sku=any(s)
 on conflict(sku,location_code) do update set on_hand=excluded.on_hand,reserved=excluded.reserved,in_transit=excluded.in_transit,
  damaged=excluded.damaged,expired=excluded.expired,unaccounted=excluded.unaccounted,updated_at=excluded.updated_at;
 update public.inventory_balances set on_hand=0,reserved=0,in_transit=0,damaged=0,expired=0,unaccounted=0,updated_at=v_instant
  where sku=any(s[2:cardinality(s)]);
 v_old_setting:=current_setting('k2.allow_stock_write',true);
 perform set_config('k2.allow_stock_write','on',true);
 update public.products set stock_available=case when sku=s[1] then v_available else 0 end,
  total_stock=case when sku=s[1] then v_available else 0 end where sku=any(s);
 perform set_config('k2.allow_stock_write',coalesce(v_old_setting,'off'),true);
 foreach v_sku in array s[2:cardinality(s)] loop
  select to_jsonb(x) into v_before from public.channel_listings x where sku=v_sku and channel_source='website' and status='Active';
  update public.channel_listings set status='Paused',publication_status='paused',updated_at=v_instant
   where sku=v_sku and channel_source='website' and status='Active' returning to_jsonb(channel_listings.*) into v_after;
  insert into k2_private.website_listing_events(actor_id,request_id,sku,assigned,reason,before_state,after_state)
   values(auth.uid(),p_key,v_sku,false,btrim(p_payload->>'reason'),v_before,v_after);
  select status into v_status from public.products where sku=v_sku;
  -- Follow the existing publication transitions, retaining one event per step.
  for v_target in select unnest(case v_status when 'Draft' then array['Under Review','Unlisted','Discontinued']
    when 'Under Review' then array['Unlisted','Discontinued'] when 'Live' then array['Discontinued']
    when 'Active' then array['Unlisted','Discontinued'] when 'Unlisted' then array['Discontinued']
    when 'Discontinued' then array[]::text[] else null end) loop
   select to_jsonb(p) into v_before from public.products p where sku=v_sku;
   update public.products set status=v_target where sku=v_sku returning to_jsonb(products.*) into v_after;
   insert into k2_private.product_master_events(actor_id,action,request_id,sku,reason,before_state,after_state)
    -- One Product Master status event per source; full ordered state sequence is
    -- retained in the merge event. Only the final status is a staff decision.
    select auth.uid(),'product_master_status',p_key,v_sku,btrim(p_payload->>'reason'),v_before,v_after
    where v_target='Discontinued';
  end loop;
 end loop;
 a:=k2_private.product_sku_merge_state_v1(p_payload->>'groupId');
 -- Compare every original lot, canonical included, not merely aggregate units.
 if (select jsonb_agg(x-'sku'-'updated_at' order by x->>'id') from jsonb_array_elements(v->'state'->'lots') x)
   is distinct from (select jsonb_agg(x-'sku'-'updated_at' order by x->>'id') from jsonb_array_elements(a->'state'->'lots') x)
  or (select coalesce(sum((x->>'on_hand')::bigint),0) from jsonb_array_elements(v->'state'->'balances') x)<>v_total
  or exists(select 1 from public.product_batches where sku=any(s[2:cardinality(s)])) then raise exception 'K2_SKU_MERGE_LOT_CONSERVATION';end if;
 r:=jsonb_build_object('groupId',p_payload->>'groupId','canonicalSku',s[1],'sourceSkus',to_jsonb(s[2:cardinality(s)]),
  'quantity',v_total,'available',v_available,'lotCount',jsonb_array_length(v->'state'->'lots'),'requestId',p_key);
 insert into k2_private.product_sku_merge_events(group_id,actor_id,request_id,reason,canonical_sku,source_skus,before_state,after_state,result,created_at)
 values(p_payload->>'groupId',auth.uid(),p_key,btrim(p_payload->>'reason'),s[1],s[2:cardinality(s)],v->'state',a->'state',r,v_instant);
 perform k2_private.clear_category_lot_context_v1();
 return r;
end $$;
revoke all on function k2_private.execute_product_sku_merge_v1(jsonb,uuid) from public,anon,authenticated,service_role;

-- Change only the two reviewed allowlists and dispatch branch in the existing
-- verified wrapper. Complete captured definitions are pinned before composition.
do $compose$
declare n text;before_def text;after_def text;expected text;oid_ oid;old_meta jsonb;new_meta jsonb;
begin
 foreach n in array array['k2_private.verify_admin_bff_request','public.execute_admin_product_master_command_v1'] loop
  oid_:=to_regprocedure(n||'(text,bigint,uuid,uuid,text,text)');
  before_def:=replace(pg_get_functiondef(oid_),E'\r\n',E'\n');
  expected:=case n when 'k2_private.verify_admin_bff_request' then '6472f0a39b9ca5949d86b52fbfdc2dfc57f41166328971cb153c23ba997c8687' else 'c7e9f53fe80c68ce99401caf10d31f4ee272bd506a0c0f3bc7f6363c97f38b94' end;
  if encode(extensions.digest(convert_to(before_def,'UTF8'),'sha256'),'hex')<>expected then raise exception 'K2_SKU_MERGE_AUTHORITY_DRIFT';end if;
  select to_jsonb(p)-'prosrc' into old_meta from pg_proc p where oid=oid_;
  if n='k2_private.verify_admin_bff_request' then
   after_def:=replace(before_def,'''product_master_update'', ''product_master_status'', ''product_master_delete'',',
    '''product_sku_merge'', ''product_master_update'', ''product_master_status'', ''product_master_delete'',');
  else
   after_def:=replace(before_def,'''product_master_delete'',''category_policy_set''','''product_master_delete'',''product_sku_merge'',''category_policy_set''');
   after_def:=replace(after_def,'  if p_action in (''category_policy_set'',''category_policy_clear'') then',
    E'  if p_action=''product_sku_merge'' then\n    v_result:=k2_private.execute_product_sku_merge_v1(v_payload,p_idempotency_key);\n  elsif p_action in (''category_policy_set'',''category_policy_clear'') then');
  end if;
  if after_def=before_def then raise exception 'K2_SKU_MERGE_AUTHORITY_DRIFT';end if;
  execute after_def;
  select to_jsonb(p)-'prosrc' into new_meta from pg_proc p where oid=oid_;
  if old_meta is distinct from new_meta then raise exception 'K2_SKU_MERGE_AUTHORITY_DRIFT';end if;
 end loop;
end $compose$;
commit;
