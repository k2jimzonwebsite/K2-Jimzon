# Shared Admin signing inputs — 1 October 2026

IDEA-20261001-04; MAP-017/020. Branch `codex/map017-guest-chat-preview`.
Prepared and locally verified only. No provider SQL write, live exploit test,
credential/configuration change, push, deployment or release occurred.

The installed/source verifier used nullable comparisons in signature format,
age and HMAC rejection conditions. PostgreSQL IF skips a condition that is not
true. On the exact isolated restore, valid Node-signed and nonce replay controls
passed, but a NULL signature returned successfully. The regression failed at
`EXPECTED_SIGNING_DENIAL_MISSING: K2_ADMIN_REQUEST_INVALID`. All changes were
transactional and rolled back on disconnect.

The CLI-generated forward migration
`supabase/migrations/20261001065252_admin_signing_null_inputs.sql` inserts an
explicit guard for action, timestamp, nonce, idempotency key, payload and signature
after staff/AAL2 checks and before action/HMAC/age/replay processing. It requires
the named definition's recognized unique boundary and security settings, refuses
missing/unfamiliar shape, verifies the complete expected resulting definition and
unchanged owner/ACL/settings, and replays as a no-op. Existing actions, byte caps,
rate and nonce controls remain intact. Earlier fulfillment/session history is
unchanged; four later prepared paid-AI, marketplace, moderation and recovery
definitions retain the guard.

Supabase CLI 2.119.0 generated the filename after help discovery. The official
[changelog](https://supabase.com/changelog) and
[minor-release notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
were read. This uses existing HMAC/digest functions and adds none of the affected
ltree, legacy PGP cipher, float GiST or custom-operator structures. References:
[Supabase functions](https://supabase.com/docs/guides/database/functions),
[PostgreSQL IF](https://www.postgresql.org/docs/17/plpgsql-control-structures.html).

## Evidence and limits

`source-callers.json` records 29 source definition occurrences, including
replacements, not 29 deployed endpoints. `live-caller-metadata.json` records
read-only named metadata on K2 `pixplcjqivlfflickobf` at 07:03:54 UTC: the private
verifier and one referencing public function, Globe review. The private helper
is not effectively callable by either browser role; Globe permits authenticated
execution. No live function was invoked or secret read.

The restored verifier has NULL ACL/default EXECUTE while its private schema
denies browser USAGE. The correction preserves that metadata. Actual private
calls under both roles fail at schema permission; this does not claim default
ACL revocation or resolve provider-owned defaults.

| Command/check | Result and scope |
| --- | --- |
| `node scripts/rehearse-admin-signing.mjs --before-fix` | Intended failure at missing-signature denial after valid Node-HMAC/replay controls. Local, intentionally failing reproduction. |
| `node scripts/rehearse-admin-signing.mjs` | Seven independent variants pass: installed restore and extracted fulfillment, session, paid AI, marketplace, moderation and recovery bodies. |
| Signing/authorization | Actual Node signer allows; six NULLs, malformed/forged HMAC, past/future expiry, unknown action and exact nonce replay deny. Absent/customer/AAL1 and anonymous caller/private-schema denials pass. |
| Existing controls | Every allowlisted literal action allows; exact normal 16/64 KiB, import 1 MiB and marketplace 4 MiB caps allow and one extra byte denies. Actor 360/global 6000 thresholds deny. These are verifier tests, not domain commands. |
| Migration | Expected definition/owner/ACL/settings preserved, two replays, missing/unfamiliar refusal. Later four bodies are tested before the patch so it cannot mask a replacement regression. |
| Public caller | Current restored Globe and extracted prepared fulfillment reject NULL locally. Fulfillment was absent and installed only inside the transaction. No product/order/content command executes. |
| `node scripts/rehearse-website-listings.mjs` | Updated 21-source installation plus two extracted later bodies passes assignment/order eligibility, permissions, retry and rollback. |
| Final `npm run verify:development` | Exit 0 after the last test edit. Earlier passing gate was repeated because new current-caller evidence required another test. Zero source inventory gaps. |
| Independent source review | No actionable defects, including final deltas. Reviewer did not rerun SQL or provider behavior. |
| Supabase security advisors | Read-only live snapshot: 55 WARN and 7 INFO, no ERROR notices. The unapplied guard is not evaluated by this provider result. This does not replace MAP-017's grant/ownership audit. Summary: `advisor-summary.json`. |

Existing notices concern [anonymous function execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[authenticated function execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[RLS without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
and [Auth password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
Their operational disposition remains in MAP-017/019/020/021; no broad grant,
RLS or Auth change was made as part of this signing repair.

`local-receipt.json` pins hashes, installed-definition hash and passing time.
Exact database/data-directory gates and random fabricated keys constrain the
witness. Original definition/security metadata, nonce/rate/receipt counts and
absence of fixture users pass after rollback. The restore server is stopped.
Extracted bodies do not prove full migrations, every caller's business behavior,
PostgREST/cookies, real staff sessions or activation. No release gate was run.

## Recovery and handoff

No live rollback is needed. Local recovery is a scoped revert of this signing
batch preserving prior Website work, the owner's Gemini idea and `.backups/`.
Before any apply, capture the same-target private verifier's definition/security
metadata and ledger, refresh reviewed backup/preflight and obtain specific
payload authorization. Include the helper in the recomposed installer/capture.

After an approved apply, recovery must keep the guard: close affected Admin
activation or use reviewed roll-forward correction. Restoring the vulnerable
definition is not acceptable recovery. September's installer/captures are stale;
local rollback is not a provider recovery package. Exact apply/recovery remains
MAP-017/020. MAP-023 owns next lock-order/shipping work; actual staff/catalog/host
and full production listing acceptance remain in the MAP.
