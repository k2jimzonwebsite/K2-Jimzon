\set ON_ERROR_STOP on

set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
set request.jwt.claims='{"aal":"aal2"}';

do $$
declare
  v_ts bigint:=extract(epoch from clock_timestamp())::bigint;
  v_nonce uuid:='12121212-1212-4212-8212-121212121212';
  v_corr uuid:='13131313-1313-4313-8313-131313131313';
  v_message text;
  v_signature text;
  v_review jsonb;
begin
  v_message:=v_ts::text||E'\n'||v_nonce::text||E'\n'||v_corr::text
    ||E'\nadmin_change\nadmin_bff\nwarning\nsucceeded\n\nadmin.staff.permissions'
    ||E'\nSTAFF_ROLE_CHANGED\nuser_profile\n14141414-1414-4414-8414-141414141414';
  v_signature:=encode(extensions.hmac(convert_to(v_message,'UTF8'),decode(repeat('11',32),'hex'),'sha256'),'hex');
  perform public.record_security_event_v1(
    v_ts,v_nonce,v_corr,'admin_change','admin_bff','warning','succeeded',null,
    'admin.staff.permissions','STAFF_ROLE_CHANGED','user_profile',
    '14141414-1414-4414-8414-141414141414',v_signature
  );
  if not exists(select 1 from k2_private.security_events
    where correlation_id=v_corr and actor_id=auth.uid() and reason_code='STAFF_ROLE_CHANGED') then
    raise exception 'attributed high-value security event missing';
  end if;

  for i in 1..2 loop
    v_ts:=extract(epoch from clock_timestamp())::bigint;
    v_nonce:=case when i=1 then '15151515-1515-4515-8515-151515151515'::uuid
      else '16161616-1616-4616-8616-161616161616'::uuid end;
    v_corr:=case when i=1 then '17171717-1717-4717-8717-171717171717'::uuid
      else '18181818-1818-4818-8818-181818181818'::uuid end;
    v_message:=v_ts::text||E'\n'||v_nonce::text||E'\n'||v_corr::text
      ||E'\nrate_limit\nadmin_bff\nwarning\ndenied\n\nadmin.auth.login'
      ||E'\nLOGIN_RATE_LIMITED\n\n';
    v_signature:=encode(extensions.hmac(convert_to(v_message,'UTF8'),decode(repeat('11',32),'hex'),'sha256'),'hex');
    perform public.record_security_event_v1(
      v_ts,v_nonce,v_corr,'rate_limit','admin_bff','warning','denied',null,
      'admin.auth.login','LOGIN_RATE_LIMITED',null,null,v_signature
    );
  end loop;
  if (select occurrence_count from k2_private.security_event_noise_buckets
      where event_type='rate_limit' and reason_code='LOGIN_RATE_LIMITED')<>2 then
    raise exception 'noise aggregation assertion failed';
  end if;

  begin
    perform public.record_security_event_v1(
      v_ts,v_nonce,v_corr,'rate_limit','admin_bff','warning','denied',null,
      'admin.auth.login','LOGIN_RATE_LIMITED',null,null,v_signature
    );
    raise exception 'replayed event unexpectedly succeeded';
  exception when invalid_authorization_specification then null;
  end;

  begin
    perform public.record_security_event_v1(
      v_ts,'19191919-1919-4919-8919-191919191919',
      '20202020-2020-4020-8020-202020202020','rate_limit','admin_bff',
      'warning','denied',null,'admin.auth.login','LOGIN_RATE_LIMITED',null,null,
      repeat('0',64)
    );
    raise exception 'invalid signature unexpectedly succeeded';
  exception when invalid_authorization_specification then null;
  end;

  v_review:=public.read_admin_security_review_v1(24);
  if (v_review->>'totalOccurrences')::integer<>3
     or jsonb_array_length(v_review->'events')<>2
     or jsonb_array_length(v_review->'attention')<>1
     or v_review#>>'{attention,0,attentionCode}'<>'HIGH_VALUE_EVENT_REVIEW'
     or v_review::text~*'(password|token|https?://|@)' then
    raise exception 'redacted review assertion failed: %',v_review;
  end if;
  if has_table_privilege('anon','k2_private.security_events','SELECT')
     or has_table_privilege('authenticated','k2_private.security_events','INSERT')
     or has_function_privilege('authenticated','public.prune_security_events_v1(timestamptz)','EXECUTE')
     or not has_function_privilege('anon','public.record_security_event_v1(bigint,uuid,uuid,text,text,text,text,uuid,text,text,text,text,text)','EXECUTE') then
    raise exception 'security-event privilege assertion failed';
  end if;
end
$$;

select 'security event PostgreSQL rehearsal passed' as result;
