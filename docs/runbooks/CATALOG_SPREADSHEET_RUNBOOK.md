# Controlled Catalog Spreadsheet Runbook

**Template version:** `k2-catalog-v1`  
**Current state:** prepared locally behind the disabled Admin BFF; export,
preview, signed commit, durable status, and redacted result report are present.
The database migrations and rollback are rehearsed on isolated PostgreSQL 17;
no spreadsheet boundary is live.

## Purpose and boundary

The workbook is an Excel-compatible CSV bulk editor for approved product
metadata. It is not a database export, backup, stock ledger, publication tool,
or price authority. Customer/payment data, credentials, private evidence,
audit internals, prices, publication state, stock, reservations, lots, expiry,
location, custody, order state, and immutable events are excluded.

The fixed launch bounds are 512 KiB, 1,000 product rows, and 4,000 characters
per cell. The server never evaluates formulas, macros, links, or embedded
content. Formula-like imported text beginning with `=`, `+`, `-`, `@`, tab, or
carriage return is rejected; equivalent exported text is prefixed with an
apostrophe so common spreadsheet programs keep it as text.

## Versioned field dictionary

Protected columns are exported for identity, provenance, and optimistic
concurrency. Staff must not edit them for existing products:

| Column | Meaning |
| --- | --- |
| `template_version` | Must equal `k2-catalog-v1`. |
| `export_operation_id` | Unique export operation identifier. |
| `exported_at` | UTC export time. |
| `catalog_id` | Immutable internal product identity. Blank only for a new Draft. |
| `sku` | Stable product SKU; immutable once the product exists. |
| `record_version` | Monotonic product version checked before an update. |
| `updated_at` | Exact UTC row timestamp checked with the record version. |

Allowlisted editable metadata:

`name`, `description`, `usage_instructions`, `storage_instructions`,
`ingredients`, `allergens`, `country_of_origin`, `net_weight`, `package_type`,
`subcategory`, `seo_keywords`, `primary_image_url`, `product_video_url`, and
`internal_notes`.

## Review outcomes

Every uploaded row is assigned exactly one outcome: `New`, `Changed`,
`Unchanged`, `Invalid`, `Protected/Ignored`, `Duplicate`, or
`Stale/Conflict`. Changed rows expose exact before/after metadata. New rows may
only become unpublished Drafts and do not create stock. A version or timestamp
mismatch blocks the row rather than overwriting a concurrent edit.

The local UI provides a keyboard-focusable outcome list and phone-readable
cards with 44px controls. Staff explicitly select only New/Changed rows, enter a
10–500 character reason, and acknowledge the consequences. The server re-hashes
and re-previews the file at commit time. Each signed request commits at most 50
rows as one atomic transaction; stale identity/version/timestamp truth aborts
the whole chunk. The same operation key safely recovers an ambiguous retry.
Private operation and immutable row-event records provide durable chunk status;
the UI can reconcile that status after interruption and download only a redacted
row/SKU/outcome/version/timestamp report. New rows receive a server-generated K2
SKU and remain unpublished Drafts. The coordinated migration revokes direct
authenticated product mutations.

## Verification

- `tests/catalog-spreadsheet-contract.spec.js` covers fixed columns, BOM/CSV
  behavior, leading-zero SKU preservation, quoted/newline text, formula
  neutralization, change/stale/duplicate/protected classification, and Draft-
  only new rows.
- `tests/admin-bff-contract.spec.js` fixes the exact 50-route allowlist and
  route-control counts.
- `supabase/tests/catalog_spreadsheet_rehearsal_bootstrap.sql` recreates the
  relevant production PostgreSQL types and security boundary without data.
- `supabase/tests/catalog_spreadsheet_rehearsal_assertions.sql` executes new
  Draft/server-SKU, successful versioned update, numeric weight, replay,
  changed-payload conflict, durable status, stale-conflict atomicity,
  out-of-order chunk and AAL1 denial, immutable evidence, and direct-write
  denial assertions.
- `npm run rehearse:catalog-spreadsheet` is the fail-closed CI/local executor.
  It accepts loopback PostgreSQL only and requires a database name with the
  `k2_catalog_rehearsal` prefix; CI supplies a disposable PostgreSQL 17 service.
- The security-surface inventory must report zero route-control gaps and zero
  unexpected `PUBLIC` function grants.
- A successful Admin production build proves only local source/artifact
  integrity. It does not prove that the migration, BFF, or endpoint is deployed.

## Remaining activation work

The isolated PostgreSQL 17.11 rehearsal proves migration syntax, new Draft and
server SKU creation, successful versioned update, numeric weight storage,
replay, changed-payload conflict, durable recovery status, stale-conflict
atomic rollback, out-of-order chunk and AAL1 denial, event preservation,
direct-write revocation, and the non-destructive emergency rollback. The
portable runtime lives only in
ignored `.tools`; its archive SHA-256 is
`6EABDF00D2893713B75DB4336A23C3FDF505F056E217EC6E2E95D901750CFEA3`.

Still prove concurrent-worker behavior plus the full role/CSRF/origin denial
matrix against the real boundary; run Excel and an alternate-editor
round trip; activate only in coordinated deployment; verify deployed denials;
and record staff acceptance. Production Supabase was inspected read-only and
was not modified. Inventory workbooks remain a separate later command path
through canonical lot reconciliation.
