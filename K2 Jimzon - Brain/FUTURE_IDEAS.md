# K2 Jimzon Future Ideas Intake

**Purpose:** durable intake and decision register for new ideas without becoming
a competing implementation backlog.

**Active implementation authority:** `../MASTER_ACTION_PLAN.md`

**Current pending intake:** IDEA-20260902-04

This is not a roadmap or backlog. An idea stays here only until it is audited
against the operations rulebook, current System Brain, actual code/data,
dependencies, risks, and existing Master Action Plan.

## Lifecycle

1. Capture the idea below with a permanent ID, without claiming it is approved
   or live.
2. Audit it using the gate in `../MASTER_ACTION_PLAN.md`.
3. Choose one outcome:
   - **Reject:** remove it from Pending idea intake and record the ID and reason
     in the Idea decision register.
   - **Duplicate/merge:** merge necessary scope into an existing MAP item, then
     replace the intake entry with a decision-register row naming that item.
   - **Unavailable dependency:** mark it Deferred in the decision register and
     name the System Brain limitation or Master Action Plan constraint that must
     change before re-audit.
   - **Accepted:** create or update a MAP item with objective completion checks,
     then replace the intake entry with a decision-register row naming that item.
4. Never implement directly from this file.

No idea ID is erased from this file after audit. The full wording may be reduced
to a concise decision row because Git preserves the original entry, but the ID,
outcome, destination, and reason remain searchable here.

The former multichannel control-center idea was audited into MAP-009 through
MAP-011. The former product-transformation idea was audited into MAP-002. Their
full earlier wording remains recoverable in Git history; only the actionable,
still-needed scope remains in the Master Action Plan.

On 14 August 2026, the multichannel messaging/inventory and inventory-custody
truth idea was captured, audited, and merged into MAP-023. The audit found that
the canonical models exist, but external messaging/stock adapters and a complete
receiver-confirmed custody history remain unfinished. This inbox is therefore
still empty; the accepted scope lives only in `../MASTER_ACTION_PLAN.md`.

On 21 August 2026, IDEA-20260821-01 captured a broad web-architecture and
production-readiness checklist covering scale, reliability, security, delivery,
data, observability, and incident practices. It was audited against K2's actual
Vercel/Supabase architecture and the active launch queue. Necessary launch scope
was merged into MAP-020 through MAP-025; connector-only patterns remain
conditional; and infrastructure intended for independently operated distributed
systems was rejected for the first launch. This inbox remains empty.

Also on 21 August 2026, IDEA-20260821-02 captured an Excel-compatible Sheet Mode
export, offline edit, preview, and safe re-import workflow. The audit found that
the current Admin can import insert-only Draft product CSV rows but cannot export
the current sheet or safely update existing records, while inventory spreadsheet
overwrites would violate lot, reservation, expiry, custody, and audit invariants.
The accepted catalog round-trip and separately controlled inventory-
reconciliation scope was merged into MAP-023. This inbox remains empty.

On 26 August 2026, IDEA-20260826-01 captured the uploaded K2 Interactive Shop
concept and the owner's clarification that product knowledge does not exist yet.
The audit accepted an AI-first but human-approved Product Knowledge workspace and
an optional shelf-based Interactive Shop as MAP-027. It reuses the canonical K2
catalog, inventory, basket, messaging, Pasabuy, and order-request flows; it does
not authorize a second commerce backend, invented product facts, automatic AI
publication, full 360-degree navigation, or generative-AI answers without
verified grounding. This inbox remains empty because the accepted unfinished
scope now lives only in `../MASTER_ACTION_PLAN.md`.

On 27 August 2026, IDEA-20260827-02 captured the owner's confirmation that
`k2jimzonwebsite@gmail.com` is K2 Jimzon's primary provider login, recovery
identity, and project contact. The gate found this is not a new implementation
stream: it clarifies the provider-account and domain-mail scope already owned by
MAP-024. It was therefore merged there, while branded `@k2jimzon.com` mail remains
a separate decision and no credentials are authorized for repository storage.

On 28 August 2026, IDEA-20260828-01 captured the owner's public-computer threat:
a staff member may leave Admin and another person may try browser Back/Forward or
history restoration, while ordinary phone tab/app switching must not expire a
valid session. The audit rejected browser fingerprinting, logout-on-every-hide,
and silent restoration on every browser. It accepted a default-unremembered,
owner-approved remembered-personal-browser policy, one active Admin login per
staff account, and fail-closed restoration/revalidation rules. This is merged
into MAP-024 for predeployment implementation and MAP-025 for supported-browser
real-host proof; it does not claim current or deployed behavior.

