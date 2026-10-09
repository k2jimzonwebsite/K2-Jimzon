-- IDEA-20261004-01 / MAP-018/020. Prepared only; no provider activation.
-- Only exact historical/corrected private cleanup bodies are accepted.
-- Recovery closes public cleanup entrypoints while retaining this guard and all data.
begin;
set local search_path='';
set local lock_timeout='5s';
set local statement_timeout='30s';
do $cleanup_inputs$
declare
  v_before pg_catalog.pg_proc%rowtype;
  v_after pg_catalog.pg_proc%rowtype;
  v_body text := $candidate$
declare
  v_actor uuid := auth.uid();
  v_secret bytea;
  v_payload_hash text;
  v_expected text;
  v_message text;
begin
  if v_actor is null or not public.is_staff() then
    raise exception using errcode='42501', message='K2_ADMIN_ACCESS_REQUIRED';
  end if;
  if coalesce(auth.jwt()->>'aal','') <> 'aal2' then
    raise exception using errcode='42501', message='K2_ADMIN_AAL2_REQUIRED';
  end if;
  if p_action is null or p_timestamp is null or p_nonce is null
     or p_idempotency_key is null or p_payload_text is null or p_signature is null then
    raise exception using errcode='22023', message='K2_INTAKE_CLEANUP_REQUEST_INVALID';
  end if;
  if p_action not in (
    'intake_evidence_cleanup_pending',
    'intake_evidence_cleanup_retry',
    'intake_evidence_cleanup_complete'
  ) or p_payload_text is null
     or octet_length(convert_to(p_payload_text,'UTF8')) > 4096
     or p_signature !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023', message='K2_INTAKE_CLEANUP_REQUEST_INVALID';
  end if;
  if abs(extract(epoch from clock_timestamp())::bigint-p_timestamp) > 300 then
    raise exception using errcode='28000', message='K2_ADMIN_SIGNATURE_EXPIRED';
  end if;
  select request_secret into v_secret
  from k2_private.admin_bff_secrets where singleton=true;
  if v_secret is null then
    raise exception using errcode='55000', message='K2_ADMIN_BOUNDARY_NOT_CONFIGURED';
  end if;
  v_payload_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  v_message:=p_action||E'\n'||p_timestamp::text||E'\n'||p_nonce::text
    ||E'\n'||v_actor::text||E'\n'||p_idempotency_key::text||E'\n'||v_payload_hash;
  v_expected:=encode(extensions.hmac(convert_to(v_message,'UTF8'),v_secret,'sha256'),'hex');
  if extensions.digest(convert_to(v_expected,'UTF8'),'sha256')
     <> extensions.digest(convert_to(p_signature,'UTF8'),'sha256') then
    raise exception using errcode='28000', message='K2_ADMIN_SIGNATURE_INVALID';
  end if;
  delete from k2_private.admin_request_nonces where expires_at<=now();
  insert into k2_private.admin_request_nonces(actor_id,action,nonce,expires_at)
  values(v_actor,p_action,p_nonce,now()+interval '10 minutes') on conflict do nothing;
  return found;
end;
$candidate$;
begin
  select * into v_before from pg_catalog.pg_proc
  where oid=pg_catalog.to_regprocedure('k2_private.verify_admin_bff_cleanup_request(text,bigint,uuid,uuid,text,text)');
  if not found or v_before.proowner<>'postgres'::regrole
    or v_before.prokind<>'f' or not v_before.prosecdef or v_before.proisstrict
    or v_before.proretset or v_before.proleakproof or v_before.provolatile<>'v'
    or v_before.proparallel<>'u' or v_before.pronargdefaults<>0
    or v_before.prorettype<>'boolean'::regtype
    or v_before.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
    or v_before.proconfig is distinct from array['search_path=""']::text[]
    or v_before.proargnames is distinct from array['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']::text[]
    or cardinality(v_before.proacl) is distinct from 1
    or not exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a
      where a.grantee=v_before.proowner and a.grantor=v_before.proowner
        and a.privilege_type='EXECUTE' and not a.is_grantable)
    or md5(replace(v_before.prosrc,chr(13),'')) not in ('3eb156d5fceac826d50d3ab59407af69','34757a507264b051206dbea7da6c09cc') then
    raise exception 'K2_INTAKE_CLEANUP_FUNCTION_DRIFT';
  end if;
  if md5(replace(v_before.prosrc,chr(13),''))='3eb156d5fceac826d50d3ab59407af69' then
    execute replace(pg_catalog.pg_get_functiondef(v_before.oid),v_before.prosrc,v_body);
  end if;
  select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
  if md5(replace(v_after.prosrc,chr(13),''))<>'34757a507264b051206dbea7da6c09cc'
    or (to_jsonb(v_before)-'prosrc') is distinct from (to_jsonb(v_after)-'prosrc') then
    raise exception 'K2_INTAKE_CLEANUP_CONTRACT_CHANGED';
  end if;
end;
$cleanup_inputs$;
commit;
