# Admin and storefront security-check recovery

Owner: MAP-025 / IDEA-20261021-01. Local source receipt:
`docs/acceptance/SECURITY_CHECK_RECOVERY_20261021.md`.

`TurnstileChallenge.jsx` is the single shared widget for staff authentication,
customer identity, checkout, chat/messages, Wholesale and Pasabuy. Its lifecycle
lives in `src/lib/turnstileWidget.js`; do not create a parallel implementation.
Server-side token, hostname, action, replay, rate and session checks remain
required. A client timeout or an empty widget never authorizes a request.

## Expected behavior

- The provider widget is visible, with a separate announced pending status.
- Script download has a 15-second deadline. A rendered background check has a
  30-second deadline. A requested human interaction has a 120-second deadline.
- Missing callbacks, provider errors, expiry and interaction timeout clear the
  token and expose a keyboard-accessible Retry security check button.
- Retry creates a new widget without clearing the containing form's fields.
  Disposed or failed attempts cannot deliver late tokens.
- Provider success displays Security check complete and cancels the deadline.
  Provider expiry still invalidates that token. Browser status is not proof that
  the server accepted the token or authenticated the user.
- Containers below 300px use the provider's compact widget. ResizeObserver
  recreates the widget when the compact/flexible threshold changes; fields stay
  intact and the new widget must verify again. With no ResizeObserver, compact
  is the safe default.

## Commit and push gates

Run `npm run guardrails:install` in an existing clone. Ordinary `npm install` /
`npm ci` invokes the same installer through `prepare`; CI skips local hook setup.
The installer preserves a different existing `core.hooksPath`. For another hook
manager, chain `node scripts/git-guardrails.mjs pre-commit` and
`node scripts/git-guardrails.mjs pre-push` from its hooks, preserving pre-push
stdin. Current local installation is `.githooks`.

The commit hook runs `npm run security:test-turnstile` and `npm run check:imports`
when runtime/test/configuration inputs are staged. Receipt-only commits skip
application checks. Fully stage the intended runtime changes first: the hook
refuses unstaged verification inputs so an unstaged fix cannot conceal a staged
regression. It does not automatically stage or commit any file.

The push hook runs those same checks plus `npm run test:security-check-ui`.
Runtime/test inputs must be committed, with no untracked runtime/test files.
Git's outgoing non-deletion commit IDs must match the checked-out HEAD; check
out another branch before pushing it. This deliberately refuses testing one
tree while publishing another. Deletion refs do not claim source verification.
Local browser tests need an installed Playwright Chromium and localhost access.
Use `npx playwright install chromium` in a fresh workstation if required.

CI has an independent `security-check-regression` job, and the complete local
`npm test` includes the rendered checks. The development/prebuild gate includes
the fast lifecycle/server/wiring contracts. The complete release gate remains
`npm run verify:release`, once immediately before an owner-requested live release.
Hooks are local safeguards and can be bypassed by Git; CI configuration becomes
remote protection only after its source is published. No branch-protection
setting or mandatory GitHub status check was changed by this repair.

## When a real check fails

Retain form input. Use the visible retry once and read the inline provider code,
if present. Record only the code, affected hostname/action, time, and sanitized
HTTP status/correlation details. Never record passwords, CAPTCHA tokens, session
cookies, authenticator secrets or codes. Repeated failures require checking the
exact host/site-key allowlist, deployment environment and provider response;
the debugger banner alone is not evidence that automation caused rejection.
Do not disable protection or add a production bypass.

## Release and recovery

Local fixture tokens establish UI behavior only. After an explicit owner release
request, integrate only the intended source, run the release gate once, deploy
the existing separate Admin and storefront artifacts, verify both canonical
hosts, and have the owner exercise genuine verification/sign-in. This repair
needs no database migration, provider setting change or secret rotation.

For a source regression, revert this component/helper and its gate/test changes
as one bounded change. Preserve the existing server checks and unrelated dirty
work. Restore each prior production artifact separately if a later release
requires rollback. To remove only local hook activation, first verify that
`git config --local --get core.hooksPath` is `.githooks`, then use
`git config --local --unset core.hooksPath`; preserve any prior custom manager.
All remaining release and real-provider acceptance work belongs in MAP-025.
