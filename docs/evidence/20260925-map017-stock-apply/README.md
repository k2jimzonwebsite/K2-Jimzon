# MAP-017 scoped stock permission apply — 25 September 2026

## Request and decision

The owner first deferred the prepared stock correction, then reopened it with “bro fix it.” The owner explicitly authorized uploading the encrypted backup to the `K2 Production Backups` folder under `k2jimzonwebsite@gmail.com`, then separately authorized its redacted manifest and restore receipt. The earlier automatic approval-review rejections were resolved by those explicit permissions. Only the scoped stock permission correction was applied; MAP-017 is still active.

## Exact change and recovery

- Source: `supabase/migrations/20260925_map017_stock_public_grant_revocation.sql`, SHA-256 `479BCCE8AFE8EEA68B7C89F85370F5EE06FC28268ADC7DF9BC155D236E88A94D`.
- Effect: revoke `EXECUTE` on `public.get_public_product_stock()` from PostgreSQL `PUBLIC`; preserve explicit `anon` and `authenticated` grants and function logic.
- Production migration ledger: `20260925111537` / `map017_stock_public_grant_revocation_20260925`; Supabase apply returned success and a separate migration-list read confirmed the ledger.
- Emergency-only rollback: `supabase/migrations/20260925_map017_stock_public_grant_revocation_rollback.sql`, SHA-256 `61A929C103298F43DB96E819EF1C6E3E8DCBE7DEF61EAEC8161CBB26B6B5C470`. Use only after diagnosing a failed public stock read; check named grants first. The exact apply and rollback passed on a disposable isolated restore before production apply.

## Backup

Encrypted application-database backup ID `current-pixplcjqivlfflickobf-2026-09-25T100842718Z-dde4432c4355`, local ignored path `.tools/map017-stock-liveapply-20260925.k2backup`, 825,060 bytes, SHA-256 `DDE4432C4355A6462D52A8FBDC875A71EB7831298270EEB5CD9C21C5DBA99F9B`. Isolated restore had 51 public relations and baseline migration `20260921033348`; 21 stock rows were preserved by migration and rollback. The disposable database was removed.

The owner-only unshared Google Drive folder is `1mQuU8Jj6eWhDr-lpZV3YJDtaEwfAh8yo`. Its encrypted envelope file is `1iPIOt0Z-sd8g4a3g4zhJj5VGgwKHOb3M`; redacted manifest `1KuzmSauVKJrLGltQUAgZR39c48CVnbkS`; restore receipt `1xJFze343q47tGBrRyNZqfn8mYFsHxMe6`. All three metadata readbacks matched folder parent, owner, unshared state and size. Independent raw download of the envelope matched its local SHA-256. Independent raw reads of the two companions parsed the expected backup ID, hash and `restoreVerified=true`.

The application-schema restore excludes ten managed Vault entries, Storage objects and provider settings. It proves this database backup and scoped SQL rehearsal, not whole-project disaster recovery or owner-held recovery access.

## Production verification

- Preflight: function owned by `postgres`; `PUBLIC`, named `anon` and named `authenticated` execute were all present; stock function returned 21 rows. Public REST RPC returned HTTP 200/21 rows; canonical catalog HTTP GET returned 200.
- Postflight independent SQL: `public_execute=false`, `anon_named_execute=true`, `authenticated_named_execute=true`, owner `postgres`, 21 stock rows. Repository `supabase/map017_stock_public_grant_verification.sql` returned `stock_public_execute_absent=true`.
- Public REST RPC still returned HTTP 200/21 rows. Canonical `https://www.k2jimzon.com/catalog` still returned HTTP 200; rendered browser catalog displayed 22 products with availability, including Pringles 30 and Barilla Spaghetti 120.
- Fresh production metadata export at ignored `.tools/map017-live-schema-after-stock-20260925.json` reported 99 tables, 12 views, 162 functions, 132 grants, 96 defaults and 9 migrations. The linked audit report shows 12 critical and 0 high, down from 13 critical before apply.

No storefront/Admin code or production build was deployed for this database-only change. Public stock remained readable, so the emergency rollback was not used.

## Next action

MAP-017 owns six remaining transitional direct guest RPC grants and six `supabase_admin` default-privilege groups. Prove signed guest preview continuity and managed-role behavior before a guest grant cutover; follow up the pending Supabase support answer for provider-owned defaults. Do not treat the stock correction as closure of MAP-017.
