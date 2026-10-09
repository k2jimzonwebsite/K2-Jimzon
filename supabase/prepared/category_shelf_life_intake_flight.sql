-- IDEA-20261002-05 / MAP-018. PREPARED ONLY, after category_shelf_life_intake.sql.
-- Exact native regression: product FK wait must precede flight calendar validation.
do $flight$
declare b pg_catalog.pg_proc%rowtype;a pg_catalog.pg_proc%rowtype;d text;
begin
 if current_user<>'postgres' or to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is null then raise exception 'K2_CATEGORY_INTAKE_FLIGHT_TARGET_INVALID';end if;
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.create_product_first_inventory_server(uuid,uuid,text,jsonb)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f' or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0 or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null or b.proallargtypes is not null or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql') or b.prorettype<>'jsonb'::regtype or b.proargnames is distinct from array['p_session_id','p_request_id','p_source','p_inventory']::text[] or b.proacl::text[] is distinct from array['postgres=X/postgres']::text[] or b.proconfig is distinct from array['search_path=""']::text[] or md5(replace(b.prosrc,chr(13),''))<>'c0e7bece99b8b062ca68207c18cee591' then raise exception 'K2_CATEGORY_INTAKE_FLIGHT_FUNCTION_DRIFT';end if;
 d:=pg_catalog.pg_get_functiondef(b.oid);
 if (length(d)-length(replace(d,'    v_today:=(pg_catalog.clock_timestamp() at time zone ''Asia/Manila'')::date;','')))/length('    v_today:=(pg_catalog.clock_timestamp() at time zone ''Asia/Manila'')::date;')<>1 then raise exception 'K2_CATEGORY_INTAKE_FLIGHT_ANCHOR_INVALID';end if;
 execute replace(d,'    v_today:=(pg_catalog.clock_timestamp() at time zone ''Asia/Manila'')::date;','    -- Take the manifest line product FK key before evaluating its calendar.
    perform 1 from public.products where sku=v_session.assigned_sku for key share;
    if not found then raise exception using errcode=''P0002'',message=''K2_PRODUCT_NOT_FOUND'';end if;
    v_today:=(pg_catalog.clock_timestamp() at time zone ''Asia/Manila'')::date;');
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc') or md5(replace(a.prosrc,chr(13),''))<>'b23f3d40bb929614d58f8d10683a54fe' then raise exception 'K2_CATEGORY_INTAKE_FLIGHT_METADATA_CHANGED';end if;
end $flight$;
