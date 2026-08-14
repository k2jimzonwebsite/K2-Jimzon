do $$
begin
  if to_regnamespace('k2_private') is null
     or to_regclass('k2_private.guest_bff_secrets') is null
     or to_regclass('k2_private.guest_request_nonces') is null
     or to_regclass('k2_private.guest_rate_buckets') is null then
    raise exception 'MAP020_POSTFLIGHT: private boundary objects are missing';
  end if;
  if to_regprocedure('public.submit_guest_order_v1(bigint,uuid,text,text,text,text)') is null
     or to_regprocedure('public.submit_guest_pasabuy_v1(bigint,uuid,text,text,text,text)') is null
     or to_regprocedure('public.preview_guest_coupon_v1(bigint,uuid,text,text,text)') is null then
    raise exception 'MAP020_POSTFLIGHT: public signed commands are missing';
  end if;
  if to_regprocedure('public.list_guest_conversations_v1(bigint,uuid,text,text,text,text)') is null
     or to_regprocedure('public.append_guest_message_v1(bigint,uuid,text,text,text,text)') is null then
    raise exception 'MAP020_POSTFLIGHT: guest conversation commands are missing';
  end if;
  if not has_function_privilege('anon','public.submit_guest_order_v1(bigint,uuid,text,text,text,text)','EXECUTE')
     or not has_function_privilege('anon','public.submit_guest_pasabuy_v1(bigint,uuid,text,text,text,text)','EXECUTE')
     or not has_function_privilege('anon','public.preview_guest_coupon_v1(bigint,uuid,text,text,text)','EXECUTE') then
    raise exception 'MAP020_POSTFLIGHT: signed commands are not executable through the limited role';
  end if;
  if not has_function_privilege('anon','public.list_guest_conversations_v1(bigint,uuid,text,text,text,text)','EXECUTE')
     or not has_function_privilege('anon','public.append_guest_message_v1(bigint,uuid,text,text,text,text)','EXECUTE') then
    raise exception 'MAP020_POSTFLIGHT: guest conversation commands lack limited execution';
  end if;
  if has_schema_privilege('anon','k2_private','USAGE')
     or has_schema_privilege('authenticated','k2_private','USAGE') then
    raise exception 'MAP020_POSTFLIGHT: private schema is browser accessible';
  end if;
end $$;
