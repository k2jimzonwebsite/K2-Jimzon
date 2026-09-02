#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateMap017ProductionDatabaseUrl } from '../create-map017-production-backup.mjs'

const PROJECT_REF = 'pixplcjqivlfflickobf'
const rootDir = fileURLToPath(new URL('../..', import.meta.url))
const bundledPsql = path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin', 'psql.exe')

// Counts only. No stored values, customer text, URLs, or row identifiers leave Postgres.
export const hostnameInventorySql = String.raw`
set statement_timeout = '120000';
create temporary table map024_hostname_matches (
  schema_name text not null,
  table_name text not null,
  column_name text not null,
  data_type text not null,
  row_count bigint not null,
  absolute_url_count bigint not null,
  legacy_vercel_count bigint not null,
  localhost_count bigint not null,
  loopback_count bigint not null
) on commit drop;

do $map024$
declare
  column_info record;
begin
  for column_info in
    select
      namespace.nspname,
      relation.relname,
      attribute.attname,
      format_type(attribute.atttypid, attribute.atttypmod) as data_type
    from pg_attribute attribute
    join pg_class relation on relation.oid = attribute.attrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where attribute.attnum > 0
      and not attribute.attisdropped
      and namespace.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
      and relation.relkind in ('r', 'p', 'v', 'm', 'f')
      and attribute.atttypid in (25, 1042, 1043, 114, 3802)
    order by namespace.nspname, relation.relname, attribute.attnum
  loop
    execute format($statement$
      insert into map024_hostname_matches (
        schema_name, table_name, column_name, data_type, row_count,
        absolute_url_count, legacy_vercel_count, localhost_count, loopback_count
      )
      select
        %L, %L, %L, %L,
        count(*)::bigint,
        count(*) filter (where value ~* 'https?://[^[:space:]<>]+')::bigint,
        count(*) filter (where value ~* 'https?://[^[:space:]<>]*k2-jimzon[^[:space:]<>]*\.vercel\.app')::bigint,
        count(*) filter (where value ~* 'https?://(localhost|127\.0\.0\.1)(:[0-9]+)?(/|$)' or value ~* '(^|[^[:alnum:]_])localhost(:[0-9]+)?([^[:alnum:]_]|$)')::bigint,
        count(*) filter (where value ~* 'https?://(\[::1\]|0\.0\.0\.0)(:[0-9]+)?(/|$)' or value ~* '(^|[^[:alnum:]_])(127\.0\.0\.1|::1|0\.0\.0\.0)(:[0-9]+)?([^[:alnum:]_]|$)')::bigint
      from (
        select coalesce((%I)::text, '') as value
        from %I.%I
      ) values_source
      where value ~* 'https?://[^[:space:]<>]+'
         or value ~* 'https?://[^[:space:]<>]*k2-jimzon[^[:space:]<>]*\.vercel\.app'
         or value ~* '(^|[^[:alnum:]_])localhost(:[0-9]+)?([^[:alnum:]_]|$)'
         or value ~* '(^|[^[:alnum:]_])(127\.0\.0\.1|::1|0\.0\.0\.0)(:[0-9]+)?([^[:alnum:]_]|$)'
    $statement$, column_info.nspname, column_info.relname, column_info.attname, column_info.data_type,
      column_info.attname, column_info.nspname, column_info.relname);
  end loop;
end
$map024$;

select json_build_object(
  'projectRef', '${PROJECT_REF}',
  'columnsScanned', (
    select count(*)::bigint
    from pg_attribute attribute
    join pg_class relation on relation.oid = attribute.attrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where attribute.attnum > 0
      and not attribute.attisdropped
      and namespace.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
      and relation.relkind in ('r', 'p', 'v', 'm', 'f')
      and attribute.atttypid in (25, 1042, 1043, 114, 3802)
  ),
  'columnsWithMatches', (select count(*)::bigint from map024_hostname_matches),
  'rowsWithMatches', (select coalesce(sum(row_count), 0)::bigint from map024_hostname_matches),
  'matches', coalesce((
    select json_agg(row_to_json(matches) order by schema_name, table_name, column_name)
    from map024_hostname_matches matches
  ), '[]'::json)
)::text;
`

function databaseEnvironment(databaseUrl) {
  const parsed = new URL(databaseUrl)
  return {
    ...process.env,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGDATABASE: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    PGSSLMODE: parsed.searchParams.get('sslmode'),
    PGTZ: 'UTC',
  }
}

export function inventoryPersistedHostnames({ databaseUrl, psql = bundledPsql, spawnImpl = spawnSync }) {
  const target = validateMap017ProductionDatabaseUrl(databaseUrl)
  if (!target.valid) throw new Error(`MAP024_HOSTNAME_INVENTORY_REFUSAL: ${target.reason}`)
  const result = spawnImpl(psql, ['-X', '--no-psqlrc', '-At', '-v', 'ON_ERROR_STOP=1', '-c', hostnameInventorySql], {
    env: databaseEnvironment(databaseUrl),
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  })
  if (result.error || result.status !== 0) {
    throw new Error('MAP024_HOSTNAME_INVENTORY_REFUSAL: INVENTORY_QUERY_FAILED')
  }
  let inventory
  try { inventory = JSON.parse(String(result.stdout).trim()) }
  catch { throw new Error('MAP024_HOSTNAME_INVENTORY_REFUSAL: INVENTORY_INVALID') }
  if (
    inventory?.projectRef !== PROJECT_REF
    || !Number.isSafeInteger(Number(inventory.columnsScanned))
    || !Number.isSafeInteger(Number(inventory.columnsWithMatches))
    || !Number.isSafeInteger(Number(inventory.rowsWithMatches))
    || !Array.isArray(inventory.matches)
  ) throw new Error('MAP024_HOSTNAME_INVENTORY_REFUSAL: INVENTORY_SHAPE_INVALID')
  return {
    generatedAt: new Date().toISOString(),
    projectRef: PROJECT_REF,
    evidenceBoundary: 'Read-only counts and schema/column names; matched values, row identifiers, and customer text are excluded.',
    ...inventory,
  }
}

async function main() {
  const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : null
  try {
    const result = inventoryPersistedHostnames({ databaseUrl: process.env.K2_PRODUCTION_DATABASE_URL })
    const serialized = `${JSON.stringify(result, null, 2)}\n`
    if (outputPath) await fs.writeFile(outputPath, serialized, { flag: 'wx' })
    process.stdout.write(serialized)
  } catch (error) {
    console.error(String(error?.message || 'MAP024_HOSTNAME_INVENTORY_REFUSAL'))
    process.exit(2)
  }
}

if (process.argv[1]?.endsWith('inventory-persisted-hostnames.mjs')) main()
