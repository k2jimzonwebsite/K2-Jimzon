-- Synthetic current-production order signature for the read-only guest preflight.
-- The live function has 11 arguments; its final three have defaults, so the
-- guest boundary's nine-argument call remains valid.
alter table public.order_requests add column request_fingerprint bytea;
alter table public.pasabuy_requests add column idempotency_key text;

create function public.submit_order_request_v2(
  text, text, text, text, text, text, jsonb, text,
  text default null, numeric default 0, text default null
) returns public.order_requests language sql as $$
  select null::public.order_requests
$$;

create function public.submit_pasabuy_request(
  text, text, text, text, text, integer, numeric, text, boolean, text
) returns public.pasabuy_requests language sql as $$
  select null::public.pasabuy_requests
$$;
