# MAP-019 email sign-in repair

**29 October VERIFIED LIVE / fresh-login acceptance pending:** Production main `e4ece97da62e6a39ebe7d0f7f51b1fb27ea8a887` is Ready on both canonical artifacts: Storefront `dpl_ETk6P3gMbuj8ypMFTZpWbooCHMgz`, Admin `dpl_5yZqQezm1aLGBEZp5hi4AX6LWUer`. Public target markers and deliberate email confirmation are browser-verified. Packetb794e937 was applied ONCE; direct fields and customization-status metadata are readback/reconciled. Owner confirms Inbox delivery. Their last click created a valid12-character provider refresh token which the previous BFF incorrectly rejected; sourcee4ece97d corrects both BFF and legacy-parser bounds. Failed-first regressions,5parser/6Auth-boundary/6email-browser, finaldevelopment0/147 and both builds pass. Prior24-stage release evidence is retained for unchanged inputs. A new successful email confirmation/session reload and real profile/address/default-checkout acceptance remain unverified. No further provider activation or unrelated suite is required. Full evidence, original failures and recovery: `email-signin-repair-20261029/live-repair-verification.json`.



29 October: owner reports the real email landing in Spam and the clicked link returning to signup/sign-in. This repairs accepted IDEA-20261027-02 in existing MAP-019; automated deletion remains suspended.

**Named owner authorization applied once:** Owner approved exact packetb794e937 on K2pixplcjqivlfflickobf. It was applied at02:37:24Z after source verification and fresh gates; the five fields match. The two customization-status maps are reconciled read-only. Preserve original dispatch/result/reconciled receipts; no retry or second activation is required.

## Diagnosis

The Storefront BFF requests an implicit Supabase magic link. The shared browser singleton uses PKCE. Installed `@supabase/auth-js` explicitly rejects an implicit callback in PKCE mode. The old account view also ignores callback errors, presenting the form again. Two failed-first browser regressions reproduce missing confirmation and missing expired-link recovery. Google OAuth configuration is a separate flow; changing Google Console is not the repair for this email return.

The currently connected Gmail account is the K2 sender mailbox. Its sent message proves delivery was attempted to the owner-selected identity using custom `smtp.gmail.com`, with sender display `K2 Jimzon Admin`, a generic subject and a direct Supabase verification link. It does not expose the recipient's Spam classification or receiving SPF/DKIM/DMARC verdict. No missing DNS record, email-authentication failure or inbox-delivery guarantee is inferred. No unrelated mailbox content is part of this receipt; live tokens/message content are not committed.

