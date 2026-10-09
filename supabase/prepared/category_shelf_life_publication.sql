-- IDEA-20261002-05 / MAP-018. PREPARED ONLY, not a complete installer.
-- Closed publication shared entry before fresh resources; locked unchanged-status replay.
do $publication$
declare b pg_catalog.pg_proc%rowtype;a pg_catalog.pg_proc%rowtype;d text;
begin
 if current_user<>'postgres' or to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is null then raise exception 'K2_CATEGORY_PUBLICATION_TARGET_INVALID';end if;
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.transition_product_publication_server(uuid,text)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f' or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0 or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null or b.proallargtypes is not null or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql') or b.prorettype<>'jsonb'::regtype or b.proargnames is distinct from array['p_session_id','p_requested_status']::text[] or b.proacl::text[] is distinct from array['postgres=X/postgres']::text[] or b.proconfig is distinct from array['search_path=""']::text[] or md5(replace(b.prosrc,chr(13),''))<>'47b5f07d104fd7a5cc8d4a93123d62bc' then raise exception 'K2_CATEGORY_PUBLICATION_FUNCTION_DRIFT';end if;
 d:=pg_catalog.pg_get_functiondef(b.oid);
 if (length(d)-length(replace(d,'  select * into v_session
  from public.product_intake_sessions','')))/length('  select * into v_session
  from public.product_intake_sessions')<>1 then raise exception 'K2_CATEGORY_PUBLICATION_ANCHOR_INVALID';end if;
 execute replace(d,'  select * into v_session
  from public.product_intake_sessions','  -- Historical unchanged status: reauthorize and reread under original locks.
  select s.* into v_session from public.product_intake_sessions s
  join public.products p on p.id=s.product_id
  where s.id=p_session_id and (s.created_by=auth.uid() or public.is_admin())
    and p.status=v_target;
  if found then
    select * into v_session from public.product_intake_sessions
    where id=p_session_id and product_id is not null
      and (created_by=auth.uid() or public.is_admin()) for update;
    if not found then raise exception using errcode=''42501'',message=''K2_INTAKE_PRODUCT_NOT_FOUND'';end if;
    select * into v_product from public.products where id=v_session.product_id for update;
    if not found then raise exception using errcode=''P0002'',message=''K2_PRODUCT_NOT_FOUND'';end if;
    if v_product.status is distinct from v_target then
      raise exception using errcode=''55000'',message=''K2_PUBLICATION_RETRY_STATE_CHANGED'';
    end if;
    return jsonb_build_object(''success'',true,''product_id'',v_product.id,''status'',v_target);
  end if;
  -- Publication changes no taxonomy/policy; shared mode covers fresh status writes.
  perform k2_private.lock_category_policy_v1(false);

  select * into v_session
  from public.product_intake_sessions');
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc') or md5(replace(a.prosrc,chr(13),''))<>'925c568b148630f98249a6207f3ce25e' then raise exception 'K2_CATEGORY_PUBLICATION_METADATA_CHANGED';end if;
end $publication$;
