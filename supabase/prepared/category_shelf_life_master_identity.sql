-- IDEA-20261005-05 / MAP-018. PREPARED ONLY after category-aware master foundation.
-- Destination identity cooperation, preserving duplicate edits, versions and historical retries.
do $master$
declare b pg_catalog.pg_proc%rowtype;a pg_catalog.pg_proc%rowtype;d text;h text;
begin
 if current_user<>'postgres' then raise exception 'K2_MASTER_IDENTITY_TARGET_INVALID';end if;
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f' or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0 or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null or b.proallargtypes is not null or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql') or b.prorettype<>'jsonb'::regtype or b.proargnames is distinct from array['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']::text[] or b.proacl::text[] is distinct from array['postgres=X/postgres','authenticated=X/postgres']::text[] or b.proconfig is distinct from array['search_path=""']::text[] then raise exception 'K2_MASTER_IDENTITY_FUNCTION_DRIFT';end if;
 h:=md5(replace(b.prosrc,chr(13),''));
 if h='569f28150ed3f5f27d6cf50c019d70cd' then return;end if;
 if h<>'82320eee518a85857015028dcee7ab53' then raise exception 'K2_MASTER_IDENTITY_FUNCTION_DRIFT';end if;
 d:=pg_catalog.pg_get_functiondef(b.oid);
 if (length(d)-length(replace(d,'  v_before jsonb; v_after jsonb; v_item text;','')))/length('  v_before jsonb; v_after jsonb; v_item text;')<>1 then raise exception 'K2_MASTER_IDENTITY_ANCHOR_INVALID';end if;
 d:=replace(d,'  v_before jsonb; v_after jsonb; v_item text;','  v_before jsonb; v_after jsonb; v_item text;
  v_identity_lock bigint;');
 if (length(d)-length(replace(d,'    v_before:=to_jsonb(v_product);
    update public.products set','')))/length('    v_before:=to_jsonb(v_product);
    update public.products set')<>1 then raise exception 'K2_MASTER_IDENTITY_ANCHOR_INVALID';end if;
 d:=replace(d,'    v_before:=to_jsonb(v_product);
    update public.products set','    -- Cooperate with fresh Draft admission; retain authorized master edit semantics.
    for v_identity_lock in
      select distinct identity_key from (values
        (case when v_next.name is distinct from v_product.name
          then pg_catalog.hashtextextended(''k2.draft.name:'' || lower(trim(v_next.name)), 0)
          else null::bigint end),
        (case when v_next.barcode is distinct from v_product.barcode
          and nullif(trim(v_next.barcode),'''') is not null
          then pg_catalog.hashtextextended(''k2.draft.barcode:'' || lower(trim(v_next.barcode)), 0)
          else null::bigint end)
      ) identities(identity_key) where identity_key is not null order by identity_key
    loop
      perform pg_catalog.pg_advisory_xact_lock(v_identity_lock);
    end loop;

    v_before:=to_jsonb(v_product);
    update public.products set');
 execute d;
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc') or md5(replace(a.prosrc,chr(13),''))<>'569f28150ed3f5f27d6cf50c019d70cd' then raise exception 'K2_MASTER_IDENTITY_METADATA_CHANGED';end if;
end $master$;
