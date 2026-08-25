import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const migration = readFileSync(
  new URL("../supabase/migrations/20260812_map017_public_write_boundary_hardening.sql", import.meta.url),
  "utf8",
)
const preflight = readFileSync(
  new URL("../supabase/map017_public_write_boundary_preflight.sql", import.meta.url),
  "utf8",
)
const postflight = readFileSync(
  new URL("../supabase/map017_public_write_boundary_postflight.sql", import.meta.url),
  "utf8",
)

for (const relation of [
  "brands",
  "categories",
  "warehouses",
  "product_drafts",
  "products_old",
  "channel_credentials",
  "staff_allocations",
]) {
  assert.match(migration, new RegExp(`revoke all on table public\\.${relation} from anon, authenticated`))
  assert.match(postflight, new RegExp(`'${relation}'`))
}

assert.match(migration, /create policy product_drafts_staff_manage[\s\S]+public\.is_staff\(\)/)
assert.match(migration, /revoke all on table public\.products_old from anon, authenticated/)
assert.match(migration, /create or replace function public\.get_public_product_stock\(\)/)
assert.match(migration, /security definer\s+set search_path = ''/i)
assert.match(migration, /grant execute on function public\.get_public_product_stock\(\) to anon, authenticated/)
assert.match(migration, /grant select on table public\.v_product_stock_from_batches to anon, authenticated/)
assert.match(migration, /where p\.status in \('Live', 'Active', 'Unlisted'\)/)
assert.doesNotMatch(migration, /create policy[\s\S]{0,160}for (?:all|insert|update|delete) to (?:public|anon)[\s\S]{0,120}(?:using|with check) \(true\)/i)
assert.match(preflight, /ready_to_apply/)
assert.match(preflight, /security_invoker=true/)
assert.match(postflight, /anon DML remains/)
assert.match(postflight, /unsafe public default privileges remain/)
assert.match(postflight, /legacy products_old remains exposed/)
assert.match(postflight, /public stock projection boundary is incorrect/)
assert.match(postflight, /public stock projection function is not hardened/)
assert.match(migration, /drop policy if exists "Anyone can upload" on storage\.objects/)
assert.match(migration, /file_size_limit = 10485760/)
assert.match(migration, /'image\/jpeg', 'image\/png', 'image\/webp', 'image\/avif'/)
assert.match(migration, /alter publication supabase_realtime drop table public\.products_old/)
assert.match(postflight, /legacy public Storage write policy remains/)

console.log("MAP-017 public-boundary artifact checks passed; this is not live DDL proof.")
