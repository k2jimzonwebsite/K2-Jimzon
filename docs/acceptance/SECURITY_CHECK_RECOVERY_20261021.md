# Security-check recovery and commit/push guardrails

21 October 2026 / IDEA-20261021-01 / MAP-025.
Source branch: `codex/admin-google-turnstile-recovery` (uncommitted local patch).
This receipt distinguishes local behavior from deployed/provider acceptance.

## Request and observed failure

The owner supplied an Admin screenshot with “Complete the security check before
signing in” above a blank Security check region and requested prevention for
future Admin/storefront commits and pushes. Read-only Chrome inspection of the
existing `https://admin.k2jimzon.com/` tab reproduced that region with its heading
and description but no status or retry. Captured provider logs contained
obfuscated error/warning output; no diagnostic provider error code was obtained.
No credentials, challenge, login or production POST was submitted.

The confirmed application defect: interaction-only appearance hid progress,
while the component bounded script loading only. A successful script load with
no subsequent provider callback could wait indefinitely. The 17 October record's
automation diagnosis does not establish the cause of this new provider incident.
The repair addresses visible recovery; it does not claim Cloudflare's underlying
decision/network cause is established.

## Changed behavior and systems

| Before | After | Why |
| --- | --- | --- |
| Hidden provider progress and no post-render deadline. | Visible widget plus announced pending/success status; 30-second background and 120-second interaction deadlines. | A stalled check always exposes a next action. |
| Standard flexible widget could require 300px inside an approximately 271px Admin phone container. | Compact below 300px; measured resize re-renders at threshold changes. | Keep the real widget within the sign-in form. |
| Existing tests covered failed script download only. | Lifecycle tests plus six-action browser tests, expiry/download recovery, responsive geometry and actual Admin dialog geometry. | Catch the reproduced failure and recovery regressions. |
| No local commit/push hook path. | Fast commit contracts/import check; browser check before push; outgoing SHA/tree checks; independent CI job. | Check the code that Git will publish. |

Application files: `src/components/security/TurnstileChallenge.jsx` and
`src/lib/turnstileWidget.js`. Guard source: `.githooks/pre-commit`,
`.githooks/pre-push`, `scripts/git-guardrails.mjs`,
`scripts/install-git-guardrails.mjs`, `package.json`,
`.github/workflows/ci.yml`, `playwright.config.js`,
`playwright.security-check.config.js` and the new `tests/fixtures/security-check*`
fixtures. Tests: `tests/turnstile-widget-lifecycle.test.mjs`,
`tests/git-guardrails.test.mjs`, `tests/security-check-recovery.spec.js` and the
added actual-dialog case in `tests/admin-auth-recovery.spec.js`.

No new dependency, database/schema change, provider setting, key, session/rate
relaxation or parallel authentication implementation was introduced. Existing
unrelated working-tree edits are preserved. The old screenshot files overwritten
by the existing Admin suite were restored after copying current evidence into
this repair's dated directory.

## Verification evidence

- Failing-first original-component browser reproduction: the silent-provider
  Admin case failed because Checking your browser was absent. It then passed
  after the shared lifecycle repair.
- `npm run security:test-turnstile`: 12 Node checks and 7 server/wiring contracts
  pass. Includes callback order, expiry, stale attempts, bounded wait, errors,
  cleanup, outgoing non-HEAD/multiple/deletion refs and custom hook preservation.
- `npm run test:security-check-ui`: final 8/8 pass. Six actions are `admin_auth`,
  `customer_auth`, `guest_order`, `guest_start`, `guest_wholesale`, `guest_pasabuy`.
  Keyboard retry preserves input, refuses the prior attempt's token, and grants
  submission only after the current fixture succeeds. Geometry covers
  320→1440→320; screenshots cover 375px/1440px with reduced motion.
- Existing actual Admin recovery suite: 5/5 pass (Google token routing,
  failed-download recovery, MFA-required/enrollment/invalid return).
- Added actual Admin provider-geometry test: reproduced a false fit assertion
  before compact sizing; then passes 375→1440→375. Provider geometry uses
  documented compact/flexible widths, not an actual Cloudflare response.
- API-focused command for `turnstile-wiring-contract`, `bot-challenge-contract`,
  `release-ci-contract`, `storefront-auth-boundary`: 24/24 pass. Missing secrets,
  replay, wrong host, action and consumer wiring retain their protections.
- `npm run verify:development`: exit 0 after final application code changes:
  12 lifecycle/hook Node + 7 server/wiring checks, 86 Admin tests, identity/readiness
  fixtures, source/env/file/secret/dependency/surface/import checks all pass.
  Only the new browser fixture assertion/theme was corrected afterward; final
  focused browser evidence covers those test-only edits. No unaffected suite
  rerun is needed for these documentation receipts.
- `npm run guardrails:install`: exit 0; independent `git config --show-origin
  --get core.hooksPath` confirms `.git/config` → `.githooks`.
- Executing the real pre-push runner with a synthetic outgoing HEAD ref exits 1
  and reports the current dirty verification tree, as required. No Git push or
  remote action was executed. Final `git diff --check` exits 0.
- Independent code review found two Important issues (outgoing refs and actual
  phone geometry); both were reproduced/fixed, and final bounded re-review has
  no remaining Critical/Important finding. It independently passes 12 Node + 7
  server/wiring checks.

The sandbox rejected localhost access (`EACCES`); browser and existing loopback
verification ran with approved local networking. One added geometry assertion
initially raced a detached synthetic widget; its null-parent assertion was
corrected and the focused suite passed. No failure is represented as success.

Screenshots: `docs/design-checkpoints/20261021-security-check/` retains actual
Admin dialog geometry, actual login/retry screens and bounded shared-component
Admin/guest-order phone/desktop fixtures. The synthetic provider is explicitly
labelled. These prove local presentation only.

## Limits, recovery and exact next action

Both production artifacts are unchanged. No push, merge, deployment, real
Cloudflare token acceptance, genuine staff login, customer sign-in/order/message,
branch protection, or provider configuration was performed. Local hooks are
installed; remote CI wiring is prepared source until publication. Hooks cannot
guarantee against every regression or provider outage.

MAP-025 owns the exact next action: obtain the explicit owner request to release
this concrete patch to both existing K2 projects; integrate only intended source,
run `npm run verify:release` once, promote Admin and storefront separately, then
verify canonical host boundaries and genuine owner-controlled security checks.
The operational runbook is `docs/runbooks/SECURITY_CHECK_GUARDRAILS.md`.
Rollback is a scoped component/helper/gates/test revert; preserve server
verification and unrelated work. No database or provider rollback is required.
