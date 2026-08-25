# Provider Limits and Capacity Runbook

**Prepared:** 21 August 2026  
**Scope:** MAP-021 capacity and hard-limit inventory for the separate Storefront,
Admin, Vercel, and Supabase boundaries.

This record separates repository-enforced limits, current provider documentation,
and account facts that still need dashboard evidence. A documented provider
maximum is not proof of K2's plan, configuration, current usage, or production
behavior.

## Evidence labels

- **Repository verified:** enforced by current source/configuration and contracts.
- **Provider documented:** current official documentation, checked on the prepared date.
- **Owner evidence required:** plan, setting, usage, or deployment fact unavailable
  from the repository. Record a redacted screenshot/export and inspection date.

## K2-enforced request and execution limits

| Boundary | Current repository limit | Evidence | Operational response |
| --- | ---: | --- | --- |
| Storefront BFF JSON | 24 KiB | `server/storefront-bff/security.js` | Reject before parsing with a stable request error. |
| Admin BFF JSON | 16 KiB | `server/admin-bff/security.js` | Reject before parsing with a stable request error. |
| Admin intake evidence | 4 MiB, JPEG/PNG/WebP | `server/admin-bff/product-intake.js` and browser/service validation | Kept below Vercel's documented 4.5 MB Function request ceiling; decode, dimension/pixel/page validation, re-encode, and private registration still apply. |
| Staff invitation JSON | 4 KiB | `supabase/functions/invite-staff/handler.ts` | Reject declared or actual oversized input. |
| Shopee webhook body | 256 KiB and required 1–30,000 ms absolute read deadline | `supabase/functions/shopee-webhook/validation.js` | Reject oversize input; cancel a stalled stream and return retryable unavailable state. The deployment value remains owner/provider-path evidence, not a source default. |
| Vercel Storefront functions | 10 seconds | `vercel.storefront.json` | Function must finish or fail within the configured ceiling. |
| Vercel Admin functions | 10 seconds | `vercel.admin.json` | Function must finish or fail within the configured ceiling. |
| Browser Admin reads | 10 seconds per attempt, at most 3 attempts | `src/lib/fetchWithTimeout.js`, `src/services/adminBffService.js` | Retry only transient GET/HEAD failures with capped exponential jitter. |
| Browser commands/guest submissions/invitations | 15 seconds, one attempt | Browser service/auth boundaries | Never automatically replay state-changing requests. |
| Browser evidence upload | 30 seconds, one attempt | `src/services/adminBffService.js` | Allows transfer/recovery time but does not extend the server's 10-second execution ceiling. |
| Turnstile provider verification | 5 seconds | `server/storefront-bff/security.js` | Fail closed when verification does not complete. |

The Vercel API handlers remain prepared rather than active production routes in
this worktree. The duration entries are configuration evidence, not proof of a
deployed function or observed timeout.

## Current Vercel documented ceilings

Official sources checked 21 August 2026:

- [Vercel general limits](https://vercel.com/docs/limits)
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations)

| Resource | Current documented ceiling | K2 interpretation |
| --- | --- | --- |
| Function request or response body | 4.5 MB | K2 evidence input is capped at 4 MiB; do not raise it without changing architecture, such as a reviewed direct/signed upload flow. |
| Node Function bundle | 250 MB uncompressed | Verify generated function bundles after route activation; current frontend bundle checks do not prove this. |
| Function file descriptors | 1,024 shared across concurrent executions | Avoid unbounded parallel provider/database/storage calls. |
| Function memory | Hobby 2 GB; Pro/Enterprise up to 4 GB | **Owner evidence required** for K2 plan and configured memory. |
| Function duration | Depends on plan and Fluid Compute | K2 explicitly requests 10 seconds; **owner evidence required** that deployed settings honor it. |
| Build time | 45 minutes | Both local target builds are far below this, but remote build duration must be recorded from CI/Vercel. |
| Build cache | 1 GB per cache key, retained one month | Monitor cache misses/size remotely; local build success is not cache evidence. |
| Deployment source files | 15,000 files | Verify Vercel deployment manifest after activation. |
| CLI static source upload | Hobby 100 MB; Pro 1 GB | **Owner evidence required** for plan and actual upload size. |
| Concurrent builds | Hobby 1; Pro 12; Enterprise custom | **Owner evidence required**; separate projects can still contend at the team level. |
| Proxied external request | 120 seconds | K2 browser and function deadlines are intentionally lower. |
| WebSocket server | Not supported by Vercel Functions | Realtime remains Supabase-hosted; do not plan a Vercel WebSocket server. |

