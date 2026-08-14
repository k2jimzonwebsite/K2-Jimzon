# Live Supabase Security Audit — 11 August 2026

This is a read-only provider evidence snapshot, not a migration or competing
backlog. Remediation remains in MAP-016/MAP-017 of `MASTER_ACTION_PLAN.md`.

## Evidence source and boundary

- Project: `K2jimzon` (`pixplcjqivlfflickobf`), status `ACTIVE_HEALTHY`
- Region: `ap-southeast-1`; PostgreSQL 17
- Evidence: connected Supabase management API, database catalogs, security
  advisors, and the available 24-hour log window
- No DDL, policy, data, Auth, key, or provider-setting change was made during
  this audit.
- The log response is a limited window/sample and cannot prove that an exposed
  credential was never used.

## Live summary

| Control | Live result |
| --- | ---: |
| Public tables | 42 |
| Tables without RLS | 0 |
| RLS tables without a policy | 2 |
| Tables carrying anon DML grants | 6 |
| Public views | 9 |
| Anon-selectable views | 2 |
| `SECURITY DEFINER` functions | 44 |
| Anon-executable `SECURITY DEFINER` functions | 4 |
| Authenticated-executable `SECURITY DEFINER` functions | 32 |
| Recorded live migrations | 3 |

The three recorded migrations are `operations_hardening_20260809`,
`security_boundary_hardening_20260810`, and
`deprecated_rpc_lockdown_20260810`. Other local migration files are not proven
applied.

## Confirmed high-priority gaps

1. `brands` and `categories` each have a public `ALL USING (true)` policy in
   addition to their intended public-read policy. Their anon role also carries
   insert/update/delete grants.
2. `warehouses` has a public `ALL USING (true)` policy and anon DML grants.
3. `products_old` has public full management through a public `ALL` policy and
   anon DML grants. It is a legacy table and must not remain an alternate product
   write path.
4. `product_drafts` allows every authenticated user to manage every draft via
   `USING (true)` / `WITH CHECK (true)`; it is not staff-scoped.
5. `channel_credentials` and `staff_allocations` have RLS enabled but no
   policies. This is fail-closed today, but their intended server/staff boundary
   must be explicit and tested.
6. `v_channel_catalog_readiness` and `v_expiring_batches` are anon-selectable
   operational views. View ownership/security-invoker behavior and underlying
   RLS must be fixed before access is granted.
7. Four intentionally customer-facing functions are anon executable:
   `submit_order_request`, `submit_order_request_v2`,
   `submit_pasabuy_request`, and `validate_coupon`. Hybrid guest commerce needs
   public submission, but these require server validation, abuse controls,
   minimal non-enumerating results, and idempotency proof rather than blanket
   trust.
8. Many staff `SECURITY DEFINER` functions are callable by the authenticated
   role. Most contain an `is_staff()` or `is_admin()` guard, but grants, exact
   guard semantics, ownership checks, fixed search paths, AAL2 requirements,
   and negative tests are not yet proven as one consistent boundary.
9. The public `product-images` bucket has three legacy public policies named
   `Anyone can upload`, `Anyone can update`, and `Anyone can delete`. Because
   policies are permissive, these defeat the newer staff-only write policies.
   The bucket has neither a server file-size limit nor a MIME allowlist.
10. `products_old` and `product_drafts` are both in the Realtime publication.
    Realtime observes RLS, but the legacy table must leave the publication and
    draft access must remain staff-scoped.

## Recent provider log evidence

- The returned API sample contains public product, review, globe-product, and
  realtime reads from a mobile/Facebook in-app browser.
- The returned Auth and Edge Function log sets were empty.
- No key values were printed or stored in this audit.
- This evidence does not replace the Supabase dashboard key-activity review and
  disablement required by incident `SEC-20260811-001`.

## Required verification before any migration

The next SQL must be generated from the live catalog above, be idempotent, and
include a read-only preflight plus postflight assertions. It must preserve only
the intended public catalog reads and hybrid guest submission entry points,
remove alternate public write paths, make operational views security-invoker or
private, and test anon/customer/staff/admin denial and success cases. It must not
reuse the incompatible 1,800-line migration or assume a local table/column exists.

The prepared phase-1 preflight was run read-only after this inventory and
returned `ready_to_apply = true`, no missing relations, `is_staff()` present,
and both required staff views already configured with
`security_invoker=true`. The matching migration remains local and unapplied
until MAP-016 provider-key disablement is recorded. The migration also removes
the three legacy public Storage write policies, sets a 10 MiB image limit and a
JPEG/PNG/WebP/AVIF allowlist, and removes `products_old` from Realtime.

On 12 August the exact migration and postflight were executed in one explicit
transaction followed by `ROLLBACK`. Every postflight assertion passed, and a
separate query proved the original grants/policies, bucket null limits, and
Realtime membership were restored. This proves live compatibility and rollback,
not permanent remediation. Full evidence is in
`MAP_017_ROLLBACK_VALIDATION_2026-08-12.md`.

Advisor references: [RLS enabled with no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[anon-executable security definer](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), and
[authenticated-executable security definer](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
