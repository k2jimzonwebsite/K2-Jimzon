-- IDEA-20261005-04 / MAP-018. PREPARED ONLY after category_shelf_life_draft_duplicates.sql.
-- One stored barcode normalization for query, identity lock and INSERT; raw length unchanged.
do $draft$
declare b pg_catalog.pg_proc%rowtype;a pg_catalog.pg_proc%rowtype;d text;
begin
 if current_user<>'postgres' or to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is null then raise exception 'K2_CATEGORY_DRAFT_WHITESPACE_TARGET_INVALID';end if;
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.create_product_draft_server(uuid,uuid,jsonb,jsonb)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f' or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0 or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null or b.proallargtypes is not null or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql') or b.prorettype<>'jsonb'::regtype or b.proargnames is distinct from array['p_session_id','p_request_id','p_reviewed_payload','p_field_decisions']::text[] or b.proacl::text[] is distinct from array['postgres=X/postgres']::text[] or b.proconfig is distinct from array['search_path=""']::text[] or md5(replace(b.prosrc,chr(13),''))<>'47e8f63b086e417a460d18061dad626b' then raise exception 'K2_CATEGORY_DRAFT_WHITESPACE_FUNCTION_DRIFT';end if;
 d:=pg_catalog.pg_get_functiondef(b.oid);
 if (length(d)-length(replace(d,'  v_identity_lock bigint;','')))/length('  v_identity_lock bigint;')<>1 then raise exception 'K2_CATEGORY_DRAFT_WHITESPACE_ANCHOR_INVALID';end if;
 d:=replace(d,'  v_identity_lock bigint;','  v_identity_lock bigint;
  v_barcode text;');
 if (length(d)-length(replace(d,'  -- Cooperating fresh Draft identities:','')))/length('  -- Cooperating fresh Draft identities:')<>1 then raise exception 'K2_CATEGORY_DRAFT_WHITESPACE_ANCHOR_INVALID';end if;
 d:=replace(d,'  -- Cooperating fresh Draft identities:','  v_barcode := nullif(trim(coalesce(v_product ->> ''barcode'', v_session.barcode)), '''');

  -- Cooperating fresh Draft identities:');
 if (length(d)-length(replace(d,'case when coalesce(v_product ->> ''barcode'', v_session.barcode) is not null','')))/length('case when coalesce(v_product ->> ''barcode'', v_session.barcode) is not null')<>1 then raise exception 'K2_CATEGORY_DRAFT_WHITESPACE_ANCHOR_INVALID';end if;
 d:=replace(d,'case when coalesce(v_product ->> ''barcode'', v_session.barcode) is not null','case when v_barcode is not null');
 if (length(d)-length(replace(d,'lower(coalesce(v_product ->> ''barcode'', v_session.barcode)), 0)','')))/length('lower(coalesce(v_product ->> ''barcode'', v_session.barcode)), 0)')<>1 then raise exception 'K2_CATEGORY_DRAFT_WHITESPACE_ANCHOR_INVALID';end if;
 d:=replace(d,'lower(coalesce(v_product ->> ''barcode'', v_session.barcode)), 0)','lower(v_barcode), 0)');
 if (length(d)-length(replace(d,'lower(barcode) = lower(coalesce(v_product ->> ''barcode'', v_session.barcode))','')))/length('lower(barcode) = lower(coalesce(v_product ->> ''barcode'', v_session.barcode))')<>1 then raise exception 'K2_CATEGORY_DRAFT_WHITESPACE_ANCHOR_INVALID';end if;
 d:=replace(d,'lower(barcode) = lower(coalesce(v_product ->> ''barcode'', v_session.barcode))','lower(trim(barcode)) = lower(v_barcode)');
 if (length(d)-length(replace(d,'    nullif(trim(coalesce(v_product ->> ''barcode'', v_session.barcode)), ''''),','')))/length('    nullif(trim(coalesce(v_product ->> ''barcode'', v_session.barcode)), ''''),')<>1 then raise exception 'K2_CATEGORY_DRAFT_WHITESPACE_ANCHOR_INVALID';end if;
 d:=replace(d,'    nullif(trim(coalesce(v_product ->> ''barcode'', v_session.barcode)), ''''),','    v_barcode,');
 execute d;
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc') or md5(replace(a.prosrc,chr(13),''))<>'e0ae0726b5d19da69a023eb59bc98722' then raise exception 'K2_CATEGORY_DRAFT_WHITESPACE_METADATA_CHANGED';end if;
end $draft$;
