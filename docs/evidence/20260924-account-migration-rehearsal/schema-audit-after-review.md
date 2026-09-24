EXPLICIT_SCHEMA_EXPORT_AUDIT
This result compares the supplied metadata export only; verify the export provenance and capture time before treating it as database evidence.

# Schema-Truth Audit Report (MAP-017)

**Generated:** 2026-09-24T09:09:54.703Z
**Overall Status:** NON_CONFORMANT_CRITICAL
**Total Findings:** 13 (Critical: 13, High: 0)

## Executive Summary

- Tables audited: 13
- Views audited: 4
- Functions audited: 5
- Required migration entries audited: 4
- Storage buckets audited: 1
- Exhaustive public tables audited: 42
- Exhaustive public views audited: 9
- Exhaustive public functions audited: 61
- Schema grants audited: 15
- Default privileges audited: 96

## Findings by Severity

| Severity | Issue Type | Target | Details |
| --- | --- | --- | --- |
| **CRITICAL** | `FUNCTION_PUBLIC_EXECUTE_GRANTED` | `public.get_public_product_stock()` | Function public.get_public_product_stock() retains PostgreSQL PUBLIC execute instead of an exact role grant. |
| **CRITICAL** | `FUNCTION_ANON_EXECUTE_UNREVIEWED` | `public.get_storefront_chat_v1(uuid)` | Unlisted function public.get_storefront_chat_v1(uuid) is directly executable by anonymous callers. |
| **CRITICAL** | `FUNCTION_ANON_EXECUTE_UNREVIEWED` | `public.validate_coupon(text, numeric)` | Unlisted function public.validate_coupon(text, numeric) is directly executable by anonymous callers. |
| **CRITICAL** | `FUNCTION_ANON_EXECUTE_UNREVIEWED` | `public.submit_storefront_chat_v1(text, text, text, uuid, text)` | Unlisted function public.submit_storefront_chat_v1(text, text, text, uuid, text) is directly executable by anonymous callers. |
| **CRITICAL** | `FUNCTION_ANON_EXECUTE_UNREVIEWED` | `public.submit_order_request(text, text, text, text, text, text, jsonb, text)` | Unlisted function public.submit_order_request(text, text, text, text, text, text, jsonb, text) is directly executable by anonymous callers. |
| **CRITICAL** | `FUNCTION_ANON_EXECUTE_UNREVIEWED` | `public.submit_pasabuy_request(text, text, text, text, text, integer, numeric, text, boolean, text)` | Unlisted function public.submit_pasabuy_request(text, text, text, text, text, integer, numeric, text, boolean, text) is directly executable by anonymous callers. |
| **CRITICAL** | `FUNCTION_ANON_EXECUTE_UNREVIEWED` | `public.submit_order_request_v2(text, text, text, text, text, text, jsonb, text, text, numeric, text)` | Unlisted function public.submit_order_request_v2(text, text, text, text, text, text, jsonb, text, text, numeric, text) is directly executable by anonymous callers. |
| **CRITICAL** | `UNSAFE_DEFAULT_PRIVILEGE` | `public.supabase_admin.anon.FUNCTION` | Default privileges automatically grant EXECUTE on future FUNCTION objects in public to anon. |
| **CRITICAL** | `UNSAFE_DEFAULT_PRIVILEGE` | `public.supabase_admin.authenticated.FUNCTION` | Default privileges automatically grant EXECUTE on future FUNCTION objects in public to authenticated. |
| **CRITICAL** | `UNSAFE_DEFAULT_PRIVILEGE` | `public.supabase_admin.anon.TABLE` | Default privileges automatically grant DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE on future TABLE objects in public to anon. |
| **CRITICAL** | `UNSAFE_DEFAULT_PRIVILEGE` | `public.supabase_admin.authenticated.TABLE` | Default privileges automatically grant DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE on future TABLE objects in public to authenticated. |
| **CRITICAL** | `UNSAFE_DEFAULT_PRIVILEGE` | `public.supabase_admin.anon.SEQUENCE` | Default privileges automatically grant UPDATE, USAGE on future SEQUENCE objects in public to anon. |
| **CRITICAL** | `UNSAFE_DEFAULT_PRIVILEGE` | `public.supabase_admin.authenticated.SEQUENCE` | Default privileges automatically grant UPDATE, USAGE on future SEQUENCE objects in public to authenticated. |

---
*No credentials, tokens, or private data were printed or stored in this audit.*

[Schema Truth Source: file: .tools/account-rehearsal-live-schema-20260924.json]