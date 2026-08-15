-- Metadata-Only Schema Exporter Query (MAP-017)
-- Exports complete schema metadata, catalog definitions, RLS, policies, grants,
-- function signatures, search paths, views, storage, realtime, and migration ledger.
-- Contains ZERO business data rows, ZERO passwords, ZERO credentials, ZERO emails.

with non_system_schemas as (
  select nspname
  from pg_namespace
  where nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
    and nspname not like 'pg_temp_%'
    and nspname not like 'pg_toast_temp_%'
),
raw_tables as (
  select
    c.relname as table_name,
    n.nspname as schema_name,
    c.rowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced,
    c.relispartition as is_partition,
    pg_get_userbyid(c.relowner) as owner,
    c.relkind as kind
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from non_system_schemas)
    and c.relkind in ('r', 'p')
),
raw_views as (
  select
    c.relname as view_name,
    n.nspname as schema_name,
    pg_get_userbyid(c.relowner) as owner,
    coalesce(array_to_string(c.reloptions, ','), '') as options,
    (coalesce(array_to_string(c.reloptions, ','), '') like '%security_invoker=true%') as security_invoker
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from non_system_schemas)
    and c.relkind = 'v'
),
raw_matviews as (
  select
    c.relname as matview_name,
    n.nspname as schema_name,
    pg_get_userbyid(c.relowner) as owner,
    c.relispopulated as is_populated
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from non_system_schemas)
    and c.relkind = 'm'
),
raw_functions as (
  select
    p.proname as function_name,
    n.nspname as schema_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) as signature,
    p.prosecdef as security_definer,
    pg_get_userbyid(p.proowner) as owner,
    coalesce(array_to_string(p.proconfig, ','), '') as search_path_config,
    t.typname as return_type
  from pg_proc p
  join pg_namespace n on n.oid = p.relnamespace
  join pg_type t on t.oid = p.prorettype
  where n.nspname in (select nspname from non_system_schemas)
),
raw_policies as (
  select
    pol.polname as policy_name,
    c.relname as table_name,
    n.nspname as schema_name,
    case pol.polcmd
      when 'r' then 'SELECT'
      when 'a' then 'INSERT'
      when 'w' then 'UPDATE'
      when 'd' then 'DELETE'
      when '*' then 'ALL'
    end as command,
    case
      when pol.polroles = '{0}' then array['public']::text[]
      else array(
        select rolname from pg_roles where oid = any(pol.polroles)
      )::text[]
    end as roles,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from non_system_schemas)
),
raw_columns as (
  select
    table_schema as schema_name,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
  from information_schema.columns
  where table_schema in (select nspname from non_system_schemas)
),
raw_constraints as (
  select
    tc.constraint_schema as schema_name,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    pg_get_constraintdef(c.oid) as definition
  from information_schema.table_constraints tc
  join pg_constraint c on c.conname = tc.constraint_name
  where tc.constraint_schema in (select nspname from non_system_schemas)
),
raw_indexes as (
  select
    schemaname as schema_name,
    tablename as table_name,
    indexname as index_name,
    indexdef as definition
  from pg_indexes
  where schemaname in (select nspname from non_system_schemas)
),
raw_sequences as (
  select
    sequence_schema as schema_name,
    sequence_name,
    data_type
  from information_schema.sequences
  where sequence_schema in (select nspname from non_system_schemas)
),
raw_triggers as (
  select
    trigger_schema as schema_name,
    event_object_table as table_name,
    trigger_name,
    action_timing as timing,
    event_manipulation as event,
    action_statement
  from information_schema.triggers
  where trigger_schema in (select nspname from non_system_schemas)
),
raw_grants as (
  select
    grantee,
    table_schema as schema_name,
    table_name,
    privilege_type as privilege
  from information_schema.role_table_grants
  where table_schema in (select nspname from non_system_schemas)
    and grantee in ('anon', 'authenticated', 'public')
),
raw_storage_buckets as (
  select
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  from storage.buckets
  where to_regclass('storage.buckets') is not null
),
raw_realtime_tables as (
  select
    schemaname as schema_name,
    tablename as table_name
  from pg_publication_tables
  where pubname = 'supabase_realtime'
),
raw_migrations as (
  select
    version,
    inserted_at
  from supabase_migrations.schema_migrations
  where to_regclass('supabase_migrations.schema_migrations') is not null
  order by version asc
)
select jsonb_build_object(
  'exported_at', now() at time zone 'utc',
  'format_version', '2026-08-15.map017.meta.v1',
  'schemas', (select jsonb_agg(nspname order by nspname) from non_system_schemas),
  'tables', coalesce((select jsonb_object_agg(schema_name || '.' || table_name, to_jsonb(r)) from raw_tables r), '{}'::jsonb),
  'columns', coalesce((select jsonb_agg(to_jsonb(col)) from raw_columns col), '[]'::jsonb),
  'constraints', coalesce((select jsonb_agg(to_jsonb(con)) from raw_constraints con), '[]'::jsonb),
  'indexes', coalesce((select jsonb_agg(to_jsonb(idx)) from raw_indexes idx), '[]'::jsonb),
  'sequences', coalesce((select jsonb_agg(to_jsonb(seq)) from raw_sequences seq), '[]'::jsonb),
  'triggers', coalesce((select jsonb_agg(to_jsonb(trg)) from raw_triggers trg), '[]'::jsonb),
  'views', coalesce((select jsonb_object_agg(schema_name || '.' || view_name, to_jsonb(v)) from raw_views v), '{}'::jsonb),
  'materialized_views', coalesce((select jsonb_object_agg(schema_name || '.' || matview_name, to_jsonb(m)) from raw_matviews m), '{}'::jsonb),
  'functions', coalesce((select jsonb_object_agg(signature, to_jsonb(f)) from raw_functions f), '{}'::jsonb),
  'policies', coalesce((select jsonb_agg(to_jsonb(p)) from raw_policies p), '[]'::jsonb),
  'grants', coalesce((select jsonb_agg(to_jsonb(g)) from raw_grants g), '[]'::jsonb),
  'storage', jsonb_build_object(
    'buckets', coalesce((select jsonb_object_agg(id, to_jsonb(b)) from raw_storage_buckets b), '{}'::jsonb)
  ),
  'realtime', jsonb_build_object(
    'publication_tables', coalesce((select jsonb_agg(table_name) from raw_realtime_tables where schema_name = 'public'), '[]'::jsonb)
  ),
  'migrations', coalesce((select jsonb_agg(to_jsonb(m)) from raw_migrations m), '[]'::jsonb)
) as schema_metadata;
