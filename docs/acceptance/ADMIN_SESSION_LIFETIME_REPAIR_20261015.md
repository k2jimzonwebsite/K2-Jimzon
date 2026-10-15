# Existing-authenticator session registration — installed, real login pending

Applied continuation: owner replied “approve” to this exact linked packet. One dispatch was acknowledged HTTP201 at 2026-10-15T01:09:55.799Z. Independent read-only postflight 2026-10-15T01:10:08.349Z confirms exact after hash and unchanged owner/definer/searchpath/authenticated-only grants. Fresh normal readiness has8verified/2owner/3connector/0failed. Owner is asked to submit a fresh existing-authenticator code privately; dashboard/login remains unverified. Durable receipt ADMIN_SESSION_LIFETIME_APPLIED_20261015.json. Preparation statements below are historical and never permission to replay.

Owner reports “The secure admin service is temporarily unavailable” and asks the agent to inspect the browser. MAP-025 / IDEA-20261015-01 owns this repair. Browser inspection confirms the existing-authenticator challenge screen with the service error after verification. Do not infer that authenticator enrollment is needed. Never copy, retain or replay the displayed one-time code.

## Root cause and reproduced failure

Fresh read-only exact-K2 metadata confirms `public.execute_admin_session_command_v1(text,bigint,uuid,uuid,text,text)` requires `v_expires_at = v_created_at + interval '8 hours'`. The deployed server prepares and signs exactly seven days. After MFA, registration therefore raises `K2_ADMIN_SESSION_LIFETIME_INVALID`, which the route maps to generic `AUTH_UNAVAILABLE`. The browser observation locates the current failure after the existing-factor prompt; the isolated database reproduction establishes the lifetime incompatibility. Current user login success is not claimed.

The verified TOTP factor still exists on the K2 website staff account. No factor secret, password, refresh token or authentication cookie was queried or changed. The existing rate-limit installation remains intact. The current private session table has no lifetime cap requiring another schema change. The request verifier already supports session registration and requires staff identity, AAL2, signer, timestamp and replay/rate checks.

## Exact proposed change

Payload: `supabase/prepared/20261015_admin_session_lifetime.sql`.

SHA256: `E7620FA2B6A8DB2FECB906EB995FDBA28E14667E50312A3A6903531E4AED1DD6`.

This transaction replaces only the existing registry function's eight-hour expression with the seven-day expression already required by the application and source migration. It preserves every other byte of the observed definition, including signature, owner/SECURITY DEFINER/search_path behavior, staff/AAL2/HMAC checks, session ownership, revocation and limits. CREATE OR REPLACE preserves its ACL; no grants, accounts, factors, existing sessions, business rows, keys, provider settings or migration ledger are edited. A schema-cache notification is included. Lock timeout2s and statement timeout10s bound the transaction.

The transaction refuses any definition whose SHA256 differs from the observed before hash `D26C26C31A85B7F9F5BD7A7A40A9734CB35DE0227BA6D3E91A31E898F98A3B4E`. Before commit it requires the after definition hash `CBE4A555286A52597925315072AC5738916CE36167E2148D412404CBB7BEE5D6`. Reapplication is refused. No production write is performed yet. The earlier approval for packet921d8eeb covers a different dependency and does not authorize this payload.

## Evidence

- Fresh `npm run preflight:k2-project` passes exact K2 `pixplcjqivlfflickobf`.
- Fresh encrypted backup `admin-session-before-20261015.k2backup`, ID `current-pixplcjqivlfflickobf-2026-10-15T010543706Z-4e934acbe15d`; isolated restore verified `2026-10-15T01:06:09.603Z`,71public relations/latest ledger20261013110000. Excludes managed Vault/Storage objects/provider settings.
- The actual restored registry function rejects an actual correctly signed seven-day request with `K2_ADMIN_SESSION_LIFETIME_INVALID` (RED). Exact guarded payload then allows registration and verifies a seven-day registry row; test rows roll back (GREEN). This uses a restored existing staff/provider-session identity in the isolated database, not a forged production identity or production session mutation.
- Extended native checks pass: AAL1 denied, invalid signature denied, authenticated-only RPC grant retained, eight-hour request rejected after correction, repeat packet refused by source-drift guard. Restore deliberately omits ACLs, so the one tested RPC's observed production grants were explicitly calibrated locally before grant-preservation assertions. This is not proof that the restore retained original ACLs automatically.
- Original full-backup behavior pass is retained. First expanded rerun refused overwriting its immutable restore receipt; a separate encrypted local copy preserved that receipt. A later grant assertion correctly exposed the restore's omitted ACL calibration, then the calibrated run passed. No production change resulted from these local tests.
- Native logs: `.tools/admin-session-restore-rehearsal-20261015.log`, `.tools/admin-session-native-approved-acl-20261015.log`. Diagnostic definition/constraints: `.tools/admin-session-boundary-readonly-20261015.json` (no credentials).
- Read-only readiness exit0:8verified/2owner/3connector/0failed, with fresh encrypted backup and restore proof. `.tools/current-production-backups/admin-session-preparation-20261015.json`. Existing automated gate does not compare this session function's lifetime/body; the explicit before/after hash and real signed native reproduction are required additional checks. Zero failed gates alone did not prove operational login.
- Existing release-tested application already requests seven days; no application source edit or redeployment is part of this SQL packet. No redundant app build/full release rerun is needed for this provider-function-only correction.

## Exact next action and recovery

Obtain explicit owner approval of the payload/hash above, record it under MAP-025, then immediately refresh exact K2 identity, zero-failed readiness and backup freshness. Rehash and execute the exact transaction once. Preserve an immutable dispatch record and acknowledgement. On uncertain acknowledgement reconcile fresh read-only definition hash/grants/session boundary before any further action; never retry blindly.

After commit require exact after hash, unchanged authenticated/anon/PUBLIC grants, owner/definer/search_path and session constraints. Ask the owner to sign in using the existing authenticator, then inspect the resulting dashboard/session verification without reading its private code. Until that succeeds, retain MAP-025 and report real login as unverified. No QR re-enrollment or MFA bypass.

Failure before commit rolls the transaction back. For a confirmed applied change, retain all registry data and authenticator state. A separately approved hash-guarded restoration of the old function body would reinstate the eight-hour incompatibility and stop seven-day login; it is not a successful-login recovery. Never truncate sessions, reset factors, change passwords or restore an old database over newer data automatically. Source-only rollback cannot resolve this installed lifetime mismatch.
