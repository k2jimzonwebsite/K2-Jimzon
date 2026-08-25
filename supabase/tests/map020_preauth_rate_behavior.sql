\set ON_ERROR_STOP on

do $$
begin
  if not has_function_privilege(
      'anon',
      'public.consume_admin_preauth_rate_v1(text,bigint,uuid,text,text,text)',
      'execute'
    )
    or has_function_privilege(
      'authenticated',
      'public.consume_admin_preauth_rate_v1(text,bigint,uuid,text,text,text)',
      'execute'
    ) then
    raise exception 'Pre-auth function role boundary is unsafe';
  end if;
  if has_table_privilege('anon', 'k2_private.admin_preauth_rate_buckets', 'select')
     or has_table_privilege('anon', 'k2_private.admin_preauth_rate_nonces', 'select')
     or has_table_privilege('authenticated', 'k2_private.admin_preauth_rate_buckets', 'select') then
    raise exception 'Private pre-auth tables are exposed';
  end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'k2_private'
      and c.relname in ('admin_preauth_rate_buckets', 'admin_preauth_rate_nonces')
      and c.relrowsecurity and c.relforcerowsecurity
    group by n.nspname having count(*) = 2
  ) then
    raise exception 'Private pre-auth tables do not force RLS';
  end if;
end
$$;

create or replace function public.k2_test_consume_admin_preauth_rate(
  p_action text,
  p_ip_hash text,
  p_contact_hash text,
  p_nonce uuid
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
  v_message := p_action || E'\n' || v_timestamp::text || E'\n'
    || p_nonce::text || E'\n' || p_ip_hash || E'\n' || p_contact_hash;
  v_signature := encode(extensions.hmac(
    convert_to(v_message, 'UTF8'), decode(repeat('17', 32), 'hex'), 'sha256'
  ), 'hex');
  return public.consume_admin_preauth_rate_v1(
    p_action, v_timestamp, p_nonce, p_ip_hash, p_contact_hash, v_signature
  );
end;
$$;

-- Prove that the anonymous role can execute the signed boundary itself.
select extract(epoch from clock_timestamp())::bigint as anon_timestamp,
  extensions.gen_random_uuid()::text as anon_nonce,
  repeat('1', 64) as anon_ip_hash,
  repeat('2', 64) as anon_contact_hash
\gset
select encode(extensions.hmac(convert_to(
  'password_recovery' || E'\n' || :'anon_timestamp' || E'\n' || :'anon_nonce'
  || E'\n' || :'anon_ip_hash' || E'\n' || :'anon_contact_hash', 'UTF8'
), decode(repeat('17', 32), 'hex'), 'sha256'), 'hex') as anon_signature
\gset
set role anon;
select public.consume_admin_preauth_rate_v1(
  'password_recovery', :'anon_timestamp'::bigint, :'anon_nonce'::uuid,
  :'anon_ip_hash', :'anon_contact_hash', :'anon_signature'
);
reset role;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Contact budget: three allowed per hour; denials remain counted.
do $$
declare
  v_result jsonb;
  v_count bigint;
begin
  for i in 1..5 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'password_recovery',
      encode(extensions.digest(convert_to('contact-ip-' || i, 'UTF8'), 'sha256'), 'hex'),
      repeat('3', 64), extensions.gen_random_uuid()
    );
    if (i <= 3 and v_result->>'allowed' <> 'true')
       or (i > 3 and (v_result->>'allowed' <> 'false'
         or (v_result->>'retryAfter')::integer <= 0)) then
      raise exception 'Contact budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
  select hit_count into v_count from k2_private.admin_preauth_rate_buckets
  where scope = 'contact' and subject_hash = repeat('3', 64);
  if v_count <> 5 then
    raise exception 'Denied contact attempts did not persist: %', v_count;
  end if;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- IP budget: five allowed per 15 minutes.
do $$
declare v_result jsonb;
begin
  for i in 1..6 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'password_recovery',
      repeat('4', 64),
      encode(extensions.digest(convert_to('ip-contact-' || i, 'UTF8'), 'sha256'), 'hex'),
      extensions.gen_random_uuid()
    );
    if (i <= 5 and v_result->>'allowed' <> 'true')
       or (i = 6 and v_result->>'allowed' <> 'false') then
      raise exception 'IP budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Global budget: 120 allowed per minute across unique subjects.
