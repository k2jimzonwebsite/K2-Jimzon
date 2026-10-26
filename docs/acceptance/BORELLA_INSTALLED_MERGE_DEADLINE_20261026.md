# Borella merge installation and live deadline refusal

MAP-023 / IDEA-20261025-04, 26 October 2026. The owner explicitly approved the
exact reviewed production schema installation and both Borella merges, retaining
45 Carne units on001017 and64 Prosciutto units on001020 with all records/history.

## Installed and verified

The approved source SHA
`d9f3ab51dbc62a76cdc14ebc168c32b4a6a8b8a1c228c55d539d31b25120cc8b`
and packet SHA
`2f2d74eb291eacee467493a88f827d870e5da6d0299f4851d84519cc9341a170`
were sent once through the reviewed exclusive-attempt executor to K2
`pixplcjqivlfflickobf`. Postflight verifies all six function body hashes and
owner/config/ACL metadata, exact20261025ledger/sourceSHA, Website event per-SKU
uniqueness, forced RLS/postgres-only table ACL, and identical full products/lots/
balances/listings/Website-event snapshots. The installer must never be replayed.

Fresh post-install encrypted backup
`current-pixplcjqivlfflickobf-2026-10-26T060903948Z-b69d1e297447` restored75public
relations and migration20261025 in an owned isolated database; its server stopped.
Managed Vault, Storage objects and provider settings remain outside this proof.

The readiness classifier originally refused the exact restored version because
it required14digits. The source migration uses8digits. Failing-first regression
and16passing checks now admit valid8digitdates or14digittimestamps while retaining
exact restored-version equality, real-date, backup identity/hash/bytes/chronology
checks. Independent review reports no Critical/Important findings. Actual fresh
readiness reports8verified/2owner/3connector/0blocked. No provider grant or version
was altered merely to satisfy readiness.

## Live merge has not applied

The signed Admin Carne preview shows all three250gBag records and its original
lot `11a96932-e75b-4597-b6a5-352cf00cfb73`, BOX H,45units. The owner-approved
decision and one exact saved-request retry both refused safely. Readback retains
all three Live/public Carne rows and the original45-unit lot. Prosciutto has not
been submitted. Public catalog remains120. Preserve the original saved Carne
request/key in browser recovery; do not replace it with a new decision.

Bounded read-only K2 PostgreSQL logs at06:14:53Z and06:15:42Z identify
`K2_CATEGORY_POLICY_DEADLINES_REQUIRED` from `lock_category_policy_v1`, called by
the private merge executor. The installed Product Master wrapper and private
executor have no lock_timeout setting. Earlier rehearsals supplied2s externally,
which masked the actual caller's zero lock timeout. No broader inference about
hosted Auth or all production behavior follows from the old synthetic passes.

## Prepared follow-up, approval pending

Set only `lock_timeout='2s'` on
`k2_private.execute_product_sku_merge_v1(jsonb,uuid)`. Retain the inherited caller
statement timeout and existing guard that refuses zero or more than10seconds.
Do not add a function statement_timeout, change function logic, permissions,
products, quantities or history, or replay the original installer.

The isolated regression reproduces the actual failure with callerlock0/statement8s.
With the function-local limit, the signed merge succeeds and retains all original
lot/audit/idempotency proofs. Statement0/11s refusals and caller-setting restoration
on refusal/retry pass. Final receipt:
`.tools/sku-merge-rehearsals/412804c6-6425-47f3-b95a-49e9de39b6ab/receipt.json`.
The exact metadata-only packet also passes a rollback rehearsal in the fresh
installed-schema restore with all four captured business-table hashes unchanged.

Its prepared packet SHA is
`62d7affae2896b779e71e368eca76836c35da5669b3de6d1994acf928149a329`.
It validates the exact installed private function body/owner/config/ACL before
altering the single setting and verifies bounded config/unchanged privileges
afterward. Independent review recommends this limited repair. A concrete owner
approval question is pending because the earlier exact-packet approval does not
cover a new packet. Do not apply until answered.

Private evidence under `.tools/duplicate-products-20261026/`:
`installation-attempt.json`, `installation-postflight.json`,
`borella-installed-restore-receipt.json`, `live-merge-errors.json`,
`carne-merged-readback.json` (despite its filename, shows no applied merge),
`merge-deadline-red.log`, `merge-deadline-final.log`,
`merge-lock-deadline-prepared.sql`/`.json`, `lock-deadline-local-proof.json`.
Logs API reference used for bounded read-only diagnosis:
[Supabase log queries](https://supabase.com/docs/guides/observability/advanced-log-filtering).

After approval, refresh identity/zero-failed readiness and exact packet hash,
apply the single setting once with durable attempt/reconciliation, then retry the
**same saved Carne request**. Verify original lots, audit and public one-card
state before previewing/submitting Prosciutto. Preserve all source records and
later business activity; no whole-database rewind, fake adjustment or lot recreation.
Overall duplicate consolidation is incomplete and remains active in MAP-023.
