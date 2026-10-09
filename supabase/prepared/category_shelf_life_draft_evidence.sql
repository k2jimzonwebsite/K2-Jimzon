-- IDEA-20261005-02 / MAP-018. PREPARED ONLY after category_shelf_life_draft_validation.sql.
-- Preserve total3 and require distinct PRIMARY/BACK/BARCODE uploaded coverage.
do $draft$
declare b pg_catalog.pg_proc%rowtype;a pg_catalog.pg_proc%rowtype;d text;
begin
 if current_user<>'postgres' or to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is null then raise exception 'K2_CATEGORY_DRAFT_EVIDENCE_TARGET_INVALID';end if;
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.create_product_draft_server(uuid,uuid,jsonb,jsonb)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f' or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0 or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null or b.proallargtypes is not null or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql') or b.prorettype<>'jsonb'::regtype or b.proargnames is distinct from array['p_session_id','p_request_id','p_reviewed_payload','p_field_decisions']::text[] or b.proacl::text[] is distinct from array['postgres=X/postgres']::text[] or b.proconfig is distinct from array['search_path=""']::text[] or md5(replace(b.prosrc,chr(13),''))<>'35de7196052bd3c2d45799d68d84c057' then raise exception 'K2_CATEGORY_DRAFT_EVIDENCE_FUNCTION_DRIFT';end if;
 d:=pg_catalog.pg_get_functiondef(b.oid);
 if (length(d)-length(replace(d,'and image ->> ''upload_status'' = ''uploaded'') <> 3','')))/length('and image ->> ''upload_status'' = ''uploaded'') <> 3')<>1 then raise exception 'K2_CATEGORY_DRAFT_EVIDENCE_ANCHOR_INVALID';end if;
 execute replace(d,'and image ->> ''upload_status'' = ''uploaded'') <> 3','and image ->> ''upload_status'' = ''uploaded'') <> 3
     or (select count(distinct image ->> ''slot'') from jsonb_array_elements(v_session.packaging_images) image
         where image ->> ''slot'' in (''PRIMARY'', ''BACK'', ''BARCODE'')
           and image ->> ''upload_status'' = ''uploaded'') <> 3');
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc') or md5(replace(a.prosrc,chr(13),''))<>'63c72ea27839da942e603e900e0767b0' then raise exception 'K2_CATEGORY_DRAFT_EVIDENCE_METADATA_CHANGED';end if;
end $draft$;