Also on 28 August 2026, IDEA-20260828-02 captured the owner's request to improve
the virtual store and transform the shopkeeper avatar into a high-quality
anime/cartoon human character in both 2D and 3D with polished expressions, hair,
and visual aesthetics while fixing scene framing and test suites. The audit
accepted this scope into MAP-027. It preserves all canonical inventory, single
cart, product knowledge, accessibility, and offline procedural asset constraints.
This inbox remains empty because the accepted scope is in MAP-027.

IDEA-20260828-04 captures the owner's correction after reviewing the moving
aisle: the clerk must remain human-sized and visually anchored while the camera
travels, and the desktop right rail must be a useful, visually coherent shelf
concierge rather than a large empty utility panel. The audit accepts this as a
MAP-027 correction, not a second shopping system. The rail may expose canonical
shelves, product highlights, stock labels, FAQs, and staff handoff only; the
existing catalog, product selection, basket, and checkout remain authoritative.

IDEA-20260828-05 captures the owner's rendered-scene correction after the first
staging fix: the clerk must dwell in a real architectural gap between shelf
bays, never intersect shelf boards while travelling, use a readable articulated
arm/hand silhouette, and expose only one live-chat entry. The shelves also need
two additional physical levels for future canonical assortment capacity. The
audit accepts this into MAP-027 as spatial/accessibility repair. It does not
authorize decorative inventory, a second conversation implementation, or a
parallel shelf/catalog model.

IDEA-20260828-06 captures the owner's request to finish the virtual-store staff
conversation: the clerk explains every active category from its authored shelf
definition, the one customer chat stays inside the room, and Admin can send a
customer-visible reply back into that same browser-granted thread. Staff must be
able to distinguish this trusted website/Virtual Store source before opening the
conversation. The audit accepts the canonical conversation/BFF extension into
MAP-027. A separate chat database, invented online presence, marketplace-delivery
claims, or a second Admin inbox are rejected. Near-live refresh reuses the
existing bounded polling/realtime paths until a reviewed socket service exists.

On 30 August 2026, IDEA-20260830-01 captured the owner's deliberate decision to
add a paid OpenAI API path as an optional alternative inside the existing
product-intake workflow. For each product, staff deliberately choose either
**Automatic API** or **Manual ChatGPT Projects**; neither path is silently
forced. The automatic sequence starts from Smart Scan package evidence, produces the exact
`k2.product-content.v3` structured content contract, validates it at the K2
server boundary, produces the standardized PRIMARY and AFTER image candidates,
and returns everything to the same resumable Admin intake session for explicit
staff acceptance. Its purpose is to fill the reviewable product-record side—
identity supported by the package, descriptions, usage, ordered instructions,
SEO fields, media briefs, and Draft image candidates—not physical inventory
quantity, cost, lot, batch, expiry, custody, price, approval, or publication.
The audit merged this into MAP-018 rather than creating a
parallel AI-product or inventory system. Manual two-Project copy/paste remains a
recovery path. The API may assist with evidence-backed product facts, copy, and
Draft image candidates; it may never assign SKU, price, cost, stock, lot, batch,
expiry, custody, review approval, or publication state. The owner accepts paid
API calls in principle. The SuperAdmin-only, versioned fail-closed control now
exists as prepared local code with per-product, per-session, and monthly caps;
exact model snapshots, cap values, provider retention settings, migration/
provider activation, and measured preview evidence still require explicit owner
approval.

IDEA-20260830-02 captures the owner's request for staff to compute sales and
commercial scenarios more easily inside Admin BOS. The audit found that the
current Overview already derives payment-verified revenue from canonical order
requests, while the floating tools expose only a basic calculator and a
two-field margin scratchpad. K2 can safely add submitted-request value,
payment-verified value, and fulfilled value from the same bounded order
projection. The accepted read-only record drilldown is now locally prepared
under MAP-023, with deployment and representative staff acceptance still
unverified. K2 cannot yet
claim settled payout or actual-profit truth: no canonical settlement ledger or
order-line exact-lot cost snapshot exists. The accepted scope therefore merges
into MAP-023 as one status-separated Sales Summary plus a richer, explicitly
non-posting sales planning calculator. The calculator may show gross sales,
discounts, net sales, unit/total cost, fees, gross profit, margin, markup, and
break-even price from staff-entered planning inputs; it never writes an order,
payment, cost, payout, tax filing, or accounting record. Actual profit and
settled payout remain unavailable until their canonical records and allocation
rules exist. This avoids inventing financial truth while materially reducing
manual arithmetic for staff.

