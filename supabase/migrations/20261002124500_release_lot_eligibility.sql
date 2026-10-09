-- IDEA-20261002-10 / MAP-018/023/017/020. Prepared only, not provider-applied.
-- After the exact current lot/public/reservation/payment/recount composition.
-- Two release cache predicates and the reproduced compatibility calendar only.
-- Preserve all non-body metadata, trigger binding, counts, history and grants.
-- NULL restored cancellation/trigger ACLs are not provider-access acceptance.
-- Same-target private captures, backup, reviewed deactivation/roll-forward and
-- coordinated owner DDL maintenance remain separate activation requirements.
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
  v_spec record;
  v_body text; v_definition text; v_anchor text;
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
    or exists(select 1 from pg_catalog.aclexplode(v_helper.proacl) a where a.grantee<>v_helper.proowner
      or a.grantor<>v_helper.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable) then
    raise exception 'MAP-023 release lot eligibility: unfamiliar private predicate';
  end if;
  if (select count(*) from pg_catalog.pg_trigger where tgfoid=pg_catalog.to_regprocedure('public.sync_product_batch_compat_columns()'))<>1
    or not exists(select 1 from pg_catalog.pg_trigger where tgfoid=pg_catalog.to_regprocedure('public.sync_product_batch_compat_columns()')
      and tgrelid='public.product_batches'::pg_catalog.regclass and tgname='trg_sync_product_batch_compat_columns'
      and tgtype=23 and tgenabled='O' and not tgisinternal and tgnargs=0 and tgqual is null
      and pg_catalog.octet_length(tgargs)=0 and tgconstraint=0 and not tgdeferrable and not tginitdeferred
      and pg_catalog.cardinality(tgattr::smallint[])=0 and tgnewtable is null and tgoldtable is null) then
    raise exception 'MAP-023 release lot eligibility: unfamiliar compatibility trigger binding';
  end if;
  for v_spec in select * from (values
    ('cancel','public.cancel_order_request(uuid,text)','4b8c9de7e75771bae71c44519bfe4575','ebbae217f6d339957729295f46f5c51f',
      'public.order_requests',false,true,'search_path=public',array['p_order_request_id','p_reason']::text[]),
    ('expiry','public.release_expired_reservations_v1(integer)','c4f4622ddd1cd9868b86e9b8dd830f5b','b246092612ab4c2aa17f802613c2541e',
      'record',true,true,'search_path=""',array['p_limit','released_count','released_ids']::text[]),
    ('compatibility','public.sync_product_batch_compat_columns()','37607de6a9c0ab02d111e804806766c6','8ac9f02bb2a7e6110d3ab8d1a97cc0ab',
      'trigger',false,false,'search_path=public, pg_temp',null::text[])
  ) x(kind,signature,old_md5,new_md5,return_type,retset,definer,config,argnames)
  loop
    select * into v_before from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure(v_spec.signature);
    if v_before.oid is null or v_before.proowner<>v_helper.proowner
      or v_before.prosecdef is distinct from v_spec.definer or v_before.proretset is distinct from v_spec.retset
      or v_before.prorettype<>v_spec.return_type::pg_catalog.regtype
      or v_before.proisstrict or v_before.proleakproof or v_before.provolatile<>'v'
      or v_before.proparallel<>'u' or v_before.prosupport<>0 or v_before.prokind<>'f'
      or v_before.provariadic<>0 or v_before.procost<>100 or v_before.probin is not null
      or v_before.prosqlbody is not null or v_before.protrftypes is not null
      or v_before.prorows<>(case when v_spec.kind='expiry' then 1000 else 0 end)
      or v_before.proconfig is distinct from array[v_spec.config]::text[]
      or v_before.proargnames is distinct from v_spec.argnames
      or (select lanname from pg_catalog.pg_language where oid=v_before.prolang)<>'plpgsql'
      or pg_catalog.md5(replace(v_before.prosrc,chr(13),'')) not in (v_spec.old_md5,v_spec.new_md5) then
      raise exception 'MAP-023 release lot eligibility: unfamiliar % body or execution metadata',v_spec.kind;
    end if;
    if v_spec.kind='expiry' then
      if pg_catalog.pg_get_expr(v_before.proargdefaults,0) is distinct from '500'
        or v_before.pronargdefaults<>1
        or v_before.proargmodes is distinct from array['i','t','t']::"char"[]
        or v_before.proallargtypes is distinct from array['integer'::pg_catalog.regtype::oid,
          'integer'::pg_catalog.regtype::oid,'uuid[]'::pg_catalog.regtype::oid]
        or v_before.proacl is null or (select count(*) from pg_catalog.aclexplode(v_before.proacl))<>2
        or not exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a where a.grantee=v_before.proowner)
        or not exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a where a.grantee='authenticated'::pg_catalog.regrole)
        or exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a
          where a.grantee not in (v_before.proowner,'authenticated'::pg_catalog.regrole)
            or a.grantor<>v_before.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable) then
        raise exception 'MAP-023 release lot eligibility: unfamiliar expiry argument or ACL contract';
      end if;
    elsif v_before.proargdefaults is not null or v_before.pronargdefaults<>0 or v_before.proargmodes is not null
      or v_before.proallargtypes is not null or v_before.proacl is not null then
      raise exception 'MAP-023 release lot eligibility: unfamiliar % argument or restored ACL contract',v_spec.kind;
    end if;
    if pg_catalog.md5(replace(v_before.prosrc,chr(13),''))=v_spec.old_md5 then
      v_body:=replace(v_before.prosrc,chr(13),'');
      if v_spec.kind='compatibility' then
        if (length(v_body)-length(replace(v_body,'current_date','')))/length('current_date')<>5
          or (length(v_body)-length(replace(v_body,'declare v_expiry date;','')))/length('declare v_expiry date;')<>1 then
          raise exception 'MAP-023 release lot eligibility: unfamiliar compatibility calendar anchors';
        end if;
        v_body:=replace(replace(v_body,'declare v_expiry date;',
          $calendar$declare v_expiry date; v_today date:=(pg_catalog.transaction_timestamp() at time zone 'Asia/Manila')::date;$calendar$),
          'current_date','v_today');
      else
        v_anchor:=case when v_spec.kind='cancel' then $cancel$        and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
          or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null))$cancel$
          else $expiry$        and (coalesce(b.expiry_date,b.best_before_date)>=current_date+90
          or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89
            and b.clearance_approved_at is not null))$expiry$ end;
        if (length(v_body)-length(replace(v_body,v_anchor,'')))/length(v_anchor)<>1 then
          raise exception 'MAP-023 release lot eligibility: unfamiliar % cache anchor',v_spec.kind;
        end if;
        v_body:=replace(v_body,v_anchor,'        and k2_private.lot_is_eligible_v1(b)');
      end if;
      if pg_catalog.md5(v_body)<>v_spec.new_md5 then
        raise exception 'MAP-023 release lot eligibility: unfamiliar % candidate',v_spec.kind;
      end if;
      v_definition:=pg_catalog.pg_get_functiondef(v_before.oid);
      if (length(v_definition)-length(replace(v_definition,v_before.prosrc,'')))/length(v_before.prosrc)<>1 then
        raise exception 'MAP-023 release lot eligibility: unfamiliar % body placement',v_spec.kind;
      end if;
      execute replace(v_definition,v_before.prosrc,v_body);
    end if;
    select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
    if pg_catalog.md5(replace(v_after.prosrc,chr(13),''))<>v_spec.new_md5
      or (pg_catalog.to_jsonb(v_after)-'prosrc') is distinct from (pg_catalog.to_jsonb(v_before)-'prosrc') then
      raise exception 'MAP-023 release lot eligibility: unfamiliar % postflight metadata/body',v_spec.kind;
    end if;
  end loop;
end;
$install$;
commit;
