-- IDEA-20261002-10 / MAP-018/023/017/020. Prepared only.
-- Guarded current signed recount correction; other writers and clearance remain separate.
-- Requires same-target capture/recovery and coordinated owner DDL maintenance.
begin;
set local search_path='';
set local lock_timeout='5s';
set local statement_timeout='30s';
lock table public.inventory_balances,public.products,public.product_batches in share row exclusive mode;
do $install$
declare
  v_before pg_catalog.pg_proc%rowtype;
  v_after pg_catalog.pg_proc%rowtype;
  v_helper pg_catalog.pg_proc%rowtype;
  v_body text; v_definition text;
begin
  select * into v_before from pg_catalog.pg_proc
  where oid=pg_catalog.to_regprocedure('public.execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)');
  select * into v_helper from pg_catalog.pg_proc
  where oid=pg_catalog.to_regprocedure('k2_private.lot_is_eligible_v1(public.product_batches)');
  if v_helper.oid is null or pg_catalog.md5(v_helper.prosrc)<>'2339bbb8c55024babf0ea1d873e46413'
    or v_helper.proowner<>'postgres'::pg_catalog.regrole
    or v_helper.prosecdef or v_helper.proisstrict or v_helper.proleakproof
    or v_helper.prorettype<>'boolean'::pg_catalog.regtype or v_helper.proretset
    or v_helper.provolatile<>'s' or v_helper.proparallel<>'u'
    or v_helper.prosupport<>0 or v_helper.prokind<>'f' or v_helper.provariadic<>0
    or v_helper.proargdefaults is not null or v_helper.proargnames is distinct from array['p_lot']::text[]
    or (select lanname from pg_catalog.pg_language where oid=v_helper.prolang)<>'sql'
    or v_helper.proconfig is distinct from array['search_path=""']::text[]
    or v_helper.proacl is null or (select count(*) from pg_catalog.aclexplode(v_helper.proacl))<>1
    or exists(select 1 from pg_catalog.aclexplode(v_helper.proacl) a where
      a.grantee<>v_helper.proowner or a.grantor<>v_helper.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable) then
    raise exception 'MAP-023 recount: unfamiliar eligibility prerequisite';
  end if;
  if v_before.oid is null or v_before.proowner<>v_helper.proowner
    or not v_before.prosecdef or v_before.prorettype<>'jsonb'::pg_catalog.regtype
    or v_before.proisstrict or v_before.proleakproof or v_before.provolatile<>'v'
    or v_before.proparallel<>'u' or v_before.prosupport<>0 or v_before.prokind<>'f'
    or v_before.provariadic<>0 or v_before.proretset or v_before.procost<>100 or v_before.prorows<>0
    or v_before.proargdefaults is not null or v_before.pronargdefaults<>0 or v_before.pronargs<>6
    or v_before.proargmodes is not null or v_before.proallargtypes is not null
    or v_before.protrftypes is not null or v_before.probin is not null or v_before.prosqlbody is not null
    or v_before.proconfig is distinct from array['search_path=""']::text[]
    or v_before.proargnames is distinct from array['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']::text[]
    or (select lanname from pg_catalog.pg_language where oid=v_before.prolang)<>'plpgsql'
    or v_before.proacl is null or (select count(*) from pg_catalog.aclexplode(v_before.proacl))<>2
    or not exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a where a.grantee=v_before.proowner)
    or not exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a where a.grantee='authenticated'::pg_catalog.regrole)
    or exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a
      where a.grantee not in (v_before.proowner,'authenticated'::pg_catalog.regrole)
        or a.grantor<>v_before.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable)
    or pg_catalog.md5(replace(v_before.prosrc,chr(13),'')) not in ('50495c137602f54e527ee6fbfad2b06f','c1916e00eb4b0e041ec81e49bd2cb0bf') then
    raise exception 'MAP-023 recount: unfamiliar signed authority';
  end if;
  if pg_catalog.md5(replace(v_before.prosrc,chr(13),''))='50495c137602f54e527ee6fbfad2b06f' then
    v_body:=replace(v_before.prosrc,chr(13),'');
    if (length(v_body)-length(replace(v_body,$anchor$    perform 1 from public.products where sku=trim(v_payload->>'sku') for update;$anchor$,'')))/length($anchor$    perform 1 from public.products where sku=trim(v_payload->>'sku') for update;$anchor$)<>1 then
      raise exception 'MAP-023 recount: product lock anchor changed';
    end if;
    v_body:=replace(v_body,$anchor$    perform 1 from public.products where sku=trim(v_payload->>'sku') for update;$anchor$,$replacement$    -- K2_SIGNED_RECOUNT_BALANCE_FIRST_V1
    -- Initialize only from saved physical lots; preserve an existing balance.
    insert into public.inventory_balances(sku,location_code,on_hand,reserved)
    select p.sku,'MANILA_MAIN',coalesce(sum(b.quantity),0)::integer,
      coalesce(sum(b.reserved_quantity),0)::integer
    from public.products p left join public.product_batches b on b.sku=p.sku
    where p.sku=trim(v_payload->>'sku') group by p.sku
    on conflict(sku,location_code) do nothing;
    perform 1 from public.inventory_balances
    where sku=trim(v_payload->>'sku') and location_code='MANILA_MAIN' for update;
    perform 1 from public.products where sku=trim(v_payload->>'sku') for update;$replacement$);
    if pg_catalog.md5(v_body)<>'c1916e00eb4b0e041ec81e49bd2cb0bf' then raise exception 'MAP-023 recount: candidate body changed'; end if;
    v_definition:=pg_catalog.pg_get_functiondef(v_before.oid);
    if (length(v_definition)-length(replace(v_definition,v_before.prosrc,'')))/length(v_before.prosrc)<>1 then
      raise exception 'MAP-023 recount: body occurrence ambiguous';
    end if;
    execute replace(v_definition,v_before.prosrc,v_body);
  end if;
  select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
  if pg_catalog.md5(replace(v_after.prosrc,chr(13),''))<>'c1916e00eb4b0e041ec81e49bd2cb0bf'
    or (pg_catalog.to_jsonb(v_after)-'prosrc') is distinct from (pg_catalog.to_jsonb(v_before)-'prosrc') then
    raise exception 'MAP-023 recount: metadata or candidate changed';
  end if;
end;
$install$;
notify pgrst,'reload schema';
commit;
