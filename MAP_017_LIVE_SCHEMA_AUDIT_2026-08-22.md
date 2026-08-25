# Schema-Truth Audit Report (MAP-017 phase-one contract subset)

> **Breadth correction, 22 August 2026:** this 21-finding report covers the
> original reviewed subset only (13 tables, 4 views, and 5 functions). The
> authoritative exhaustive exposed-object result is now
> `MAP_017_EXHAUSTIVE_AUTHORIZATION_AUDIT_2026-08-22.md`: 55 findings across all
> 42 public tables, 9 public views, 53 public functions, schema grants, and
> default privileges.

**Generated:** 2026-08-22T05:16:26.372Z
**Overall Status:** NON_CONFORMANT_CRITICAL
**Total Findings:** 21 (Critical: 13, High: 7)

## Executive Summary

- Tables audited: 13
- Views audited: 4
- Functions audited: 5
- Required migration entries audited: 4
- Storage buckets audited: 1

## Findings by Severity

| Severity | Issue Type | Target | Details |
| --- | --- | --- | --- |
| **CRITICAL** | `ANON_DML_GRANTED` | `public.brands` | Direct anonymous DML privileges granted on public.brands: INSERT, UPDATE, DELETE. |
| **CRITICAL** | `BLANKET_PUBLIC_WRITE_POLICY` | `public.brands.Admin Full Access` | Permissive public write policy detected on public.brands: "Admin Full Access" (ALL USING/WITH CHECK true). |
| **CRITICAL** | `ANON_DML_GRANTED` | `public.categories` | Direct anonymous DML privileges granted on public.categories: INSERT, UPDATE, DELETE. |
| **CRITICAL** | `BLANKET_PUBLIC_WRITE_POLICY` | `public.categories.Admin Full Access` | Permissive public write policy detected on public.categories: "Admin Full Access" (ALL USING/WITH CHECK true). |
| **CRITICAL** | `ANON_DML_GRANTED` | `public.warehouses` | Direct anonymous DML privileges granted on public.warehouses: INSERT, UPDATE, DELETE. |
| **CRITICAL** | `BLANKET_PUBLIC_WRITE_POLICY` | `public.warehouses.Admin Full Access` | Permissive public write policy detected on public.warehouses: "Admin Full Access" (ALL USING/WITH CHECK true). |
| **CRITICAL** | `ANON_DML_GRANTED` | `public.product_drafts` | Direct anonymous DML privileges granted on public.product_drafts: INSERT, UPDATE, DELETE. |
| **CRITICAL** | `BLANKET_AUTHENTICATED_WRITE_POLICY` | `public.product_drafts.Staff manage product_drafts` | Permissive authenticated write policy without staff scoping on public.product_drafts: "Staff manage product_drafts" (ALL USING/WITH CHECK true). |
| **CRITICAL** | `ANON_DML_GRANTED` | `public.products_old` | Direct anonymous DML privileges granted on public.products_old: INSERT, UPDATE, DELETE. |
| **CRITICAL** | `BLANKET_PUBLIC_WRITE_POLICY` | `public.products_old.Admins manage products` | Permissive public write policy detected on public.products_old: "Admins manage products" (ALL USING/WITH CHECK true). |
| **HIGH** | `VIEW_ANON_ACCESS_GRANTED` | `public.v_channel_catalog_readiness` | Operational view public.v_channel_catalog_readiness is directly selectable by an anonymous/public role. |
| **HIGH** | `VIEW_ANON_ACCESS_GRANTED` | `public.v_expiring_batches` | Operational view public.v_expiring_batches is directly selectable by an anonymous/public role. |
| **MEDIUM** | `VIEW_ANON_ACCESS_MISSING` | `public.v_product_stock_from_batches` | Reviewed public view public.v_product_stock_from_batches lacks its expected anonymous SELECT grant. |
| **HIGH** | `FUNCTION_MISSING` | `public.get_public_product_stock()` | Required authorization function public.get_public_product_stock() is not present in the schema export. |
| **HIGH** | `STORAGE_LIMIT_MISSING` | `storage.buckets.product-images` | Storage bucket "product-images" lacks enforced max file size limit (expected <= 10485760 bytes, got null). |
| **HIGH** | `STORAGE_MIME_ALLOWLIST_MISSING` | `storage.buckets.product-images` | Storage bucket "product-images" has no allowed MIME type restriction. |
| **CRITICAL** | `STORAGE_PUBLIC_WRITE_POLICY` | `storage.objects.Anyone can delete` | Legacy permissive write policy "Anyone can delete" present on storage bucket "product-images". |
| **CRITICAL** | `STORAGE_PUBLIC_WRITE_POLICY` | `storage.objects.Anyone can update` | Legacy permissive write policy "Anyone can update" present on storage bucket "product-images". |
| **CRITICAL** | `STORAGE_PUBLIC_WRITE_POLICY` | `storage.objects.Anyone can upload` | Legacy permissive write policy "Anyone can upload" present on storage bucket "product-images". |
| **HIGH** | `REALTIME_EXCLUDED_TABLE_PRESENT` | `supabase_realtime.products_old` | Legacy table public.products_old is published in supabase_realtime publication. |
| **HIGH** | `MIGRATION_LEDGER_ENTRY_MISSING` | `20260812_map017_public_write_boundary_hardening` | Required migration ledger entry 20260812_map017_public_write_boundary_hardening is absent from the supplied export. |

---
*No credentials, tokens, or private data were printed or stored in this audit.*

[Schema Truth Source: redacted local metadata export; no row data or credentials]

## Audit correction and remediation validation

Codex independently found that the earlier `public.messages` critical finding
was false: the matching anonymous grants belong to `realtime.messages`, not
`public.messages`. The comparator now qualifies grants and policies by schema,
with a regression covering same-name relations in `public`, `realtime`, and a
private schema. This reduces the verified critical count from 14 to 13.

The same review found that the prepared migration did not actually repair the
missing public stock read it was documented to fix. The migration now provides a
fixed-search-path `SECURITY DEFINER` function exposing only SKU and aggregate
stock for `Live`, `Active`, or `Unlisted` products, behind the existing
`security_invoker` view. Anonymous callers receive no direct access to
`product_batches`; Draft stock is excluded.

The corrected migration passed an isolated PostgreSQL 17 lifecycle covering
preflight, rollback restoration, apply, anonymous/customer/staff behavior,
Storage and Realtime boundaries, Draft-stock non-disclosure, and idempotent
replay. It also passed against the live schema inside an explicit transaction
that ended in `ROLLBACK`; an anonymous stock read succeeded inside the
transaction and 9/9 baseline restoration checks passed afterward. No production
DDL was committed.