IDEA-20260830-03 captures the next staff usability gap found while completing
the accepted sales drilldown: staff can reconcile the selected-period rows in
Admin but cannot take the exact filtered set into a controlled spreadsheet or
handoff without copying each row. The gate accepts a browser-generated,
read-only CSV export into MAP-023 because it reuses the same bounded canonical
order projection and requires no new provider, schema, credential, or mutation.
The export is limited to created time, internal order reference, normalized
channel, order state, payment state, and request value in PHP. It excludes
customer identity/contact data, line-item cost, payout, tax, actual profit,
secrets, and any field not present in the reviewed ledger. UTF-8 BOM/CRLF,
stable headings, spreadsheet-formula neutralization, exact active-filter parity,
and deterministic coverage are required. The file is a selected-period
operational extract, not a settlement, accounting book, or full-history backup.

IDEA-20260830-04 captures the reverse-pricing gap in the Admin Sales Planner.
The current forward mode tells staff the result of a chosen price, but staff
still have to guess repeatedly when the real question is the minimum selling
price needed to preserve a desired gross margin after a planned total discount,
fixed/other costs, and a percentage payment or channel fee. The gate accepts a
second mode inside the same non-posting planner and merges it into MAP-023. It
must define target gross margin as planned profit divided by net sales after
discount; define the percentage fee against gross sales before discount; solve
the price algebraically; round the unit price upward to the nearest cent; and
recompute the achieved scenario from that rounded price. It must reject
negative/non-finite values, fractional/zero quantity, margin outside 0–99.99%,
fee rate outside 0–99.99%, or target margin plus fee rate at/above 100%. The
result is a planning recommendation only and never sets product price, creates
an order, or claims actual profit, landed cost, tax, payout, or approval.

IDEA-20260830-05 captures the daily sales-close reconciliation gap. The Admin
now separates submitted, payment-verified, and fulfilled facts, but those totals
overlap and staff still have to reason manually about which paid requests await
fulfillment and whether any fulfilled request lacks verified payment. The gate
accepts a payment-by-fulfillment partition into MAP-023 because the existing
bounded order projection has both exact states and no schema, provider, or write
is required. Four mutually exclusive buckets—verified and fulfilled; verified,
not fulfilled; fulfilled, payment not verified; and neither—must reproduce the
selected-period request count and value exactly. The two actionable exception
buckets become read-only record/CSV filters. “Payment not verified” remains an
exact status fact, not a claim that money was unpaid, missing, or lost. No bucket
is described as payout, settlement, accounting, actual profit, or completed
customer communication.

IDEA-20260830-06 captures the discount-allowance gap in the Admin Sales
Planner. Staff can check a chosen price and solve a target price, but they still
have to calculate manually how much total discount a chosen selling price can
safely absorb while preserving a target planned gross margin. The gate accepts
a third planning-only mode into MAP-023 because it reuses the existing bounded
calculator and requires no product, promotion, order, or accounting write. It
must define target gross margin as planned profit divided by net sales after
discount; apply the percentage payment/channel fee to gross sales before
discount; solve the maximum total discount algebraically; round that allowance
downward to the nearest cent; and recompute the achieved scenario from the
rounded allowance. It must reject negative/non-finite values, fractional/zero
quantity, unsupported money or percentage values, and any chosen price that
cannot reach the target margin even at zero discount. The result is a planning
ceiling only and never creates or approves a promotion, changes canonical
product price, posts an order, or claims actual profit, landed cost, tax,
payout, settlement, or accounting truth.

IDEA-20260830-07 captures an inconsistency in the forward `Check a price`
planner. Its sibling target-price and maximum-discount modes calculate a
percentage payment/channel fee from gross sales, but forward mode currently
requires staff to calculate one peso fee manually. Its break-even result then
treats that entered fee as fixed, which understates the true break-even price
when a percentage fee rises with gross sales. The gate accepts a surgical
correction into MAP-023: forward mode must collect fixed fees and channel fee
rate separately, apply the percentage fee to gross sales before discount, show
goods/other-fixed/percentage-fee cost components, and solve break-even as
`(discount + goods cost + other costs + fixed fees) ÷ (quantity × (1 − fee
rate))`, rounded upward to cents. It must preserve the existing non-posting,
bounded, phone-safe boundary and never claim that planned costs are canonical
landed cost, tax, payout, settlement, accounting, or actual profit.

