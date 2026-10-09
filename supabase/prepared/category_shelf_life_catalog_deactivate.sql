-- IDEA-20261005-05 / MAP-018. PREPARED ONLY: data-retaining catalog deactivate.
-- Keep corrected identity cooperation, all products, import history and receipts.
do $recovery$
declare b pg_catalog.pg_proc%rowtype;a pg_catalog.pg_proc%rowtype;
begin
 if current_user<>'postgres' then raise exception 'K2_CATALOG_RECOVERY_TARGET_INVALID';end if;
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.execute_admin_catalog_import_v1(text,bigint,uuid,uuid,text,text)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f' or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0 or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null or b.proallargtypes is not null or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql') or b.prorettype<>'jsonb'::regtype or b.proargnames is distinct from array['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']::text[] or (b.proacl::text[] is distinct from array['postgres=X/postgres','authenticated=X/postgres']::text[] and b.proacl::text[] is distinct from array['postgres=X/postgres']::text[]) or b.proconfig is distinct from array['search_path=""']::text[] then raise exception 'K2_CATALOG_RECOVERY_FUNCTION_DRIFT';end if;
 if md5(replace(b.prosrc,chr(13),''))<>'20c3b123c2ead92943d28e0097a4276a' then raise exception 'K2_CATALOG_RECOVERY_FUNCTION_DRIFT';end if;
 revoke all on function public.execute_admin_catalog_import_v1(text,bigint,uuid,uuid,text,text) from public,anon,authenticated;
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'proacl') is distinct from (to_jsonb(b)-'proacl') then raise exception 'K2_CATALOG_RECOVERY_METADATA_CHANGED';end if;
end $recovery$;
