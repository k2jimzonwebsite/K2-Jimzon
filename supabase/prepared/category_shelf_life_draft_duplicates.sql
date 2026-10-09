-- IDEA-20261005-03 / MAP-018. PREPARED ONLY after category_shelf_life_draft_evidence.sql.
-- Cooperating fresh Draft identity locks; original duplicate rules and cached retries.
do $draft$
declare b pg_catalog.pg_proc%rowtype;a pg_catalog.pg_proc%rowtype;d text;
begin
 if current_user<>'postgres' or to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is null then raise exception 'K2_CATEGORY_DRAFT_DUPLICATE_TARGET_INVALID';end if;
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.create_product_draft_server(uuid,uuid,jsonb,jsonb)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f' or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0 or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null or b.proallargtypes is not null or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql') or b.prorettype<>'jsonb'::regtype or b.proargnames is distinct from array['p_session_id','p_request_id','p_reviewed_payload','p_field_decisions']::text[] or b.proacl::text[] is distinct from array['postgres=X/postgres']::text[] or b.proconfig is distinct from array['search_path=""']::text[] or md5(replace(b.prosrc,chr(13),''))<>'63c72ea27839da942e603e900e0767b0' then raise exception 'K2_CATEGORY_DRAFT_DUPLICATE_FUNCTION_DRIFT';end if;
 d:=pg_catalog.pg_get_functiondef(b.oid);
 if (length(d)-length(replace(d,'  v_category_id uuid;
begin','')))/length('  v_category_id uuid;
begin')<>1 then raise exception 'K2_CATEGORY_DRAFT_DUPLICATE_ANCHOR_INVALID';end if;
 d:=replace(d,'  v_category_id uuid;
begin','  v_category_id uuid;
  v_identity_lock bigint;
begin');
 if (length(d)-length(replace(d,'  if exists (
    select 1 from public.products
    where barcode is not null','')))/length('  if exists (
    select 1 from public.products
    where barcode is not null')<>1 then raise exception 'K2_CATEGORY_DRAFT_DUPLICATE_ANCHOR_INVALID';end if;
 d:=replace(d,'  if exists (
    select 1 from public.products
    where barcode is not null','  -- Cooperating fresh Draft identities: ordered locks precede duplicate reads/SKU.
  for v_identity_lock in
    select distinct identity_key from (values
      (pg_catalog.hashtextextended(''k2.draft.name:'' || lower(v_name), 0)),
      (case when coalesce(v_product ->> ''barcode'', v_session.barcode) is not null
        then pg_catalog.hashtextextended(''k2.draft.barcode:'' || lower(coalesce(v_product ->> ''barcode'', v_session.barcode)), 0)
        else null::bigint end)
    ) identities(identity_key) where identity_key is not null order by identity_key
  loop
    perform pg_catalog.pg_advisory_xact_lock(v_identity_lock);
  end loop;

  if exists (
    select 1 from public.products
    where barcode is not null');
 execute d;
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc') or md5(replace(a.prosrc,chr(13),''))<>'47e8f63b086e417a460d18061dad626b' then raise exception 'K2_CATEGORY_DRAFT_DUPLICATE_METADATA_CHANGED';end if;
end $draft$;
