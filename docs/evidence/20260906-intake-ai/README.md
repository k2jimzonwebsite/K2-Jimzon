# Automatic intake preparation — 6 September 2026

Owner: MAP-018 / MAP-028 I-016, IDEA-20260906-05 (extends IDEA-20260830-01).
Checkout: `.tools/hero-release`, `codex/automatic-intake-preparation`, baseline
04734cb. Local, uncommitted preparation only. No paid calls, keys requested,
deployment, production migration or provider changes occurred.

## Implemented boundary

The Admin-only POST `/api/admin/product-intake/ai` composes content, read,
candidate, image review and attachment actions. Existing cookie-session,
origin, CSRF and AAL2 authorization runs first. A separate HMAC action namespace
uses the existing private request secret and nonce/rate tables without replacing
the shared signer allowlist. SQL requires exact session ownership even for Admin.

Jobs snapshot registered evidence, actor, request, prompt/schema version,
reviewed content, brief, reservation, usage/result, failure, latency and review.
One job per session/step prevents repeat paid dispatch even with a new browser
request ID. SQL commits the dispatch claim and reservation before the provider.
Unknown outcomes retain reservations permanently; no timer releases them and
no retry dispatches again. Completion persistence may retry twice. A process
death before dispatch can conservatively consume a reservation without a paid
call. This sacrifices availability to prevent duplicate spend.

The shared config row serializes budget reservations across sessions. Product
budget identity is the normalized intake barcode/scanned identity (not inferred
SKU). Staff must use the same exact variant identity; this does not solve alias
equivalence across different typed identities. Session and monthly caps remain
authoritative even if staff creates another identity. No unattended retries or
regeneration of the same slot are supported; use the manual fallback.

Content references must resolve to supplied registered package slots and valid
schema fields. Source evidence bytes must match the registered SHA-256. Inputs
are decoded, stripped of metadata and reduced to at most 2048px, maximum 4:1
aspect ratio, before provider calls. Outputs use the real product contract.
Schema validation cannot establish factual truth: staff must compare the draft
with the original evidence. AI fields default unaccepted when loaded.

Image requests require a saved name/content review and an explicit composition
brief. Each candidate is one fully decoded 1024px PNG, at most 2 MiB. Results
are stored privately in PostgreSQL, not an expiring provider URL. List/recovery
responses omit image bytes; one candidate is retrieved at a time to remain
under response ceilings. Acceptance records a reason. Only after canonical
Draft creation does an explicit attachment upload/register the image and call
the existing signed product-media assignment. The transaction checks the prior
media snapshot and records the attachment receipt atomically. Original intake
evidence remains unchanged. A failed public upload registration/attachment can
leave a deterministic object; retry the same candidate or use the existing
product-media orphan reconciliation. Never delete the durable job to retry AI.

## Verified evidence and limits

- `npm run test:intake-ai`: **24 passed** on the latest JS implementation.
  Real adapter with simulated provider responses; no provider calls. Includes
  malformed/prohibited fields, evidence checks, fetch/body timeout, refusal,
  no retry, image decoding, completion retry and canonical orchestration.
- Focused existing intake/Admin/capacity/release contracts: **69 passed**.
- `npm run test:intake-ai-ui`: **2 passed** on the final implementation
  at 375×812 reduced motion, including the real modal's persisted field-review
  transition, initially unaccepted content and canonical Draft request.
  Screenshot `phone.png` is a fabricated candidate, not product photography.
  It proves component recovery/review interactions with intercepted API data,
  not authenticated server or a paid-provider call.
- `npm run rehearse:intake-ai`: final local PostgreSQL 17.11 rehearsal passed
  signed lifecycle, cross-owner/AAL1
  denial, invalid signature, candidate recovery/review, refusal without Draft,
  persistent timeout reservations, monthly hard stop, concurrent cap enforcement
  and idempotent migration replay with the final composed-media bootstrap.
- The latest composed rehearsal adds the real existing spend-control signer and
  product-media migration, positive attachment, stale-media rejection and receipt
  replay. The initial execution approval limit later cleared; the composed rerun
  exposed and corrected a fixture cap-ordering error, then passed. Windows local
  loopback PostgreSQL only; no production URL is accepted by this runner.
- Both sequential `npm run build:storefront` and `npm run build:admin` passed
  boundary, budget, import and bundle-secret gates on the final application code.
  Storefront landing 149.89/150 kB gzip; Admin 186.91/300 kB minified.
- Security inventory: 92 Admin routes, zero route-control classification gaps,
  unexpected PUBLIC grants or unexpected anonymous grants on the checked source.

Independent review found the skipped persisted `field_review` transition and
missing positive SQL attachment proof. Both are now corrected with passing
composed SQL and real-modal automatic content→review→Draft fixtures. A requested
second independent review could not run because that agent's usage limit remained
exhausted; the primary agent inspected the final integration and ran the tests.
Production/provider acceptance remains unperformed; do not claim only keys remain.

## Official provider capability and cost review

Sources opened 6 September 2026:
[GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini),
[GPT Image 1](https://developers.openai.com/api/docs/models/gpt-image-1),
[vision costs](https://developers.openai.com/api/docs/guides/images-vision),
[image edits](https://developers.openai.com/api/docs/guides/image-generation),
[model catalog](https://developers.openai.com/api/docs/models/all).

Content snapshot: `gpt-4.1-mini-2025-04-14`, image inputs and structured outputs.
Published uncached token prices are $0.40/M input and $1.60/M output. Our 6000
output-token maximum costs $0.0096. Even conservatively counting all 4096
32px patches per 2048px square input, three images, a 1.62 image multiplier and
20,000 text/schema tokens gives input under $0.016. The $0.10 reservation is
above this bound; no search/tool charges are requested. Revalidate pricing and
schema token length whenever this version changes.

Image alias: `gpt-image-1`, medium 1024-square output, one image, high fidelity.
Published costs: $0.042 output plus $10/M image input and $5/M text input.
The 4:1/2048px normalized bound limits the shortest-side-512 representation to
four tiles. 65 + 4×129 + 6240 = 6821 input image tokens is under $0.069;
even budgeting 10,000 prompt tokens adds only $0.05. A $1 reservation exceeds
the resulting $0.161 bound. These are conservative reservations, not billed
actual costs; `actual_usd_micros` remains null pending invoice reconciliation.

**Activation caveat:** the official catalog now labels `gpt-image-1` deprecated.
It is an alias, not an immutable dated snapshot. No account access or continued
availability was tested. Confirm a supported, approved image model before
activation; if changing it, update adapter, SQL snapshot, cost bounds, fixtures
and owner configuration together. Never set `K2_AI_PRICING_REVIEWED=true` solely
because this document exists. `store:false` is not a zero-retention guarantee.

## Recovery / rollback

Keep `K2_INTAKE_AI_ENABLED=false` to disable new paid calls; recovery and manual
intake remain available. Disable owner paid-path configuration for a database
hard stop. Already committed dispatches may finish; reservations must remain.
Preserve the job and media receipt tables for reconciliation. Roll back the
UI/route change through scoped Git changes, not a worktree reset. After any
future activation, do not drop audit/job tables as a rollback. Public candidate
orphans use the existing media orphan controls; no direct SQL stock/media edits.

All remaining work and activation order stay in the owning MAP entry and the
Product Intake runbook. This file is evidence, not a second backlog.
