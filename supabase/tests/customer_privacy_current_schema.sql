-- Synthetic account only, after prepared migrations inside the owned restored
-- database's rolled-back transaction. No original customer record is selected.
-- Original rows are hashed only to assert foreign-record conservation.
create function pg_temp.privacy_foreign_fingerprint(actor uuid, customer uuid, conversation uuid) returns jsonb
language sql as $scope$
select jsonb_build_object(
  'auth',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]')) from auth.users t where t.id<>actor),
  'profiles',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]')) from public.user_profiles t where t.id<>actor),
  'customers',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]')) from public.customers t where t.id<>customer),
  'contacts',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]')) from public.customer_contact_points t where t.customer_id<>customer),
  'accounts',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.user_id)::text,'[]')) from public.customer_accounts t where t.user_id<>actor),
  'grants',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]')) from public.guest_access_grants t where t.customer_id<>customer),
  'settings',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.user_id)::text,'[]')) from k2_private.customer_account_settings t where t.user_id<>actor),
  'notifications',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]')) from k2_private.customer_account_notifications t where t.user_id<>actor),
  'conversations',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]')) from public.conversations t where t.id<>conversation),
  'messages',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]')) from public.messages t where t.conversation_id<>conversation)
)
$scope$;
do $fixture$
declare
  actor uuid:=gen_random_uuid(); customer uuid:=gen_random_uuid(); contact uuid:=gen_random_uuid();
  request uuid:=gen_random_uuid(); grant_id uuid:=gen_random_uuid();
  conversation uuid:=gen_random_uuid(); message uuid:=gen_random_uuid();
  email text:='privacy-'||gen_random_uuid()::text||'@example.invalid'; before_retry jsonb; foreign_before jsonb;
begin
  insert into auth.users(id,email,email_confirmed_at,created_at,updated_at,aud,role,raw_app_meta_data,raw_user_meta_data)
    values(actor,email,clock_timestamp(),clock_timestamp(),clock_timestamp(),'authenticated','authenticated','{}','{}');
  if not exists(select 1 from public.user_profiles p where p.id=actor and p.role::text='Customer') then
    raise exception 'CURRENT_SCHEMA_DEFAULT_SIGNUP_ROLE_NOT_CUSTOMER';
  end if;
  insert into public.customers(id,display_name,created_source)
    values(customer,'Synthetic privacy qualification','website_account');
  insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,verification_status,verified_at,source)
    values(contact,customer,'email',email,extensions.digest(convert_to('email:'||email,'UTF8'),'sha256'),'verified',clock_timestamp(),'website_account');
  insert into public.customer_accounts(user_id,customer_id,verified_contact_point_id) values(actor,customer,contact);
  insert into public.guest_access_grants(id,customer_id,token_hash,expires_at)
    values(grant_id,customer,extensions.digest(grant_id::text,'sha256'),clock_timestamp()+interval '1 day');
  insert into k2_private.customer_account_settings(user_id,display_name,delivery_address)
    values(actor,'Synthetic privacy qualification','Synthetic address; never a real customer');
  if current_setting('k2_test.address_book_coverage',true)='on' then
    perform pg_temp.populate_address_book(actor);
  end if;
  insert into k2_private.customer_account_notifications(user_id,source_event_key,event_kind,public_reference)
    values(actor,'privacy-qualification:'||actor::text,'staff_reply','SYNTHETIC-ONLY');
  insert into public.conversations(id,customer_id,customer_name,customer_email,platform,status,source_kind,source_id,unread_count)
    values(conversation,customer,'Synthetic privacy qualification',email,'Website','Open','website_message',gen_random_uuid(),1);
  insert into public.messages(id,conversation_id,sender_type,content,is_draft,delivery_status,provider_event_key,direction)
    values(message,conversation,'Customer','Synthetic private inquiry',false,'received','privacy-qualification:'||message::text,'inbound');
  insert into k2_private.customer_privacy_requests(id,user_id,customer_id,channel,receipt_hash,state,verified_at)
    values(request,actor,customer,'email',extensions.digest(request::text,'sha256'),'pending',clock_timestamp());
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
  perform set_config('request.jwt.claim.sub',actor::text,true);
  foreign_before:=pg_temp.privacy_foreign_fingerprint(actor,customer,conversation);
  perform k2_private.process_customer_privacy(request);
  if not exists(select 1 from k2_private.customer_privacy_requests where id=request and state='closed' and provider_state='pending')
    or not exists(select 1 from k2_private.customer_privacy_tombstones where user_id=actor and customer_id=customer and request_id=request)
    or not exists(select 1 from public.customer_accounts where user_id=actor and status='revoked')
    or not exists(select 1 from public.customers where id=customer and status='deleted' and display_name='Closed customer')
    or not exists(select 1 from public.customer_contact_points where id=contact and verification_status='revoked' and contact_value='closed:'||contact::text)
    or not exists(select 1 from public.guest_access_grants where id=grant_id and status='revoked')
    or exists(select 1 from k2_private.customer_account_settings where user_id=actor)
    or exists(select 1 from k2_private.customer_account_notifications where user_id=actor)
    or not exists(select 1 from public.messages m where m.id=message and m.content='[Removed after verified account closure]' and m.provider_event_key is null)
    or not exists(select 1 from public.conversations c where c.id=conversation and c.status::text='Resolved' and c.customer_email is null and c.customer_name='Closed customer')
    or exists(select 1 from public.user_profiles p where p.id=actor and (p.email is not null or p.full_name is not null)) then
      raise exception 'CURRENT_SCHEMA_SYNTHETIC_ACCOUNT_CLOSURE_FAILED';
  end if;
  select to_jsonb(r) into before_retry from k2_private.customer_privacy_requests r where id=request;
  perform k2_private.process_customer_privacy(request);
  if before_retry is distinct from (select to_jsonb(r) from k2_private.customer_privacy_requests r where id=request) then
    raise exception 'CURRENT_SCHEMA_SYNTHETIC_CLOSURE_RETRY_CHANGED_OUTCOME';
  end if;
  if foreign_before is distinct from pg_temp.privacy_foreign_fingerprint(actor,customer,conversation) then
    raise exception 'CURRENT_SCHEMA_FOREIGN_CUSTOMER_ROWS_CHANGED';
  end if;
end $fixture$;
select 'CURRENT_SCHEMA_SYNTHETIC_ACCOUNT_MINIMIZATION_AND_RETRY_PASSED';
