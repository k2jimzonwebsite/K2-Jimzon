# MAP-019 account sign-out recovery — 27 October 2026

IDEA-20261027-02. **Local source and synthetic verification only. The overall account/deletion goal remains open in MAP-019.**

The owner asked to inspect the last session and finish its goal. The last K2 chat, `Review completion requirements` (`01a178d1-2679-79e3-b9a3-983a323bac2d`), stopped at the usage limit while correcting account sign-out. Its final browser check, `SDK-ignored provider refusal`, was failing. This continuation reuses that accepted idea and the existing feature branch `codex/customer-privacy-owner-decisions`; base HEAD remains `c630e7ebfa491c463c618c030e4222e544269f06`. Earlier account/CRM/privacy preparation and unrelated dirty images remain preserved.

## Changed behavior

- The existing account hook saves and verifies a shared, non-sensitive browser guard before clearing its private view or calling the existing SDK sign-out operation. A failed guard write reports that sign-out could not start safely and keeps the current account accessible for recovery. It does not silently pretend sign-out succeeded.
- A pending sign-out hides account data in the initiating, new, reloaded and already-open account tabs. The local guard remains while a saved session cannot be verified cleared. Initializing and receiving Auth events respect that guard; this is an app-view safeguard, not server-side credential revocation.
- A provider error or missing expected saved session leaves an explicit uncertainty notice. The per-tab reload marker and shared guard contain only `1`, never identity, contacts or credentials. The SDK's default sign-out scope is preserved.
- The installed SDK can normalize provider 401/403/404 responses to success. Even its accepted result plus an empty local session is therefore described only as “Signed out on this browser. Other sessions may still be active.” It does not verify remote revocation, token invalidation or other devices.
- A failed guard write during an already-blocked retry preserves the closed account view and Retry sign-out control. A newly accepted session clears the previous local-success notice; unresolved warnings remain distinct. Older sign-out attempts cannot overwrite a newer attempt's final notice.

Source changes in this continuation are confined to `src/hooks/useCustomerAccount.js`, the `SignOutNotice` in `src/views/CustomerAccount.jsx`, and sign-out regressions/captures in `tests/customer-account-ui.spec.js`. No schema, provider, scheduler, retention policy, canonical customer/order/payment record or deployment was changed.

## Verification and review

| Evidence | Result and limit |
| --- | --- |
| Initial sandbox-only fixture runner | Could not start its localhost server; not a behavioral test result. |
| Local-access `node scripts/test-customer-account-ui.mjs --grep 'shared guard cannot be saved\|SDK-ignored provider refusal'`, session 71253 | Both intended assertions failed before the fix. Fabricated `fixture.supabase.co` with intercepted provider requests. |
| First focused `--grep 'sign-out'`, session 86553 | Eight cases passed. |
| Independent source review | Found two Important issues: a storage-error retry lost its recovery control; a later sign-in retained the local-success notice. Both accepted. |
| `--grep 'blocked sign-out keeps\|accepted session clears'`, session 30808 | Both new regressions failed before their fixes. |
| Expanded focused run, session 14013 | Nine passed; one test had an ambiguous alert locator because an unrelated bot-check alert also rendered. Locator scoped to the sign-out notice; failure retained here. No production change was needed for this test error. |
| Final `node scripts/test-customer-account-ui.mjs`, session 32846 | **37/37 passed**, 1.4 minutes: 36 account cases and one wholesale case. Covers purchases/private downloads, closure receipts, account switches, settings response ordering, drafts, notifications and ten sign-out cases. |
| Independent bounded re-review | Both findings resolved; no remaining Important finding in the inspected slice. Reviewer did not rerun tests. |
| Final `npm run verify:development`, session 45466 | **Exit 0** after final code/test edits. Includes 19 privacy/portfolio/CRM Node checks, import integrity, secret/env policies and source security inventory: 105 Admin/24 Storefront routes, zero route-control gaps/unexpected PUBLIC or anonymous grants. This is source evidence, not installed metadata. |
| Scoped `git diff --check` | Passed; Git reports existing CRLF-to-LF normalization notices. |

Eight new captures in `docs/acceptance/account-signout-20261027/` cover provider uncertainty and initial storage refusal, at 375px and 1440px in both themes. Assertions check no horizontal overflow and notice buttons at least 44px high, with reduced motion. Representative phone/desktop and light/dark captures were inspected; the established palette, type and navigation are preserved. These are Chromium synthetic records and emulated viewports, not physical-device, screen-reader, other-engine or real-host evidence. Existing purchase/closure captures are regenerated by the maintained full runner. No decorative motion, font, dependency or new navigation was introduced.

The exact qualified source hashes are in the companion JSON. Documentation-only recording after the passing gate does not require another application test/build/deployment.

## Remaining authority and recovery boundary

The already-recorded old-backup reproduction remains unresolved: restoring an old database can restore a closed account and minimized content without its later tombstone. The independent closure authority/journal, writer fencing, newest-state witness and versioned offline suppression protocol remain unapproved and unimplemented. Current direct and worker closure paths must not be activated on the strength of these sign-out tests.

Actual installed-schema compatibility, committed pre-activation migration recovery, real email-link/code delivery and re-registration, real sign-out behavior, supported scheduler capacity, historical attachments and the OWNER-006 financial retention schedule still require qualification. No credentials, prior source tests or this continuation authorize K2 production SQL, provider configuration, main publication or a live release. Excel connection remains excluded; existing external copies and backups are not claimed erased.

**Exact next action lives only in MAP-019:** resolve and independently review the concrete recovery authority/restore protocol and qualify the actual infrastructure and remaining gates before preparing an owner-reviewable activation packet. The completed sign-out correction is evidence, not a completed deletion service.

Recovery before activation is a scoped reversal of the sign-out helpers/listeners/flow, notice rendering and associated tests/captures, preserving all earlier settings/CRM/privacy work and unrelated dirty files. Browser guard removal is safe only after verifying the local SDK session has cleared; blindly removing it can expose the still-saved session. No production rollback applies to this source-only change. Never restore erased PII as ordinary post-closure rollback.