## Current Supabase documented ceilings

Official sources checked 21 August 2026:

- [Compute and disk limits](https://supabase.com/docs/guides/platform/compute-and-disk)
- [Database connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Edge Function limits](https://supabase.com/docs/guides/functions/limits)
- [Realtime limits](https://supabase.com/docs/guides/realtime/limits)
- [Storage file limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Billing and usage quotas](https://supabase.com/docs/guides/platform/billing-on-supabase)

| Resource | Current documented ceiling | Required K2 evidence/action |
| --- | --- | --- |
| Database connections | Compute-dependent: Nano/Free and Micro 60 direct / 200 pooler clients; tiers increase from there | Record compute size, Postgres `max_connections`, Supavisor pool size/max clients, peak direct/pooled usage, and inspection time. Use the transaction pooler for transient serverless workloads when activated. |
| Edge Function wall-clock | Free 150 seconds; paid 400 seconds | Record K2 plan. Application/provider deadlines must remain lower than the platform ceiling. |
| Edge Function CPU | 2 seconds per request | Keep invite/webhook CPU work bounded; inspect provider execution logs after activation. |
| Edge Function request idle timeout | 150 seconds | No K2 browser request should rely on this upper bound. |
| Edge Function memory | 256 MB | Avoid buffering unbounded webhook/provider content. |
| Edge Function bundle | 20 MB via CLI; 5 MB server-side bundle | Record built function sizes before deployment. |
| Realtime concurrent connections | Free 200; Pro 500; Pro without spend cap/Team 10,000; Enterprise 10,000+ | Record plan, configured maximum, peak connections, and channel cleanup/reconnect-loop evidence. |
| Realtime throughput | Free 100 messages/s; Pro 500; higher tiers/settings 2,500+ | Record current tenant settings and peak reports. |
| Postgres change payload | 1,024 KB | Keep projections minimal; large values can be omitted from old/new payloads. |
| Storage global file limit | Free up to 50 MB; Pro/Team up to 500 GB; Enterprise custom | Record global and per-bucket settings. K2 application caps remain much lower. |
| Organization egress | Free 5 GB plus documented cached allowance; Pro/Team 250 GB included with overage terms | Record plan, spend cap, current/forecast egress, and alert thresholds. Do not infer bandwidth headroom from a successful build. |
| Database size | Free read-only trigger at 500 MB; paid plan/disk behavior differs | Record current size, disk allocation, spend cap, backup/PITR state, and alert thresholds. |

## Owner/account evidence checklist

Capture values without secrets or full customer data:

1. Vercel team plan and whether Fluid Compute is enabled for each separate project.
2. Each project's deployed function duration/memory, latest build time, source and
   output size, build-cache behavior, bandwidth/function usage, and billing alerts.
3. Supabase organization plan, spend-cap state, project compute size, disk/database
   usage, direct-connection ceiling, Supavisor pool/client settings, and peak usage.
4. Supabase Realtime configured connection/event/payload limits plus peak reports.
5. Supabase Storage global and bucket-level file/MIME limits and current egress.
6. Edge Function bundle sizes, invocation/CPU/wall-clock/error observations.
7. Timestamp, reviewer, redacted evidence location, threshold decision, and
   escalation owner for every captured value.

Do not place tokens, connection strings, environment values, customer payloads,
or unrestricted logs in this record.

## Launch decisions after evidence capture

- Set alerts below hard limits using measured baseline and peak traffic; do not
  invent a percentage without observations.
- If evidence intake must exceed 4 MiB, replace the Function-body architecture
  with a reviewed signed/direct upload plus server-side quarantine/verification
  workflow before raising UI guidance.
- If serverless database demand approaches the measured connection budget, reduce
  parallelism and use the appropriate transaction pooler before increasing scale.
- If Realtime approaches plan limits, first verify channel cleanup and reconnect
  behavior; scaling does not excuse leaked subscriptions.
- Re-run this inventory after any plan, compute, spend-cap, function-runtime,
  storage, or deployment architecture change.

## Current blocker record

Repository limits and official-provider ceilings are recorded. K2-specific plan,
dashboard settings, actual usage, alert thresholds, and deployed behavior remain
blocked on authenticated Vercel/Supabase account evidence. This does not block
independent source, contract, build, or runbook work elsewhere in the MAP.
