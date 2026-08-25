\set ON_ERROR_STOP on

do $$
declare
  v_function regprocedure := to_regprocedure(
    'public.capture_shopee_event_v1(bigint,text,text,jsonb)'
  );
begin
  if v_function is null then
    raise exception 'Shopee capture function is missing';
  end if;
  if not has_function_privilege('service_role', v_function, 'execute')
     or has_function_privilege('anon', v_function, 'execute')
     or has_function_privilege('authenticated', v_function, 'execute') then
    raise exception 'Shopee capture function role boundary is unsafe';
  end if;
  if has_table_privilege('service_role', 'k2_private.shopee_webhook_rate_config', 'select')
     or has_table_privilege('service_role', 'k2_private.shopee_webhook_rate_buckets', 'select')
     or has_table_privilege('anon', 'k2_private.shopee_webhook_rate_buckets', 'select') then
    raise exception 'Shopee private rate tables are exposed';
  end if;
  if (
    select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'k2_private'
      and c.relname in ('shopee_webhook_rate_config', 'shopee_webhook_rate_buckets')
      and c.relrowsecurity and c.relforcerowsecurity
  ) <> 2 then
    raise exception 'Shopee private rate tables do not force RLS';
  end if;
end
$$;

-- Missing production-owned limits must fail closed without capturing an event.
do $$
declare v_result jsonb;
begin
  v_result := public.capture_shopee_event_v1(
    42, '42:unconfigured', 'test_event', '{"code":99,"shop_id":42,"data":{}}'
  );
  if v_result->>'status' <> 'unavailable'
     or exists (select 1 from public.channel_event_inbox) then
    raise exception 'Unconfigured Shopee capture did not fail closed: %', v_result;
  end if;
end
$$;

insert into k2_private.shopee_webhook_rate_config(
  singleton, per_shop_limit, global_limit, window_seconds
) values (true, 3, 5, 60);

-- Prove service_role can execute the command through the granted boundary.
set role service_role;
select public.capture_shopee_event_v1(
  42, '42:service-role', 'test_event', '{"code":99,"shop_id":42,"data":{}}'
);
reset role;

truncate public.channel_event_inbox, k2_private.shopee_webhook_rate_buckets;

-- Exact replay preserves terminal processing state; changed payload conflicts.
do $$
declare v_result jsonb;
begin
  v_result := public.capture_shopee_event_v1(
    42, '42:replay', 'test_event', '{"code":99,"shop_id":42,"data":{"value":1}}'
  );
  if v_result->>'status' <> 'captured' then
    raise exception 'Initial Shopee capture failed: %', v_result;
  end if;

  update public.channel_event_inbox
  set status = 'processed', attempt_count = 7, last_error = null
  where channel = 'shopee' and external_event_id = '42:replay';

  v_result := public.capture_shopee_event_v1(
    42, '42:replay', 'test_event', '{"code":99,"shop_id":42,"data":{"value":1}}'
  );
  if v_result->>'status' <> 'replayed'
     or not exists (
       select 1 from public.channel_event_inbox
       where channel = 'shopee' and external_event_id = '42:replay'
         and status = 'processed' and attempt_count = 7
     ) then
    raise exception 'Exact replay changed inbox processing state: %', v_result;
  end if;

  v_result := public.capture_shopee_event_v1(
    42, '42:replay', 'test_event', '{"code":99,"shop_id":42,"data":{"value":2}}'
  );
  if v_result->>'status' <> 'conflict'
     or not exists (
       select 1 from public.channel_event_inbox
       where channel = 'shopee' and external_event_id = '42:replay'
         and payload = '{"code":99,"shop_id":42,"data":{"value":1}}'::jsonb
     ) then
    raise exception 'Changed-payload conflict was not preserved safely: %', v_result;
  end if;
end
$$;

truncate public.channel_event_inbox, k2_private.shopee_webhook_rate_buckets;

-- Per-shop denial is atomic and denied attempts remain counted.
do $$
declare v_result jsonb;
begin
  for i in 1..4 loop
    v_result := public.capture_shopee_event_v1(
      51, '51:shop-' || i, 'test_event',
      jsonb_build_object('code', 99, 'shop_id', 51, 'data', jsonb_build_object('i', i))
    );
    if (i <= 3 and v_result->>'status' <> 'captured')
       or (i = 4 and (v_result->>'status' <> 'rate_limited'
         or (v_result->>'retryAfter')::integer <= 0)) then
      raise exception 'Per-shop budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
  if (select count(*) from public.channel_event_inbox) <> 3
     or not exists (
       select 1 from k2_private.shopee_webhook_rate_buckets
       where scope = 'shop' and shop_id = 51 and hit_count = 4
     ) then
    raise exception 'Per-shop denial persistence or atomic capture failed';
  end if;
end
$$;

truncate public.channel_event_inbox, k2_private.shopee_webhook_rate_buckets;

-- Global denial spans shops and denied attempts remain counted.
do $$
declare v_result jsonb;
begin
  for i in 1..6 loop
    v_result := public.capture_shopee_event_v1(
      100 + i, (100 + i)::text || ':global', 'test_event',
      jsonb_build_object('code', 99, 'shop_id', 100 + i, 'data', jsonb_build_object())
    );
    if (i <= 5 and v_result->>'status' <> 'captured')
       or (i = 6 and v_result->>'status' <> 'rate_limited') then
      raise exception 'Global budget failed on attempt %: %', i, v_result;
    end if;
  end loop;
  if (select count(*) from public.channel_event_inbox) <> 5
     or not exists (
       select 1 from k2_private.shopee_webhook_rate_buckets
       where scope = 'global' and shop_id = 0 and hit_count = 6
     ) then
    raise exception 'Global denial persistence or atomic capture failed';
  end if;
end
$$;

-- Old buckets are cleaned without deleting the active bucket.
update k2_private.shopee_webhook_rate_buckets
set bucket_start = bucket_start - interval '2 days';
select public.capture_shopee_event_v1(
  500, '500:cleanup', 'test_event', '{"code":99,"shop_id":500,"data":{}}'
);
do $$
begin
  if exists (
    select 1 from k2_private.shopee_webhook_rate_buckets
    where bucket_start < clock_timestamp() - interval '1 day'
  ) then
    raise exception 'Expired Shopee rate buckets were not cleaned';
  end if;
end
$$;

