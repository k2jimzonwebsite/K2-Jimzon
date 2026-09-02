#!/usr/bin/env node
/**
 * MAP-028 D1 — portable rehearsal for the channel vocabulary and shop identity.
 *
 * The migration rewrites constraints on two live tables, so it gets rehearsed
 * against a real PostgreSQL before it is ever proposed for production. What is
 * checked is the behaviour that matters operationally, not that the SQL parses:
 *
 *   1. it applies, and applies again idempotently
 *   2. legacy spellings (tiktok_shop, shopee_account_1, website_retail) are
 *      migrated onto the canonical vocabulary rather than orphaned
 *   3. an unknown channel is refused
 *   4. a marketplace order without a shop is refused
 *   5. a website order carrying a shop is refused
 *   6. an order whose shop belongs to a different marketplace is refused
 *   7. two shops can list the same SKU on the same marketplace
 *   8. two shops cannot claim the same external marketplace item
 *
 * Run: npm run rehearse:channel-vocabulary
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

const config = {
  binDir: path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin'),
  dataDir: path.join(rootDir, '.tools', 'map028-channel-pg-data'),
  logPath: path.join(rootDir, '.tools', 'map028-channel-pg.log'),
  port: 54328,
  database: 'k2_map028_channel_rehearsal',
}

function requireRuntime() {
  const names = ['initdb.exe', 'pg_ctl.exe', 'psql.exe', 'dropdb.exe', 'createdb.exe']
  const executables = Object.fromEntries(names.map((name) => [name, path.join(config.binDir, name)]))
  const missing = names.filter((name) => !fs.existsSync(executables[name]))
  if (missing.length > 0) throw new Error(`PORTABLE_POSTGRES_RUNTIME_MISSING: ${missing.join(', ')}`)
  return executables
}

function run(executable, args, label, env, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: rootDir, env, encoding: 'utf8', windowsHide: true, ...options,
  })
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.stdout || result.error?.message || 'unknown').trim()
    throw new Error(`${label} failed: ${detail}`)
  }
  return String(result.stdout || '').trim()
}

/**
 * The pre-migration world, including the legacy spellings.
 *
 * These rows exist so the migration's data mapping is actually exercised. A
 * rehearsal against empty tables would prove only that the DDL runs.
 */
const BOOTSTRAP = `
create extension if not exists pgcrypto with schema public;
create schema if not exists auth;
create table if not exists public.user_profiles (id uuid primary key, full_name text);
create table if not exists public.products (sku text primary key, name text);
insert into public.products(sku, name) values ('caffe-milano-gold', 'Caffe Milano')
  on conflict do nothing;

create table if not exists public.order_requests (
  id uuid primary key default gen_random_uuid(),
  channel_source text not null default 'website' check (channel_source in (
    'website', 'shopee', 'tiktok', 'lazada', 'pasabuy', 'manual'
  )),
  status text not null default 'submitted'
);

create table if not exists public.channel_listings (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku) on delete cascade,
  channel_source text not null,
  external_item_id text,
  status text not null default 'Active',
  constraint unique_sku_channel unique (sku, channel_source)
);

-- The three legacy spellings the migration has to reconcile.
insert into public.channel_listings(sku, channel_source, external_item_id) values
  ('caffe-milano-gold', 'tiktok_shop', 'TT-1'),
  ('caffe-milano-gold', 'shopee_account_1', 'SP-1'),
  ('caffe-milano-gold', 'website_retail', null);

insert into public.order_requests(channel_source) values ('website'), ('shopee');

create or replace function public.is_staff() returns boolean
  language sql stable as $$ select coalesce(current_setting('k2.staff', true), 'off') = 'on' $$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema public to anon, authenticated;
`

/** Two shops on one marketplace, which is the case the old schema could not hold. */
const SEED_SHOPS = `
insert into public.channel_shops (shop_code, channel_code, external_shop_id, display_name)
values ('shopee-01', 'shopee', '111', 'K2 Shopee Main'),
       ('shopee-02', 'shopee', '222', 'K2 Shopee Second'),
       ('lazada-01', 'lazada', '333', 'K2 Lazada Main')
on conflict (shop_code) do nothing;
`

const refuses = (name, body) => ({
  name,
  sql: `do $$ begin
      ${body}
      raise exception 'SHOULD_HAVE_BEEN_REFUSED';
    exception when others then
      if sqlerrm = 'SHOULD_HAVE_BEEN_REFUSED' then raise; end if;
    end $$;
    select 'refused';`,
  expect: 'refused',
})

