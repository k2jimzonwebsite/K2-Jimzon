\set ON_ERROR_STOP on
do $$
declare
  v_user uuid := '10000000-0000-4000-8000-000000000001';
  v_other uuid := '10000000-0000-4000-8000-000000000002';
  v_ip text := repeat('a',64);
  v_ts bigint;
  v_nonce uuid;
  v_payload text;
  v_result jsonb;
  v_notice uuid;
begin
  perform set_config('request.jwt.claim.sub',v_user::text,true);
  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  v_result:=public.read_customer_account_settings_v1(v_ts,v_nonce,'{}',v_ip,
    k2_test.signature('account_settings_read',v_ts,v_nonce,'{}',v_ip));
  if v_result->>'ok'<>'true' or v_result->'settings'->>'notifyInApp'<>'true' then
    raise exception 'DEFAULT_SETTINGS_UNAVAILABLE';
  end if;
  v_payload:='{"deliveryAddress":"Manila, Philippines","displayName":"Maria Prieto","notifyInApp":true}';
  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  v_result:=public.save_customer_account_settings_v1(v_ts,v_nonce,v_payload,v_ip,
    k2_test.signature('account_settings_write',v_ts,v_nonce,v_payload,v_ip));
  if v_result->>'ok'<>'true' or v_result->'settings'->>'displayName'<>'Maria Prieto' then
    raise exception 'SETTINGS_SAVE_FAILED: %',v_result;
  end if;
  if (select count(*) from k2_private.customer_account_notifications where user_id=v_user and event_kind='staff_reply')<1 then
    raise exception 'STAFF_REPLY_NOTIFICATION_MISSING';
  end if;
  select id into v_notice from k2_private.customer_account_notifications
  where user_id=v_user and event_kind='staff_reply' limit 1;
  v_payload:=jsonb_build_object('notificationId',v_notice)::text;
  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  v_result:=public.read_customer_account_notification_v1(v_ts,v_nonce,v_payload,v_ip,
    k2_test.signature('account_notification_read',v_ts,v_nonce,v_payload,v_ip));
  if v_result->>'read'<>'true' or (select read_at from k2_private.customer_account_notifications where id=v_notice) is null then
    raise exception 'OWN_NOTIFICATION_READ_FAILED';
  end if;
  perform set_config('request.jwt.claim.sub',v_other::text,true);
  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  v_result:=public.read_customer_account_notification_v1(v_ts,v_nonce,v_payload,v_ip,
    k2_test.signature('account_notification_read',v_ts,v_nonce,v_payload,v_ip));
  if v_result->>'read'<>'false' then raise exception 'CROSS_ACCOUNT_NOTIFICATION_READ_ALLOWED'; end if;
  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  v_result:=public.read_customer_account_settings_v1(v_ts,v_nonce,'{}',v_ip,
    k2_test.signature('account_settings_read',v_ts,v_nonce,'{}',v_ip));
  if v_result->'settings'->>'displayName' <> '' or jsonb_array_length(v_result->'notifications')<>0 then
    raise exception 'CROSS_ACCOUNT_SETTINGS_VISIBLE';
  end if;
end $$;
select 'CUSTOMER_ACCOUNT_SETTINGS_ASSERTIONS_PASSED';
