-- MAP-020 prepared-only durable pre-auth abuse boundary for staff login/MFA/recovery.
-- Stores only server-HMAC subjects. Do not apply permanently until MAP-017 and
-- the Admin authentication activation gates are authorized and evidenced.

begin;

do $preflight$
begin
  if to_regclass('k2_private.admin_bff_secrets') is null
     or to_regprocedure('extensions.hmac(bytea,bytea,text)') is null
     or to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception 'Admin BFF secret foundation and pgcrypto must be applied first';
  end if;
end
$preflight$;

create table if not exists k2_private.admin_preauth_rate_nonces (
  action text not null constraint admin_preauth_rate_nonces_action_check
    check (action in ('admin_login', 'admin_mfa', 'password_recovery', 'password_recovery_verify', 'password_recovery_complete')),
  nonce uuid not null,
  used_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  primary key (action, nonce)
);

create table if not exists k2_private.admin_preauth_rate_buckets (
  action text not null constraint admin_preauth_rate_buckets_action_check
    check (action in ('admin_login', 'admin_mfa', 'password_recovery', 'password_recovery_verify', 'password_recovery_complete')),
  scope text not null constraint admin_preauth_rate_buckets_scope_check
    check (scope in ('ip', 'contact', 'session', 'global')),
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  bucket_start timestamptz not null,
  window_seconds integer not null check (window_seconds in (60, 900, 3600)),
  hit_count bigint not null default 1 check (hit_count > 0),
  primary key (action, scope, subject_hash, bucket_start, window_seconds)
);

alter table k2_private.admin_preauth_rate_nonces
  drop constraint if exists admin_preauth_rate_nonces_action_check;
alter table k2_private.admin_preauth_rate_nonces
  add constraint admin_preauth_rate_nonces_action_check
  check (action in ('admin_login', 'admin_mfa', 'password_recovery', 'password_recovery_verify', 'password_recovery_complete'));
alter table k2_private.admin_preauth_rate_buckets
  drop constraint if exists admin_preauth_rate_buckets_action_check;
alter table k2_private.admin_preauth_rate_buckets
  add constraint admin_preauth_rate_buckets_action_check
  check (action in ('admin_login', 'admin_mfa', 'password_recovery', 'password_recovery_verify', 'password_recovery_complete'));
alter table k2_private.admin_preauth_rate_buckets
  drop constraint if exists admin_preauth_rate_buckets_scope_check;
alter table k2_private.admin_preauth_rate_buckets
  add constraint admin_preauth_rate_buckets_scope_check
  check (scope in ('ip', 'contact', 'session', 'global'));

create index if not exists admin_preauth_rate_nonces_expiry_idx
  on k2_private.admin_preauth_rate_nonces (expires_at);
create index if not exists admin_preauth_rate_buckets_expiry_idx
  on k2_private.admin_preauth_rate_buckets (bucket_start, window_seconds);

alter table k2_private.admin_preauth_rate_nonces enable row level security;
alter table k2_private.admin_preauth_rate_nonces force row level security;
alter table k2_private.admin_preauth_rate_buckets enable row level security;
alter table k2_private.admin_preauth_rate_buckets force row level security;
revoke all on table k2_private.admin_preauth_rate_nonces from public, anon, authenticated;
revoke all on table k2_private.admin_preauth_rate_buckets from public, anon, authenticated;