do $$
declare
  v_result jsonb;
  v_second double precision := extract(second from clock_timestamp());
begin
  if v_second > 55 then
    perform pg_sleep(61 - v_second);
  end if;
  for i in 1..121 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'password_recovery',
      encode(extensions.digest(convert_to('global-ip-' || i, 'UTF8'), 'sha256'), 'hex'),
      encode(extensions.digest(convert_to('global-contact-' || i, 'UTF8'), 'sha256'), 'hex'),
      extensions.gen_random_uuid()
    );
    if (i <= 120 and v_result->>'allowed' <> 'true')
       or (i = 121 and v_result->>'allowed' <> 'false') then
      raise exception 'Global budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Login contact budget: ten allowed per hour across distinct IPs.
do $$
declare v_result jsonb;
begin
  for i in 1..11 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'admin_login',
      encode(extensions.digest(convert_to('login-contact-ip-' || i, 'UTF8'), 'sha256'), 'hex'),
      repeat('c', 64), extensions.gen_random_uuid()
    );
    if (i <= 10 and v_result->>'allowed' <> 'true')
       or (i = 11 and (v_result->>'allowed' <> 'false'
         or (v_result->>'retryAfter')::integer <= 0)) then
      raise exception 'Login contact budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Login IP budget: twenty allowed per 15 minutes across distinct contacts.
do $$
declare v_result jsonb;
begin
  for i in 1..21 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'admin_login', repeat('d', 64),
      encode(extensions.digest(convert_to('login-ip-contact-' || i, 'UTF8'), 'sha256'), 'hex'),
      extensions.gen_random_uuid()
    );
    if (i <= 20 and v_result->>'allowed' <> 'true')
       or (i = 21 and v_result->>'allowed' <> 'false') then
      raise exception 'Login IP budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Login global budget: 300 allowed per minute across unique subjects.
do $$
declare
  v_result jsonb;
  v_second double precision := extract(second from clock_timestamp());
begin
  if v_second > 55 then
    perform pg_sleep(61 - v_second);
  end if;
  for i in 1..301 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'admin_login',
      encode(extensions.digest(convert_to('login-global-ip-' || i, 'UTF8'), 'sha256'), 'hex'),
      encode(extensions.digest(convert_to('login-global-contact-' || i, 'UTF8'), 'sha256'), 'hex'),
      extensions.gen_random_uuid()
    );
    if (i <= 300 and v_result->>'allowed' <> 'true')
       or (i = 301 and v_result->>'allowed' <> 'false') then
      raise exception 'Login global budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Pending-MFA session budget: five allowed per 15 minutes across distinct IPs.
do $$
declare v_result jsonb;
begin
  for i in 1..6 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'admin_mfa',
      encode(extensions.digest(convert_to('mfa-session-ip-' || i, 'UTF8'), 'sha256'), 'hex'),
      repeat('e', 64), extensions.gen_random_uuid()
    );
    if (i <= 5 and v_result->>'allowed' <> 'true')
       or (i = 6 and (v_result->>'allowed' <> 'false'
         or (v_result->>'retryAfter')::integer <= 0)) then
      raise exception 'MFA session budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
  if not exists (
    select 1 from k2_private.admin_preauth_rate_buckets
    where action = 'admin_mfa' and scope = 'session'
      and subject_hash = repeat('e', 64) and hit_count = 6 and window_seconds = 900
  ) then
    raise exception 'MFA session bucket scope/window/count is incorrect';
  end if;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Pending-MFA IP budget: ten allowed per 15 minutes across distinct sessions.
do $$
declare v_result jsonb;
begin
  for i in 1..11 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'admin_mfa', repeat('f', 64),
      encode(extensions.digest(convert_to('mfa-ip-session-' || i, 'UTF8'), 'sha256'), 'hex'),
      extensions.gen_random_uuid()
    );
    if (i <= 10 and v_result->>'allowed' <> 'true')
       or (i = 11 and v_result->>'allowed' <> 'false') then
      raise exception 'MFA IP budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Pending-MFA global budget: 300 allowed per minute across unique sessions.
