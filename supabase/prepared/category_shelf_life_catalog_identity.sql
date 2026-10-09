-- IDEA-20261005-05 / MAP-018. PREPARED ONLY after canonical catalog/category foundation.
-- Preserve import duplicate-edit, optimistic version and saved receipt semantics.
do $catalog$
declare b pg_catalog.pg_proc%rowtype;a pg_catalog.pg_proc%rowtype;d text;h text;
begin
 if current_user<>'postgres' or to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is null then raise exception 'K2_CATALOG_IDENTITY_TARGET_INVALID';end if;
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.execute_admin_catalog_import_v1(text,bigint,uuid,uuid,text,text)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f' or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0 or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null or b.proallargtypes is not null or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql') or b.prorettype<>'jsonb'::regtype or b.proargnames is distinct from array['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']::text[] or b.proacl::text[] is distinct from array['postgres=X/postgres','authenticated=X/postgres']::text[] or b.proconfig is distinct from array['search_path=""']::text[] then raise exception 'K2_CATALOG_IDENTITY_FUNCTION_DRIFT';end if;
 h:=md5(replace(b.prosrc,chr(13),''));
 if h='20c3b123c2ead92943d28e0097a4276a' then return;end if;
 if h<>'643ee1b9b7b584270d713b908729bfd3' then raise exception 'K2_CATALOG_IDENTITY_FUNCTION_DRIFT';end if;
 d:=pg_catalog.pg_get_functiondef(b.oid);
 if (length(d)-length(replace(d,'  v_key text;','')))/length('  v_key text;')<>1 then raise exception 'K2_CATALOG_IDENTITY_ANCHOR_INVALID';end if;
 d:=replace(d,'  v_key text;','  v_key text;
  v_identity_lock bigint;');
 if (length(d)-length(replace(d,'  insert into k2_private.catalog_import_operations(','')))/length('  insert into k2_private.catalog_import_operations(')<>1 then raise exception 'K2_CATALOG_IDENTITY_ANCHOR_INVALID';end if;
 d:=replace(d,'  insert into k2_private.catalog_import_operations(','  -- Fresh chunks cooperate with category and Draft admission; saved receipts return above.
  perform k2_private.lock_category_policy_v1(false);
  -- Existing-row locks precede identity keys, matching the master command order.
  -- Lock the whole chunk in SKU order before taking any destination-name key.
  perform p.id from public.products p
  where exists(select 1 from jsonb_array_elements(v_payload->''rows'') i
    where i->>''kind''=''update'' and p.catalog_id::text=lower(i->>''catalogId'')
      and p.sku=i->>''sku'')
  order by p.sku,p.id for update of p;
  for v_identity_lock in
    select distinct pg_catalog.hashtextextended(
      ''k2.draft.name:'' || lower(trim(i->''values''->>''name'')),0) as identity_key
    from jsonb_array_elements(v_payload->''rows'') i
    where i->>''kind''=''new'' or exists(select 1 from public.products p
      where p.catalog_id::text=lower(i->>''catalogId'') and p.sku=i->>''sku''
        and p.name is distinct from trim(i->''values''->>''name''))
    order by identity_key
  loop
    if v_identity_lock is not null then
      perform pg_catalog.pg_advisory_xact_lock(v_identity_lock);
    end if;
  end loop;

  insert into k2_private.catalog_import_operations(');
 execute d;
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc') or md5(replace(a.prosrc,chr(13),''))<>'20c3b123c2ead92943d28e0097a4276a' then raise exception 'K2_CATALOG_IDENTITY_METADATA_CHANGED';end if;
end $catalog$;
