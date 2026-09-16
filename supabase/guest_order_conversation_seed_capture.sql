-- MAP-019: run read-only BEFORE applying the seed migration on the exact target.
-- Save the JSON privately. Function bodies can contain sensitive implementation.
-- This capture does not authorize application or recovery.
with targets(signature) as (values
  ('public.submit_guest_order_v1(bigint,uuid,text,text,text,text)'),
  ('public.submit_guest_pasabuy_v1(bigint,uuid,text,text,text,text)')
)
select jsonb_build_object(
  'database', current_database(),
  'systemIdentifier', (select system_identifier::text from pg_control_system()),
  'capturedAt', clock_timestamp(),
  'functions', jsonb_agg(jsonb_build_object(
    'signature', t.signature, 'definition', pg_get_functiondef(p.oid),
    'owner', pg_get_userbyid(p.proowner), 'acl', p.proacl::text
  ) order by t.signature)
) as guest_seed_capture
from targets t left join pg_proc p on p.oid=to_regprocedure(t.signature);
