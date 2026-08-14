do $$
begin
  if not exists (select 1 from pg_extension where extname='pgcrypto') then
    raise exception 'MAP020_PREFLIGHT: pgcrypto is required';
  end if;
  if to_regclass('public.customers') is null
     or to_regclass('public.guest_access_grants') is null
     or to_regclass('public.guest_access_grant_scopes') is null then
    raise exception 'MAP020_PREFLIGHT: apply MAP019 identity migration first';
  end if;
  if to_regprocedure('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text)') is null
     or to_regprocedure('public.submit_pasabuy_request(text,text,text,text,text,integer,numeric,text,boolean,text)') is null then
    raise exception 'MAP020_PREFLIGHT: live guest source commands are missing';
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='order_requests' and column_name='request_fingerprint')
     or not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='pasabuy_requests' and column_name='idempotency_key') then
    raise exception 'MAP020_PREFLIGHT: MAP019 request links are incomplete';
  end if;
end $$;
