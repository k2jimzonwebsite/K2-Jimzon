\set ON_ERROR_STOP on

do $$
begin
  if not has_function_privilege(
      'anon', 'public.consume_storefront_customer_auth_rate_v1(text,bigint,uuid,text,text,text)', 'execute'
    ) or has_function_privilege(
      'authenticated', 'public.consume_storefront_customer_auth_rate_v1(text,bigint,uuid,text,text,text)', 'execute'
    ) then
    raise exception 'Storefront customer Auth function role boundary is unsafe';
  end if;
  if has_table_privilege('anon', 'k2_private.storefront_auth_rate_buckets', 'select')
     or has_table_privilege('anon', 'k2_private.storefront_auth_rate_nonces', 'select')
     or has_table_privilege('authenticated', 'k2_private.storefront_auth_rate_buckets', 'select') then
    raise exception 'Private Storefront Auth rate tables are exposed';
  end if;
  if (
    select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'k2_private'
      and c.relname in ('storefront_auth_rate_buckets', 'storefront_auth_rate_nonces')
      and c.relrowsecurity and c.relforcerowsecurity
  ) <> 2 then
    raise exception 'Private Storefront Auth rate tables do not force RLS';
  end if;
end
$$;

create or replace function public.k2_test_consume_storefront_auth_rate(
  p_action text, p_ip_hash text, p_subject_hash text, p_nonce uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timestamp bigint := extract(epoch from clock_timestamp())::bigint;
  v_message text;
  v_signature text;
begin
  v_message := p_action || E'\n' || v_timestamp::text || E'\n' || p_nonce::text
    || E'\n' || p_ip_hash || E'\n' || p_subject_hash;
  v_signature := encode(extensions.hmac(
    convert_to(v_message, 'UTF8'), decode(repeat('15', 32), 'hex'), 'sha256'
  ), 'hex');
  return public.consume_storefront_customer_auth_rate_v1(
    p_action, v_timestamp, p_nonce, p_ip_hash, p_subject_hash, v_signature
  );
end;
$$;

select extract(epoch from clock_timestamp())::bigint as anon_timestamp,
  extensions.gen_random_uuid()::text as anon_nonce,
  repeat('1', 64) as anon_ip_hash,
  repeat('2', 64) as anon_subject_hash
\gset
select encode(extensions.hmac(convert_to(
  'customer_auth_email_request' || E'\n' || :'anon_timestamp' || E'\n' || :'anon_nonce'
  || E'\n' || :'anon_ip_hash' || E'\n' || :'anon_subject_hash', 'UTF8'
), decode(repeat('15', 32), 'hex'), 'sha256'), 'hex') as anon_signature
\gset
set role anon;
select public.consume_storefront_customer_auth_rate_v1(
  'customer_auth_email_request', :'anon_timestamp'::bigint, :'anon_nonce'::uuid,
  :'anon_ip_hash', :'anon_subject_hash', :'anon_signature'
);
reset role;

truncate k2_private.storefront_auth_rate_buckets, k2_private.storefront_auth_rate_nonces;

-- Each action's subject threshold and scope/window.
do $$
declare v_result jsonb; v_action text; v_limit integer; v_scope text; v_window integer; v_count bigint;
begin
  for v_action, v_limit, v_scope, v_window in
    select * from (values
      ('customer_auth_email_request', 3, 'contact', 3600),
      ('customer_auth_sms_request', 3, 'contact', 3600),
      ('customer_auth_sms_verify', 5, 'challenge', 900)
    ) as limits(action_name, max_hits, scope_name, window_seconds)
  loop
    for i in 1..v_limit + 2 loop
      v_result := public.k2_test_consume_storefront_auth_rate(
        v_action,
        encode(extensions.digest(convert_to(v_action || '-subject-ip-' || i, 'UTF8'), 'sha256'), 'hex'),
        repeat(case when v_action = 'customer_auth_email_request' then '3'
          when v_action = 'customer_auth_sms_request' then '4' else '5' end, 64),
        extensions.gen_random_uuid()
      );
      if (i <= v_limit and v_result->>'allowed' <> 'true')
         or (i > v_limit and (v_result->>'allowed' <> 'false'
           or (v_result->>'retryAfter')::integer <= 0)) then
        raise exception '% subject threshold failed on attempt %: %', v_action, i, v_result;
      end if;
    end loop;
    select hit_count into v_count from k2_private.storefront_auth_rate_buckets
    where action = v_action and scope = v_scope and window_seconds = v_window;
    if v_count <> v_limit + 2 then
      raise exception '% denied subject attempts did not persist: %', v_action, v_count;
    end if;
    truncate k2_private.storefront_auth_rate_buckets, k2_private.storefront_auth_rate_nonces;
  end loop;
end
$$;

-- Each action's IP threshold across distinct subjects.
do $$
declare v_result jsonb; v_action text; v_limit integer;
begin
  for v_action, v_limit in
    select * from (values
      ('customer_auth_email_request', 5),
      ('customer_auth_sms_request', 5),
      ('customer_auth_sms_verify', 10)
    ) as limits(action_name, max_hits)
  loop
    for i in 1..v_limit + 1 loop
      v_result := public.k2_test_consume_storefront_auth_rate(
        v_action, repeat('6', 64),
        encode(extensions.digest(convert_to(v_action || '-ip-subject-' || i, 'UTF8'), 'sha256'), 'hex'),
        extensions.gen_random_uuid()
      );
      if (i <= v_limit and v_result->>'allowed' <> 'true')
         or (i = v_limit + 1 and v_result->>'allowed' <> 'false') then
        raise exception '% IP threshold failed on attempt %: %', v_action, i, v_result;
      end if;
    end loop;
    truncate k2_private.storefront_auth_rate_buckets, k2_private.storefront_auth_rate_nonces;
  end loop;
end
$$;

-- Each action's global one-minute threshold.
do $$
declare v_result jsonb; v_action text; v_limit integer; v_second double precision;
begin
  for v_action, v_limit in
    select * from (values
      ('customer_auth_email_request', 120),
      ('customer_auth_sms_request', 60),
      ('customer_auth_sms_verify', 120)
    ) as limits(action_name, max_hits)
  loop
    v_second := extract(second from clock_timestamp());
    if v_second > 55 then perform pg_sleep(61 - v_second); end if;
    for i in 1..v_limit + 1 loop
      v_result := public.k2_test_consume_storefront_auth_rate(
        v_action,
        encode(extensions.digest(convert_to(v_action || '-global-ip-' || i, 'UTF8'), 'sha256'), 'hex'),
        encode(extensions.digest(convert_to(v_action || '-global-subject-' || i, 'UTF8'), 'sha256'), 'hex'),
        extensions.gen_random_uuid()
      );
      if (i <= v_limit and v_result->>'allowed' <> 'true')
         or (i = v_limit + 1 and v_result->>'allowed' <> 'false') then
        raise exception '% global threshold failed on attempt %: %', v_action, i, v_result;
      end if;
    end loop;
    truncate k2_private.storefront_auth_rate_buckets, k2_private.storefront_auth_rate_nonces;
  end loop;
end
$$;

-- Replay, signature, cleanup, and privacy.
do $$
declare
  v_nonce uuid := extensions.gen_random_uuid();
  v_timestamp bigint := extract(epoch from clock_timestamp())::bigint;
  v_replayed boolean := false;
  v_invalid boolean := false;
begin
  perform public.k2_test_consume_storefront_auth_rate(
    'customer_auth_email_request', repeat('7', 64), repeat('8', 64), v_nonce
  );
  begin
    perform public.k2_test_consume_storefront_auth_rate(
      'customer_auth_email_request', repeat('7', 64), repeat('8', 64), v_nonce
    );
  exception when sqlstate '28000' then
    v_replayed := sqlerrm = 'K2_STOREFRONT_AUTH_RATE_REPLAYED';
  end;
  if not v_replayed then raise exception 'Replay was not rejected'; end if;

  begin
    perform public.consume_storefront_customer_auth_rate_v1(
      'customer_auth_email_request', v_timestamp, extensions.gen_random_uuid(),
      repeat('9', 64), repeat('a', 64), repeat('0', 64)
    );
  exception when sqlstate '28000' then
    v_invalid := sqlerrm = 'K2_STOREFRONT_AUTH_RATE_SIGNATURE_INVALID';
  end;
  if not v_invalid then raise exception 'Invalid signature was not rejected'; end if;

  insert into k2_private.storefront_auth_rate_buckets(
    action, scope, subject_hash, bucket_start, window_seconds
  ) values ('customer_auth_email_request', 'ip', repeat('b', 64), clock_timestamp() - interval '2 days', 900);
  insert into k2_private.storefront_auth_rate_nonces(action, nonce, expires_at)
  values ('customer_auth_email_request', extensions.gen_random_uuid(), clock_timestamp() - interval '1 minute');
  perform public.k2_test_consume_storefront_auth_rate(
    'customer_auth_email_request', repeat('c', 64), repeat('d', 64), extensions.gen_random_uuid()
  );
  if exists (select 1 from k2_private.storefront_auth_rate_buckets where subject_hash = repeat('b', 64))
     or exists (select 1 from k2_private.storefront_auth_rate_nonces where expires_at <= clock_timestamp()) then
    raise exception 'Expired private rate evidence was not cleaned';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'k2_private'
      and table_name in ('storefront_auth_rate_buckets', 'storefront_auth_rate_nonces')
      and column_name ~ '(email|phone|ip_address|code|token|raw)'
  ) or exists (
    select 1 from k2_private.storefront_auth_rate_buckets
    where subject_hash !~ '^[0-9a-f]{64}$'
  ) then
    raise exception 'Storefront Auth persistence can contain raw identifiers';
  end if;
end
$$;

drop function public.k2_test_consume_storefront_auth_rate(text, text, text, uuid);
select 'MAP020_STOREFRONT_AUTH_RATE_BEHAVIOR_OK' as result;
