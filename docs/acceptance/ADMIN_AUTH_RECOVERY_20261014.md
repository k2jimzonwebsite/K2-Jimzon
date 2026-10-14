# Admin Google and Cloudflare recovery — 14 October 2026

Owner request: inspect Antigravity's screenshot and fix missing Google sign-in and the Cloudflare security check. IDEA-20261014-05 is accepted into MAP-025. Branch: `codex/admin-google-turnstile-recovery`; starting source `79fd78e1`. Preserve existing unrelated untracked source/evidence.

## Findings and scope

The supplied screenshot is third-party diagnostic evidence, not an instruction to disable BFF. It correctly identifies that `adminOAuthAvailable: !adminBffEnabled()` hid Google. Its unmigrated-BFF/503 explanation is unverified and conflicts with the recorded production activation. Current live Admin showed the secure sign-in form and an automatically successful Cloudflare widget; no CAPTCHA, credentials, messages or form were submitted by the agent. This proves visible challenge success only, not server token acceptance.

Read-only K2 Management Auth configuration: Google enabled; CAPTCHA disabled at Supabase; redirects allow `https://admin.k2jimzon.com/**` and existing Storefront hosts; site URL remains `https://www.k2jimzon.com`. No setting or credential changed. Vercel runtime-error read for exact K2 Admin/team returned403; `Get-Command vercel` found no CLI. Reported password-login503 and actual production preauth/session registration are not diagnosed or claimed fixed by local tests.

Confirmed challenge defect: the module cached a rejected script download forever and offered no retry control. A repeat load failed without making a second request. A widget error/expiry also had no explicit recoverable action.

## Prepared source behavior

Two leaf routes, `auth/google/start` and `auth/google/complete`, stay inside the existing single Admin router. Start requires the same-origin Admin target, process brake, existing signed durable `admin_login` budget and a verified `admin_auth` token/hostname. The installed Supabase SDK builds PKCE in request-local memory. Only its verifier, random state and creation time enter the encrypted Secure/HttpOnly/Lax ten-minute cookie; no new provider secret or SQL is needed. Return uses the existing guarded Admin route with state and one-time code. Completion checks exact body/origin/cookie/state/age, consumes the durable budget, exchanges server-side, verifies confirmed email/current staff role and requires existing MFA enrollment/challenge or active AAL2 registration before issuing session cookies. Provider single-use code exchange remains Auth's authority. Telemetry uses the existing bounded safe security event mechanism without tokens.

Browser Supabase callback detection, persistent sessions and refresh are disabled in BFF mode. One return exchange is reused across StrictMode effects; provider credentials are removed from the address bar. Auto-enrollment reuses a single request. Password/recovery/legacy flag-off behavior stays qualified. Google attempts still require the real bot check; there is no CAPTCHA bypass or forced direct-browser mode.

The shared challenge loader releases failed promises, removes the failed script, bounds loading at15seconds and offers a44px keyboard-accessible Retry security check. Expiry/error/timeout clears the token, preserves the caller's form fields and ignores removed-widget callbacks. Flexible widget width preserves phone containment. Storefront identity and Admin product-register styles are unchanged.

## Verification and limits

| Evidence | Result |
| --- | --- |
| Failing-first actual Admin browser cases | Missing Google button and missing Retry control fail; initial combined-run load timeouts were harness failures. Dedicated Admin runner reproduces the intended failures. |
| `node --test tests/turnstile-loader-recovery.test.mjs` | Observed red cached-download failure, then green second download. |
| `node --test tests/admin-google-bff.test.mjs tests/turnstile-loader-recovery.test.mjs` |16/16pass; real SDK PKCE construction, encrypted-cookie attributes, altered/missing/expired state, foreign origin, extra fields, staff/email/MFA/enrollment/registry and bot/rate denials. Provider exchange/identity replies are controlled fixtures. |
| `npx playwright test --config=playwright.auth-recovery.config.js` |5/5pass; real app Google start token, failed script retry retaining email, callback TOTP/enrollment/invalid recovery, one exchange/enrollment and no browser Auth requests/token storage. |
| Existing auth browser/source checks |6/6admin.spec checks pass; two existing enrollment/password-recovery cases pass after supplying the runner's missing synthetic site key. No source workaround for that fixture failure. |
| Admin BFF/bot/wiring/rate/security-surface contracts |125passed initially; five loopback HTTP permission failures plus two new-route documentation/audit failures. After scoped corrections, all7affected cases pass;132covered. |
| `npm run verify:development` |Invoked once; secret scanner passes and68/69session checks pass, with one loopback-restricted recovery failure. Focused existing recovery test2/2passes with loopback permission. Remaining eleven development constituents complete exit0; zero route gaps and secret/import/dependency/environment checks pass. The original aggregate invocation exited1; no false aggregate exit0 claim. |
| `node scripts/verify-admin-bff.mjs` |Passes exact leaf/router coverage and limited-key/session foundation. |
| `npm --ignore-scripts run build:admin` |Exit0 with process permission; target boundary,88-file secret scan and222.72/300.00kB minified Admin budget pass. Initial restricted Vite runner failure retained as environment limitation. |
| `npm --ignore-scripts run build:storefront` |Exit0; target boundary,92-file secret scan; JS149.03/150.50kB gzip and CSS29.98/30.00kB gzip pass. |
| Screenshots |375/1440Google and375retry inspected in `docs/design-checkpoints/20261014-admin-auth-recovery/`; synthetic challenge fixture is intentionally blank, not a real CAPTCHA claim. |

Logs are retained under ignored `.tools/admin-auth-*-20261014.log`. New Node/browser tests are included in the existing development/release scripts. Builds skipped lifecycle prebuild to avoid repeating already qualified development suites. Full release gate was not requested or repeated. Primary source/security/design review finds no remaining actionable defect in this bounded local repair; no independent reviewer claim.

All four required design skills preserve current identity. Review summary:

| Before | After | Why |
| --- | --- | --- |
| Google disappears when secure BFF activates. | Visible Google starts server PKCE and returns to existing MFA. | Preserve staff authentication without replacing operational transport. |
| Failed script stays cached; errors have no recovery control. | Bounded reload with named44px retry and retained form input. | Staff can recover without restarting their work. |

References used for protocol compatibility: [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Cloudflare explicit rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/).

## Remaining action and recovery

MAP-025 owns explicit live-release authorization, one release gate, GitHub main promotion, separate Vercel artifact/host verification and genuine owner Google/password/AAL2/Turnstile acceptance. The fix is locally prepared and compiled, not deployed. No provider/database/credential/DNS change occurred. Do not infer production503 recovery from mock responses or earlier widget success.

Rollback this bounded source change as one unit (Google handlers, router/cookie/client/runtime/form, shared challenge, audit/test/scripts and records), then restore each prior deployment if released. Preserve active BFF flags, existing secrets, canonical business data and all pending original actor/body/command keys. No database rollback or auth-mode bypass is required. If genuine login still returns503, use the safe correlation ID to inspect exact current Admin preauth/session telemetry once Vercel log access is available; repair only the observed failing boundary under its MAP authorization.