do $$
declare
  v_result jsonb;
  v_second double precision := extract(second from clock_timestamp());
begin
  if v_second > 55 then
    perform pg_sleep(61 - v_second);
  end if;
  for i in 1..301 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'admin_mfa',
      encode(extensions.digest(convert_to('mfa-global-ip-' || i, 'UTF8'), 'sha256'), 'hex'),
      encode(extensions.digest(convert_to('mfa-global-session-' || i, 'UTF8'), 'sha256'), 'hex'),
      extensions.gen_random_uuid()
    );
    if (i <= 300 and v_result->>'allowed' <> 'true')
       or (i = 301 and v_result->>'allowed' <> 'false') then
      raise exception 'MFA global budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Recovery-completion session budget: five allowed per 15 minutes.
do $$
declare v_result jsonb;
begin
  for i in 1..6 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'password_recovery_complete',
      encode(extensions.digest(convert_to('recovery-complete-session-ip-' || i, 'UTF8'), 'sha256'), 'hex'),
      repeat('1', 64), extensions.gen_random_uuid()
    );
    if (i <= 5 and v_result->>'allowed' <> 'true')
       or (i = 6 and (v_result->>'allowed' <> 'false' or (v_result->>'retryAfter')::integer <= 0)) then
      raise exception 'Recovery-completion session budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
  if not exists (
    select 1 from k2_private.admin_preauth_rate_buckets
    where action = 'password_recovery_complete' and scope = 'session'
      and subject_hash = repeat('1', 64) and hit_count = 6 and window_seconds = 900
  ) then
    raise exception 'Recovery-completion session bucket scope/window/count is incorrect';
  end if;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Recovery-completion IP budget: ten allowed per 15 minutes across distinct sessions.
do $$
declare v_result jsonb;
begin
  for i in 1..11 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'password_recovery_complete', repeat('2', 64),
      encode(extensions.digest(convert_to('recovery-complete-ip-session-' || i, 'UTF8'), 'sha256'), 'hex'),
      extensions.gen_random_uuid()
    );
    if (i <= 10 and v_result->>'allowed' <> 'true')
       or (i = 11 and v_result->>'allowed' <> 'false') then
      raise exception 'Recovery-completion IP budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Recovery-completion global budget: 120 allowed per minute across unique sessions.
do $$
declare
  v_result jsonb;
  v_second double precision := extract(second from clock_timestamp());
begin
  if v_second > 55 then
    perform pg_sleep(61 - v_second);
  end if;
  for i in 1..121 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'password_recovery_complete',
      encode(extensions.digest(convert_to('recovery-complete-global-ip-' || i, 'UTF8'), 'sha256'), 'hex'),
      encode(extensions.digest(convert_to('recovery-complete-global-session-' || i, 'UTF8'), 'sha256'), 'hex'),
      extensions.gen_random_uuid()
    );
    if (i <= 120 and v_result->>'allowed' <> 'true')
       or (i = 121 and v_result->>'allowed' <> 'false') then
      raise exception 'Recovery-completion global budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Recovery-verification token budget: three allowed per 15 minutes.
do $$
declare v_result jsonb;
begin
  for i in 1..4 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'password_recovery_verify',
      encode(extensions.digest(convert_to('recovery-verify-token-ip-' || i, 'UTF8'), 'sha256'), 'hex'),
      repeat('c', 64), extensions.gen_random_uuid()
    );
    if (i <= 3 and v_result->>'allowed' <> 'true')
       or (i = 4 and (v_result->>'allowed' <> 'false' or (v_result->>'retryAfter')::integer <= 0)) then
      raise exception 'Recovery-verification token budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
  if not exists (
    select 1 from k2_private.admin_preauth_rate_buckets
    where action = 'password_recovery_verify' and scope = 'session'
      and subject_hash = repeat('c', 64) and hit_count = 4 and window_seconds = 900
  ) then
    raise exception 'Recovery-verification token bucket scope/window/count is incorrect';
  end if;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Recovery-verification IP budget: ten allowed per 15 minutes across distinct tokens.