const CHECKS = [
  {
    name: 'legacy tiktok_shop is migrated onto the canonical vocabulary',
    sql: `select coalesce(string_agg(distinct channel_source, ',' order by channel_source), 'none')
          from public.channel_listings;`,
    expect: 'shopee,tiktok,website',
  },
  {
    name: 'the canonical vocabulary is exactly the six sales channels',
    sql: `select string_agg(code, ',' order by code) from public.channels;`,
    expect: 'lazada,manual,pasabuy,shopee,tiktok,website',
  },
  {
    name: 'only marketplaces are flagged as carrying shops',
    sql: `select string_agg(code, ',' order by code) from public.channels where is_marketplace;`,
    expect: 'lazada,shopee,tiktok',
  },
  refuses('an unknown channel is refused',
    `insert into public.order_requests(channel_source) values ('tiktok_shop');`),
  refuses('a marketplace order without a shop is refused',
    `insert into public.order_requests(channel_source) values ('shopee');`),
  refuses('a website order carrying a shop is refused',
    `insert into public.order_requests(channel_source, shop_id)
     values ('website', (select id from public.channel_shops where shop_code = 'shopee-01'));`),
  refuses('an order whose shop belongs to another marketplace is refused',
    `insert into public.order_requests(channel_source, shop_id)
     values ('shopee', (select id from public.channel_shops where shop_code = 'lazada-01'));`),
  {
    name: 'a marketplace order naming its own shop is accepted',
    sql: `insert into public.order_requests(channel_source, shop_id)
          values ('shopee', (select id from public.channel_shops where shop_code = 'shopee-01'));
          select count(*)::text from public.order_requests where shop_id is not null;`,
    expect: '1',
  },
  {
    name: 'two shops can list the same SKU on the same marketplace',
    sql: `insert into public.channel_listings(sku, channel_source, shop_id, external_item_id)
          values ('caffe-milano-gold','shopee',(select id from public.channel_shops where shop_code='shopee-02'),'SP-2');
          select count(*)::text from public.channel_listings
          where sku='caffe-milano-gold' and channel_source='shopee';`,
    expect: '2',
  },
  refuses('two shops cannot claim the same external marketplace item',
    `insert into public.channel_listings(sku, channel_source, shop_id, external_item_id)
     values ('caffe-milano-gold','shopee',(select id from public.channel_shops where shop_code='shopee-02'),'SP-2');`),
  {
    name: 'the vocabulary is publicly readable but shops are not',
    sql: `set role anon;
      select case
        when (select count(*) from public.channels) = 6
         and not exists (select 1 from information_schema.role_table_grants
                         where grantee='anon' and table_name='channel_shops' and privilege_type='SELECT')
        then 'correct' else 'wrong' end;`,
    expect: 'correct',
  },
  {
    name: 'shop foreign keys have dedicated lookup and cascade indexes',
    sql: `select case
      when to_regclass('public.channel_shops_custodian_idx') is not null
       and to_regclass('public.channel_listings_shop_idx') is not null
      then 'indexed' else 'missing' end;`,
    expect: 'indexed',
  },
]

function main() {
  const executable = requireRuntime()
  const env = {
    ...process.env,
    PGHOST: '127.0.0.1', PGPORT: String(config.port),
    PGUSER: 'postgres', PGDATABASE: 'postgres',
  }
  let startedHere = false

  try {
    if (!fs.existsSync(path.join(config.dataDir, 'PG_VERSION'))) {
      fs.mkdirSync(config.dataDir, { recursive: true })
      run(executable['initdb.exe'],
        ['-D', config.dataDir, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'],
        'portable PostgreSQL initialization', env)
    }
    const status = spawnSync(executable['pg_ctl.exe'], ['-D', config.dataDir, 'status'], {
      cwd: rootDir, env, encoding: 'utf8', windowsHide: true,
    })
    if (status.status !== 0) {
      run(executable['pg_ctl.exe'],
        ['-D', config.dataDir, '-l', config.logPath,
          '-o', `-p ${config.port} -h 127.0.0.1`, '-w', 'start'],
        'portable PostgreSQL startup', env, { stdio: 'ignore' })
      startedHere = true
    }

    run(executable['dropdb.exe'], ['--if-exists', config.database], 'rehearsal database reset', env)
    run(executable['createdb.exe'], [config.database], 'rehearsal database creation', env)
    const dbEnv = { ...env, PGDATABASE: config.database }

    const psql = (sql, label) => run(
      executable['psql.exe'],
      ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql], label, dbEnv,
    )
    const psqlFile = (file, label) => run(
      executable['psql.exe'],
      ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-f', file], label, dbEnv,
    )

    psql(BOOTSTRAP, 'pre-migration bootstrap')

    const migration = path.join(rootDir, 'supabase', 'migrations', '20260829_channel_vocabulary_and_shops.sql')
    psqlFile(migration, 'channel vocabulary migration')
    console.log('[ok] migration applied over legacy data')
    psqlFile(migration, 'channel vocabulary replay')
    console.log('[ok] migration is idempotent on replay')

    psql(SEED_SHOPS, 'shop seed')

    let failures = 0
    for (const check of CHECKS) {
      const output = psql(check.sql, check.name)
      const actual = output.split('\n').map((line) => line.trim()).filter(Boolean).pop() || ''
      if (actual === check.expect) {
        console.log(`[ok] ${check.name}`)
      } else {
        failures += 1
        console.error(`[FAIL] ${check.name}: expected "${check.expect}", got "${actual}"`)
      }
    }

    if (failures > 0) {
      console.error(`\n${failures} of ${CHECKS.length} checks failed.`)
      process.exitCode = 1
      return
    }
    console.log(`\nAll ${CHECKS.length} checks passed against isolated PostgreSQL.`)
    console.log('This rehearses the migration. It is not a production apply.')
  } finally {
    if (startedHere) {
      spawnSync(executable['pg_ctl.exe'], ['-D', config.dataDir, '-w', 'stop'], {
        cwd: rootDir, env, encoding: 'utf8', windowsHide: true, stdio: 'ignore',
      })
    }
  }
}

main()
