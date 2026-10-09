-- IDEA-20261002-05 / MAP-018. PREPARED ONLY, not a complete installer.
-- New zero-stock Draft shared entry before session/resources; locked saved association.
do $draft$
declare b pg_catalog.pg_proc%rowtype;a pg_catalog.pg_proc%rowtype;d text;
begin
 if current_user<>'postgres' or to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is null then raise exception 'K2_CATEGORY_DRAFT_TARGET_INVALID';end if;
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.create_product_draft_server(uuid,uuid,jsonb,jsonb)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f' or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0 or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null or b.proallargtypes is not null or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql') or b.prorettype<>'jsonb'::regtype or b.proargnames is distinct from array['p_session_id','p_request_id','p_reviewed_payload','p_field_decisions']::text[] or b.proacl::text[] is distinct from array['postgres=X/postgres']::text[] or b.proconfig is distinct from array['search_path=""']::text[] or md5(replace(b.prosrc,chr(13),''))<>'effac58afd4dd09a0d5af207ed493326' then raise exception 'K2_CATEGORY_DRAFT_FUNCTION_DRIFT';end if;
 d:=pg_catalog.pg_get_functiondef(b.oid);
 if (length(d)-length(replace(d,'  select * into v_session
  from public.product_intake_sessions','')))/length('  select * into v_session
  from public.product_intake_sessions')<>1 then raise exception 'K2_CATEGORY_DRAFT_ANCHOR_INVALID';end if;
 execute replace(d,'  select * into v_session
  from public.product_intake_sessions','  -- Saved Draft association: reauthorize and reread under the original session lock.
  select * into v_session from public.product_intake_sessions
  where id=p_session_id and status=''active'' and product_id is not null
    and (created_by=auth.uid() or public.is_admin());
  if found then
    select * into v_session from public.product_intake_sessions
    where id=p_session_id and status=''active''
      and (created_by=auth.uid() or public.is_admin()) for update;
    if not found then raise exception using errcode=''42501'',message=''K2_INTAKE_SESSION_NOT_FOUND'';end if;
    if v_session.request_id<>p_request_id then raise exception using errcode=''22023'',message=''K2_REQUEST_ID_MISMATCH'';end if;
    if v_session.product_id is null then
      raise exception using errcode=''55000'',message=''K2_DRAFT_RETRY_STATE_CHANGED'';
    end if;
    return jsonb_build_object(''success'',true,''idempotent'',true,
      ''product_id'',v_session.product_id,''sku'',v_session.assigned_sku);
  end if;
  -- New zero-stock Draft first assignment reads existing taxonomy; no taxonomy mutation.
  perform k2_private.lock_category_policy_v1(false);

  select * into v_session
  from public.product_intake_sessions');
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc') or md5(replace(a.prosrc,chr(13),''))<>'e05c6e32e5b80d22fa70d4c44da8d170' then raise exception 'K2_CATEGORY_DRAFT_METADATA_CHANGED';end if;
end $draft$;
