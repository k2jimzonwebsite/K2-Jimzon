import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(new URL('../supabase/migrations/20260812_guest_account_identity_and_messaging.sql', import.meta.url), 'utf8')
const preflight = await readFile(new URL('../supabase/map019_identity_preflight.sql', import.meta.url), 'utf8')
const postflight = await readFile(new URL('../supabase/map019_identity_postflight.sql', import.meta.url), 'utf8')

for (const required of [
  'create table if not exists public.customers',
  'create table if not exists public.customer_contact_points',
  'create table if not exists public.customer_accounts',
  'create table if not exists public.channel_identities',
  'create table if not exists public.guest_access_grants',
  'create table if not exists public.guest_access_grant_scopes',
  'create table if not exists public.customer_claim_requests',
  'force row level security',
  'K2_GUEST_SCOPE_OWNER_MISMATCH',
  'K2_ACCOUNT_IDENTITY_CONFLICT',
  'customer_record_owned_by_current_user',
]) assert.equal(migration.includes(required), true, `Missing MAP-019 identity boundary: ${required}`)

assert.equal(/create policy[\s\S]*to anon/i.test(migration), false, 'Guest identity tables must not have anon policies')
assert.equal(/grant (insert|update|delete)[\s\S]*to authenticated/i.test(migration), false, 'Browser roles must not mutate identity tables directly')
assert.equal(/lower\([^)]*(email|phone|display_name)/i.test(migration), false, 'Migration must not silently merge identity by readable PII')
assert.equal(preflight.includes('MAP-019 identity preflight passed'), true)
assert.equal(postflight.includes('MAP-019 identity postflight passed'), true)

console.log('MAP-019 hybrid identity static contract passed (live behavior remains gated).')
