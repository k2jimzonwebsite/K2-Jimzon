-- MAP-020 prepared-only Shopee webhook ingress boundary.
-- No rate configuration is inserted here: approved provider limits must be
-- supplied deliberately before this command can capture events.

begin;

do $preflight$
begin
  if to_regclass('public.channel_event_inbox') is null then
    raise exception 'Channel event inbox foundation must be applied first';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    raise exception 'service_role must exist before Shopee ingress hardening';
  end if;
end
$preflight$;

create table if not exists k2_private.shopee_webhook_rate_config (
  singleton boolean primary key default true check (singleton),
  per_shop_limit integer not null check (per_shop_limit between 1 and 10000),
  global_limit integer not null check (global_limit between 1 and 100000),
  window_seconds integer not null check (window_seconds between 60 and 3600),
  configured_at timestamptz not null default clock_timestamp(),
  check (global_limit >= per_shop_limit)
);

create table if not exists k2_private.shopee_webhook_rate_buckets (
  scope text not null check (scope in ('shop', 'global')),
  shop_id bigint not null check (
    (scope = 'shop' and shop_id > 0) or (scope = 'global' and shop_id = 0)
  ),
  bucket_start timestamptz not null,
  window_seconds integer not null check (window_seconds between 60 and 3600),
  hit_count bigint not null default 1 check (hit_count > 0),
  primary key (scope, shop_id, bucket_start, window_seconds)
);

create index if not exists shopee_webhook_rate_buckets_expiry_idx
  on k2_private.shopee_webhook_rate_buckets (bucket_start, window_seconds);

alter table k2_private.shopee_webhook_rate_config enable row level security;
alter table k2_private.shopee_webhook_rate_config force row level security;
alter table k2_private.shopee_webhook_rate_buckets enable row level security;
alter table k2_private.shopee_webhook_rate_buckets force row level security;

revoke all on table k2_private.shopee_webhook_rate_config
  from public, anon, authenticated, service_role;
revoke all on table k2_private.shopee_webhook_rate_buckets
  from public, anon, authenticated, service_role;

create or replace function public.capture_shopee_event_v1(
  p_shop_id bigint,
  p_external_event_id text,
  p_event_type text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_per_shop_limit integer;
  v_global_limit integer;
  v_window_seconds integer;
  v_bucket_start timestamptz;
  v_shop_count bigint;
  v_global_count bigint;
  v_retry_after integer;
  v_inserted integer;
  v_existing_type text;
  v_existing_payload jsonb;
begin
  if p_shop_id is null or p_shop_id <= 0
     or p_external_event_id is null
     or length(p_external_event_id) not between 1 and 300
     or p_external_event_id not like p_shop_id::text || ':%'
     or p_event_type is null or length(p_event_type) not between 1 and 100
     or p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or coalesce(p_payload->>'shop_id', '') !~ '^[1-9][0-9]{0,17}$'
     or (p_payload->>'shop_id')::bigint <> p_shop_id then
    raise exception using errcode = '22023', message = 'K2_SHOPEE_CAPTURE_INVALID';
  end if;

  select per_shop_limit, global_limit, window_seconds
    into v_per_shop_limit, v_global_limit, v_window_seconds
  from k2_private.shopee_webhook_rate_config
  where singleton = true;

  if not found then
    return jsonb_build_object('status', 'unavailable', 'retryAfter', 60);
  end if;

  delete from k2_private.shopee_webhook_rate_buckets
  where bucket_start + make_interval(secs => window_seconds) <= v_now - interval '1 day';

  v_bucket_start := date_bin(
    make_interval(secs => v_window_seconds),
    v_now,
    timestamptz '2000-01-01 00:00:00+00'
  );

  insert into k2_private.shopee_webhook_rate_buckets(
    scope, shop_id, bucket_start, window_seconds
  ) values ('shop', p_shop_id, v_bucket_start, v_window_seconds)
  on conflict (scope, shop_id, bucket_start, window_seconds)
  do update set hit_count = k2_private.shopee_webhook_rate_buckets.hit_count + 1
  returning hit_count into v_shop_count;

  insert into k2_private.shopee_webhook_rate_buckets(
    scope, shop_id, bucket_start, window_seconds
  ) values ('global', 0, v_bucket_start, v_window_seconds)
  on conflict (scope, shop_id, bucket_start, window_seconds)
  do update set hit_count = k2_private.shopee_webhook_rate_buckets.hit_count + 1
  returning hit_count into v_global_count;

  if v_shop_count > v_per_shop_limit or v_global_count > v_global_limit then
    v_retry_after := greatest(
      1,
      ceil(extract(epoch from (
        v_bucket_start + make_interval(secs => v_window_seconds) - v_now
      )))::integer
    );
    return jsonb_build_object('status', 'rate_limited', 'retryAfter', v_retry_after);
  end if;

  insert into public.channel_event_inbox(
    channel, external_event_id, event_type, payload, status, last_error
  ) values (
    'shopee', p_external_event_id, p_event_type, p_payload, 'received', null
  ) on conflict (channel, external_event_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    return jsonb_build_object('status', 'captured', 'retryAfter', 0);
  end if;

  select event_type, payload into v_existing_type, v_existing_payload
  from public.channel_event_inbox
  where channel = 'shopee' and external_event_id = p_external_event_id
  for update;

  if v_existing_type = p_event_type and v_existing_payload = p_payload then
    return jsonb_build_object('status', 'replayed', 'retryAfter', 0);
  end if;

  return jsonb_build_object('status', 'conflict', 'retryAfter', 0);
end;
$$;

revoke all on function public.capture_shopee_event_v1(bigint,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.capture_shopee_event_v1(bigint,text,text,jsonb)
  to service_role;

notify pgrst, 'reload schema';
commit;