IDEA-20260830-08 captures the missing sales-target question in the Admin Sales
Planner: staff can evaluate or solve price and discount, but cannot calculate
the minimum whole units needed to reach a planned gross-profit target. The gate
accepts a fourth non-posting mode into MAP-023. It must use reviewed unit price,
unit cost, total discount, other/fixed costs, and a gross-sales percentage fee;
define per-unit contribution as `unit price × (1 − fee rate) − unit cost`; and
solve `ceil((target profit + total discount + other costs + fixed fees) ÷
per-unit contribution)`. It must recompute the cent-rounded scenario at the
whole-unit result and prove the immediately previous quantity misses the target.
It must refuse zero/negative contribution, invalid values, and requirements
above 100,000 units. The output is a planning target only and never creates a
sales quota, changes stock or price, posts an order, or claims actual profit,
landed cost, tax, payout, settlement, or accounting truth.

IDEA-20260830-09 captures the transcription gap after a valid Sales Planner
calculation. Staff currently have to retype assumptions and results into an
approval note or discussion, which can separate a number from its fee, discount,
cost, or target basis. The gate accepts one reusable `Copy planning summary`
action across all four modes into MAP-023. The copied plain text must be
deterministic for a supplied timestamp, name the mode, include the reviewed
assumptions and complete relevant result, and begin with a prominent statement
that it is not an approved price/promotion/quota, order, payout, settlement,
accounting record, or actual profit. It must contain no customer fields, expose
no copy action for invalid calculations, announce success, and provide an
inline clipboard-permission recovery error. Copying changes clipboard text only;
it never writes canonical product, promotion, inventory, order, payment, cost,
payout, tax, settlement, or accounting state.

IDEA-20260831-01 captures the owner's corrected channel direction and the
manual operating burden evidenced in the supplied owner screenshot. K2 must
first receive product, listing, price, and reported-quantity snapshots from each
individual Shopee, Lazada, TikTok Shop, Website, and future shop account; it must
not begin by pushing K2 quantities outward. The owner currently has to box
Pasabuy goods, total sales, calculate commissions and tax estimates, encode
stock, update books, and manage household responsibilities manually, so the
accepted outcome also includes one resumable phone-first **Owner Count & Close**
workflow inside Admin BOS rather than another disconnected spreadsheet or app.

The audit accepts the staged-import, human-reviewed approach and merges it into
MAP-023 and MAP-026. One K2 SKU remains the permanent identity of one sellable
variant. Every marketplace/shop SKU, external listing identity, reported
quantity, price, status, and observation time remains attributable to its exact
shop. Exact or normalized SKU/name/barcode evidence may suggest a match but may
never merge products automatically; an Admin approves the link or creates a new
Draft product whose K2 SKU is server generated. Different size, concentration,
flavor, shade, formulation, or pack count remains a distinct product even when a
provider reused a SKU or barcode. Approved manufacturer and K2 barcodes can both
scan to the one canonical product; ambiguous/reused codes remain
non-authoritative evidence.

Marketplace quantities are observations and proposed channel availability, not
physical Master Inventory. A reviewed count/reconciliation command is the only
way an import can affect canonical lots. The owner selected a flexible target of
two sellable units per **individual shop account**, not per marketplace and not
as a blocking minimum. A product/shop state is Covered (at least two), Thin
(one), Skipped (deliberately not offered), Out (an active allocation was
consumed), or Needs review (source/canonical facts disagree or are stale).
Scarcity is normal: K2 recommends which shops to cover from recent verified
sales, the owner may override or skip any shop, and skipped shops do not create
false low-stock alerts. Automatic rebalancing may adjust proposed/eligible
channel availability but may never exceed canonical sellable stock, make a
negative balance, double-count one unit, or impersonate a physical custody
transfer. Existing request/approval/receipt rules still govern stock that must
move between custodians or locations.

