-- IDEA-20261001-04 / MAP-017/020. Prepared forward correction, not live apply.
-- Preserve the installed action, payload, rate and nonce controls. Earlier
-- migrations remain historical; future replacements must retain this guard.
begin;
do $signing_inputs$
declare
 v_oid oid:=to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)');
 v_definition text; v_after text; v_before pg_proc%rowtype; v_current pg_proc%rowtype;
 v_marker text:='  if p_action not in (';
 v_guard text:=E'  if p_action is null or p_timestamp is null or p_nonce is null\n'
  ||E'     or p_idempotency_key is null or p_payload_text is null or p_signature is null then\n'
  ||E'    raise exception using errcode=''22023'',message=''K2_ADMIN_REQUEST_INVALID'';\n'
  ||E'  end if;\n';
begin
 if v_oid is null then raise exception 'PREFLIGHT_FAILED: Admin signing verifier missing'; end if;
 select * into v_before from pg_proc where oid=v_oid;
 select replace(pg_get_functiondef(v_oid),E'\r\n',E'\n') into v_definition;
 if not v_before.prosecdef or v_before.prorettype<>'boolean'::regtype
    or not coalesce(v_before.proconfig @> array['search_path=""'],false)
    or (length(v_definition)-length(replace(v_definition,v_marker,'')))/length(v_marker)<>1
    or position('K2_ADMIN_ACCESS_REQUIRED' in v_definition)=0
    or position('K2_ADMIN_AAL2_REQUIRED' in v_definition)=0
    or position('K2_ADMIN_ACTION_INVALID' in v_definition)=0
    or position('K2_ADMIN_SIGNATURE_INVALID' in v_definition)=0 then
  raise exception 'PREFLIGHT_FAILED: unfamiliar Admin signing verifier';
 end if;
 if position(v_guard||v_marker in v_definition)=0 then
  execute replace(v_definition,v_marker,v_guard||v_marker);
 end if;
 select * into v_current from pg_proc where oid=v_oid;
 select replace(pg_get_functiondef(v_oid),E'\r\n',E'\n') into v_after;
 if v_after<>(case when position(v_guard||v_marker in v_definition)>0 then v_definition
                  else replace(v_definition,v_marker,v_guard||v_marker) end)
    or v_current.proowner<>v_before.proowner
    or v_current.proacl is distinct from v_before.proacl
    or v_current.proconfig is distinct from v_before.proconfig then
  raise exception 'POSTFLIGHT_FAILED: Admin signing metadata changed';
 end if;
end $signing_inputs$;
commit;