References: [Supabase implicit flow](https://supabase.com/docs/guides/auth/sessions/implicit-flow), [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [email template/prefetch guidance](https://supabase.com/docs/guides/auth/auth-email-templates), [SMTP delivery practices](https://supabase.com/docs/guides/auth/auth-smtp), [Gmail sender guidelines](https://support.google.com/mail/answer/81126).

## Local repair

`src/lib/customerEmailReturn.js` captures only email returns on root/account routes, immediately removes secret fragment fields and moves to `/account`. It retains credentials in memory, rejects duplicate/mixed/recovery/malformed credentials and refuses if URL cleanup fails. It leaves PKCE codes and unrelated routes/anchors untouched. First-party hash verification uses the existing same-origin BFF verification route and signed email rate budget before the provider call; the SDK validates the returned session. Older implicit sessions use the existing SDK. The browser never calls provider `verifyOtp` directly. Shared PKCE, Admin Auth, roles, sign-out safeguards, issuance bot/rate gates and closure flags stay unchanged.

The account view presents **Complete sign-in** before verification. A plain page fetch or email preview does not spend the token. Expired/used links show a clear error and **Request a new link**; provider diagnostics never appear in the UI. The existing account canvas, type, controls and keyboard behavior are retained. No credential is persisted by the callback helper; the existing SDK retains only a successfully validated session using its established storage rules.

Evidence: two expected missing-control/error regressions before implementation; four parser checks; six browser cases covering first-party verification, old implicit callback/reload, expired recovery, pending sign-out and 375/1440 layout. Initial legacy assertion regenerated its synthetic JWT a second later and was corrected to use one fixed fixture token; the product was not weakened. Five cases plus the corrected focused legacy case pass. Final `npm run verify:development` exits0, with146 privacy/address/parser cases passing. Phone/desktop captures in `email-signin-repair-20261029/confirmation-*.png` were inspected together: no overflow,44px controls, visible primary/recovery action and keyboard focus. All provider calls in these tests are intercepted synthetic fixtures; they are not real delivery/login evidence.

## Applied provider packet

Target `pixplcjqivlfflickobf`, `https://pixplcjqivlfflickobf.supabase.co`, `PATCH /v1/projects/pixplcjqivlfflickobf/config/auth`.

[activate.json](email-signin-repair-20261029/activate.json), SHA-256 `b794e9371ccc2810b6a489fc251ce7265d0ad4f78618740433db297f6c7c9ef8`, changes exactly five fields: sender display name, confirmation/magic-link subjects and their two HTML templates. Emails are branded K2 Jimzon and link to `{{ .SiteURL }}/account#token_hash={{ .TokenHash }}&type=email`. The fragment is not sent in HTTP requests; the app scrubs it and waits for the deliberate confirmation. SMTP sender email/credentials, required email confirmation, signup setting, Google/phone providers, roles and deletion settings are unchanged. An email client that strips fragments may still require a new link; genuine delivery/login remains to be observed.

Current five-field inverse [restore-previous-templates.json](email-signin-repair-20261029/restore-previous-templates.json), SHA-256 `063c9762676ba9cdecc173c2f79eaadecf2fdaa30e5ae8515e797dd52c98c744`, is saved without SMTP credentials. Actual restoration needs its own scoped owner decision. Old source must not replace the repaired callback while newly sent first-party links remain valid. Keep the repaired backward-compatible callback available during any template recovery.

Named approval, deployed source, fresh exact-K2 identity/zero-blocked readiness and exact five-field preconditions were satisfied before the single dispatch. Independent postflight matches the five values and all other direct Auth settings. Two customization-status maps are separately reconciled; the original strict result is retained. This activation is complete and must not be repeated. SQL and signup activation are also already complete.

## Release qualification and remaining acceptance

The initial complete release invocation stopped at a CRM fixture flag incompatibility. The retained stage receipts reconcile24 stages, including1122 base browser cases plus9 separately configured CRM cases; a transient logo assertion passes unchanged on focused rerun, and the owner workflow passes after removal of the inherited fixture URL. The expanded wrapper PATH and probe-config mistakes are preserved. This is reconciled coverage, not a clean aggregate exit0.

The actual owner email then exposed the12-character provider session format which longer fixture tokens missed. Parser/BFF tests fail before the two-line fix, then5parser/6BFF/6browser checks pass; final development exits0/147 and both separate builds pass on e4ece97d. Unaffected preceding release groups are retained without another full run. New templates remain once-applied, with no SQL/signup/Google/role change.

Exact next in MAP-019: one fresh real confirmation and refresh-persistent sign-in after e4ece97d, then owner-data profile/settings/address save/readback/default checkout without order submission. Owner reports Inbox placement for one message; general delivery and recipient authentication headers are not claimed. The02:41 link was consumed when Supabase created its session and cannot establish a new session after the compatibility fix.

Recovery must preserve the compatible first-party callback and12-character refresh format while issued links remain valid. The saved template inverse requires a separately scoped recovery decision. Do not replay production SQL/signup/email activation, reset staff roles, delete users/addresses or restore an old database over later data. All suspended deletion work and unrelated owner images remain untouched. Receipt-only changes need no application suite or production deployment.