The Owner Count & Close workflow stages bounded CSV imports first and later uses
the same contract for approved APIs. It guides the owner through source/shop and
period selection; product-link approval; sales/order deduplication; provider
commission/fee estimation from versioned rules; expected-versus-physical stock
count and reasoned discrepancy handling; Pasabuy boxing status; low/zero Master
Inventory and unsupported-shop warnings; and a customer-minimized bookkeeping
handoff. Commission and tax remain labelled estimates until reconciled with
provider settlement and approved accounting rules. Imports, approvals, and
close sessions are resumable, idempotent, bounded, auditable, and honest about
loading, offline, stale, partial, conflict, ambiguous-timeout, and failed states.
No connector credential enters browser code, no import silently publishes or
changes physical stock, and no planning summary claims to be an official tax
filing, accounting book, settlement, or actual-profit record.

IDEA-20260831-02 captures the staff usability gap between finding a procedure
and actually reaching its result. The owner confirmed the recommended model:
the Operations guide is a read-only teacher and navigator, while the real K2
workflow remains the only record of operational progress and completion. The
gate merges the idea into MAP-023 rather than creating a second guide or
workflow state store. Staff begin with the outcome they need, then receive one
phone-safe step at a time: exact screen and control, required input or evidence,
the action to take, expected intermediate result, canonical completion evidence,
and failure/recovery guidance. A real destination may be opened and focused,
but the guide never presses a state-changing control automatically.

Manual external steps are explicit handoffs. For Product Intake, the guide may
prepare a customer-free approved prompt and instruct staff to use the private K2
Product Content or K2 Product Image Studio ChatGPT Project, but it cannot claim
to open, operate, or verify either Project. Staff must return the result to the
owning K2 workflow, where schema, evidence, field, image, and human-review gates
decide whether work may continue. Computation guidance opens the real Sales
Planner mode, explains every required field and assumption, and preserves the
planning-only boundary. Guide views and checkmarks may remain browser-local
rehearsal; only canonical records, events, files, provider receipts, or bounded
read models can show operational completion. Exact control targets, guide copy,
and procedure contracts must be versioned and tested together so renamed or
missing controls fail acceptance instead of sending staff to the wrong place.

IDEA-20260831-03 captures the public-route integrity and receipt-continuity gap
found by the 31 August full Storefront/Admin audit. The current route parser
silently turns an unknown path into Home, a nonexistent product remains on an
unbounded loading screen, and a successful order request renders Confirmation
without moving the browser URL away from `/checkout`. A refresh therefore loses
the in-memory receipt instead of reaching a safe continuation state. The gate
accepts one shared route/recoverability contract and merges it into MAP-019,
MAP-024, and the MAP-028 release audit rather than creating another router or
status system. Every registered public route must have a canonical title and
H1, a bounded loading transition, an explicit not-found/unavailable state, and
a tested direct-load/back/forward/reload path. Unknown routes must never
impersonate Home. Order continuation must use the existing scoped guest/account
status boundary; no customer identifier, provider token, unrestricted order ID,
or private record may be placed in a public URL. A generated internal-route and
local-asset crawl must fail acceptance on missing route states, missing assets,
or links that resolve to an unintended surface.

IDEA-20260901-02 captures the owner's corrected warehouse/channel boundary and
the first approved connector sequence. Warehouse A is the only warehouse whose
eligible stock may be sold through the K2 direct Storefront and the only current
origin for J&T/direct shipping, while Warehouse A may also sell through
marketplaces. Warehouses B and C remain visible and operable in Admin BOS but
are marketplace-only: their stock must never make a K2 direct product available,
rescue a K2 direct checkout, or enter a K2-paid direct order. The owner selected
TikTok Shop and Lazada as the first marketplace integrations and explicitly
deferred Shopee for now.

The audit merges this into MAP-026 rather than creating another channel plan.
The provider capabilities exist, but production access is externally gated:
K2 must register the required TikTok custom/connector and Lazada self-developed
applications, obtain the exact approved scopes for every shop, and prove shop
authorization, token refresh, signed webhook receipt, authoritative product and
order reads, and one reversible test-SKU inventory write before full adapter
implementation. A marketplace "app" is a server-side integration identity for
the existing K2 website/Admin BOS, not a separate customer mobile application.
The accepted scope includes exact warehouse/shop/listing identity; Warehouse A
reservation-driven outbound availability; marketplace-order intake into the same
canonical warehouse pool; cancellation/release handling; signed idempotent event
capture; retryable outbox publication; scheduled reconciliation; connection,
authorization, freshness, lag, and error health; and Admin queues for mappings,
orders, pending/failed sync, discrepancies, and auditable manual recovery. No
connector is called free, approved, live, or synchronized until provider and
end-to-end evidence exists.

