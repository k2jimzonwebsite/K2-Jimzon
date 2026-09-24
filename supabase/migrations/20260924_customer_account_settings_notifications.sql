-- Prepared only. Apply after the MAP-019 identity and guest BFF migrations.
-- Private profile data and content-free account notifications have no table grants.
begin;

create table if not exists k2_private.customer_account_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 140),
  delivery_address text not null default '' check (length(delivery_address) <= 500),
  notify_in_app boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists k2_private.customer_account_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_event_key text not null unique,
  event_kind text not null check (event_kind in ('staff_reply','order_updated','payment_verified','pasabuy_updated')),
  public_reference text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists customer_account_notifications_user_recent_idx
  on k2_private.customer_account_notifications(user_id,created_at desc);
revoke all on k2_private.customer_account_settings, k2_private.customer_account_notifications from public,anon,authenticated;

create or replace function k2_private.verify_guest_bff_request(
  p_action text, p_timestamp bigint, p_nonce uuid, p_payload_text text,
  p_ip_hash text, p_signature text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_secret bytea;
  v_payload_hash text;
  v_expected text;
  v_message text;
begin
  if p_action not in (
    'order','pasabuy','coupon','guest_start','guest_read','guest_reply',
    'account_claim','account_read','account_reply','wholesale_inquiry',
    'account_settings_read','account_settings_write','account_notification_read'
  ) then
    raise exception using errcode='22023', message='K2_GUEST_ACTION_INVALID';
  end if;
  if p_payload_text is null or octet_length(convert_to(p_payload_text,'UTF8')) > 24576 then
    raise exception using errcode='22023', message='K2_GUEST_PAYLOAD_INVALID';
  end if;
  if p_ip_hash !~ '^[0-9a-f]{64}$' or p_signature !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='28000', message='K2_GUEST_SIGNATURE_INVALID';
  end if;
  if abs(extract(epoch from clock_timestamp())::bigint - p_timestamp) > 300 then
    raise exception using errcode='28000', message='K2_GUEST_SIGNATURE_EXPIRED';
  end if;
  select request_secret into v_secret from k2_private.guest_bff_secrets where singleton=true;
  if v_secret is null then
    raise exception using errcode='55000', message='K2_GUEST_BOUNDARY_NOT_CONFIGURED';
  end if;
  v_payload_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  v_message:=p_action||E'\n'||p_timestamp::text||E'\n'||p_nonce::text||E'\n'||v_payload_hash||E'\n'||p_ip_hash;
  v_expected:=encode(extensions.hmac(convert_to(v_message,'UTF8'),v_secret,'sha256'),'hex');
  if extensions.digest(convert_to(v_expected,'UTF8'),'sha256')
     <> extensions.digest(convert_to(p_signature,'UTF8'),'sha256') then
    raise exception using errcode='28000', message='K2_GUEST_SIGNATURE_INVALID';
  end if;
  delete from k2_private.guest_request_nonces where expires_at <= now();
  insert into k2_private.guest_request_nonces(action,nonce,expires_at)
  values(p_action,p_nonce,now()+interval '10 minutes') on conflict do nothing;
  return found;
end;
$$;
revoke all on function k2_private.verify_guest_bff_request(text,bigint,uuid,text,text,text) from public,anon,authenticated;

create or replace function public.read_customer_account_settings_v1(
  p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_settings k2_private.customer_account_settings;
  v_rate record;
  v_notices jsonb;
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error_code','ACCOUNT_AUTH_REQUIRED'); end if;
  if not k2_private.verify_guest_bff_request('account_settings_read',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature)
     or p_payload_text <> '{}' then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
  select * into v_rate from k2_private.consume_guest_rate('account_settings_read','actor',extensions.digest(convert_to(auth.uid()::text,'UTF8'),'sha256'),300,60);
  if not v_rate.allowed then return jsonb_build_object('ok',false,'error_code','RATE_LIMITED','retry_after_seconds',v_rate.retry_after_seconds); end if;
  select * into v_settings from k2_private.customer_account_settings where user_id=auth.uid();
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',n.id,'event_kind',n.event_kind,'public_reference',n.public_reference,
    'created_at',n.created_at,'read_at',n.read_at
  ) order by n.created_at desc),'[]'::jsonb) into v_notices
  from (select * from k2_private.customer_account_notifications where user_id=auth.uid() order by created_at desc limit 30) n;
  return jsonb_build_object('ok',true,'settings',jsonb_build_object(
    'displayName',coalesce(v_settings.display_name,''),
    'deliveryAddress',coalesce(v_settings.delivery_address,''),
    'notifyInApp',coalesce(v_settings.notify_in_app,true)
  ),'notifications',v_notices);
end;
$$;

