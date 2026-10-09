-- IDEA-20261002-09 / MAP-018/023/017/020. Prepared only.
-- After the exact current payment/handover and reservation eligibility chain.
-- LF-normalized body pins; preserve all non-body catalog metadata and data.
-- Same-target private capture/backup/recovery and coordinated owner DDL required.
begin;
set local search_path='';
set local lock_timeout='5s';
set local statement_timeout='30s';
lock table public.product_batches,public.batch_change_events,public.hubs,public.custodians in share row exclusive mode;
do $install$
declare
  v_helper pg_catalog.pg_proc%rowtype;
  v_before pg_catalog.pg_proc%rowtype;
  v_after pg_catalog.pg_proc%rowtype;
  v_body text; v_definition text;
begin
  select * into v_helper from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('k2_private.lot_is_eligible_v1(public.product_batches)');
  if v_helper.oid is null or pg_catalog.md5(v_helper.prosrc)<>'2339bbb8c55024babf0ea1d873e46413'
    or v_helper.proowner<>'postgres'::pg_catalog.regrole or v_helper.prosecdef
    or v_helper.prorettype<>'boolean'::pg_catalog.regtype or v_helper.proisstrict or v_helper.proleakproof
    or v_helper.provolatile<>'s' or v_helper.proparallel<>'u' or v_helper.prosupport<>0
    or v_helper.prokind<>'f' or v_helper.provariadic<>0 or v_helper.proretset
    or v_helper.proconfig is distinct from array['search_path=""']::text[]
    or v_helper.proargdefaults is not null or v_helper.proargnames is distinct from array['p_lot']::text[]
    or (select lanname from pg_catalog.pg_language where oid=v_helper.prolang)<>'sql'
    or v_helper.proacl is null or (select count(*) from pg_catalog.aclexplode(v_helper.proacl))<>1
    or exists(select 1 from pg_catalog.aclexplode(v_helper.proacl) a
      where a.grantee<>v_helper.proowner or a.grantor<>v_helper.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable) then
    raise exception 'MAP-023 payment lot eligibility: unfamiliar private predicate';
  end if;
  select * into v_before from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('public.set_order_request_payment_status(uuid,text,text,jsonb)');
  if v_before.oid is null or v_before.proowner<>v_helper.proowner or not v_before.prosecdef
    or v_before.prorettype<>'public.order_requests'::pg_catalog.regtype
    or v_before.proisstrict or v_before.proleakproof or v_before.provolatile<>'v'
    or v_before.proparallel<>'u' or v_before.prosupport<>0 or v_before.prokind<>'f'
    or v_before.provariadic<>0 or v_before.proretset or v_before.proargdefaults is not null
    or v_before.proconfig is distinct from array['search_path=""']::text[]
    or v_before.proargnames is distinct from array['p_order_request_id','p_to_status','p_evidence_note','p_payment_evidence']::text[]
    or (select lanname from pg_catalog.pg_language where oid=v_before.prolang)<>'plpgsql'
    or v_before.proacl is null
    or not exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a where a.grantee=v_before.proowner)
    or exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a
      where a.grantee not in (v_before.proowner)
        or a.grantor<>v_before.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable)
    or pg_catalog.md5(replace(v_before.prosrc,chr(13),'')) not in ('c306b7e5f3df57efcfad47c718d58dd4','8528429beab5aedf914ba197dfdef429') then
    raise exception 'MAP-023 payment lot eligibility: unfamiliar payment authority';
  end if;
  if pg_catalog.md5(replace(v_before.prosrc,chr(13),''))='c306b7e5f3df57efcfad47c718d58dd4' then
    v_body:=replace(v_before.prosrc,chr(13),'');
    if (length(v_body)-length(replace(v_body,$old$            and (coalesce(b.expiry_date,b.best_before_date)>=current_date+90
              or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89
                and b.clearance_approved_at is not null))$old$,'')))/length($old$            and (coalesce(b.expiry_date,b.best_before_date)>=current_date+90
              or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89
                and b.clearance_approved_at is not null))$old$)<>1 then
      raise exception 'MAP-023 payment lot eligibility: payment anchor changed';
    end if;
    v_body:=replace(v_body,$old$            and (coalesce(b.expiry_date,b.best_before_date)>=current_date+90
              or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89
                and b.clearance_approved_at is not null))$old$,$new$            and k2_private.lot_is_eligible_v1(b)$new$);
    if pg_catalog.md5(v_body)<>'8528429beab5aedf914ba197dfdef429' then raise exception 'MAP-023 payment lot eligibility: payment candidate changed'; end if;
    v_definition:=pg_catalog.pg_get_functiondef(v_before.oid);
    if (length(v_definition)-length(replace(v_definition,v_before.prosrc,'')))/length(v_before.prosrc)<>1 then
      raise exception 'MAP-023 payment lot eligibility: payment body ambiguous';
    end if;
    execute replace(v_definition,v_before.prosrc,v_body);
  end if;
  select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
  if pg_catalog.md5(replace(v_after.prosrc,chr(13),''))<>'8528429beab5aedf914ba197dfdef429'
    or (pg_catalog.to_jsonb(v_after)-'prosrc') is distinct from (pg_catalog.to_jsonb(v_before)-'prosrc') then
    raise exception 'MAP-023 payment lot eligibility: payment metadata changed';
  end if;
  select * into v_before from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('public.fulfill_order_request(uuid,text)');
  if v_before.oid is null or v_before.proowner<>v_helper.proowner or not v_before.prosecdef
    or v_before.prorettype<>'public.order_requests'::pg_catalog.regtype
    or v_before.proisstrict or v_before.proleakproof or v_before.provolatile<>'v'
    or v_before.proparallel<>'u' or v_before.prosupport<>0 or v_before.prokind<>'f'
    or v_before.provariadic<>0 or v_before.proretset or v_before.proargdefaults is not null
    or v_before.proconfig is distinct from array['search_path=public']::text[]
    or v_before.proargnames is distinct from array['p_order_request_id','p_handover_note']::text[]
    or (select lanname from pg_catalog.pg_language where oid=v_before.prolang)<>'plpgsql'
    or v_before.proacl is null
    or not exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a where a.grantee=v_before.proowner)
    or exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a
      where a.grantee not in (v_before.proowner,'authenticated'::pg_catalog.regrole)
        or a.grantor<>v_before.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable)
    or pg_catalog.md5(replace(v_before.prosrc,chr(13),'')) not in ('3a30eb37388ca0a81a611d502042fb6d','5a19b704a9ca5d95c0691c0e5d44e2ac') then
    raise exception 'MAP-023 payment lot eligibility: unfamiliar handover authority';
  end if;
  if pg_catalog.md5(replace(v_before.prosrc,chr(13),''))='3a30eb37388ca0a81a611d502042fb6d' then
    v_body:=replace(v_before.prosrc,chr(13),'');
    if (length(v_body)-length(replace(v_body,$old$     or not coalesce((coalesce(b.expiry_date,b.best_before_date)>=current_date+90
       or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89 and b.clearance_approved_at is not null)),false)$old$,'')))/length($old$     or not coalesce((coalesce(b.expiry_date,b.best_before_date)>=current_date+90
       or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89 and b.clearance_approved_at is not null)),false)$old$)<>1 then
      raise exception 'MAP-023 payment lot eligibility: handover anchor changed';
    end if;
    v_body:=replace(v_body,$old$     or not coalesce((coalesce(b.expiry_date,b.best_before_date)>=current_date+90
       or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89 and b.clearance_approved_at is not null)),false)$old$,$new$     or not k2_private.lot_is_eligible_v1(b)$new$);
    if (length(v_body)-length(replace(v_body,$old$      and (b.inventory_status <> 'available' or coalesce(b.expiry_date, b.best_before_date) <= current_date + 30)$old$,'')))/length($old$      and (b.inventory_status <> 'available' or coalesce(b.expiry_date, b.best_before_date) <= current_date + 30)$old$)<>1 then
      raise exception 'MAP-023 payment lot eligibility: handover anchor changed';
    end if;
    v_body:=replace(v_body,$old$      and (b.inventory_status <> 'available' or coalesce(b.expiry_date, b.best_before_date) <= current_date + 30)$old$,$new$      and not k2_private.lot_is_eligible_v1(b)$new$);
    if (length(v_body)-length(replace(v_body,$old$        and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
          or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null))$old$,'')))/length($old$        and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
          or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null))$old$)<>1 then
      raise exception 'MAP-023 payment lot eligibility: handover anchor changed';
    end if;
    v_body:=replace(v_body,$old$        and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
          or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null))$old$,$new$        and k2_private.lot_is_eligible_v1(b)$new$);
    if pg_catalog.md5(v_body)<>'5a19b704a9ca5d95c0691c0e5d44e2ac' then raise exception 'MAP-023 payment lot eligibility: handover candidate changed'; end if;
    v_definition:=pg_catalog.pg_get_functiondef(v_before.oid);
    if (length(v_definition)-length(replace(v_definition,v_before.prosrc,'')))/length(v_before.prosrc)<>1 then
      raise exception 'MAP-023 payment lot eligibility: handover body ambiguous';
    end if;
    execute replace(v_definition,v_before.prosrc,v_body);
  end if;
  select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
  if pg_catalog.md5(replace(v_after.prosrc,chr(13),''))<>'5a19b704a9ca5d95c0691c0e5d44e2ac'
    or (pg_catalog.to_jsonb(v_after)-'prosrc') is distinct from (pg_catalog.to_jsonb(v_before)-'prosrc') then
    raise exception 'MAP-023 payment lot eligibility: handover metadata changed';
  end if;
end;
$install$;
commit;
