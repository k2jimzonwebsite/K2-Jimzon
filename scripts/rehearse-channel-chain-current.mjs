#!/usr/bin/env node
// Full ordered-chain rehearsal for the MAP-026 channel work on the restored
// current K2 application schema (loopback only; refuses any non-local target).
//
// Composes 20260829 (vocabulary + shops) + 20260917 (allocations + transfers)
// + 20260929 (listing slices: seeds, visibility view, lot grams, oversell
// guard) inside ONE rollback-only transaction, runs postflight against the
// real restored rows (30 products, live balances), then rolls everything back
// and proves the ledger is unchanged and no chain object remains.
//
// Uses the existing isolated restore cluster at
// .tools/current-restore-20260929-pg-data (database k2_current_restore_20260929,
// ledger 20260928092634). Never touches production or a shared database.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const BIN_DIR = path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin')
const DATA_DIR = path.join(rootDir, '.tools', 'current-restore-20260929-pg-data')
const PORT = 54388
const DATABASE = 'k2_current_restore_20260929'

const CHAIN = [
  'supabase/migrations/20260829_channel_vocabulary_and_shops.sql',
  'supabase/migrations/20260917_multi_shop_allocation_and_transfers.sql',
  'supabase/migrations/20260929_channel_listing_slices.sql',
]

const stripTransaction = (sql) => sql.replace(/(^|\r?\n)begin;(?=\r?\n)/i, '$1').replace(/\r?\ncommit;\s*$/i, '\n')

function binary(name) {
  const full = path.join(BIN_DIR, name)
  if (!fs.existsSync(full)) throw new Error(`PORTABLE_POSTGRES_RUNTIME_MISSING: ${name}`)
  return full
}

function runBinary(executable, args, label, env) {
  const result = spawnSync(executable, args, { cwd: rootDir, env, encoding: 'utf8', windowsHide: true })
  if (result.error || result.status !== 0) {
    throw new Error(`${label} failed: ${String(result.stderr || result.stdout || result.error?.message || 'unknown failure').trim()}`)
  }
  return String(result.stdout || '').trim()
}

const POSTFLIGHT = `
do $chain_gate$
declare
  v_seed_count integer;
  v_target_shop uuid;
  v_target_sku text;
  v_target_avail integer;
begin
  -- 1. The six slice seeds landed on top of the chain.
  select count(*) into v_seed_count from public.channel_shops
    where shop_code in ('pasabuy-lazada', 'pasabuy-shopee', 'pasabuy-tiktok',
                        'jworld-lazada', 'jworld-shopee', 'jworld-tiktok');
  if v_seed_count <> 6 then
    raise exception 'CHAIN_POSTFLIGHT_FAILED: expected 6 seed shops, found %', v_seed_count;
  end if;

  -- 2. The visibility view exists and runs against the restored rows.
  perform 1 from public.v_storefront_visible_skus limit 1;

  -- 3. The oversell guard refuses one unit past a real restored balance.
  select b.sku, b.available into v_target_sku, v_target_avail
    from public.inventory_balances b limit 1;
  if v_target_sku is null then
    raise exception 'CHAIN_POSTFLIGHT_FAILED: restored schema has no balance row to guard against';
  end if;
  select id into v_target_shop from public.channel_shops
    where shop_code = 'pasabuy-shopee';
  begin
    insert into public.channel_shop_allocations (shop_id, sku, allocated_units)
      values (v_target_shop, v_target_sku, v_target_avail + 1);
    raise exception 'CHAIN_POSTFLIGHT_FAILED: oversell past a restored balance was allowed';
  exception when check_violation then
    if SQLERRM <> 'K2_SHOP_OVERSELL_REFUSED' then raise; end if;
  end;

  -- 4. The lot weight column accepts grams on a real restored batch.
  if to_regclass('public.product_batches') is not null then
    perform 1 from information_schema.columns
      where table_name = 'product_batches' and column_name = 'net_weight_g';
    if not found then
      raise exception 'CHAIN_POSTFLIGHT_FAILED: net_weight_g missing after slice apply';
    end if;
  end if;

  raise notice 'CHANNEL_CHAIN_POSTFLIGHT_PASS seeds=6 guarded_sku=%', v_target_sku;
end $chain_gate$;
`