## Idea decision register

This is a decision index, not a backlog. Only Accepted scope listed in the
Master Action Plan is authorized for implementation.

| Idea | Outcome | Destination or reason |
| --- | --- | --- |
| Legacy multichannel control-center idea | Merged | Historical MAP-009 through MAP-011; original wording remains in Git history |
| Legacy product-transformation idea | Merged | Historical MAP-002; original wording remains in Git history |
| IDEA-20260814-05 | Merged | Remaining messaging, channel-stock, and custody-truth scope is in MAP-023 |
| IDEA-20260821-01 | Merged in part / rejected in part | Necessary launch scope is in MAP-020 through MAP-025; unjustified first-launch distributed infrastructure was rejected |
| IDEA-20260821-02 | Merged | Controlled catalog spreadsheet round trip and inventory-reconciliation scope is in MAP-023 |
| IDEA-20260824-01 | Accepted and completed | Added Necessary, Active, Future, and Done navigation to the MAP, an explicit active count, and this durable idea-decision register; no unfinished scope remains |
| IDEA-20260824-02 | Accepted and completed | `AGENTS.md` now requires Superpowers-first skill routing, every applicable specialist skill, the four-skill UI/UX gate, and durable documentation/handoff traceability; no unfinished scope remains |
| IDEA-20260824-03 | Accepted and completed | Installed `karpathy-guidelines` from `multica-ai/andrej-karpathy-skills` to the user-level Codex skills directory and added it to `AGENTS.md` for all code writing, review, refactoring, and fixing tasks; installed `SKILL.md` SHA-256 is `6E22CC54CB02A5E98AE42D06D9D7292DB0C1B43894831B32879BEB0166B2AEA7` |
| IDEA-20260826-01 | Accepted | MAP-027 owns the AI-assisted, human-approved Product Knowledge workspace, shared verified FAQ layer, product-context staff handoff, Pasabuy fallback, and optional shelf-based Interactive Shop; exact-host SEO activation remains MAP-024 |
| IDEA-20260827-01 | Merged | The new-domain downstream audit—Search Console/Bing, Supabase Auth and email callbacks, exact origins/cookies/bot hostnames, persisted database URLs, discovery assets, provider-route drift, domain email/DNS security, monitoring, external callbacks, and rollback evidence—is now ordered inside MAP-024 |
| IDEA-20260827-02 | Merged | Owner confirmed `k2jimzonwebsite@gmail.com` as the primary provider login, recovery identity, and project contact; MAP-024 owns provider-account alignment and keeps branded-domain mail as a separate decision |
| IDEA-20260828-01 | Merged | MAP-024 owns one-active-login and remembered-personal-browser implementation before deployment; MAP-025 owns supported-browser real-host proof. Ordinary phone tab/app switching does not itself expire a valid session |
| IDEA-20260828-02 | Accepted | Virtual store anime/cartoon human avatar redesign in 2D and 3D, hair and body sculpting, dynamic expressions, scene framing fix, and test polish in MAP-027 |
| IDEA-20260828-03 | Accepted | Storefront & virtual store ambient lighting, smooth light/dark transitions, interactive sidebar avatar gaze/click effects, and unified 3D front clerk visuals in MAP-027 |
| IDEA-20260828-04 | Accepted | Stable human-scale aisle-clerk staging and an editorial, actionable right-side shelf concierge using only canonical shelf/product/help actions in MAP-027 |
| IDEA-20260828-05 | Accepted | Inter-bay clerk dwelling zones, collision-free synchronized travel, two additional shelf levels, one canonical chat entry, and articulated hands in MAP-027 |
| IDEA-20260828-06 | Accepted | Category-authored clerk explanations and one customer-visible Virtual Store thread connected to the canonical Admin inbox through the signed website reply boundary in MAP-027 |
| IDEA-20260830-01 | Merged | MAP-018 owns a deliberate per-product staff choice between Automatic API and Manual ChatGPT Projects for product-record descriptions, usage, instructions, SEO, media briefs, and Draft image candidates inside the resumable intake session; physical inventory/publication fields stay human/server controlled, and production use requires explicit cost/privacy/model/evaluation gates |
| IDEA-20260830-02 | Merged | MAP-023 owns a canonical status-separated Sales Summary and an explicitly non-posting staff sales planning calculator; actual profit and settled payout stay unavailable until exact-lot cost snapshots and settlement records exist |
| IDEA-20260830-03 | Merged | MAP-023 owns a customer-free selected-period CSV of the exact active sales-ledger filter, with spreadsheet-injection protection and no accounting, payout, profit, or write authority |
| IDEA-20260830-04 | Merged | MAP-023 owns a reverse target-price mode inside the non-posting Sales Planner; it solves and rounds up the minimum planned unit price from cost, discount, fixed costs, percentage fee, and target gross margin without changing canonical price or claiming approval/actual profit |
| IDEA-20260830-05 | Merged | MAP-023 owns a four-bucket payment-by-fulfillment reconciliation that exactly partitions selected-period order requests and exposes customer-free record/CSV filters for verified-awaiting-fulfillment and fulfilled-payment-not-verified review |
| IDEA-20260830-06 | Merged | MAP-023 owns a third non-posting Sales Planner mode that solves the maximum total discount a chosen price can absorb while preserving target planned gross margin, rounds the allowance down to cents, recomputes the achieved scenario, and denies prices that fail the target even without a discount |
| IDEA-20260830-07 | Merged | MAP-023 owns consistent forward fee math: Check a price collects fixed fees plus a gross-sales channel-fee rate, shows the cost breakdown, and solves an upward-cent-rounded fee-aware break-even unit price rather than freezing a manually calculated peso fee |
| IDEA-20260830-08 | Merged | MAP-023 owns a fourth non-posting Sales Planner mode that solves the minimum whole units required for a planned gross-profit target, recomputes the achieved scenario, proves one fewer unit misses, and refuses non-positive contribution or requirements above 100,000 units |
| IDEA-20260830-09 | Merged | MAP-023 owns a customer-free Copy planning summary action for every valid planner mode, with deterministic timestamped assumptions/results, a prominent non-posting disclaimer, success announcement, and clipboard-permission recovery |
| IDEA-20260831-01 | Merged | MAP-023 owns staged inbound shop snapshots, human-reviewed product/quantity reconciliation, and the phone-first Owner Count & Close workflow; MAP-026 owns per-shop aliases, observations, flexible two-unit coverage, scarcity ranking/override, safe availability rebalancing, and later API adapters |
| IDEA-20260831-02 | Merged | MAP-023 owns the outcome-first, step-by-step Operations guide: exact real controls, safe manual/external handoffs, canonical completion evidence, phone/laptop recovery acceptance, and no guide-owned operational state |
| IDEA-20260831-03 | Merged | MAP-019 owns scoped reload-safe order-status continuation; MAP-024 owns one explicit public-route, metadata, not-found, and internal-link/asset contract; MAP-028 owns the 31 August release finding and verification gate |
| IDEA-20260901-01 | Merged | MAP-023 owns the owner-approved exact-locality manual delivery-rate workbook, controlled pilot quoting, actual-cost reconciliation, staff workflow, and recovery; MAP-019 owns any future customer-facing quote snapshot and continuation; MAP-020 owns a future independently validated import/API boundary; MAP-026 retains Warehouse A eligibility, marketplace separation, provider evidence, and later courier/channel adapters |
| IDEA-20260901-02 | Merged | MAP-026 owns the Warehouse A-only K2-direct eligibility rule, Warehouse B/C marketplace-only boundary, TikTok Shop and Lazada access qualification, approved-app/webhook/order/inventory adapters, canonical stock synchronization, reconciliation and Admin recovery; Shopee adapter work is deferred by owner decision |
| IDEA-20260902-01 | Merged | MAP-023 owns the editable evidence-source register, courier VIP-account-versus-public reference comparison, 30-day source-verification gate, quote-tester comparison panel, and staff recovery; public/secondary/third-party evidence remains nonquotable, traffic/time-of-day does not change the ordinary J&T fee without documented evidence, and MAP-020 still owns any future independently validated importer |
| IDEA-20260902-03 | Merged | MAP-023 owns weight-scaled delivery pricing: band plus per-kg excess reusing the existing `delivery_cost_rows.profile_id` dimension, profile selected from chargeable weight instead of from the locality, an Admin band picker/editor, and a ceiling raised only as far as verified J&T evidence reaches with manual quotation above it. Admin-only by owner scope — no weight-derived price reaches the storefront, which stays with MAP-019. Band values remain blocked on owner-supplied J&T evidence under the 30-day source-verification gate, and the apply state of the five 2026-09-02 delivery migrations must be confirmed first |
| IDEA-20260902-02 | Merged | MAP-023 replaces the earlier single-courier customer-fee basis with a carrier-agnostic `K2-arranged delivery` rule: for one exact origin, destination, packed profile, and owner-approved route-qualified courier/service set, quote the PHP 5 ceiling of the maximum complete current outbound courier cost; missing or stale eligible-option evidence routes to manual quotation, integrity conflicts hard-stop, current J&T-only routes remain automatic only when J&T is explicitly the sole eligible option, and MAP-019/MAP-020 own the future Admin activation and independently validated import/snapshot boundary |

