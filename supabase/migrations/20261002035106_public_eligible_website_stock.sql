-- IDEA-20261002-05 / MAP-018: query-time Website stock over canonical lots.
-- Prepared only. Requires reviewed real Website/custody records and the
-- coordinated MAP-017/020/023 cutover; this file grants no new access or stock.
begin;
set local search_path='';

do $install$
declare
  v_before pg_catalog.pg_proc%rowtype;
  v_after pg_catalog.pg_proc%rowtype;
  v_view_before pg_catalog.pg_class%rowtype;
  v_view_after pg_catalog.pg_class%rowtype;
  v_definition text;
  v_query text := $stock_query$
  with policy as (
    select (pg_catalog.transaction_timestamp() at time zone 'Asia/Manila')::date as today
  ), eligible_lots as (
    select b.sku, (b.quantity - b.reserved_quantity)::bigint as units
    from public.product_batches b
    join public.hubs h on h.id=b.hub and h.id='HUB-MNL-CENTRAL' and h.country='PH'
    join public.custodians c on c.id=b.custodian and c.hub_id=h.id
    cross join policy d
    where b.inventory_status='available' and b.quantity>0
      and b.reserved_quantity>=0 and b.reserved_quantity<b.quantity
      and (
        coalesce(b.expiry_date,b.best_before_date)>=d.today+90
        or (
          coalesce(b.expiry_date,b.best_before_date) between d.today+31 and d.today+89
          and b.clearance_approved_at is not null and b.clearance_approved_by is not null
          and b.clearance_approved_at<=pg_catalog.transaction_timestamp()
          and exists (
            select 1 from public.batch_change_events e
            where e.batch_id=b.id and e.sku=b.sku and e.actor_id=b.clearance_approved_by
              and nullif(pg_catalog.btrim(e.reason),'') is not null
              -- Both supported approval writers save the marker and event with
              -- now() in one transaction. A later recount is not an approval.
              and e.created_at=b.clearance_approved_at
              and e.created_at<=pg_catalog.transaction_timestamp()
              and coalesce(e.new_data->>'expiry_date',e.new_data->>'best_before_date')=
                coalesce(b.expiry_date,b.best_before_date)::text
              and (
                e.new_data->'clearance_approved'='true'::jsonb
                or (e.new_data->>'clearance_approved_by'=b.clearance_approved_by::text
                  and case when pg_catalog.pg_input_is_valid(
                    e.new_data->>'clearance_approved_at','timestamp with time zone')
                    then (e.new_data->>'clearance_approved_at')::timestamptz end=b.clearance_approved_at
                  and e.old_data->'clearance_approved_at' is distinct from e.new_data->'clearance_approved_at')
              )
              and not exists (
                select 1 from public.batch_change_events x
                where x.batch_id=b.id and x.sku=b.sku and x.id<>e.id
                  and x.created_at>=b.clearance_approved_at
                  and x.created_at<=pg_catalog.transaction_timestamp()
                  and (
                    x.new_data->'clearance_approved'='false'::jsonb
                    or (x.new_data ? 'inventory_status' and (
                      x.new_data->>'inventory_status' is distinct from 'available'
                      or x.old_data->'expiry_date' is distinct from x.new_data->'expiry_date'
                      or x.old_data->'best_before_date' is distinct from x.new_data->'best_before_date'
                    ))
                  )
              )
          )
        )
      )
  )
  select p.sku::text, coalesce(pg_catalog.sum(b.units),0)::bigint
  from public.products p
  left join eligible_lots b on b.sku=p.sku
  where p.is_human_reviewed is true
    and nullif(pg_catalog.btrim(p.name),'') is not null
    and nullif(pg_catalog.btrim(p.primary_image_url),'') is not null
    and coalesce(p.srp,p.retail_price,0)>0
    and (p.status::text='Unlisted' or (p.status::text in ('Live','Active') and p.published is true))
    and exists (
      select 1 from public.channel_listings l
      where l.sku=p.sku and l.channel_source='website' and l.shop_id is null
        and l.status='Active' and l.publication_status in ('ready','published')
        and l.validation_errors='[]'::jsonb
    )
  group by p.sku
