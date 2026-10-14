# Admin login dependency repair — installed, real login pending

Production continuation: owner replied “proceed” to this exact linked packet. Applied once on K2 at 2026-10-14T14:28:49.485Z, HTTP201 acknowledgement. Independent read-only postflight returned K2_ADMIN_PREAUTH_RATE_POSTFLIGHT_OK at 2026-10-14T14:29:45.872Z; normal readiness has8verified/2owner/3connector/0failed, including exact installed pre-auth body/grants/private tables. Refreshed live form renders without the prior stale error; Cloudflare requires human completion. No credentials or CAPTCHA were submitted. Actual login/MFA remains MAP-025. Durable receipt: ADMIN_PREAUTH_DEPENDENCY_APPLIED_20261014.json. Earlier preparation statements below are historical and do not mean the packet is pending or may be replayed.

Owner request: restore real staff login after the hosted Admin reports “The secure admin service is temporarily unavailable.” Owning work: MAP-025 / IDEA-20261014-06. This receipt supersedes any inference that the earlier restored button and Cloudflare rendering established successful login.

## Observed production failure

Read-only metadata on K2 `pixplcjqivlfflickobf` confirms the signed rate RPC `public.consume_admin_preauth_rate_v1(text,bigint,uuid,text,text,text)` and both `k2_private.admin_preauth_rate_nonces` / `admin_preauth_rate_buckets` absent. The existing Admin session RPC and 32-byte signer are present. Password login and Google start invoke this missing dependency before provider authentication; its unavailable result causes the service 503. This is not evidence that the account is locked. Actual account/OAuth/MFA acceptance remains unverified. The separate missing best-effort `record_security_event_v1` is a monitoring gap, outside this additive repair.

## Exact proposed production change

Apply **once, only after explicit owner approval**, to the exact K2 project:

- Payload: `supabase/prepared/20261014_admin_preauth_dependency.sql`.
- SHA256: `921D8EEB9361F9EEC16411CCE313D5FED1D1FBEF3126143418F476504BFB9457`.
- Reuses the unchanged sole migration `supabase/migrations/20260825_admin_preauth_rate_boundary.sql`, SHA256 `F82320CD5731D65944663516CA7433EEAAB9BE94C4BE9281CE241BA5187E1CFC`. Adds atomic refusal of any existing same-name public function or either table, and the existing postflight assertions before commit. There is no second rate implementation.
- Creates only two private, forced-RLS nonce/rate tables and the server-signed rate RPC. Grants RPC execution to `anon` only; denies PUBLIC/authenticated execution and browser table access. Keeps the existing signer. Stores HMAC subjects only. Existing account records, roles, passwords, inventory and orders are untouched. Schema cache notification is included. No historical migration ledger is rewritten.
- Existing limits remain: login IP20/15min, subject10/hour, global300/min; existing MFA/recovery limits and signature/replay defenses remain unchanged.

No production SQL or provider configuration change has been performed in this investigation. Source-release approval for IDEA-20261014-05 does not authorize this new payload.

## Passing preparation evidence

- Fresh read-only project identity: exact K2 ref and URL confirmed before metadata queries. No ScoutIT connector access.
- `node scripts/rehearse-map020-admin-preauth-rate.mjs`: existing native migration, signed login/MFA/recovery, rate denial persistence, nonce replay, HMAC privacy, privileges, postflight and idempotent historical replay passed.
- Exact guarded packet qualified in a fresh isolated local database with the existing bootstrap/behavior/postflight fixtures. Atomic installation and repeated-install refusal passed. An initial generated packet had dollar-quote corruption and failed before commit; the generator was corrected, and the final hash above passed. Local test database removed and owned runtime stopped.
- `npm run security:test-live-readiness`: 25/25 pass. Missing dependency, partial installation, source/grant drift and unexpected permission extensions are refused. Preparation mode marks only exact complete absence as owner-pending; it grants no write authorization.
- Final `npm run verify:development`: exit0, source/security/import checks pass; secret scan covers2450files. No redundant application build/release/browser suite was run for these readiness-only changes.
- Normal live readiness: exactly one failed gate, `admin-preauth-dependency`; expected and proves the missing dependency is now detected. Preparation readiness: 7 verified, 3 owner, 3 connector, **0 blocked**, exit0. Connector-unreached and real hosted acceptance are not represented as observed.
- Encrypted backup: `.tools/current-production-backups/admin-preauth-before-20261014.k2backup`, backup ID `current-pixplcjqivlfflickobf-2026-10-14T140736304Z-b68bde1bac4b`. Isolated restore verified at `2026-10-14T14:17:21.941Z`, 71 public relations, latest ledger `20261013110000`. Managed Vault/Storage objects/provider settings are excluded; this is an application-database recovery proof.
- Readiness records: `.tools/current-production-backups/admin-preauth-normal-20261014.json` and `admin-preauth-prepared-20261014.json`. Diagnostic and local logs stay in ignored `.tools`; no secret is included in this tracked receipt.

## Approval, apply and recovery procedure

Exact next action: obtain owner approval of the payload/hash above. Record that approval under MAP-025. Immediately before applying, rehash the packet, rerun `npm run preflight:k2-project` with the owner K2 environment and `node --env-file=.env.local scripts/k2-live-readiness.mjs admin-preauth-before-apply.json --prepare-admin-preauth`; require zero failed gates and current verified backup evidence. Refuse any changed/partial installation. Execute the exact transaction once against K2; do not retry an uncertain acknowledgement.

After confirmed commit, use fresh read-only metadata and `supabase/map020_admin_preauth_rate_postflight.sql` assertions, then normal live readiness (without preparation flag). Require the exact function body/hash, grants and both forced-RLS table boundaries. The installed permission profile may add only this exact signed RPC. Have the owner test Google/password and MFA on `https://admin.k2jimzon.com/`; never mark real login verified from metadata alone. No app redeployment is required to expose the newly installed RPC to the already deployed BFF.

If apply fails before commit, PostgreSQL rolls back the packet. If acknowledgement is uncertain, reconcile read-only exact objects/body/grants before any further action; never blindly replay. If a confirmed installed boundary causes a new fault, retain both tables and nonce/rate data, keep secure BFF gates, and investigate under MAP-025. Emergency execution revocation requires a separately approved `REVOKE EXECUTE ON FUNCTION public.consume_admin_preauth_rate_v1(text,bigint,uuid,text,text,text) FROM anon;` and deliberately stops login; it is not a working-login rollback. Do not drop growing rate data or switch to unsafe direct login. Full encrypted application-database restoration is a separately approved last resort, not automatic recovery.

Changed local source: readiness gate/classifiers, its focused tests and package test command. No application UI code changes in this repair. Local preparation is distinct from permanent installation, deployed behavior and real authenticated acceptance. MAP-025 remains open until those steps are evidenced.
