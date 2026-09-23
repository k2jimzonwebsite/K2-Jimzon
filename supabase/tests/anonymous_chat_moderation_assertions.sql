\set ON_ERROR_STOP on
create schema k2_test;
create function k2_test.command(p_action text,p_payload jsonb) returns jsonb
language plpgsql as $$
declare v_ts bigint:=extract(epoch from clock_timestamp())::bigint;
  v_nonce uuid:=gen_random_uuid(); v_key uuid:=gen_random_uuid();
  v_text text:=p_payload::text; v_hash text; v_message text; v_signature text;
begin
  v_hash:=encode(extensions.digest(convert_to(v_text,'UTF8'),'sha256'),'hex');
  v_message:=p_action||E'\n'||v_ts||E'\n'||v_nonce||E'\n'||auth.uid()||E'\n'||v_key||E'\n'||v_hash;
  v_signature:=encode(extensions.hmac(convert_to(v_message,'UTF8'),
    (select request_secret from k2_private.admin_bff_secrets where singleton=true),'sha256'),'hex');
  return public.execute_admin_chat_moderation_v1(p_action,v_ts,v_nonce,v_key,v_text,v_signature);
end $$;
insert into auth.users(id) values
  ('30000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000002',false);
do $$ begin
  perform public.list_anonymous_chat_moderation_v1();
  raise exception 'missing-role user read moderation metadata';
exception when others then
  if sqlerrm<>'K2_ADMIN_REQUIRED' then raise; end if;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"is_staff":true,"aal":"aal2"}',false);
insert into public.user_profiles(id,role) values('30000000-0000-4000-8000-000000000001','Admin');
insert into public.customers(id,display_name,created_source)
values('30000000-0000-4000-8000-000000000010','Guest','website');
insert into public.conversations(id,customer_id,customer_name,platform,status,source_kind)
values('30000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000010','Guest','Website','open','website_message');
insert into public.conversation_events(conversation_id)
values('30000000-0000-4000-8000-000000000011');
do $$ begin
  if has_function_privilege('anon','public.submit_storefront_chat_v1(text,text,text,uuid,text)','EXECUTE')
    then raise exception 'legacy direct chat writer remains callable'; end if;
  begin
    delete from public.conversation_events where conversation_id='30000000-0000-4000-8000-000000000011';
    raise exception 'event history mutated without authorization';
  exception when others then
    if sqlerrm<>'Conversation event history is append-only' then raise; end if;
  end;
end $$;
insert into public.messages(conversation_id,sender_type,content,delivery_status)
values('30000000-0000-4000-8000-000000000011','Customer','remove me','received');
insert into public.guest_access_grants(id,customer_id,token_hash,expires_at)
values('30000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000010',
  extensions.digest('fixture','sha256'),now()+interval '1 day');
insert into public.guest_access_grant_scopes(grant_id,scope_kind,scope_id,permissions)
values('30000000-0000-4000-8000-000000000012','conversation',
  '30000000-0000-4000-8000-000000000011',array['read']);
do $$ begin
  perform k2_test.command('inbox_delete_anonymous',jsonb_build_object(
    'conversationId','30000000-0000-4000-8000-000000000011','reason','test deletion'));
  if exists(select 1 from public.conversations where id='30000000-0000-4000-8000-000000000011')
    or exists(select 1 from public.conversation_events where conversation_id='30000000-0000-4000-8000-000000000011')
    or exists(select 1 from public.guest_access_grant_scopes where scope_id='30000000-0000-4000-8000-000000000011')
    or not exists(select 1 from k2_private.anonymous_chat_deletion_receipts where conversation_id='30000000-0000-4000-8000-000000000011')
  then raise exception 'anonymous delete incomplete'; end if;
end $$;
insert into public.conversations(id,customer_id,customer_name,platform,status,source_kind)
values('30000000-0000-4000-8000-000000000013','30000000-0000-4000-8000-000000000010','Guest','Website','open','website_message');
insert into k2_private.anonymous_chat_principals(conversation_id,ip_hash)
values('30000000-0000-4000-8000-000000000013',extensions.digest('ip fixture','sha256'));
select k2_test.command('inbox_block_anonymous',jsonb_build_object(
  'conversationId','30000000-0000-4000-8000-000000000013','reason','test block'));
do $$ begin
  if not exists(select 1 from k2_private.anonymous_chat_blocks) then raise exception 'block missing'; end if;
end $$;
select k2_test.command('inbox_unblock_anonymous',jsonb_build_object(
  'blockId',(select id from k2_private.anonymous_chat_blocks limit 1),'reason','test unblock'));
do $$ begin
  if exists(select 1 from k2_private.anonymous_chat_blocks) then raise exception 'unblock failed'; end if;
end $$;
insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,source)
values('30000000-0000-4000-8000-000000000014','30000000-0000-4000-8000-000000000010',
  'email','a@example.test',extensions.digest('contact fixture','sha256'),'website');
insert into public.customer_accounts(user_id,customer_id,verified_contact_point_id,status)
values('30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000010',
  '30000000-0000-4000-8000-000000000014','revoked');
do $$ begin
  perform k2_test.command('inbox_delete_anonymous',jsonb_build_object(
    'conversationId','30000000-0000-4000-8000-000000000013','reason','must refuse'));
  raise exception 'linked customer was deleted';
exception when others then
  if sqlerrm<>'K2_ANONYMOUS_CHAT_REQUIRED' then raise; end if;
end $$;
select 'ANONYMOUS_CHAT_MODERATION_ASSERTIONS_PASSED';
