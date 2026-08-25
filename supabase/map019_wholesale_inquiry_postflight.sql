\set ON_ERROR_STOP on
do $$ begin
  if to_regprocedure('public.submit_wholesale_inquiry_v1(bigint,uuid,text,text,text,text)') is null then raise exception 'wholesale function missing'; end if;
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='wholesale_inquiries') then raise exception 'wholesale table missing'; end if;
  if has_table_privilege('anon','public.wholesale_inquiries','select') or has_table_privilege('authenticated','public.wholesale_inquiries','select') then raise exception 'wholesale table exposed'; end if;
  if not has_function_privilege('anon','public.submit_wholesale_inquiry_v1(bigint,uuid,text,text,text,text)','execute') then raise exception 'anon execute missing'; end if;
  if has_function_privilege('authenticated','public.submit_wholesale_inquiry_v1(bigint,uuid,text,text,text,text)','execute') then raise exception 'authenticated execute unexpected'; end if;
  if not has_function_privilege('authenticated','public.list_admin_wholesale_inquiries_v1()','execute') or has_function_privilege('anon','public.list_admin_wholesale_inquiries_v1()','execute') then raise exception 'admin wholesale projection grant invalid'; end if;
  if not has_function_privilege('authenticated','public.execute_admin_wholesale_inquiry_command_v1(text,bigint,uuid,uuid,text,text)','execute') or has_function_privilege('anon','public.execute_admin_wholesale_inquiry_command_v1(text,bigint,uuid,uuid,text,text)','execute') then raise exception 'admin wholesale command grant invalid'; end if;
end $$;
