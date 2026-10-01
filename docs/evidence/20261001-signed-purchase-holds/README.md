# Current canonical writer and signed purchase holds — 1 October 2026

IDEA-20261001-06; owning MAP-023, with MAP-017/020 installation and recovery
dependencies. Branch `codex/map017-guest-chat-preview`. Prepared and locally
verified only; no provider SQL, data, configuration, push or deployment changed.
Dedicated account access was already verified in
`../20261001-provider-account-access/README.md`; no resource transfer was needed.

The earlier stock witness accepted two actual signed requests for one unit with
zero holds. The full purchase-hold migration then refused the restored canonical
writer because it expected the absent 9-argument signature. Current K2 has the
11-argument writer with shipping and one linked conversation seed. Replacing it
with the older body would discard that behavior.

The unapplied `20260902_purchase_time_reservation.sql` now supports exactly one
reviewed current or legacy overload. Its current-writer branch checks security
metadata and unique insertion anchors, retains the captured definition, inserts
Website eligibility and the existing FEFO purchase hold, and verifies the result
and unchanged owner, ACL, search path, definer, return type and defaults. Replay
retains the definition; missing, ambiguous or unfamiliar targets refuse. The
legacy branch retains its original body and creates no second overload. Direct
canonical ACLs remain unchanged; their coordinated retirement stays in MAP-017.

Both the current canonical writer and prepared signed entry point acquire the
same idempotency advisory key before inventory locks. Website eligibility retains
the balance-before-product/listing order from IDEA-20261001-05. Continuity checks
also exposed a swallowed shipping update error: a disposable diagnostic body
rethrow proved `column reference "subtotal" is ambiguous`. Qualifying saved-order
columns in the unapplied latest signed function preserves the existing ₱95
fixture quote and ₱195 total. This fixes expression resolution only: browser
shipping amount/status remains insufficient authority for activation.

## Evidence

| Command or check | Result and scope |
| --- | --- |
| Full stock command before compatibility edit | Exit 1 at the missing old-writer prerequisite; owned clone removed and original fingerprint unchanged. |
| `node scripts/rehearse-website-stock-locks.mjs --signed-holds` | Exit 0, 36/36 checks; timestamp and 29-entry source manifest in `local-receipt.json`. |
| `node scripts/rehearse-purchase-time-reservation.mjs` | Exit 0, 48/48 properties on the separate synthetic legacy fixture; not a current-production installation receipt. |
| `node scripts/rehearse-website-listings.mjs` | Exit 0; refreshed 21-source restored-schema assignment/eligibility rollback receipt in the Website evidence folder. This command does not install the stock chain. |
| `npm run verify:development` | Exit 0 after the final code edit, 08:20:02 UTC. Documentation-only receipt edits do not repeat this gate. |
| Independent read-only source review | No Critical or Important defect; the concurrency evidence limit below was identified and retained. Reviewer did not repeat SQL or provider tests. |
| Local PostgreSQL status after verification | Both current-restore and legacy purchase-hold servers report no server running. |
| Receipt source integrity after documentation | All 52 entries across the current 29-entry stock manifest and Website dependency/later-verifier manifests match source SHA-256. Historical IDEA-20261001-05 hashes retain their earlier scope. |
| Final staged scope/security checks | `git diff --cached --check` passes; sensitive-file policy passes for 1,712 tracked files and secret scan for 1,713 files. The owner Gemini row and `.backups/` are excluded from this batch. |

The signed-holds mode installs all 21 guest/Website sources plus eight stock
entries on an owned disposable clone of `k2_current_restore_20260929` at
`127.0.0.1:54388`. It executes the **whole** purchase-hold migration, rather than
only extracting its reservation helper. Recount still uses an extracted original
repository function followed by its actual lock patch; each manifest entry names
its scope. This is the listed 29-entry chain, not every pending stock migration
or a full provider installer.

Actual anonymous signed purchases now create one exact-lot 30-minute hold and one
order/customer/grant/conversation/message result. A second last-unit purchase is
refused; an exact retry returns the same order without another hold or business
record, and a changed payload with the same key is refused. A later basket-item
failure rolls back earlier holds, identities, contacts, orders, grants, scopes,
conversations, messages and business events, with unchanged failed-transaction
nonce/rate counters. Concurrent distinct buyers produce one winner; concurrent
same-key signed calls produce one canonical result. Actual cancellation, expiry,
recount, signed Admin pause, opposite basket ordering and missing-balance cases
also pass. Direct `anon` and `authenticated` helper execution is denied.
Metadata preservation, replay and four invalid-target refusals pass.

The same-key concurrency case shares a contact rate bucket, which is locked
before the new advisory key. It proves concurrent retry behavior; it does not
isolate that key lock or prove the mixed canonical-direct/signed same-key cycle.
That specific interleaving remains in MAP-023 with other writer/coupon acceptance.
The receipt's `canonicalSignedHoldIntegration=true` describes this local mode
only. Managed role membership, PostgREST, bot/cookie behavior, authoritative
shipping, full payment/commitment and real-host acceptance remain unverified.

Read-only Supabase security advisors at 08:20:31.600 UTC returned 55 WARN and
7 INFO findings, summarized without identities or definitions in
`advisor-summary.json`: 10 anonymous and 44 authenticated executable-definer
warnings, one password-protection warning and seven RLS-without-policy infos.
Remediation references are [anonymous definer access](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[authenticated definer access](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
and [RLS policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
These describe existing live state, not the unapplied local patch, and do not
replace MAP-017's custom privilege findings or justify blanket grant/policy edits.

## Recovery and exact next action

The owned clone was removed and the original restore's table counts and
public/private function/ACL fingerprint are unchanged. Cleanup is bound to exact
loopback target, data directory and random ownership marker; a missing or
mismatched marker refuses deletion. Never drop the source restore or an unowned
pre-existing clone. Local source recovery is a scoped revert of IDEA-20261001-06
while retaining this receipt and the earlier shared-signing guard. No production
rollback was exercised or made ready.

MAP-023 next owns server-authoritative validation of the owner's current J&T
region/weight policy and accepted-charge preservation, then complete current
writer/coupon/lifecycle coverage including the mixed same-key interleaving.
MAP-017/020 must recompose the stale installer and same-target captures/recovery
to include the modified existing 11-argument writer, private signer and expanded
stock objects before backup/preflight and exact apply/configuration review.
The old 33-function/24-new-table/three-hook capture is not this expanded scope.
MAP-018 retains assignment UI and reviewed real facts, media, membership and
physical counts. Full MAP items and the production-listing goal remain open.
