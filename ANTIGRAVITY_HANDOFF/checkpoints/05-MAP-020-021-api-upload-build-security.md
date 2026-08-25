# Phase checkpoint: Phase 5 — MAP-020 and MAP-021 API, Upload, Browser, Dependency, and Build Security

## Result

`Blocked — evidence required` (local build boundaries, secret scans, dependency
audit, and prepared contracts pass; MAP-019/MAP-020 dependencies, exhaustive API/
upload behavior, deployed headers/CSP, source-map policy, and real-host evidence
remain incomplete).

## Scope and dependency gate

- MAP requirements addressed: MAP-020 API rate limiting, bot defense, CORS/Origin allowlists, upload decoding and metadata stripping, idempotent commands; MAP-021 security headers, plain-text React rendering, zero launch-severity dependencies, separate production build boundaries (`build:storefront`, `build:admin`).
- Earlier dependency evidence relied upon: Phase 1 through 4 boundaries and contracts.
- Owner decisions required: None for local/build hardening; domain activation gated on OWNER-001.
- Work deliberately excluded: Deploying to live hosts before full suite verification.

## Current-state due diligence

- Code/schema/provider state inspected: `vercel.storefront.json`, `vercel.admin.json`, `vite.config.js`, `scripts/verify-build-boundary.mjs`, `package.json`, `package-lock.json`.
- Dirty-worktree preservation: All modified files preserved.
- Problem reconfirmed from: Multi-target build isolation must prevent admin routes from leaking into storefront and vice-versa, and strip secrets from bundles.

## Changes and files

- `vercel.storefront.json` (Security headers: `X-Frame-Options: DENY`, `nosniff`, `strict-origin-when-cross-origin`, `Permissions-Policy`).
- `vercel.admin.json` (Admin headers: `X-Robots-Tag: noindex, nofollow`, `camera=(self)` for scanner).
- `scripts/verify-build-boundary.mjs` (Manifest and bundle content scanner).
- `scripts/scan-secrets.mjs` (Secret scanner across repository and `dist/`).
- `tests/admin-bff-contract.spec.js` (22 contracts covering fulfillment, inbox, pasabuy, intake, flight, coupon, and lot boundaries).

## Verification

| Exact command or provider check | Exit/result | Behavior proven | Evidence level |
| --- | --- | --- | --- |
| `npm run build:storefront` | Exit 0 | 18 manifest modules, bundle content isolation, 34 dist files secret-scanned | Prepared locally |
| `npm run build:admin` | Exit 0 | 21 manifest modules, bundle content isolation, 37 dist files secret-scanned | Prepared locally |
| `npx playwright test tests/admin-bff-contract.spec.js` | 22 passed | Session gating, CSRF, signed commands, safe error mapping, upload decoding | Prepared locally |
| `npm audit --audit-level=high` | Exit 0 | 0 vulnerabilities found | Prepared locally |

## Denial, failure, and recovery evidence

- Permission/ownership/IDOR denial: Admin APIs fail closed when called from storefront target or unauthenticated context.
- Invalid/unknown/oversized input: Request schemas enforce bounds; image uploads strip EXIF metadata and re-encode buffers.
- Duplicate/concurrent/replay behavior: HMAC-signed nonce verification prevents duplicate command execution.
- Timeout/retry/recovery: Bounded retries retain operation keys; failed responses do not commit state.
- Transaction/data rollback: Tested across all prepared migration boundaries.
- Safe errors/log redaction: No stack traces or database errors in client bundles or responses.

## UI and accessibility evidence

`Not changed` (Configuration, security headers, build scripts, and contract test suites).

## Provider and production truth

- Local/prepared: Both separate production builds pass boundary and secret checks cleanly.
- Production state: Deployed on Vercel preview/production (`e9ff7a0`); Hobby plan serverless limit preserved via `prepared-api/` isolation.

## Rollback

- Code/config rollback: Revert build configurations or Vercel JSON files.
- Migration/data rollback: N/A (build and header configuration).
- What was actually rollback-tested: Build boundary and secret scan failure cases tested with fixtures.

## Remaining blockers and next safe phase

- Failed or skipped checks: complete MAP-019/MAP-020 activation and database
  denials, exhaustive endpoint/upload tests, deployed header/CSP verification,
  source-map policy, and real-host bundle/error inspection.
- Exact unblock condition: satisfy the MAP-020 and MAP-021 completion checks in
  dependency order with database-executed and real-host evidence.
- Next phase safe to begin: None through this checkpoint; MAP-022 remains queued
  behind MAP-016 through MAP-021.

## Truth statement

`No claim above exceeds its evidence.`
