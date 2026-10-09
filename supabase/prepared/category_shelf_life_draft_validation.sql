-- IDEA-20261005-01 / MAP-018. PREPARED ONLY after category_shelf_life_draft.sql.
-- Null-safe required request/review/object gates; original cache/lock/metadata contract.
do $draft$
declare b pg_catalog.pg_proc%rowtype;a pg_catalog.pg_proc%rowtype;d text;
begin
 if current_user<>'postgres' or to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is null then raise exception 'K2_CATEGORY_DRAFT_VALIDATION_TARGET_INVALID';end if;
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.create_product_draft_server(uuid,uuid,jsonb,jsonb)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f' or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0 or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null or b.proallargtypes is not null or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql') or b.prorettype<>'jsonb'::regtype or b.proargnames is distinct from array['p_session_id','p_request_id','p_reviewed_payload','p_field_decisions']::text[] or b.proacl::text[] is distinct from array['postgres=X/postgres']::text[] or b.proconfig is distinct from array['search_path=""']::text[] or md5(replace(b.prosrc,chr(13),''))<>'e05c6e32e5b80d22fa70d4c44da8d170' then raise exception 'K2_CATEGORY_DRAFT_VALIDATION_FUNCTION_DRIFT';end if;
 d:=pg_catalog.pg_get_functiondef(b.oid);
 if (length(d)-length(replace(d,'jsonb_typeof(p_reviewed_payload) <>','')))/length('jsonb_typeof(p_reviewed_payload) <>')<>1 then raise exception 'K2_CATEGORY_DRAFT_VALIDATION_ANCHOR_INVALID';end if;
 d:=replace(d,'jsonb_typeof(p_reviewed_payload) <>','jsonb_typeof(p_reviewed_payload) is distinct from');
 if (length(d)-length(replace(d,'jsonb_typeof(p_field_decisions) <>','')))/length('jsonb_typeof(p_field_decisions) <>')<>1 then raise exception 'K2_CATEGORY_DRAFT_VALIDATION_ANCHOR_INVALID';end if;
 d:=replace(d,'jsonb_typeof(p_field_decisions) <>','jsonb_typeof(p_field_decisions) is distinct from');
 if (length(d)-length(replace(d,'v_session.request_id<>p_request_id','')))/length('v_session.request_id<>p_request_id')<>1 then raise exception 'K2_CATEGORY_DRAFT_VALIDATION_ANCHOR_INVALID';end if;
 d:=replace(d,'v_session.request_id<>p_request_id','v_session.request_id is distinct from p_request_id');
 if (length(d)-length(replace(d,'v_session.request_id <> p_request_id','')))/length('v_session.request_id <> p_request_id')<>1 then raise exception 'K2_CATEGORY_DRAFT_VALIDATION_ANCHOR_INVALID';end if;
 d:=replace(d,'v_session.request_id <> p_request_id','v_session.request_id is distinct from p_request_id');
 if (length(d)-length(replace(d,'p_reviewed_payload -> ''meta'' ->> ''schemaVersion'' <>','')))/length('p_reviewed_payload -> ''meta'' ->> ''schemaVersion'' <>')<>1 then raise exception 'K2_CATEGORY_DRAFT_VALIDATION_ANCHOR_INVALID';end if;
 d:=replace(d,'p_reviewed_payload -> ''meta'' ->> ''schemaVersion'' <>','p_reviewed_payload -> ''meta'' ->> ''schemaVersion'' is distinct from');
 if (length(d)-length(replace(d,'p_field_decisions ->> ''name'' <>','')))/length('p_field_decisions ->> ''name'' <>')<>1 then raise exception 'K2_CATEGORY_DRAFT_VALIDATION_ANCHOR_INVALID';end if;
 d:=replace(d,'p_field_decisions ->> ''name'' <>','p_field_decisions ->> ''name'' is distinct from');
 if (length(d)-length(replace(d,'jsonb_typeof(v_product) <>','')))/length('jsonb_typeof(v_product) <>')<>1 then raise exception 'K2_CATEGORY_DRAFT_VALIDATION_ANCHOR_INVALID';end if;
 d:=replace(d,'jsonb_typeof(v_product) <>','jsonb_typeof(v_product) is distinct from');
 execute d;
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc') or md5(replace(a.prosrc,chr(13),''))<>'35de7196052bd3c2d45799d68d84c057' then raise exception 'K2_CATEGORY_DRAFT_VALIDATION_METADATA_CHANGED';end if;
end $draft$;