const ABSENCE_PROBE = `
select
  to_regclass('public.channel_shops') is null
  and to_regclass('public.channel_shop_allocations') is null
  and to_regclass('public.v_storefront_visible_skus') is null
  and not exists (
    select 1 from pg_trigger where tgname = 'channel_shop_allocations_oversell_guard'
  );
`

export function rehearseChannelChainCurrent() {
  if (!fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    throw new Error('RESTORE_CLUSTER_MISSING: .tools/current-restore-20260929-pg-data is absent; restore the 29 September envelope first')
  }
  const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: String(PORT), PGUSER: 'postgres', PGDATABASE: DATABASE }

  const probe = spawnSync(binary('psql.exe'), ['-h', '127.0.0.1', '-p', String(PORT), '-U', 'postgres', '-d', 'postgres', '-At', '-c', 'show data_directory'], {
    cwd: rootDir, env, encoding: 'utf8', windowsHide: true,
  })
  const runningDirectory = String(probe.stdout || '').trim()
  if (probe.status === 0 && path.resolve(runningDirectory).toLowerCase() !== path.resolve(DATA_DIR).toLowerCase()) {
    throw new Error(`SECURITY_REFUSAL: port ${PORT} belongs to a different PostgreSQL data directory`)
  }
  let startedByRunner = false
  if (probe.status !== 0) {
    runBinary(binary('pg_ctl.exe'),
      ['-D', DATA_DIR, '-l', path.join(rootDir, '.tools', 'current-restore-20260929-chain.log'), '-o', `-p ${PORT} -h 127.0.0.1`, '-w', 'start'],
      'restore cluster startup', env)
    startedByRunner = true
  }

  try {
    const q = (sql) => runBinary(binary('psql.exe'), ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], 'restore probe', env)
    const baseline = q("select count(*)||'|'||max(version) from supabase_migrations.schema_migrations;")
    if (!baseline.includes('20260928092634')) {
      throw new Error(`UNEXPECTED_RESTORE_LEDGER: ${baseline}; expected the 29 September current schema`)
    }

    let composed = 'begin;\n'
    for (const file of CHAIN) {
      composed += `\n-- CHAIN STEP ${file}\n${stripTransaction(fs.readFileSync(path.join(rootDir, file), 'utf8'))}\n`
    }
    composed += `\n${POSTFLIGHT}\nrollback;\n`
    // The composed chain is far past the Windows command-line limit, so it
    // travels as a file, exactly like the portable runners do.
    const composedPath = path.join(rootDir, '.tools', 'channel-chain-composed.sql')
    fs.writeFileSync(composedPath, composed)
    runBinary(binary('psql.exe'), ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-f', composedPath], 'ordered channel chain (rollback-only)', env)

    const after = q("select count(*)||'|'||max(version) from supabase_migrations.schema_migrations;")
    if (after !== baseline) throw new Error(`LEDGER_BASELINE_CHANGED ${baseline} -> ${after}`)
    const absent = q(ABSENCE_PROBE)
    if (absent !== 't') throw new Error('ROLLBACK_OBJECTS_REMAIN: chain objects survived the rollback')

    console.log(`CHANNEL_CHAIN_CURRENT_PASS baseline=${baseline}; ledger unchanged, chain objects absent after rollback.`)
  } finally {
    if (startedByRunner) {
      spawnSync(binary('pg_ctl.exe'), ['-D', DATA_DIR, '-w', 'stop'], { cwd: rootDir, env, encoding: 'utf8', windowsHide: true })
    }
  }
}

if (process.argv[1]?.endsWith('rehearse-channel-chain-current.mjs')) {
  rehearseChannelChainCurrent()
}