create or replace function public.save_customer_account_settings_v1(
  p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_payload jsonb;
  v_name text;
  v_address text;
  v_notify boolean;
  v_rate record;
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error_code','ACCOUNT_AUTH_REQUIRED'); end if;
  if not k2_private.verify_guest_bff_request('account_settings_write',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature)
    then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object' then
    return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID');
  end if;
  if (select count(*) from jsonb_object_keys(v_payload))<>3
     or not (v_payload ?& array['displayName','deliveryAddress','notifyInApp'])
     or jsonb_typeof(v_payload->'displayName')<>'string'
     or jsonb_typeof(v_payload->'deliveryAddress')<>'string'
     or jsonb_typeof(v_payload->'notifyInApp')<>'boolean' then
    return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID');
  end if;
  v_name:=trim(v_payload->>'displayName');
  v_address:=trim(v_payload->>'deliveryAddress');
  v_notify:=(v_payload->>'notifyInApp')::boolean;
  if length(v_name) not between 1 and 140 or length(v_address)>500 then
    return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID');
  end if;
  select * into v_rate from k2_private.consume_guest_rate('account_settings_write','actor',extensions.digest(convert_to(auth.uid()::text,'UTF8'),'sha256'),3600,30);
  if not v_rate.allowed then return jsonb_build_object('ok',false,'error_code','RATE_LIMITED','retry_after_seconds',v_rate.retry_after_seconds); end if;
  insert into k2_private.customer_account_settings(user_id,display_name,delivery_address,notify_in_app)
  values(auth.uid(),v_name,v_address,v_notify)
  on conflict(user_id) do update set display_name=excluded.display_name,delivery_address=excluded.delivery_address,
    notify_in_app=excluded.notify_in_app,updated_at=now();
  return jsonb_build_object('ok',true,'settings',jsonb_build_object(
    'displayName',v_name,'deliveryAddress',v_address,'notifyInApp',v_notify));
end;
$$;

create or replace function public.read_customer_account_notification_v1(
  p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_payload jsonb;
  v_id uuid;
  v_rate record;
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error_code','ACCOUNT_AUTH_REQUIRED'); end if;
  if not k2_private.verify_guest_bff_request('account_notification_read',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature)
    then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object' then
    return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID');
  end if;
  if (select count(*) from jsonb_object_keys(v_payload))<>1 or not (v_payload ? 'notificationId')
     or (v_payload->>'notificationId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID');
  end if;
  v_id:=(v_payload->>'notificationId')::uuid;
  select * into v_rate from k2_private.consume_guest_rate('account_notification_read','actor',extensions.digest(convert_to(auth.uid()::text,'UTF8'),'sha256'),300,60);
  if not v_rate.allowed then return jsonb_build_object('ok',false,'error_code','RATE_LIMITED','retry_after_seconds',v_rate.retry_after_seconds); end if;
  update k2_private.customer_account_notifications set read_at=coalesce(read_at,now())
  where id=v_id and user_id=auth.uid();
  return jsonb_build_object('ok',true,'read',found);
end;
$$;

revoke all on function public.read_customer_account_settings_v1(bigint,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.save_customer_account_settings_v1(bigint,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.read_customer_account_notification_v1(bigint,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.read_customer_account_settings_v1(bigint,uuid,text,text,text) to authenticated;
grant execute on function public.save_customer_account_settings_v1(bigint,uuid,text,text,text) to authenticated;
grant execute on function public.read_customer_account_notification_v1(bigint,uuid,text,text,text) to authenticated;

create or replace function k2_private.enqueue_customer_account_notification(
  p_customer_id uuid,p_kind text,p_reference text,p_event_key text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_customer_id is null or p_reference is null then return; end if;
  insert into k2_private.customer_account_notifications(user_id,source_event_key,event_kind,public_reference)
  select a.user_id,p_event_key,p_kind,p_reference from public.customer_accounts a
  left join k2_private.customer_account_settings s on s.user_id=a.user_id
  where a.customer_id=p_customer_id and a.status='active' and coalesce(s.notify_in_app,true)
  on conflict (source_event_key) do nothing;
end;
$$;
revoke all on function k2_private.enqueue_customer_account_notification(uuid,text,text,text) from public,anon,authenticated;

create or replace function k2_private.notify_customer_order_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.payment_status = 'verified' and new.payment_status is distinct from old.payment_status then
    perform k2_private.enqueue_customer_account_notification(new.customer_id,'payment_verified',new.public_reference,
      'order-payment:'||new.id::text||':'||new.updated_at::text);
  elsif new.status is distinct from old.status then
    perform k2_private.enqueue_customer_account_notification(new.customer_id,'order_updated',new.public_reference,
      'order-status:'||new.id::text||':'||new.updated_at::text);
  end if;
  return new;
end;
$$;
revoke all on function k2_private.notify_customer_order_change() from public,anon,authenticated;
drop trigger if exists trg_customer_order_notification on public.order_requests;
create trigger trg_customer_order_notification after update of status,payment_status on public.order_requests
for each row execute function k2_private.notify_customer_order_change();

create or replace function k2_private.notify_customer_pasabuy_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    perform k2_private.enqueue_customer_account_notification(new.customer_id,'pasabuy_updated',new.public_reference,
      'pasabuy-status:'||new.id::text||':'||new.updated_at::text);
  end if;
  return new;
end;
$$;
revoke all on function k2_private.notify_customer_pasabuy_change() from public,anon,authenticated;
drop trigger if exists trg_customer_pasabuy_notification on public.pasabuy_requests;
create trigger trg_customer_pasabuy_notification after update of status on public.pasabuy_requests
for each row execute function k2_private.notify_customer_pasabuy_change();

create or replace function k2_private.notify_customer_staff_reply() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_customer_id uuid;
  v_reference text;
begin
  if new.sender_type::text = 'Customer' or new.delivery_status <> 'sent' or new.is_draft then return new; end if;
  if tg_op='UPDATE' and old.delivery_status = 'sent' then return new; end if;
  select customer_id,guest_reference into v_customer_id,v_reference
  from public.conversations where id=new.conversation_id;
  perform k2_private.enqueue_customer_account_notification(v_customer_id,'staff_reply',v_reference,
    'staff-reply:'||new.id::text);
  return new;
end;
$$;
revoke all on function k2_private.notify_customer_staff_reply() from public,anon,authenticated;
drop trigger if exists trg_customer_staff_reply_notification on public.messages;
create trigger trg_customer_staff_reply_notification after insert or update of delivery_status on public.messages
for each row execute function k2_private.notify_customer_staff_reply();

commit;