create or replace function public.consume_admin_preauth_rate_v1(
  p_action text,
  p_timestamp bigint,
  p_nonce uuid,
  p_ip_hash text,
  p_contact_hash text,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_secret bytea;
  v_expected text;
  v_message text;
  v_inserted integer;
  v_ip_bucket timestamptz;
  v_contact_bucket timestamptz;
  v_global_bucket timestamptz;
  v_ip_count bigint;
  v_contact_count bigint;
  v_global_count bigint;
  v_ip_limit bigint;
  v_contact_limit bigint;
  v_global_limit bigint;
  v_subject_scope text;
  v_subject_window_seconds integer;
  v_retry_after integer := 0;
  v_allowed boolean := true;
begin
  if p_action is null or p_action not in (
       'admin_login', 'admin_mfa', 'password_recovery', 'password_recovery_verify',
       'password_recovery_complete'
     )
     or p_timestamp is null
     or p_nonce is null
     or p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$'
     or p_contact_hash is null or p_contact_hash !~ '^[0-9a-f]{64}$'
     or p_signature is null or p_signature !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'K2_ADMIN_PREAUTH_RATE_INVALID';
  end if;
  if abs(extract(epoch from v_now)::bigint - p_timestamp) > 300 then
    raise exception using errcode = '28000', message = 'K2_ADMIN_PREAUTH_RATE_EXPIRED';
  end if;

  if p_action = 'admin_login' then
    v_ip_limit := 20;
    v_contact_limit := 10;
    v_global_limit := 300;
    v_subject_scope := 'contact';
    v_subject_window_seconds := 3600;
  elsif p_action = 'admin_mfa' then
    v_ip_limit := 10;
    v_contact_limit := 5;
    v_global_limit := 300;
    v_subject_scope := 'session';
    v_subject_window_seconds := 900;
  elsif p_action = 'password_recovery_complete' then
    v_ip_limit := 10;
    v_contact_limit := 5;
    v_global_limit := 120;
    v_subject_scope := 'session';
    v_subject_window_seconds := 900;
  elsif p_action = 'password_recovery_verify' then
    v_ip_limit := 10;
    v_contact_limit := 3;
    v_global_limit := 120;
    v_subject_scope := 'session';
    v_subject_window_seconds := 900;
  else
    v_ip_limit := 5;
    v_contact_limit := 3;
    v_global_limit := 120;
    v_subject_scope := 'contact';
    v_subject_window_seconds := 3600;
  end if;

  select request_secret into v_secret
  from k2_private.admin_bff_secrets where singleton = true;
  if v_secret is null or octet_length(v_secret) <> 32 then
    raise exception using errcode = '55000', message = 'K2_ADMIN_PREAUTH_RATE_NOT_CONFIGURED';
  end if;

  v_message := p_action || E'\n' || p_timestamp::text || E'\n' || p_nonce::text
    || E'\n' || p_ip_hash || E'\n' || p_contact_hash;
  v_expected := encode(extensions.hmac(convert_to(v_message, 'UTF8'), v_secret, 'sha256'), 'hex');
  if extensions.digest(convert_to(v_expected, 'UTF8'), 'sha256')
     <> extensions.digest(convert_to(p_signature, 'UTF8'), 'sha256') then
    raise exception using errcode = '28000', message = 'K2_ADMIN_PREAUTH_RATE_SIGNATURE_INVALID';
  end if;

  delete from k2_private.admin_preauth_rate_nonces where expires_at <= v_now;
  delete from k2_private.admin_preauth_rate_buckets
  where bucket_start + make_interval(secs => window_seconds) <= v_now - interval '1 day';

  insert into k2_private.admin_preauth_rate_nonces(action, nonce, expires_at)
  values (p_action, p_nonce, v_now + interval '10 minutes')
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted <> 1 then
    raise exception using errcode = '28000', message = 'K2_ADMIN_PREAUTH_RATE_REPLAYED';
  end if;

  v_ip_bucket := date_bin(interval '15 minutes', v_now, timestamptz '2000-01-01 00:00:00+00');
  insert into k2_private.admin_preauth_rate_buckets(
    action, scope, subject_hash, bucket_start, window_seconds
  ) values (p_action, 'ip', p_ip_hash, v_ip_bucket, 900)
  on conflict (action, scope, subject_hash, bucket_start, window_seconds)
  do update set hit_count = k2_private.admin_preauth_rate_buckets.hit_count + 1
  returning hit_count into v_ip_count;

  v_contact_bucket := date_bin(
    make_interval(secs => v_subject_window_seconds), v_now,
    timestamptz '2000-01-01 00:00:00+00'
  );
  insert into k2_private.admin_preauth_rate_buckets(
    action, scope, subject_hash, bucket_start, window_seconds
  ) values (p_action, v_subject_scope, p_contact_hash, v_contact_bucket, v_subject_window_seconds)
  on conflict (action, scope, subject_hash, bucket_start, window_seconds)
  do update set hit_count = k2_private.admin_preauth_rate_buckets.hit_count + 1
  returning hit_count into v_contact_count;

  v_global_bucket := date_bin(interval '1 minute', v_now, timestamptz '2000-01-01 00:00:00+00');
  insert into k2_private.admin_preauth_rate_buckets(
    action, scope, subject_hash, bucket_start, window_seconds
  ) values (p_action, 'global', repeat('0', 64), v_global_bucket, 60)
  on conflict (action, scope, subject_hash, bucket_start, window_seconds)
  do update set hit_count = k2_private.admin_preauth_rate_buckets.hit_count + 1
  returning hit_count into v_global_count;

  if v_ip_count > v_ip_limit then
    v_allowed := false;
    v_retry_after := greatest(v_retry_after,
      ceil(extract(epoch from (v_ip_bucket + interval '15 minutes' - v_now)))::integer);
  end if;
  if v_contact_count > v_contact_limit then
    v_allowed := false;
    v_retry_after := greatest(v_retry_after,
      ceil(extract(epoch from (
        v_contact_bucket + make_interval(secs => v_subject_window_seconds) - v_now
      )))::integer);
  end if;
  if v_global_count > v_global_limit then
    v_allowed := false;
    v_retry_after := greatest(v_retry_after,
      ceil(extract(epoch from (v_global_bucket + interval '1 minute' - v_now)))::integer);
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'retryAfter', greatest(v_retry_after, case when v_allowed then 0 else 1 end)
  );
end;
$$;

revoke all on function public.consume_admin_preauth_rate_v1(
  text, bigint, uuid, text, text, text
) from public, anon, authenticated;
grant execute on function public.consume_admin_preauth_rate_v1(
  text, bigint, uuid, text, text, text
) to anon;

notify pgrst, 'reload schema';
commit;
