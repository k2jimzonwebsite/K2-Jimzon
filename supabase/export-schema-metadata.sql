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
    c.relrowsecurity as rls_enabled,
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
    -- oidvectortypes yields the identity argument TYPES only.
    -- pg_get_function_identity_arguments includes parameter names, which makes
    -- the signature unmatchable against a reviewed contract like
    -- "public.set_user_role(uuid,text)".
    format('%I.%I(%s)', n.nspname, p.proname, oidvectortypes(p.proargtypes)) as signature,
    p.prosecdef as security_definer,
    pg_get_userbyid(p.proowner) as owner,
    coalesce(array_to_string(p.proconfig, ','), '') as search_path_config,
    -- Authorization evidence is exported as booleans only. Function bodies may
    -- contain implementation detail and are deliberately excluded from the
    -- artifact, while these signals let MAP-017 verify live guards rather than
    -- infer them from repository migrations.
    (p.prosrc ~* 'auth[.]uid[[:space:]]*[(][[:space:]]*[)]') as references_auth_uid,
    (p.prosrc ~* 'public[.]is_staff[[:space:]]*[(][[:space:]]*[)]') as references_is_staff,
    (p.prosrc ~* 'public[.]is_admin[[:space:]]*[(][[:space:]]*[)]') as references_is_admin,
    (p.prosrc ~* 'role(::text)?[[:space:]]*=[[:space:]]*''Admin''') as references_admin_role,
    (p.prosrc ~* 'auth[.]jwt[[:space:]]*[(]' and p.prosrc ~* 'aal2') as references_aal2,
    (p.prosrc ~* 'raise[[:space:]]+exception') as raises_exception,
    -- pg_get_function_result gives the SQL type name ("boolean"); pg_type.typname
    -- gives the internal name ("bool") and never matches a reviewed contract.
    pg_get_function_result(p.oid) as return_type,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'grantee', coalesce(grantee_role.rolname, 'public'),
        'privilege', function_acl.privilege_type
      ) order by coalesce(grantee_role.rolname, 'public'))
      from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) function_acl
      left join pg_roles grantee_role on grantee_role.oid = function_acl.grantee
      where function_acl.privilege_type = 'EXECUTE'
        and coalesce(grantee_role.rolname, 'public') in ('public', 'anon', 'authenticated')
    ), '[]'::jsonb) as grants
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
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
-- Read from pg_catalog, not information_schema. The information_schema views
-- expose only objects the CURRENT role owns or holds privileges on, so a
-- non-owner export role silently sees zero constraints, triggers and grants.
-- That produces an export that looks complete and audits clean while proving
-- nothing.
raw_constraints as (
  select
    n.nspname as schema_name,
    cl.relname as table_name,
    con.conname as constraint_name,
    case con.contype
      when 'p' then 'PRIMARY KEY'
      when 'f' then 'FOREIGN KEY'
      when 'u' then 'UNIQUE'
      when 'c' then 'CHECK'
      when 'x' then 'EXCLUDE'
      when 't' then 'TRIGGER'
      else con.contype::text
    end as constraint_type,
    pg_get_constraintdef(con.oid) as definition
  from pg_constraint con
  join pg_namespace n on n.oid = con.connamespace
  left join pg_class cl on cl.oid = con.conrelid
  where n.nspname in (select nspname from non_system_schemas)
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
    n.nspname as schema_name,
    c.relname as sequence_name,
    format_type(s.seqtypid, null) as data_type
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_sequence s on s.seqrelid = c.oid
  where n.nspname in (select nspname from non_system_schemas)
    and c.relkind = 'S'
),
raw_triggers as (
  select
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    case
      when (t.tgtype & 2) <> 0 then 'BEFORE'
      when (t.tgtype & 64) <> 0 then 'INSTEAD OF'
      else 'AFTER'
    end as timing,
    array_to_string(array_remove(array[
      case when (t.tgtype & 4) <> 0 then 'INSERT' end,
      case when (t.tgtype & 8) <> 0 then 'DELETE' end,
      case when (t.tgtype & 16) <> 0 then 'UPDATE' end,
      case when (t.tgtype & 32) <> 0 then 'TRUNCATE' end
    ], null), ',') as event,
    pg_get_triggerdef(t.oid) as action_statement
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from non_system_schemas)
    and not t.tgisinternal
),
raw_grants as (
  select
    coalesce(r.rolname, 'public') as grantee,
    n.nspname as schema_name,
    c.relname as table_name,
    a.privilege_type as privilege
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
  left join pg_roles r on r.oid = a.grantee
  where n.nspname in (select nspname from non_system_schemas)
    and c.relkind in ('r', 'p', 'v', 'm')
    and coalesce(r.rolname, 'public') in ('anon', 'authenticated', 'public')
),
raw_schema_grants as (
  select
    n.nspname as schema_name,
    pg_get_userbyid(n.nspowner) as owner,
    coalesce(r.rolname, 'public') as grantee,
    a.privilege_type as privilege
  from pg_namespace n
  cross join lateral aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a
  left join pg_roles r on r.oid = a.grantee
  where n.nspname in (select nspname from non_system_schemas)
    and coalesce(r.rolname, 'public') in ('anon', 'authenticated', 'public')
),
raw_default_privileges as (
  select
    coalesce(n.nspname, '') as schema_name,
    owner_role.rolname as owner,
    coalesce(grantee_role.rolname, 'public') as grantee,
    case d.defaclobjtype
      when 'r' then 'TABLE'
      when 'S' then 'SEQUENCE'
      when 'f' then 'FUNCTION'
      when 'T' then 'TYPE'
      when 'n' then 'SCHEMA'
      else d.defaclobjtype::text
    end as object_type,
    a.privilege_type as privilege
  from pg_default_acl d
  join pg_roles owner_role on owner_role.oid = d.defaclrole
  left join pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral aclexplode(d.defaclacl) a
  left join pg_roles grantee_role on grantee_role.oid = a.grantee
  where (n.nspname is null or n.nspname in (select nspname from non_system_schemas))
    and coalesce(grantee_role.rolname, 'public') in ('anon', 'authenticated', 'public')
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
  -- Only version and name are exported. The ledger also stores `statements` and
  -- `rollback`, which hold raw applied SQL and must not enter a metadata-only
  -- export.
  select
    version,
    name
  from supabase_migrations.schema_migrations
  where to_regclass('supabase_migrations.schema_migrations') is not null
  order by version asc
)
select jsonb_build_object(
  'exported_at', now() at time zone 'utc',
  'format_version', '2026-08-22.map017.meta.v2',
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
  'schema_grants', coalesce((select jsonb_agg(to_jsonb(g)) from raw_schema_grants g), '[]'::jsonb),
  'default_privileges', coalesce((select jsonb_agg(to_jsonb(d)) from raw_default_privileges d), '[]'::jsonb),
  'storage', jsonb_build_object(
    'buckets', coalesce((select jsonb_object_agg(id, to_jsonb(b)) from raw_storage_buckets b), '{}'::jsonb),
    'policies', coalesce((
      select jsonb_agg(to_jsonb(p))
      from raw_policies p
      where p.schema_name = 'storage' and p.table_name = 'objects'
    ), '[]'::jsonb)
  ),
  'realtime', jsonb_build_object(
    'publication_tables', coalesce((select jsonb_agg(table_name) from raw_realtime_tables where schema_name = 'public'), '[]'::jsonb)
  ),
  'migrations', coalesce((select jsonb_agg(to_jsonb(m)) from raw_migrations m), '[]'::jsonb)
) as schema_metadata;
