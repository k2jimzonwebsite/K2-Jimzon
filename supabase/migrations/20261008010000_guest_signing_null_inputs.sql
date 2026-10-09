-- IDEA-20261007-04 / MAP-017/018/020. Prepared forward correction; no live apply.
-- Historical verifier sources and receipts stay unchanged. Apply after the last
-- guest verifier replacement. Recovery must retain this guard (deactivate callers
-- or roll forward); never restore a vulnerable historical verifier.
begin;
set local lock_timeout='2s';
set local statement_timeout='10s';
do $guest_signing_inputs$
declare
 v_oid oid:=to_regprocedure('k2_private.verify_guest_bff_request(text,bigint,uuid,text,text,text)');
 v_before pg_proc%rowtype; v_after pg_proc%rowtype;
 v_definition text; v_expected text; v_hash text; v_index integer;
 v_original text[]:=array['b87fd8c006feb7457944962ecc386038','c4f9656bb96575258858ee575611e9e7','20734341e0b32a317d78bbef965dfc92'];
 v_corrected text[]:=array['b76ad447a4108ef2707f5ff9fb8272d9','dbea062977929b9b2f181219a1853a67','808cec5d3a1be42e5b7e1ded833cc94f'];
 v_guard text:=E'  if p_timestamp is null or p_nonce is null or p_ip_hash is null or p_signature is null then\n'
  ||E'    raise exception using errcode=''28000'', message=''K2_GUEST_SIGNATURE_INVALID'';\n'
  ||E'  end if;\n';
begin
 if v_oid is null then raise exception 'PREFLIGHT_FAILED: Guest signing verifier missing'; end if;
 select * into v_before from pg_catalog.pg_proc where oid=v_oid;
 v_hash:=md5(replace(v_before.prosrc,E'\r\n',E'\n'));
 v_index:=array_position(v_original,v_hash);
 if not v_before.prosecdef or v_before.prorettype<>'boolean'::regtype
    or not coalesce(v_before.proconfig @> array['search_path=""'],false)
    or (v_index is null and array_position(v_corrected,v_hash) is null) then
  raise exception 'PREFLIGHT_FAILED: unfamiliar Guest signing verifier';
 end if;
 if v_index is null then return; end if;
 v_definition:=replace(pg_get_functiondef(v_oid),E'\r\n',E'\n');
 v_expected:=replace(v_definition,'  if p_action not in (',
  v_guard||'  if p_action is null or p_action not in (''delivery_quote'',');
 v_expected:=replace(v_expected,'     <> extensions.digest','     is distinct from extensions.digest');
 execute v_expected;
 select * into v_after from pg_catalog.pg_proc where oid=v_oid;
 if md5(replace(v_after.prosrc,E'\r\n',E'\n'))<>v_corrected[v_index]
    or v_after.proowner<>v_before.proowner
    or v_after.proacl is distinct from v_before.proacl
    or v_after.proconfig is distinct from v_before.proconfig
    or (to_jsonb(v_after)-'prosrc') is distinct from (to_jsonb(v_before)-'prosrc') then
  raise exception 'POSTFLIGHT_FAILED: Guest signing metadata changed';
 end if;
end $guest_signing_inputs$;
commit;
