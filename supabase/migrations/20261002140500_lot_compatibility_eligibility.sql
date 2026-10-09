-- IDEA-20261002-10 / MAP-018/023/017/020. Prepared only, not provider-applied.
-- After the exact current recount and release eligibility corrections.
-- Derive the touched lot from current private eligibility; refresh after the
-- new audit event becomes visible, finalize only that uncommitted event's
-- snapshot, and derive product sums from current eligibility. No prior event
-- or sibling lot is rewritten. Physical/reserved values and signing remain.
-- Same-target captures, coordinated owner DDL, backup and reviewed recovery
-- remain activation gates. Existing stale rows require separate reviewed rebuild.
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
    or exists(select 1 from pg_catalog.aclexplode(v_helper.proacl) a where a.grantee<>v_helper.proowner
      or a.grantor<>v_helper.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable) then
    raise exception 'MAP-023 lot compatibility: unfamiliar private predicate';
  end if;
  if exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.batch_change_events'::regclass and not tgisinternal)
    or exists(select 1 from pg_catalog.pg_rewrite where ev_class='public.batch_change_events'::regclass) then
    raise exception 'MAP-023 lot compatibility: unfamiliar audit consumers';
  end if;
  if (select count(*) from pg_catalog.pg_trigger where tgfoid=pg_catalog.to_regprocedure('public.sync_product_batch_compat_columns()'))<>1
    or not exists(select 1 from pg_catalog.pg_trigger where tgfoid=pg_catalog.to_regprocedure('public.sync_product_batch_compat_columns()')
      and tgrelid='public.product_batches'::regclass and tgname='trg_sync_product_batch_compat_columns'
      and tgtype=23 and tgenabled='O' and not tgisinternal and tgnargs=0 and tgqual is null
      and pg_catalog.octet_length(tgargs)=0 and tgconstraint=0 and not tgdeferrable and not tginitdeferred
      and pg_catalog.cardinality(tgattr::smallint[])=0 and tgnewtable is null and tgoldtable is null) then
    raise exception 'MAP-023 lot compatibility: unfamiliar trigger binding';
  end if;
  for v_spec in select * from (values
    ('trigger','public.sync_product_batch_compat_columns()','8ac9f02bb2a7e6110d3ab8d1a97cc0ab','7b85feb02792af76d287ba1c2114324f',
      'trigger',false,'search_path=public, pg_temp',null::text[]),
    ('command','public.execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)','c1916e00eb4b0e041ec81e49bd2cb0bf','6690b0ab5cf99a74a5f7e8ad7bafd8d0',
      'jsonb',true,'search_path=""',array['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']::text[])
  ) x(kind,signature,old_md5,new_md5,return_type,definer,config,argnames)
  loop
    select * into v_before from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure(v_spec.signature);
    if v_before.oid is null or v_before.proowner<>v_helper.proowner
      or v_before.prosecdef is distinct from v_spec.definer or v_before.proretset
      or v_before.prorettype<>v_spec.return_type::pg_catalog.regtype
      or v_before.proisstrict or v_before.proleakproof or v_before.provolatile<>'v'
      or v_before.proparallel<>'u' or v_before.prosupport<>0 or v_before.prokind<>'f'
      or v_before.provariadic<>0 or v_before.procost<>100 or v_before.prorows<>0
      or v_before.probin is not null or v_before.prosqlbody is not null or v_before.protrftypes is not null
      or v_before.proargdefaults is not null or v_before.pronargdefaults<>0
      or v_before.proargmodes is not null or v_before.proallargtypes is not null
      or v_before.proconfig is distinct from array[v_spec.config]::text[]
      or v_before.proargnames is distinct from v_spec.argnames
      or (select lanname from pg_catalog.pg_language where oid=v_before.prolang)<>'plpgsql'
      or pg_catalog.md5(replace(v_before.prosrc,chr(13),'')) not in (v_spec.old_md5,v_spec.new_md5) then
      raise exception 'MAP-023 lot compatibility: unfamiliar % body or metadata',v_spec.kind;
    end if;
    if v_spec.kind='trigger' then
      if v_before.proacl is not null then raise exception 'MAP-023 lot compatibility: unfamiliar trigger ACL'; end if;
    elsif v_before.proacl is null or (select count(*) from pg_catalog.aclexplode(v_before.proacl))<>2
      or not exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a where a.grantee=v_before.proowner)
      or not exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a where a.grantee='authenticated'::pg_catalog.regrole)
      or exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a
        where a.grantee not in (v_before.proowner,'authenticated'::pg_catalog.regrole)
          or a.grantor<>v_before.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable) then
      raise exception 'MAP-023 lot compatibility: unfamiliar command ACL';
    end if;
    if pg_catalog.md5(replace(v_before.prosrc,chr(13),''))=v_spec.old_md5 then
      v_body:=replace(v_before.prosrc,chr(13),'');
      if v_spec.kind='trigger' then
        v_body:=replace(v_body,$old$  new.quantity_available:=case when new.inventory_status='available' and (
    v_expiry>=v_today+90 or
    (v_expiry between v_today+31 and v_today+89 and new.clearance_approved_at is not null)
  ) then greatest(new.quantity-new.reserved_quantity,0) else 0 end;$old$,$new$  new.quantity_available:=case when k2_private.lot_is_eligible_v1(new)
    then greatest(new.quantity-new.reserved_quantity,0) else 0 end;$new$);
      else
        if (length(v_body)-length(replace(v_body,'current_date','')))/length('current_date')<>12 then
          raise exception 'MAP-023 lot compatibility: unfamiliar command calendar';
        end if;
        v_body:=replace(replace(v_body,$old$  v_sellable integer;$old$,$new$  v_sellable integer;
  v_event_id uuid;
  v_today date:=(pg_catalog.transaction_timestamp() at time zone 'Asia/Manila')::date;$new$),'current_date','v_today');
        v_body:=replace(v_body,$old$values(v_saved.id,v_saved.sku,trim(v_payload->>'reason'),null,to_jsonb(v_saved),v_actor);$old$,$new$values(v_saved.id,v_saved.sku,trim(v_payload->>'reason'),null,to_jsonb(v_saved),v_actor) returning id into v_event_id;
    -- The approval/history event now exists. Finalize only this command's event.
    update public.product_batches set quantity_available=quantity_available
    where id=v_saved.id returning * into v_saved;
    update public.batch_change_events set new_data=to_jsonb(v_saved)
    where id=v_event_id;$new$);
        v_body:=replace(v_body,$old$values(v_saved.id,v_saved.sku,trim(v_payload->>'reason'),to_jsonb(v_existing),to_jsonb(v_saved),v_actor);$old$,$new$values(v_saved.id,v_saved.sku,trim(v_payload->>'reason'),to_jsonb(v_existing),to_jsonb(v_saved),v_actor) returning id into v_event_id;
    -- The approval/history event now exists. Finalize only this command's event.
    update public.product_batches set quantity_available=quantity_available
    where id=v_saved.id returning * into v_saved;
    update public.batch_change_events set new_data=to_jsonb(v_saved)
    where id=v_event_id;$new$);
        v_body:=replace(v_body,$old$    select coalesce(sum(quantity),0)::integer,coalesce(sum(quantity_available),0)::integer
    into v_total,v_sellable from public.product_batches where sku=trim(v_payload->>'sku');$old$,$new$    select coalesce(sum(b.quantity),0)::integer,
      coalesce(sum(greatest(b.quantity-b.reserved_quantity,0)) filter (where k2_private.lot_is_eligible_v1(b)),0)::integer
    into v_total,v_sellable from public.product_batches b where b.sku=trim(v_payload->>'sku');$new$);
        v_body:=replace(v_body,$old$    select coalesce(sum(quantity_available),0)::integer into v_sellable
    from public.product_batches where sku=v_saved.sku;$old$,$new$    select coalesce(sum(greatest(b.quantity-b.reserved_quantity,0)),0)::integer into v_sellable
    from public.product_batches b where b.sku=v_saved.sku and k2_private.lot_is_eligible_v1(b);$new$);
      end if;
      if pg_catalog.md5(v_body)<>v_spec.new_md5 then
        raise exception 'MAP-023 lot compatibility: unfamiliar % candidate anchors',v_spec.kind;
      end if;
      v_definition:=pg_catalog.pg_get_functiondef(v_before.oid);
      if (length(v_definition)-length(replace(v_definition,v_before.prosrc,'')))/length(v_before.prosrc)<>1 then
        raise exception 'MAP-023 lot compatibility: unfamiliar % body placement',v_spec.kind;
      end if;
      execute replace(v_definition,v_before.prosrc,v_body);
    end if;
    select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
    if pg_catalog.md5(replace(v_after.prosrc,chr(13),''))<>v_spec.new_md5
      or (pg_catalog.to_jsonb(v_after)-'prosrc') is distinct from (pg_catalog.to_jsonb(v_before)-'prosrc') then
      raise exception 'MAP-023 lot compatibility: unfamiliar % postflight',v_spec.kind;
    end if;
  end loop;
end;
$install$;
commit;
