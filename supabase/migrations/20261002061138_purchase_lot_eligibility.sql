-- IDEA-20261002-08 / MAP-018/023. Prepared only, after current composed
-- lot/public stock, ordered holds, coverage, commitment and payment definitions.
-- Preserves physical counts, events, Website membership and public wrapper.
-- Same-target capture/recovery and coordinated owner-DDL maintenance required.
begin;
set local search_path='';
lock table public.product_batches,public.batch_change_events,public.hubs,public.custodians in share row exclusive mode;
do $install$
declare
  v_before pg_catalog.pg_proc%rowtype;
  v_after pg_catalog.pg_proc%rowtype;
  v_public pg_catalog.pg_proc%rowtype;
  v_helper pg_catalog.pg_proc%rowtype;
  v_body text;
  v_definition text;
  v_helper_body text:=$predicate$
  with policy as (
    select (pg_catalog.transaction_timestamp() at time zone 'Asia/Manila')::date as today
  )
  select exists (
    select 1 from public.hubs h
    join public.custodians c on c.id=p_lot.custodian and c.hub_id=h.id
    cross join policy d
    where h.id=p_lot.hub and h.id='HUB-MNL-CENTRAL' and h.country='PH'
      and p_lot.inventory_status='available' and p_lot.quantity>0
      and p_lot.reserved_quantity>=0 and p_lot.reserved_quantity<=p_lot.quantity
      and (
        coalesce(p_lot.expiry_date,p_lot.best_before_date)>=d.today+90
        or (
          coalesce(p_lot.expiry_date,p_lot.best_before_date) between d.today+31 and d.today+89
          and p_lot.clearance_approved_at is not null and p_lot.clearance_approved_by is not null
          and p_lot.clearance_approved_at<=pg_catalog.transaction_timestamp()
          and exists (
            select 1 from public.batch_change_events e
            where e.batch_id=p_lot.id and e.sku=p_lot.sku and e.actor_id=p_lot.clearance_approved_by
              and nullif(pg_catalog.btrim(e.reason),'') is not null
              -- Both supported approval writers save the marker and event with
              -- now() in one transaction. A later recount is not an approval.
              and e.created_at=p_lot.clearance_approved_at
              and e.created_at<=pg_catalog.transaction_timestamp()
              and coalesce(e.new_data->>'expiry_date',e.new_data->>'best_before_date')=
                coalesce(p_lot.expiry_date,p_lot.best_before_date)::text
              and (
                e.new_data->'clearance_approved'='true'::jsonb
                or (e.new_data->>'clearance_approved_by'=p_lot.clearance_approved_by::text
                  and case when pg_catalog.pg_input_is_valid(
                    e.new_data->>'clearance_approved_at','timestamp with time zone')
                    then (e.new_data->>'clearance_approved_at')::timestamptz end=p_lot.clearance_approved_at
                  and e.old_data->'clearance_approved_at' is distinct from e.new_data->'clearance_approved_at')
              )
              and not exists (
                select 1 from public.batch_change_events x
                where x.batch_id=p_lot.id and x.sku=p_lot.sku and x.id<>e.id
                  and x.created_at>=p_lot.clearance_approved_at
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
  );
$predicate$;
begin
  select * into v_before from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('public.reserve_order_request_lots_v1(uuid,text)');
  select * into v_public from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('public.get_public_product_stock()');
  if v_before.oid is null or v_public.oid is null
    or pg_catalog.md5(v_public.prosrc)<>'3007471a23043753b52b8b6731d78c49' or v_public.proowner<>v_before.proowner
    or not v_public.prosecdef or v_public.proconfig is distinct from array['search_path=""']::text[]
    or v_public.proowner<>'postgres'::pg_catalog.regrole or v_public.provolatile<>'s'
    or not v_public.proretset or v_public.prorettype<>'record'::pg_catalog.regtype
    or v_public.pronargs<>0 or v_public.proargdefaults is not null or v_public.proleakproof
    or v_public.proisstrict or v_public.proparallel<>'u' or v_public.prosupport<>0
    or v_public.prokind<>'f' or v_public.provariadic<>0
    or v_public.proallargtypes is distinct from array['text'::pg_catalog.regtype::oid,'bigint'::pg_catalog.regtype::oid]
    or v_public.proargmodes is distinct from array['t','t']::"char"[]
    or v_public.proargnames is distinct from array['sku','stock_from_batches']::text[]
    or (select lanname from pg_catalog.pg_language where oid=v_public.prolang)<>'sql'
    or v_public.proacl is null
    or (select count(*) from pg_catalog.aclexplode(v_public.proacl))<>4
    or exists(select 1 from pg_catalog.aclexplode(v_public.proacl) a
      where a.grantee not in (v_public.proowner,'anon'::pg_catalog.regrole,'authenticated'::pg_catalog.regrole,'service_role'::pg_catalog.regrole)
        or a.grantor<>v_public.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable)
    or exists(select 1 from unnest(array[v_public.proowner,'anon'::pg_catalog.regrole::oid,
      'authenticated'::pg_catalog.regrole::oid,'service_role'::pg_catalog.regrole::oid]) required(grantee)
      where not exists(select 1 from pg_catalog.aclexplode(v_public.proacl) a where a.grantee=required.grantee))
    or not v_before.prosecdef or v_before.prorettype<>'integer'::pg_catalog.regtype
    or v_before.proconfig is distinct from array['search_path=public']::text[]
    or v_before.proargnames is distinct from array['p_order_request_id','p_reason']::text[]
    or pg_catalog.pg_get_expr(v_before.proargdefaults,0) is distinct from 'NULL::text'
    or v_before.provolatile<>'v' or v_before.proretset
    or v_before.proisstrict or v_before.proleakproof or v_before.proparallel<>'u'
    or v_before.prosupport<>0 or v_before.prokind<>'f' or v_before.provariadic<>0
    or (select lanname from pg_catalog.pg_language where oid=v_before.prolang)<>'plpgsql'
    or v_before.proacl is null
    or exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a where a.grantee<>v_before.proowner)
    or pg_catalog.md5(v_before.prosrc) not in ('4037e919fadbb05ea704870110c511f4','e32eb0b2dc671859256e4c21bc7886b0') then
    raise exception 'MAP-023 lot eligibility: unfamiliar reservation/public authority';
  end if;
  select * into v_helper from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('k2_private.lot_is_eligible_v1(public.product_batches)');
  if v_helper.oid is not null then
    if v_helper.prosrc is distinct from v_helper_body or v_helper.proowner<>v_before.proowner
      or v_helper.prosecdef or v_helper.prorettype<>'boolean'::pg_catalog.regtype
      or v_helper.proconfig is distinct from array['search_path=""']::text[]
      or v_helper.provolatile<>'s' or v_helper.proretset or v_helper.proleakproof
      or v_helper.proisstrict or v_helper.proparallel<>'u' or v_helper.prosupport<>0
      or v_helper.prokind<>'f' or v_helper.provariadic<>0
      or v_helper.proargnames is distinct from array['p_lot']::text[]
      or v_helper.proargdefaults is not null or v_helper.proacl is null
      or (select lanname from pg_catalog.pg_language where oid=v_helper.prolang)<>'sql'
      or exists(select 1 from pg_catalog.aclexplode(v_helper.proacl) a where a.grantee<>v_helper.proowner) then
      raise exception 'MAP-023 lot eligibility: unfamiliar private predicate';
    end if;
  else
    execute pg_catalog.format('create function k2_private.lot_is_eligible_v1(p_lot public.product_batches)
      returns boolean language sql stable security invoker set search_path='''' as %L',v_helper_body);
    execute pg_catalog.format('alter function k2_private.lot_is_eligible_v1(public.product_batches) owner to %I',pg_catalog.pg_get_userbyid(v_before.proowner));
    revoke all on function k2_private.lot_is_eligible_v1(public.product_batches) from public,anon,authenticated,service_role;
  end if;
  if pg_catalog.md5(v_before.prosrc)='4037e919fadbb05ea704870110c511f4' then
    v_body:=v_before.prosrc;
    if length(v_body)-length(replace(v_body,$old$      select * from public.product_batches
$old$,''))<>length($old$      select * from public.product_batches
$old$) then
      raise exception 'MAP-023 lot eligibility: replacement anchor changed';
    end if;
    v_body:=replace(v_body,$old$      select * from public.product_batches
$old$,$new$      select * from public.product_batches b
$new$);
    if length(v_body)-length(replace(v_body,$old$        and (
          coalesce(expiry_date, best_before_date) >= current_date + 90
          or (
            coalesce(expiry_date, best_before_date) between current_date + 31 and current_date + 89
            and clearance_approved_at is not null
          )
        )$old$,''))<>length($old$        and (
          coalesce(expiry_date, best_before_date) >= current_date + 90
          or (
            coalesce(expiry_date, best_before_date) between current_date + 31 and current_date + 89
            and clearance_approved_at is not null
          )
        )$old$) then
      raise exception 'MAP-023 lot eligibility: replacement anchor changed';
    end if;
    v_body:=replace(v_body,$old$        and (
          coalesce(expiry_date, best_before_date) >= current_date + 90
          or (
            coalesce(expiry_date, best_before_date) between current_date + 31 and current_date + 89
            and clearance_approved_at is not null
          )
        )$old$,$new$        and k2_private.lot_is_eligible_v1(b)$new$);
    if length(v_body)-length(replace(v_body,$old$              and (coalesce(b.expiry_date,b.best_before_date)>=current_date+90
                or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89 and b.clearance_approved_at is not null))$old$,''))<>length($old$              and (coalesce(b.expiry_date,b.best_before_date)>=current_date+90
                or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89 and b.clearance_approved_at is not null))$old$) then
      raise exception 'MAP-023 lot eligibility: replacement anchor changed';
    end if;
    v_body:=replace(v_body,$old$              and (coalesce(b.expiry_date,b.best_before_date)>=current_date+90
                or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89 and b.clearance_approved_at is not null))$old$,$new$              and k2_private.lot_is_eligible_v1(b)$new$);
    if length(v_body)-length(replace(v_body,$old$          and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
            or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null))$old$,''))<>length($old$          and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
            or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null))$old$) then
      raise exception 'MAP-023 lot eligibility: replacement anchor changed';
    end if;
    v_body:=replace(v_body,$old$          and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
            or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null))$old$,$new$          and k2_private.lot_is_eligible_v1(b)$new$);
    if pg_catalog.md5(v_body)<>'e32eb0b2dc671859256e4c21bc7886b0' then raise exception 'MAP-023 lot eligibility: candidate body changed'; end if;
    v_definition:=pg_catalog.pg_get_functiondef(v_before.oid);
    if length(v_definition)-length(replace(v_definition,v_before.prosrc,''))<>length(v_before.prosrc) then
      raise exception 'MAP-023 lot eligibility: definition body ambiguous';
    end if;
    execute replace(v_definition,v_before.prosrc,v_body);
  end if;
  select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
  if pg_catalog.md5(v_after.prosrc)<>'e32eb0b2dc671859256e4c21bc7886b0'
    or (pg_catalog.to_jsonb(v_after)-'prosrc') is distinct from (pg_catalog.to_jsonb(v_before)-'prosrc') then
    raise exception 'MAP-023 lot eligibility: reservation metadata changed';
  end if;
  select * into v_helper from pg_catalog.pg_proc where oid='k2_private.lot_is_eligible_v1(public.product_batches)'::pg_catalog.regprocedure;
  if v_helper.prosrc is distinct from v_helper_body or v_helper.proowner<>v_before.proowner
    or v_helper.proacl is null or v_helper.prosecdef
    or exists(select 1 from pg_catalog.aclexplode(v_helper.proacl) a where a.grantee<>v_helper.proowner) then
    raise exception 'MAP-023 lot eligibility: private predicate postflight changed';
  end if;
end;
$install$;
notify pgrst,'reload schema';
commit;
