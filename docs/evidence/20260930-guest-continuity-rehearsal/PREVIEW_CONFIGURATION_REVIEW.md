# Existing K2 Preview configuration review

MAP-017/018/019/020/022/023; IDEA-20260930-04 preparation and the accepted
channel-listing handoff. This record describes provider scope and current evidence,
not another backlog or authorization. Existing K2 remains the only backend.

## Verified provider scope

Storefront is Vercel project `prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL` (`k2-jimzon`),
team `team_C3Wf3dVUBjUqGQ4rndMTCchz`. The separate Admin project is
`prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x`; this proposal changes no Admin settings.
The target Git branch is exactly `codex/map017-guest-chat-preview`, with origin
`https://k2-jimzon-git-codex-map017-guest-chat-preview-k2-jimzon.vercel.app`.

Fresh signed-in Vercel UI read found only deployment target and the browser
Supabase pair in global Preview scope. Server Supabase, request key, origins,
cookie and BFF switches remain Production-scoped. Neither Turnstile key appears
in the project variable list. Values were not revealed. The connected project's
detail tool rejected its advertised argument shape twice; list-projects and the
signed-in UI supplied the evidence instead.

The empty unsaved Add form verified the exact branch selector. Selecting that
branch leaves the default Production selection active. The reviewed procedure
must explicitly uncheck Production; verified final unsaved scope was only the
feature branch, with Production/global Preview/Development unchecked. Close
discarded the form, and the original list remained unchanged; no value was entered
and Save was never clicked. `preview-configuration-preflight.json` records this
observation. Official [Vercel environment documentation](https://vercel.com/docs/environment-variables)
confirms branch overrides and that new variables affect subsequent deployments.

Supabase URL readback is `https://pixplcjqivlfflickobf.supabase.co`. The modern
default publishable key ID is `628ef935-6697-46bb-96fb-580fd0157ecb`, enabled.
The legacy `anon` key is disabled. Use the same enabled modern key for both
browser/server pairs; do not use privileged keys. Values are omitted here.

## Prepared branch-only values

Every entry below is scoped only to that exact branch, never global Preview,
Production, Development, team-wide or Admin. Capture prior branch entry IDs,
types, scopes and recovery references before a separately approved change.

| Variable | Reviewed value or remaining private binding |
| --- | --- |
| `K2_DEPLOYMENT_TARGET` | `storefront` |
| `SUPABASE_URL` | `https://pixplcjqivlfflickobf.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Enabled modern key ID above |
| `VITE_SUPABASE_URL` | Same K2 URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same enabled modern key |
| `K2_STOREFRONT_ORIGINS` | Exact feature origin above |
| `K2_GUEST_BFF_SECRET` | Fresh independent 32-byte base64 Secret, matching the private K2 request key; generate/bind only in the approved secret procedure |
| `K2_COOKIE_SECURE` | `true` |
| `K2_TURNSTILE_SECRET_KEY` | Selected real widget's server Secret; account/widget binding pending |
| `VITE_TURNSTILE_SITE_KEY` | That same real widget's public site key; binding pending |
| `K2_TURNSTILE_ALLOW_UNCONFIGURED` | `false` |
| `K2_STOREFRONT_BFF_ENABLED` | `false` during preparation; later `true` requires all-route gates and specific approval |
| `VITE_GUEST_BFF_ENABLED` | `false` during preparation; later `true` last after server/denial proof and specific approval |
| `VITE_CUSTOMER_ACCOUNT_ENABLED` | `false` until its separate Auth/account acceptance |

The database also needs its separate fresh private 32-byte contact-HMAC key.
No signing/contact key was generated, copied from Production, logged or committed.
Keep these out of browser/VITE values, screenshots and chat. A changed Secret
cannot be recovered by revealing it later in Vercel; preserve an approved private
recovery reference or remove only the new branch entry to resume its captured
prior state. Do not alter the inherited global or Production entries.

Cloudflare navigation resolved to its sign-in page; account/widget/hostname
settings could not be verified. The owner has been asked to sign in or identify
the existing K2 Turnstile setup. No account/widget was created or changed. Its
real token must validate the exact hostname and expected action, expire/replay
correctly and fail closed; static test credentials cannot establish acceptance.
See [Cloudflare validation documentation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## Activation and recovery boundary

`api/storefront/index.js` has one server flag for the complete 17-route router;
enabling it is not a chat-only change. All route dependencies, authorization,
rate, replay, bot, shipping and Website-membership controls must be verified
before any activation. The browser account flag alone does not close server
account routes. The prepared exact-host routing exception remains separate
from environment scope: retain the original path-only 404 until its own approved
stage/test/publish, preserve it for all other hosts, and restore the original
export on failure. Never remove that rule globally.

Read-only live membership audit found 30 products, 22 published, zero Website
listing rows across canonical/legacy Website spellings, and no canonical
channel/shop tables. Turning on strict membership filtering now would exclude
all 22 current published products. Do not auto-assign or bulk-unpublish them.
Protected staff assignment and reviewed membership must precede that release.
`website-membership-preflight.json` records aggregate/source metadata only;
it does not prove behavioral order denial or physical stock. Source review also
shows the prepared latest order replacement trusts a bounded client fee/status;
server calculation/confirmation is still MAP-018/023 work, not a passing gate.

New-envelope off-site upload/retrieval is pending its exact three-file approval
in `BACKUP_UPLOAD_REVIEW.md`. The guarded installation/deactivation review is
`INSTALLATION_REVIEW.md`; actual provider after captures/recovery generation
precede key/connection changes. Recovery retains installed schema/data. Refresh
preflight and backup before any later apply. No provider SQL, setting, key, flag,
routing, assignment, stock, connection or live conversation changed in this review.
Remaining execution and owner/provider gates live only in the owning MAP items.
