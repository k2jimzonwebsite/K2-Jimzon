# MAP-019 profile and deletion qualification — 27 October 2026

IDEA-20261027-02 / -03. **The full goal remains active:** a working customer profile, settings and complete account-deletion process. This receipt qualifies one prerequisite batch; it does not reduce that goal to the earlier sign-out fix or claim a deployed deletion service.

## Observed provider prerequisites

The exact K2 project identity preflight passed. The fresh read-only readiness receipt reported 8 verified / 2 owner / 3 connector / 0 failed; this applies no change and authorizes no write.

The signed-in in-app browser reached K2 project `pixplcjqivlfflickobf` directly, not the unrelated Supabase connector project. It observed:

| Surface | Actual observation | Consequence |
| --- | --- | --- |
| K2 Auth [providers](https://supabase.com/dashboard/project/pixplcjqivlfflickobf/auth/providers) | New-user signup disabled; Email enabled; Phone disabled; email confirmation enabled. | New registration and the phone journey are not ready for customer activation. No switches were changed. |
| K2 Auth Magic link/OTP template | Body contains `ConfirmationURL`, with no `Token` code placeholder. | Prepared numeric email-closure verification cannot be inferred from current sign-in email. Preserve link sign-in while preparing a reviewed code-capable template. No template was saved. |
| K2 Auth SMTP | Custom SMTP enabled, Gmail host/port 587, K2 sender name; stored password remains hidden. Dashboard warns about transactional deliverability. | Configuration was observed; actual delivery remains unverified. No credentials were read, replaced or sent. |
| [K2 Vercel team](https://vercel.com/k2-jimzon) | Hobby; existing Storefront and Admin remain separate projects. | The prepared once-per-minute Vercel cron is incompatible with this plan. No daily downgrade, upgrade or scheduler activation occurred. |
| Owner's Cloudflare account, R2 | Account is reachable; R2 redirects to its subscription/terms page. It offers a free allowance with recurring usage-based overages and requires explicit subscription acceptance. | R2 is not an activated recovery service. No subscription, bucket, credential or binding was created. |
| Exact K2 extension metadata | Only `supabase_vault` 0.3.1 among `pg_cron`, `pg_net`, `http`, `supabase_vault`; read-only query receipt `.tools/privacy-provider-readiness-20261027.json`. | Supabase scheduling/network extensions are not installed. A documented capability is not an installed job. |

Browser access supersedes the earlier unobserved plan/template/account statements only at this observation scope. It does not establish successful delivery, scheduler capacity, R2 durability in K2, hosted acceptance or authorization to change settings.

[Supabase Cron documentation](https://supabase.com/docs/guides/cron) describes SQL/function and HTTP scheduling; [pg_net documentation](https://supabase.com/docs/guides/database/extensions/pg_net) describes its asynchronous transport. They identify a candidate to qualify, not an installed solution. The [R2 API compatibility reference](https://developers.cloudflare.com/r2/api/s3/api/) must govern any proposed conditional-write implementation; the prior authority review remains unresolved. Infrastructure selection, custody, retention, failure behavior and exact owner approval still precede production changes.

## Restored-schema qualification

New runner `scripts/rehearse-customer-privacy-current-schema.mjs` reuses the existing encrypted `borella-installed-before-merge-20261026.k2backup` archive. It imports the maintained archive verification/restoration helper, creates a uniquely owned loopback PostgreSQL 17.11 cluster and dedicated database, and has no production networking/client. Backup credentials stay in memory and no row contents are printed. The archive is copied as ciphertext; the restored plaintext cluster is removed only after stop/status/PID-file/actual-port checks and checked-path ownership.

The runner applies all three prepared 27 October migrations together inside one transaction against the restored schema. `supabase/tests/customer_privacy_current_schema.sql` then creates synthetic records and verifies:

- The original Auth insertion trigger assigns the Customer role; no fixture role override supplies that result.
- A synthetic verified account/contact, guest grant, saved profile/address and notification can undergo the prepared database closure with the actual restored constraints/triggers.
- Its Website inquiry message is minimized, conversation resolved and contact fields removed, account/grant revoked, settings/notification removed and tombstone recorded. Auth cleanup remains explicitly pending.
- Repeated processing preserves the recorded request outcome.
- Hashes of foreign Auth/profile/customer/contact/account/grant/settings/notification/conversation/message rows remain unchanged during processing. Original row contents stay inside the owned database.
- After transaction rollback, all 161 selected table projections / 49,717 summed row projections, the restored schema and every exact sequence counter/`is_called` state match the baseline. These counts are database projections, not customer counts or a physical inventory.

A negative control changes an uncalled synthetic sequence with `setval(...,42,false)`: the `pg_sequences` projection stays unchanged while the strengthened exact-state fingerprint changes. This addresses the review finding that the original sequence-view check was incomplete.

## Evidence, failures and review

| Run | Result |
| --- | --- |
| First migration-only run `e36f04e3-21ff-4fa2-a83f-eb2cc95668ba` | Passed restored-schema DDL and rollback; its sequence-view evidence was weaker than the final check and is preserved with that limit. |
| Independent bounded review | Three Important findings: startup-acknowledgment cleanup gap, cleanup errors could omit the receipt, and incomplete sequence fingerprint. All accepted and corrected. |
| `node scripts/rehearse-customer-privacy-current-schema.mjs --prove-startup-recovery`, exec 70777 / run `5f332cfe-6bc7-4063-b8e8-3d4dd1dcb54b` | Passed simulated startup acknowledgment loss before archive restoration. Server stopped, PID file absent, actual port refused and owned plaintext directory removed. This probe loads no owner environment or archive. |
| First account assertion run `74332f1e-282d-4629-96f8-1375abc31784`, exec 43222 | Failed on a test variable/column named `email` after processing. Complete rollback and cleanup passed. The test column was qualified; no product fix was inferred from this fixture error. |
| Corrected basic account run `a6740a0f-a6af-44b0-9fc1-3236e5d259ba`, exec 89459 | Passed synthetic account closure/retry and strengthened conservation. |
| Final expanded run `d2d86625-bccd-4307-9254-a489bc82f205`, exec 17020 | **Exit 0** with original Customer-role trigger, actual Website inquiry/message minimization, foreign-record conservation, exact retry, full rollback and verified cleanup. |
| Bounded independent re-review | All three findings resolved; no remaining Important finding in the inspected runner/fixture. Reviewer did not rerun tests or access providers. |
| Final `npm run verify:development`, exec 74169 | **Exit 0** after final code edits; 19 privacy/portfolio/CRM Node cases and zero source route-control gaps/unexpected PUBLIC or anonymous grants. |

Private redacted receipts are under `.tools/privacy-current-schema/<run>/receipt.json`; the companion JSON carries the final result and exact source pins. No application browser/build/release suite was repeated for this test-tool-only batch. Earlier 37 passing account/inquiry browser cases remain in `MAP019_ACCOUNT_SIGNOUT_20261027.md` at their original scope.

## Limits and recovery

The archive is from 26 October, not a new live snapshot. Its maintained restore excludes ten managed Vault entries and uses `--no-owner --no-privileges`; this does not establish original hosted ACL/ownership preservation, managed Auth/Storage behavior or genuine caller permissions. The synthetic identity and direct database processing are not a delivered OTP, real registration, signed hosted closure or provider cleanup. A rolled-back installation is not a committed pre-activation downgrade. Most importantly, this is not the independent recovery authority, latest-state proof or versioned backup suppression safeguard.

No production schema, row, provider configuration, subscription, main branch or deployment changed. No customer was closed. The overall goal remains open in MAP-019, which alone holds the next work: finalize/review the concrete recovery authority and offline restore protocol, qualify a supported scheduler and actual Auth flows, complete committed-migration recovery and record-specific retention/attachment qualification, then prepare exact owner-reviewable activation actions. Current direct/worker closure paths must remain inactive until those gates pass.

Recovery for this batch removes only the new runner/assertion and its documentation additions, preserving prior source and immutable receipts. If a future run reports cleanup failure, its receipt names the uniquely owned data directory; stop/reconcile that server and verify the checked absolute path before removing plaintext. Never delete a guessed cluster or restore closed PII as ordinary rollback.