## Pending idea intake

### IDEA-20260902-04 - Pay-at-checkout by GCash, on purchase-time reserved stock

**Captured:** 2026-09-02
**Raised by:** Owner, after placing a test order

**Desired flow:** add to cart -> buy -> GCash QR -> pay -> a form where the
customer submits that they paid (reference number required, screenshot
optional) -> staff verify. Live chat supports that step now and becomes
optional once the process is automated.

**Owner's stated premise, and the correction.** The owner expected that
"inventory here should automatically adjust, so staff don't need to check."
That is not true in the current tree. `public.submit_order_request_v2` touches
no stock, no reservations and no batches; it writes the order request, its
items, subtotal/coupon and one event. Stock moves only in
`public.confirm_order_request` (`20260809_operations_hardening.sql:381`), whose
only caller is a staff button at `src/views/admin/OmniOperationsHub.jsx:164`.
Enabling payment at checkout before this changes would let two customers pay
for the same last unit, with manual GCash refunds and no gateway.

**This is not new scope - it completes OWNER-002.** The owner's own answer
records "Reservation - 30 minutes, starting when the customer clicks purchase."
The implementation starts the hold later: `set_reservation_deadline()` sets
`expires_at := now() + 30 minutes` on insert into `inventory_reservations`, and
that insert happens inside `confirm_order_request`, i.e. at staff-confirm time,
not at purchase. Those moments can be hours apart.