do $$
declare v_result jsonb;
begin
  for i in 1..11 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'password_recovery_verify', repeat('d', 64),
      encode(extensions.digest(convert_to('recovery-verify-ip-token-' || i, 'UTF8'), 'sha256'), 'hex'),
      extensions.gen_random_uuid()
    );
    if (i <= 10 and v_result->>'allowed' <> 'true')
       or (i = 11 and v_result->>'allowed' <> 'false') then
      raise exception 'Recovery-verification IP budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Recovery-verification global budget: 120 allowed per minute across unique tokens.
do $$
declare
  v_result jsonb;
  v_second double precision := extract(second from clock_timestamp());
begin
  if v_second > 55 then
    perform pg_sleep(61 - v_second);
  end if;
  for i in 1..121 loop
    v_result := public.k2_test_consume_admin_preauth_rate(
      'password_recovery_verify',
      encode(extensions.digest(convert_to('recovery-verify-global-ip-' || i, 'UTF8'), 'sha256'), 'hex'),
      encode(extensions.digest(convert_to('recovery-verify-global-token-' || i, 'UTF8'), 'sha256'), 'hex'),
      extensions.gen_random_uuid()
    );
    if (i <= 120 and v_result->>'allowed' <> 'true')
       or (i = 121 and v_result->>'allowed' <> 'false') then
      raise exception 'Recovery-verification global budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
end
$$;

truncate k2_private.admin_preauth_rate_buckets, k2_private.admin_preauth_rate_nonces;

-- Replay, signature validation, cleanup, and privacy schema assertions.
do $$
declare
  v_nonce uuid := extensions.gen_random_uuid();
  v_timestamp bigint := extract(epoch from clock_timestamp())::bigint;
  v_replayed boolean := false;
  v_invalid boolean := false;
begin
  perform public.k2_test_consume_admin_preauth_rate('password_recovery', repeat('5', 64), repeat('6', 64), v_nonce);
  begin
    perform public.k2_test_consume_admin_preauth_rate('password_recovery', repeat('5', 64), repeat('6', 64), v_nonce);
  exception when sqlstate '28000' then
    v_replayed := sqlerrm = 'K2_ADMIN_PREAUTH_RATE_REPLAYED';
  end;
  if not v_replayed then raise exception 'Replay was not rejected'; end if;

  begin
    perform public.consume_admin_preauth_rate_v1(
      'password_recovery', v_timestamp, extensions.gen_random_uuid(),
      repeat('7', 64), repeat('8', 64), repeat('0', 64)
    );
  exception when sqlstate '28000' then
    v_invalid := sqlerrm = 'K2_ADMIN_PREAUTH_RATE_SIGNATURE_INVALID';
  end;
  if not v_invalid then raise exception 'Invalid signature was not rejected'; end if;

  insert into k2_private.admin_preauth_rate_buckets(
    action, scope, subject_hash, bucket_start, window_seconds
  ) values ('password_recovery', 'ip', repeat('9', 64), clock_timestamp() - interval '2 days', 900);
  insert into k2_private.admin_preauth_rate_nonces(action, nonce, expires_at)
  values ('password_recovery', extensions.gen_random_uuid(), clock_timestamp() - interval '1 minute');
  perform public.k2_test_consume_admin_preauth_rate(
    'password_recovery', repeat('a', 64), repeat('b', 64), extensions.gen_random_uuid()
  );
  if exists (select 1 from k2_private.admin_preauth_rate_buckets where subject_hash = repeat('9', 64))
     or exists (select 1 from k2_private.admin_preauth_rate_nonces where expires_at <= clock_timestamp()) then
    raise exception 'Expired private rate evidence was not cleaned';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'k2_private'
      and table_name in ('admin_preauth_rate_buckets', 'admin_preauth_rate_nonces')
      and column_name ~ '(email|ip_address|contact_value|raw)'
  ) or exists (
    select 1 from k2_private.admin_preauth_rate_buckets
    where subject_hash !~ '^[0-9a-f]{64}$'
  ) then
    raise exception 'Pre-auth persistence can contain raw identifiers';
  end if;
end
$$;

drop function public.k2_test_consume_admin_preauth_rate(text, text, text, uuid);
