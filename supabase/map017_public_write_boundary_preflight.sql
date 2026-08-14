-- Read-only MAP-017 preflight. Run before the phase-1 migration.
with required_relations(relation_name) as (
  values
    ('brands'), ('categories'), ('warehouses'), ('product_drafts'),
    ('products_old'), ('channel_credentials'), ('staff_allocations'),
    ('v_channel_catalog_readiness'), ('v_expiring_batches')
), relation_check as (
  select r.relation_name,
    to_regclass(format('public.%I', r.relation_name)) is not null as exists_live
  from required_relations r
), view_check as (
  select c.relname, coalesce(array_to_string(c.reloptions, ','), '') as options
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('v_channel_catalog_readiness', 'v_expiring_batches')
)
select
  not exists (select 1 from relation_check where not exists_live)
    and to_regprocedure('public.is_staff()') is not null
    and (select count(*) = 2 from view_check where options like '%security_invoker=true%')
    and exists (select 1 from storage.buckets where id = 'product-images')
    as ready_to_apply,
  coalesce(
    (select jsonb_agg(relation_name order by relation_name)
     from relation_check where not exists_live),
    '[]'::jsonb
  ) as missing_relations,
  to_regprocedure('public.is_staff()') is not null as is_staff_exists,
  exists (select 1 from storage.buckets where id = 'product-images')
    as product_images_bucket_exists,
  coalesce(
    (select jsonb_object_agg(relname, options) from view_check),
    '{}'::jsonb
  ) as view_options;