$stock_query$;
begin
  if to_regprocedure('public.get_public_product_stock()') is null
     or to_regclass('public.v_product_stock_from_batches') is null then
    raise exception 'MAP-018 public stock: original public projection is missing';
  end if;
  if to_regclass('public.hubs') is null or to_regclass('public.custodians') is null
     or to_regclass('public.channels') is null or to_regclass('public.channel_shops') is null
     or to_regclass('public.batch_change_events') is null
     or to_regprocedure('public.execute_admin_website_listing_command_v1(text,bigint,uuid,uuid,text,text)') is null then
    raise exception 'MAP-018 public stock: canonical custody and protected Website prerequisites are missing';
  end if;
  -- Keep referenced relation definitions stable during installation. Provider
  -- activation additionally requires the reviewed exclusive maintenance window.
  lock table public.products,public.product_batches,public.hubs,public.custodians,
    public.channel_listings,public.batch_change_events,public.v_product_stock_from_batches in access share mode;
  select * into v_before from pg_catalog.pg_proc
  where oid='public.get_public_product_stock()'::regprocedure;
  if pg_catalog.md5(pg_catalog.replace(v_before.prosrc,chr(13),'')) not in
       ('009576b4d06b8f2b6853d958361a2136',pg_catalog.md5(v_query))
     or v_before.proowner is distinct from 'postgres'::regrole
     or v_before.prolang is distinct from (select oid from pg_catalog.pg_language where lanname='sql')
     or not v_before.prosecdef or v_before.provolatile<>'s' or not v_before.proretset
     or v_before.prorettype<>'record'::regtype or v_before.pronargs<>0
     or v_before.proargdefaults is not null
     or v_before.proargnames is distinct from array['sku','stock_from_batches']
     or v_before.proargmodes is distinct from array['t','t']::"char"[]
     or v_before.proallargtypes is distinct from array['text'::regtype::oid,'bigint'::regtype::oid]
     or v_before.proconfig is distinct from array['search_path=""']
     or v_before.proacl is null
     or exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a
       where a.grantee not in (v_before.proowner,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
         or a.privilege_type<>'EXECUTE' or a.is_grantable)
     or not pg_catalog.has_function_privilege('anon',v_before.oid,'EXECUTE')
     or not pg_catalog.has_function_privilege('authenticated',v_before.oid,'EXECUTE') then
    raise exception 'MAP-018 public stock: unfamiliar function body or security metadata';
  end if;
  select * into v_view_before from pg_catalog.pg_class
  where oid='public.v_product_stock_from_batches'::regclass;
  if v_view_before.relkind<>'v' or v_view_before.relowner is distinct from 'postgres'::regrole
     or v_view_before.reloptions is distinct from array['security_invoker=true']
     or pg_catalog.md5(pg_catalog.pg_get_viewdef(v_view_before.oid,false))<>'9c24274c724ecbed60807b68df43fa3f'
     or (select array_agg(attname order by attnum) from pg_catalog.pg_attribute
       where attrelid=v_view_before.oid and attnum>0 and not attisdropped)
       is distinct from array['sku','stock_from_batches']::name[]
     or (select array_agg(atttypid order by attnum) from pg_catalog.pg_attribute
       where attrelid=v_view_before.oid and attnum>0 and not attisdropped)
       is distinct from array['text'::regtype::oid,'bigint'::regtype::oid]
     or v_view_before.relacl is null
     or exists(select 1 from pg_catalog.pg_attribute
       where attrelid=v_view_before.oid and attnum>0 and not attisdropped and attacl is not null)
     or exists(select 1 from pg_catalog.aclexplode(v_view_before.relacl) a
       where a.grantee not in (v_view_before.relowner,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
         or (a.grantee<>v_view_before.relowner and (a.privilege_type<>'SELECT' or a.is_grantable)))
     or not pg_catalog.has_table_privilege('anon',v_view_before.oid,'SELECT')
     or not pg_catalog.has_table_privilege('authenticated',v_view_before.oid,'SELECT') then
    raise exception 'MAP-018 public stock: unfamiliar public view definition or security metadata';
  end if;
  if v_before.prosrc is distinct from v_query then
    v_definition:=pg_catalog.pg_get_functiondef(v_before.oid);
    if (pg_catalog.length(v_definition)-pg_catalog.length(pg_catalog.replace(v_definition,v_before.prosrc,'')))
       <>pg_catalog.length(v_before.prosrc) then
      raise exception 'MAP-018 public stock: function replacement scope is ambiguous';
    end if;
    execute pg_catalog.replace(v_definition,v_before.prosrc,v_query);
  end if;
  select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
  if v_after.prosrc is distinct from v_query
     or (to_jsonb(v_after)-'prosrc') is distinct from (to_jsonb(v_before)-'prosrc') then
    raise exception 'MAP-018 public stock: replacement changed protected metadata';
  end if;
  select * into v_view_after from pg_catalog.pg_class where oid=v_view_before.oid;
  if to_jsonb(v_view_after) is distinct from to_jsonb(v_view_before)
     or pg_catalog.md5(pg_catalog.pg_get_viewdef(v_view_after.oid,false))<>'9c24274c724ecbed60807b68df43fa3f' then
    raise exception 'MAP-018 public stock: replacement changed public view metadata';
  end if;
end
$install$;

notify pgrst,'reload schema';
commit;
