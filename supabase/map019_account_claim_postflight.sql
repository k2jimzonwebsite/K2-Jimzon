\set ON_ERROR_STOP on
do $$
begin
  if to_regprocedure('public.claim_guest_customer_account_v1(bigint,uuid,text,text,text,text)') is null then
    raise exception 'MAP019_CLAIM_FUNCTION_MISSING';
  end if;
  if to_regprocedure('public.list_customer_account_history_v1(bigint,uuid,text,text,text)') is null
     or to_regprocedure('public.append_customer_account_message_v1(bigint,uuid,text,text,text)') is null then
    raise exception 'MAP019_ACCOUNT_CONTINUITY_FUNCTION_MISSING';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public'
    and table_name='customer_claim_requests' and column_name='request_fingerprint') then
    raise exception 'MAP019_FINGERPRINT_COLUMN_MISSING';
  end if;
  if has_function_privilege('anon','public.claim_guest_customer_account_v1(bigint,uuid,text,text,text,text)','execute')
     or not has_function_privilege('authenticated','public.claim_guest_customer_account_v1(bigint,uuid,text,text,text,text)','execute') then
    raise exception 'MAP019_CLAIM_EXECUTE_GRANTS_INVALID';
  end if;
  if has_function_privilege('anon','public.list_customer_account_history_v1(bigint,uuid,text,text,text)','execute')
     or has_function_privilege('anon','public.append_customer_account_message_v1(bigint,uuid,text,text,text)','execute')
     or not has_function_privilege('authenticated','public.list_customer_account_history_v1(bigint,uuid,text,text,text)','execute')
     or not has_function_privilege('authenticated','public.append_customer_account_message_v1(bigint,uuid,text,text,text)','execute') then
    raise exception 'MAP019_CONTINUITY_EXECUTE_GRANTS_INVALID';
  end if;
  if has_table_privilege('anon','k2_private.guest_account_claim_events','select')
     or has_table_privilege('authenticated','k2_private.guest_account_claim_events','select') then
    raise exception 'MAP019_EVENT_TABLE_EXPOSED';
  end if;
end $$;
select 'MAP019_ACCOUNT_CLAIM_POSTFLIGHT_PASSED';