**Dependency order, and none of it may be reordered:**

1. Move reservation creation to purchase time so buying holds stock. Until this
   lands, payment at checkout is unsafe at any scale.
2. Apply `20260902_reservation_expiry_policy.sql`, still prepared and unapplied,
   behind the MAP-017 gate.
3. Only then: GCash QR at checkout, and the payment-evidence form.

**Payment evidence shape, owner-selected:** GCash reference number required and
format-validated, optional screenshot. The reference is what staff match against
the GCash merchant account and it stays searchable; the screenshot is a fallback,
not the record. This reaches the existing `payment_status` value
`evidence_submitted`, so no new vocabulary is required - the chain
`not_requested -> awaiting_instructions -> evidence_submitted -> verified ->
failed/refunded` already exists (`20260803_launch_core_stabilization.sql:797`).

**Refund exposure.** Even with purchase-time holds, a hold can expire or a lot can
fail its expiry/quarantine check between payment and confirmation. A written
refund procedure must exist before this is switched on, because K2 has no payment
gateway and every refund is a manual GCash send.

**Surfaces that must change together, or the storefront will contradict itself:**
`src/views/Confirmation.jsx` ("No payment was charged... staff will contact you
with payment details"), the FAQ at `src/data/site.js:97`, and the README's
deferred-payment note all currently promise review-first.

**Owner decision still required:** the GCash account details to display, and
whether the QR is static or per-order. A static merchant QR cannot be matched to
an order automatically, which is precisely why the reference number is required.

**Status:** captured, premise corrected, not audited into the MAP. Not authorized
for implementation.


The idea below was captured, decided, audited, and merged into MAP-023 on
2 September 2026. Its outcome is in the decision register above; MAP-023 holds
the remaining unfinished scope. Nothing is pending intake.

None.

When the owner raises an idea, add it here immediately using the next dated ID.
Do not wait for the audit before capturing it.

### New idea template

```markdown
### <IDEA-YYYYMMDD-NN> — Short name

**Captured:** YYYY-MM-DD
**Raised by:** person/source
**Problem observed:**
**Desired outcome:**
**Evidence or example:**
**Known dependency:**
**Possible overlap with current behavior/MAP item:**
**Owner decision potentially required:**
```
