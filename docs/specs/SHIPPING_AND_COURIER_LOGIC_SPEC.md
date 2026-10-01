# K2 Jimzon - Shipping, Waybill, and Tracking Logic Spec

## Current regional checkout correction — 1 October 2026

**Design candidate, not implemented or activated.** IDEA-20260925-06 / MAP-023
owns this correction. The sections below this reconciliation retain the older
exact-locality carrier-cost pilot. That pilot is prepared evidence and does not
replace the owner's current customer matrix. Remaining actions live only in MAP.
Owner policy and the separate NCR express choice are confirmed; this candidate's
implementation approach still needs owner acceptance. Sequential peer review
and arbitration are complete: APPROVED for that owner gate, not implementation
or activation evidence.

### Intent and assumptions

- Give buyers a delivery fee that the server can validate before creating an order.
- Preserve all current regional prices and separate NCR Lalamove/Grab express.
- Use canonical K2 product facts and a structured Philippine destination.
- Keep accepted customer charges stable through staff edits and rate revisions.
- Keep future standard pricing inactive and carrier costs separate.
- Preserve the existing guest ownership, conversation, coupon and stock contracts.

Assume the existing 50-line / 99-units-per-line request limits remain. Quote and
order operations use indexed local database reads with no external provider call;
target additional database work below 500 ms at the current 30-product scale,
subject to measurement. Failures preserve entered fields and prevent submission
with stale fees. No customer address goes to PSA or a geocoder. Keep the K2 wood
canvas, typography, mobile controls, keyboard access and reduced-motion behavior.
Maintain one tariff formula in the database, with client/server parity evidence.

### Approach and alternatives

**Recommended: recompute on submission and freeze the accepted snapshot.** The
existing signed delivery route returns a preview calculated from canonical SKUs,
quantities, locality and service. It returns the immutable rate version, weight
basis/fingerprint and PHP fee. The signed order transaction recomputes under the
existing ordered inventory/product locks and requires these exact displayed
values. A mismatch stops for a new review; it never silently increases the fee.
The same transaction records the accepted delivery snapshot with the order.

A persisted expiring pre-order quote could also bind these inputs, but adds
expiry, single-use and abandoned-record handling before a reservation exists.
Recomputing only in the BFF would be smaller but would leave a race between its
read and the database transaction. The recommended approach keeps pricing
authority with canonical inventory/order data without an extra quote store.

### Submission recovery

A definitive stale-quote refusal must be a distinct, classified no-business-commit
result. Only that result releases StoreContext's retained stale quote/key, keeps
the buyer's fields, fetches a fresh preview and requires reviewing it before a
new submission identity. A timeout, malformed response or lost response is
uncertain: retain the exact payload/key and retry it. That retry first resolves
the saved order and ownership under the key lock, even after rate or weight
changes. It cannot refresh the quote or create another order/hold/seed until the
original outcome is known. Preview responses also carry an input identity;
responses for older cart/destination/service selections cannot replace the
current preview. Security nonce/rate records are separate from business writes.

On recovery, a bot/origin/rate/shape refusal before canonical key resolution
proves only that the retry did not run; it cannot prove an earlier lost-response
attempt did not commit. Keep the original payload/key and reviewed fee/context
while resolving that uncertainty, including after a fresh challenge or rate
wait. Do not offer an edit action that silently abandons the unresolved key and
starts another order. Correction becomes available after the original transaction
is definitively refused; otherwise retry or ask staff to resolve the original
request. Bot tokens/nonces are fresh transport controls, outside the retained
business fingerprint. Prove this with a successful-but-lost first response
followed by a denied retry and then a successful exact-key retry.

### Preview eligibility and projection

Preview uses a read-only form of the existing reviewed Website-offer predicate:
current active assignment, approved facts/name/image/positive price, published
Live/Active or approved direct-link Unlisted. Guessed, paused, unassigned or
ineligible SKUs receive a generic refusal without canonical weight facts.
The response allowlist contains service/area, PHP fee, version/input identity,
total packed weight and measured/estimated basis needed for buyer review; it
contains no costs, stock lots or private product evidence. Preview must not
invoke the order helper wholesale because that helper initializes balances and
takes write locks. Only existing security nonce/rate controls may write.

### Customer tariff

| Service / area | Base PHP | Included weight | Each started kg above it | PHP ceiling step |
| --- | ---: | ---: | ---: | ---: |
| J&T standard / NCR | 95 | 3 kg | 30 | 5 |
| J&T standard / Greater Luzon | 85 | 3 kg | 35 | 5 |
| J&T standard / Visayas | 100 | 3 kg | 40 | 5 |
| J&T standard / Mindanao | 105 | 3 kg | 45 | 5 |
| Lalamove/Grab express / NCR only | 150 | 5 kg | 40 | 10 |
| K2 pickup | 0 | — | — | — |

Store one immutable, owner-evidence-linked version of this customer matrix; a
future standard-rate policy has no active amount or automatic switch. These are
K2 customer prices, not a verified carrier tariff or booking guarantee.

### Weight evidence and grammar

Prefer positive canonical `shipping_weight_g` when warehouse measurement exists.
Otherwise preserve the current owner-authorized estimate: parse canonical net
quantity/size, add the existing 220 g jar/bottle or 80 g other tare, and use 500 g
when quantity is unknown. Persist the estimator version and each SKU's basis as
estimated; never write these values into measured shipping columns. Existing
volume-as-weight behavior is explicitly an estimate, not a density measurement.
The estimator is versioned independently from the shelf-display parser, whose
unsigned substring matching is not safe shipping validation. Precedence is
measured field, then `net_weight`, then `size`, then unknown-quantity fallback.
A NULL/missing measured field permits estimation; a present invalid measured
field stops. An unknown descriptive quantity permits the next field/fallback;
a recognized but malformed numeric quantity stops rather than searching for a
cheaper later value. Supported quantity units are g, kg, ml, l and cl, with
positive decimal-dot values or unambiguous decimal-comma values (one or two
fractional digits), optionally one positive integer multipack factor joined by
x, × or *. Ordinary package words and a trailing piece count may accompany one
quantity expression. Signed values, exponent notation, ambiguous three-digit
comma groups, conflicting quantity expressions and nonfinite products stop.
Examples: `2 x 80 g` => 160 g before tare; `304 g - 22 pcs` => 304 g before tare;
`-500 g` and `1,000 g` are invalid; `jar` is unknown and can use the fallback.

### Arithmetic bounds

Proposed engineering bounds are 1–100,000 g per packed unit, at most 4,950 units
from the existing line/quantity limits, finite integer cart weight up to
495,000,000 g and a final customer fee within the existing PHP 0–100,000 envelope
(zero only for pickup). These are arithmetic/request safety bounds, not carrier
weight/coverage promises. Invalid or excessive facts stop for staff correction;
no overflowing value silently becomes 500 g. Exact boundary and multipack tests
must prove current parity for valid facts. The old measured-only pilot remains
separate. Real package and carrier evidence still belongs to staff acceptance.

### Destination reference

Pin the official PSA 30 June 2026 PSGC publication with attribution and checksum.
Validate the complete region/province/city-or-municipality/barangay hierarchy;
retain Manila submunicipal units and special geographic groups without inventing
a province. Derive the matrix area from this trusted hierarchy, including NIR
as Visayas. Unknown, mismatched or stale locality codes cannot become Mindanao
or a cheaper region. Reference geography alone proves neither carrier coverage
nor that a house/street physically exists; staff still confirms the actual route.

### Destination and pickup flow

Use dependent destination selectors plus a retained house/street field. Derive
the region display; do not ask the buyer to guess a tariff area. Loading/error
states keep entered values, clear the current fee immediately and offer retry.
Reset descendants after a parent changes. Pickup needs no delivery locality.
Show server-calculated service fees before submission; preserve separate express
carrier wording. An estimated weight must be labelled as estimated. Legacy saved
free-text addresses need an explicit locality selection rather than guessed
parsing. A stale quote requires reviewing the new fee before another submission.

Require only real hierarchy levels: province-less HUCs and NCR must not require
an invented province, and Manila submunicipalities/Isabela/SGA groups must have
reachable labelled paths. Retain the original free-text address as visible
reference with a plain instruction to select its locality. If a parent change
makes express incompatible, clear that selection and ask the buyer to choose
an available service; do not silently switch carriers. Pickup bypasses all
delivery-locality and street validation, including empty client address fields;
the server supplies the approved pickup identity/address for the canonical
writer. Navigation/remount preserves the original pending destination, service,
weight basis and fee while its submission is uncertain.

### Customer fee presentation

Present the K2 delivery fee as the amount the buyer accepts, alongside separately
labelled weight evidence. If any SKU uses estimation, say `Estimated packed
weight`; recorded per-unit weights do not prove the final shipment was weighed.
Do not show an inferred parcel count as actual parcels. Remove unsupported fixed
ETA and air/sea/dispatch promises from this flow; state that staff confirms the
route and dispatch timing. Separate NCR Lalamove/Grab express remains visible.
Pending/failed preview clears the payable delivery and grand-total figures.
Explain the next action: retry a temporary lookup failure, correct an invalid
locality, or contact staff for unavailable product/pricing facts. Do not expose
private eligibility evidence or describe a stale total as payable.

### Order authority and replay

Signed SQL validates item limits, locality/service compatibility, canonical weight
basis and the exact version/fee shown. Reject browser `waived`, `platform_charged`
or a zero courier fee. Derive pickup identity/zero server-side. Preserve one
canonical writer overload, grant scopes, coupon behavior, FEFO holds and seeded
conversation. Keep key-before-balance-before-product lock order. An existing
exact-key replay returns the saved order before any new rate lookup; changed
payload conflicts. Refusals leave no identity, order, hold or business event.

### Accepted-charge guard

Persist accepted amount/version/destination/service/weight facts in one private,
immutable acceptance row keyed to the canonical order. It stores locality codes
and weight/pricing evidence, not another copy of the customer's street/contact
details. No browser table access or runtime update/delete privilege is granted.
An order-update guard enforces the recorded amount and acceptance indicators
across all writers. Ledger mutation/erasure is separately denied. The legacy
staff RPC must preserve those indicators on same-amount tracking/waybill edits;
its checkbox cannot replace acceptance or update the original acceptance time.
Raw changes to shipping amount, acceptance status/time or snapshot are refused.
New acceptance insertion and staff edits serialize on the canonical order row;
the ledger is evidence, not a second order or pricing authority.

After activation, every accepted insert/transition must commit exactly one
matching acceptance row atomically; a guard cannot depend on optional evidence
that a writer can omit. Enforce this at transaction commit across all accepted
writers. The initial manual staff confirmation path remains available with its
existing authorization and communication-note policy and records staff-reported
acceptance without inventing a server tariff or verified buyer receipt. It cannot
replace prior acceptance. Concurrent initial confirmation/edit takes the same
order lock, and a late failure rolls back both order and evidence. Missing
evidence, evidence drift, clearing/reconfirmation or a changed charge refuses;
idempotent replay creates no second row. Controlled provider recovery must retain
accepted-charge protection while suspending new intake until its boundary works.

### Staff acceptance display

For confirmed, platform-charged and zero-waived accepted orders, show the frozen
fee and acceptance indicators as read-only, including the original timestamp
when one exists. Do not synthesize `via storefront checkout` for unknown legacy
or manually recorded provenance. Courier/tracking/waybill metadata stays
editable with the existing required communication note. Same-amount saves
preserve the acceptance fields; guard conflicts retain typed metadata and explain
that the accepted charge cannot be changed here. Initial unaccepted manual
confirmation retains its existing authorization/communication requirements.

### Historical acceptance preflight

Installation preflight classifies existing orders and their recorded delivery
events before activating this guard:

- `customer_confirmed` or `platform_charged`, with a valid existing finite
  nonnegative amount: protect that exact amount as legacy recorded acceptance.
- `waived` with amount zero: protect the zero legacy charge.
- Accepted status with a NULL timestamp: preserve the exact amount and NULL
  timestamp with a legacy-status-only evidence label; never invent a date,
  locality, tariff version or verified buyer/provider receipt.
- Timestamp-only acceptance, positive `waived` amounts, invalid amounts,
  contradictory accepted event/current values, or previously accepted event
  history followed by cleared indicators: unresolved historical ambiguity.
- Unaccepted status with no timestamp or contrary accepted history: remains
  unaccepted; a positive quoted amount alone is not acceptance.

Any unresolved ambiguity refuses installation/activation before business
changes. Resolve it with actual owner/staff/customer evidence under MAP-023;
never leave ambiguous accepted charges unprotected or silently recalculate them.
Recognized legacy acceptance is frozen without asserting that its old browser
fee was server-validated. A future re-quote is a separate explicit acceptance.
Exceptional re-quotes need a distinct communicated proposal and explicit buyer
acceptance; the legacy staff checkbox cannot authorize an increase. That future
path is not enabled by this correction.

### Verification and activation limits

Require tests that reject tampered fee/region/service/weight/version, unknown
localities, zero delivery, stale facts and acceptance-clearing attempts. Prove
every tariff boundary, pickup, express restriction, unknown-weight labelling,
all PSGC parent cases, current coupons, same-key retry and failure rollback.
Run the actual corrected SQL on an owned restore clone, including concurrent
price/weight/assignment edits and accepted-order metadata updates. Verify public
denial/private ACLs and preserve original restore fingerprints. Phone/desktop
and keyboard fixtures cover dependent fields, pending/error/stale states and
same-request recovery. No mock establishes provider or physical acceptance.

No provider write, feature flag or release is authorized by this design.
MAP-017/020 must include the expanded functions, columns and hooks in exact
capture/backup/recovery and coordinate retirement of the browser-trusted direct
writer. A partly installed correction must remain inactive. MAP-018 retains
reviewed real product facts, media, membership and physical counts; MAP-023/025
retains real booking, QR/funds, payment and fulfillment acceptance.

### Decision log

| Decision | Alternative and reason | State |
| --- | --- | --- |
| D1 Preserve matrix plus separate NCR express | Exact-locality pilot replacement would change the owner-confirmed customer policy | Owner policy confirmed |
| D2 Database recomputation plus accepted snapshot | Pre-order quote store adds lifecycle work; BFF-only recomputation leaves a transaction race. S1 separates definite stale refusal from uncertain commit/replay; C2 bounds preview eligibility and disclosure | Recommended, design acceptance pending |
| D3 Preserve labelled canonical estimates | Measured-only checkout would change the current authorized fallback; invented measurements are forbidden. S3 adds an independent strict grammar and finite bounds | Proposed interpretation of current estimate policy |
| D4 Pin PSA hierarchy and derive area | Browser region selection cannot validate a destination; runtime PSA/geocoding adds dependency/privacy cost | Recommended, design acceptance pending |
| D5 Freeze across all accepted-charge writers | A guard in only one RPC can be bypassed by another writer or confirmation clearing. S2 adds private immutable evidence/historical classification; C1 makes matching evidence mandatory at commit across writers | Existing MAP requirement; revised details pending review |
| D6 No automatic price activation | Current cost rows and future standard pricing have different authority | Owner policy confirmed |

Structured reviewer objections and their resolutions are recorded in
`docs/evidence/20261001-authoritative-delivery/README.md`. This design is not
owner-accepted until the pending approach gate is resolved. The Arbiter approved
the revised peer design with all material objections incorporated; no runtime
evidence is implied.

---

**Status:** `IDEA-20260901-01` was audited on 1 September 2026 and merged into
`MAP-023`, with downstream system boundaries owned by `MAP-019`, `MAP-020`, and
`MAP-026`. The owner-approved target is a controlled manual-pilot workbook for
exact eligible localities. The workbook is not a website rate calculator, database
rate table, carrier connector, booking, waybill, shipment, or deployment.

**Purpose:** define one customer-facing shipping system with two internal paths -
**Logic A** (J&T API credentials available) and **Logic B** (no usable API) - plus
the waybill and tracking logic that does not exist today. Checkout must never
depend on a carrier API being reachable.

**Governing constraints:** `MASTER_ACTION_PLAN.md` gap **G-013** (courier booking
and labels do not exist; manual work is a valid launch model only when every UI
names it as manual) and the operations rulebook rule that K2 never claims a
courier booking, waybill, or delivery event without provider evidence.

---

## 1. Current state

Distinguish what exists from what works. The **fields** exist; the **logic** does not.

| Capability | State | Evidence |
| :--- | :--- | :--- |
| Rate calculation | **None.** Staff types an amount by hand. | `set_order_delivery_details`, `20260809_operations_hardening.sql` |
| Customer-visible shipping | **None.** Checkout shows `Quoted after review`. | `src/views/Checkout.jsx` |
| Destination zone | **None.** `delivery_address` is one free-text field. | `order_requests` |
| Product weight | **None usable.** `net_weight` is text (`'1000g'`). | `src/data/products.js` |
| Tracking number | Column + manual text input. **No lifecycle, no events, no history.** | `OmniOperationsHub.jsx` delivery modal |
| Waybill | `waybill_url` column + manual URL paste. **K2 never generates or stores a label.** | `OmniOperationsHub.jsx` delivery modal |
| Customer tracking view | **None.** | - |
| Actual carrier cost | **Not captured.** Only the billed amount exists. | `order_requests.shipping_amount` |
| Packing QR | Exists, and correctly declares it is *not* a waybill. | `src/views/admin/PackingSlipModal.jsx` |

Two existing rules must be preserved, not replaced: the K2 packing QR is an
internal document and never a carrier label; and staff are forbidden from
inventing a waybill, tracking number, or delivery event
(`src/views/admin/staffProcedureRegistry.js`).

### 1.1 Approved manual-pilot boundary

The first deliverable is an owner-approved Excel quoting and reconciliation aid,
not a runtime component. It may produce `STANDARD_FEE` only when every condition
below is known and true before K2 communicates the charge:

- channel is direct website or Pasabuy;
- origin is Warehouse A;
- service is ordinary J&T EZ;
- exactly one parcel, with measured or credible estimated packed weight at or
  below 3 kg;
- oversize, remote/ODZ, and special-protection flags are all explicitly false;
- merchandise subtotal is at or below PHP 2,000; and
- the destination matches one active exact-locality rule with one unambiguous
  active rate rule for the quote date.

The initial exact-locality pilot is limited to the eight verified VIP observations:

| Exact locality | Final K2 customer charge |
| :--- | ---: |
| San Jose del Monte City / Muzon East | PHP 85 |
| Angeles City / Agapito del Rosario | PHP 85 |
| Calamba City / Bagong Kalsada | PHP 85 |
| Dagupan City / Bacayao Norte | PHP 85 |
| Baguio City / A. Bonifacio-Caguioa-Rimando (ABCR) | PHP 85 |
| Caloocan / Barangay 1 | PHP 95 |
| Cebu City / Apas | PHP 100 |
| Davao City / Agdao | PHP 105 |

Luzon PHP 85, NCR PHP 95, Visayas PHP 100, and Mindanao PHP 105 may appear as
`PLANNING_FLOOR_NOT_QUOTABLE` values only. They are not regional coverage claims
and cannot price a customer order. The PSGC region list is administrative reference
data, not evidence of J&T service coverage. Any unknown input, ineligible order,
unlisted locality, duplicate/overlapping active rule, or missing evidence routes to
`MANUAL_COURIER_QUOTE` or `DATA_CONFLICT_STOP`; it never falls through to a floor.

The workbook result vocabulary is fixed: `INPUT_ERROR`, `DATA_CONFLICT_STOP`,
`PLATFORM_CHARGED_EXTERNAL`, `PICKUP_ZERO`, `UNAVAILABLE`,
`MANUAL_COURIER_QUOTE`, and `STANDARD_FEE`. A blank financial cell means unknown;
numeric zero is valid only for confirmed K2 pickup. Workbook approval and QC cells
are documentation, not an authentication or security boundary.

---

## 2. Status vocabulary - three independent axes

The largest integration risk is status collision. Two status columns already exist
and a naive third list would overlap both. Keep three axes that never encode each
other's meaning.

| Axis | Column | Answers | Values |
| :--- | :--- | :--- | :--- |
| **Money** | `shipping_quote_status` *(exists)* | Has the customer agreed to the delivery charge? | `pending_quote`, `quoted`, `customer_confirmed`, `platform_charged`, `waived` |
| **K2 work** | `delivery_status` *(exists)* | What does K2 still have to do? | `awaiting_quote`, `awaiting_customer`, `ready_to_pack`, `packed`, `handed_over` |
| **Carrier parcel** | `shipment_status` *(new, on `shipments`)* | Where is the physical parcel? | `booked`, `label_ready`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered` |

Shipment exceptions: `booking_failed`, `on_hold`, `delivery_failed`,
`returned_to_sender`, `lost`, `cancelled`.

A status is only introduced if some real event can change it. In Logic B there is
no pickup event, so `picked_up` is set by explicit staff action or not at all - a
status nobody maintains is worse than no status, because it lies confidently.

---

## 3. Shared architecture

### 3.1 The seam

Every caller depends on one signature. The provider behind it is replaceable
without touching checkout, admin, or order submission.

```text
quoteShipping({ origin, destination, cart, parcels })
-> {
     carrier,          // 'jnt'
     service,          // carrier service code
     parcels[],        // per-parcel weight/dimensions/rate
     baseRate,         // sum of parcel rates
     protectionFee,    // 0 until the protection product is defined
     totalShipping,
     source,           // 'k2_rate_matrix' | 'jnt_api'
     rateVersionId,    // null when source = 'jnt_api'
     confidence,       // 'exact' | 'estimated' | 'unavailable'
     quotedAt
   }
```

`confidence` is a contract, not decoration:

- `exact` - carrier-returned, or a matrix row matching a validated bracket.
- `estimated` - matrix fallback, interpolated bracket, or unverified zone.
- `unavailable` - no rate could be produced; checkout falls back to the existing
  `pending_quote` request model rather than guessing.

`source` and `rateVersionId` make every stored quote auditable, so a table-derived
number is never mistaken for a carrier-confirmed price.

### 3.2 Chargeable weight

```text
volumetric_g = (L_mm * W_mm * H_mm) / carrier.volumetric_divisor
chargeable_g = max(actual_g, volumetric_g)
```

The divisor is per-carrier account data, never a hardcoded constant. This governs
K2's light-bulky seasonal stock, where volumetric weight can exceed actual weight
several times over.

### 3.3 Multi-parcel

A grocery order exceeds one parcel's carrier limits routinely (six bottles of oil
is already past 6 kg). `quoteShipping` therefore packs the cart into *n* parcels
against `carrier.max_parcel_weight_g` and `max_parcel_dimensions_mm`, and returns
a per-parcel breakdown. `shipments` is 1:N with the order for the same reason -
each parcel gets its own waybill and tracking number.

### 3.4 Shipping snapshot

On Place Order, the accepted quote is frozen onto the order: zone, chargeable
weight, parcel count, base rate, protection fee, total, source, rate version, and
`quotedAt`. A later rate-matrix revision must never retroactively change what a
customer agreed to pay.

### 3.5 Requote and the delta rule

Before acceptance, K2 must resolve the full eligibility inputs and either communicate
one final pilot charge or route the order to manual courier quotation. If the inputs
change before acceptance, K2 shows the old and new amount and reason and obtains a
new confirmation. Once the customer accepts an eligible `STANDARD_FEE`, that amount
is frozen for the order: K2 absorbs later ordinary carrier variance and does not add
a surprise delivery charge. An exception discovered after acceptance is escalated
for owner handling rather than silently rebilled. Reconciliation may change a future
rate version, but it never changes an accepted order's charge.

### 3.6 Channels that price their own delivery

`quoteShipping` never runs for `shopee`, `lazada`, or `tiktok` orders. Those keep
`shipping_quote_status = 'platform_charged'` exactly as `set_order_delivery_details`
already handles, and marketplace labels continue to come from the marketplace.
Running K2 rating on them would double-charge.

---

## 4. Data model additions

Additive to the existing schema; nothing below replaces a current column.

**`carriers`** - `code`, `name`, `is_active`, `volumetric_divisor`,
`max_parcel_weight_g`, `max_parcel_dimensions_mm`, and capability flags
(`supports_rate_api`, `supports_booking_api`, `supports_label_api`,
`supports_pickup_api`, `supports_tracking_webhook`). Capability flags drive the
runtime path in section 9 - K2 never assumes a carrier supports something.

**`shipping_zones`** - `code`, `name`, `carrier_code`, grouping notes.

**`ph_destinations`** - `region`, `province`, `city_municipality`, `barangay`,
`postal_code`, `zone_code`, `is_remote_area`, `surcharge_amount`. Structured
destination is the prerequisite for zone mapping; the free-text address stays for
the courier label.

**`shipping_rate_versions`** - `id`, `carrier_code`, `label`, `source`
(`contract_card` | `vip_quick_inquiry` | `api_snapshot`), `captured_at`,
`captured_by`, `effective_from`, `effective_to`, `is_active`, `notes`. Rates are
versioned so a quote can always be explained after the fact and so a revision is a
new version rather than an in-place edit.

**`shipping_rate_matrix`** - `rate_version_id`, `zone_code`, `service_code`,
`min_weight_g`, `max_weight_g`, `base_amount`, `additional_kg_amount`.

**`shipments`** *(new, 1:N with the order)* - `order_request_id`, `carrier_code`,
`parcel_index`, `tracking_number`, `waybill_state`, `waybill_storage_path`,
`shipment_status`, `weight_g`, dimensions, `booked_at`, `picked_up_at`,
`delivered_at`, `carrier_reference`, `cost_actual`.

**`shipment_tracking_events`** *(append-only)* - `shipment_id`, `carrier_code`,
`raw_payload jsonb`, `carrier_status_code`, `normalized_status`, `occurred_at`,
`received_at`, `source` (`webhook` | `poll` | `manual`), `event_fingerprint`
(unique, for idempotency). Current status is derived from the latest event, never
overwritten in place - matching the durable-raw-event pattern already required of
connectors.

**`carrier_status_map`** - `carrier_code`, `carrier_status_code`,
`normalized_status`. A table, not code: carriers add and rename codes.

**`products`** - `shipping_weight_g integer`, `shipping_length_mm`,
`shipping_width_mm`, `shipping_height_mm`, `shipping_profile`. The existing text
`net_weight` remains a display attribute and is never used for rate arithmetic.

**`order_requests`** - `destination_zone_code`, `chargeable_weight_g`,
`parcel_count`, `shipping_rate_version_id`, `shipping_quote_source`,
`shipping_quote_confidence`, `shipping_discount`, `shipping_cost_actual`,
`protection_required`, `protection_fee`, `protection_status`.

`shipping_discount` exists from the start because free-shipping-over-X is a
standard promotion and the current coupon model supports only `percentage` and
`fixed` against items.

---

## 5. Logic A - carrier API available

### 5.1 Quotation, before any order exists

1. Customer supplies a structured destination.
2. K2 computes parcels and chargeable weight.
3. **Server** calls the carrier rate endpoint. Credentials never reach the browser.
4. Carrier returns the applicable rate; K2 returns `source: 'jnt_api'`,
   `confidence: 'exact'`.
5. On timeout, error, or an unconfigured endpoint, K2 falls back to the Logic B
   matrix and downgrades `confidence` to `estimated`. Rating never hard-fails checkout.
6. **No shipment is created.** A visitor asking for a price must never book a parcel.

### 5.2 Fulfillment, after order confirmation

1. K2 creates the internal order and the `shipments` rows.
2. K2 submits recipient, address, parcel, contact, declared value, and COD data.
3. Carrier returns a tracking number and carrier reference; K2 stores them.
4. If `supports_label_api`, K2 retrieves the waybill document (section 6).
5. If `supports_pickup_api`, K2 books pickup and records the window.
6. If `supports_tracking_webhook`, K2 registers for status callbacks (section 7).
7. Any unsupported capability degrades to the Logic B manual step for that step
   only - the paths are per-capability, not all-or-nothing.

### 5.3 Failure handling

Booking is not idempotent by nature, so every submission carries a K2-generated
idempotency key, and a retry after an ambiguous timeout must query before it
re-books. A failed booking sets `shipment_status = 'booking_failed'`, keeps the
order in the Shipout Workspace, and never fabricates a tracking number.

---

## 6. Waybill logic

A waybill is the **carrier's** label and contract of carriage. K2 renders or stores
it; K2 never authors it.

### 6.1 States

```text
not_required -> pending -> created -> printed -> attached
                                   \
                                    -> voided
```

- `not_required` - marketplace order; the platform supplies the label.
- `pending` - order is ready to book, no carrier label yet.
- `created` - carrier returned a waybill/tracking number.
- `printed` - staff recorded that the physical label was printed.
- `attached` - label is on the parcel; required before handover.
- `voided` - booking cancelled. Voiding **must** clear the tracking number from
  customer-facing surfaces so a dead number is never shown as live.

### 6.2 Storage

`waybill_url` today holds a pasted URL. A carrier portal URL usually requires an
authenticated session and will rot. Replacement: store the label document in a
**private** Supabase bucket under `waybill_storage_path`, served to staff through
signed URLs - the pattern already used by `intake-evidence`. The pasted-URL column
is retained only for historical rows.

### 6.3 Invariants

- K2 must never generate a waybill number, barcode, or label that resembles a
  carrier document. This extends the existing packing-QR rule.
- The packing QR and the waybill are distinct documents at every point in the UI.
- Handover stays blocked until `waybill_state` is `attached` (Logic A) or staff has
  explicitly recorded the carrier tracking number (Logic B).
- A voided waybill returns the shipment to `pending` and leaves an audit event.

---

## 7. Tracking logic

### 7.1 Three ingestion modes

| Mode | When | Requirements |
| :--- | :--- | :--- |
| **Webhook (push)** | `supports_tracking_webhook` | Signature verification, replay window, bounded body - reuse the `shopee-webhook` pattern (256 KB cap, HMAC SHA-256, 5-minute replay window) |
| **Poll (pull)** | Tracking API but no webhook | A scheduled job. **K2 currently has zero scheduled jobs**, so this needs new infrastructure and its own MAP scope |
| **Manual** | Logic B | Staff records the number once; K2 deep-links to the carrier's public Track & Trace. No events are ingested |

### 7.2 Event handling

Every event is appended to `shipment_tracking_events` with its raw payload, never
merged into a mutable status column. `event_fingerprint` makes redelivery
idempotent. Carrier codes normalize through `carrier_status_map`; an **unmapped
code is stored and surfaced for staff review, never silently dropped and never
guessed into a normalized status**.

Current shipment status is derived from the newest event by `occurred_at`, so
out-of-order delivery cannot move a parcel backwards.

### 7.3 Customer-facing tracking

Extends the existing minimal-disclosure guest boundary
(`20260831_guest_order_status_boundary.sql`). Exposed: public reference, carrier
name, tracking number, normalized status, last event timestamp, and coarse event
history. Never exposed: internal notes, staff identity, cost, reconciliation data,
raw carrier payloads, or another customer's parcel.

In Logic B the customer surface shows the tracking number and an outbound link to
the carrier. K2 states plainly that status comes from the carrier and is not
synchronized - it does not imply live tracking it does not have.

---

## 8. Logic B - no usable API

Customer experience stays automatic. K2 owns the quotation; physical fulfillment
stays manual but stops being repetitive data entry.

### 8.1 Rate matrix

The controlled pilot workbook maintains immutable version IDs and exact-locality
rules seeded only from the eight verified Warehouse A J&T VIP observations in
section 1.1. Every row records its source, status, effective interval, and identifiers
for workbook release, rate version, rate rule, and location rule. Effective intervals
use Asia/Manila time and `[effective_from, effective_to)` semantics; a blank end means
no scheduled end. Duplicate or overlapping active rules stop quotation rather than
being resolved by priority.

The workbook also records the four macro-area planning floors and the current PSGC
region-to-island-group reference. Those rows are expressly nonquotable. A future
rate version is created instead of editing a used version in place. Accepted quotes
must be copied into the order record or another immutable snapshot outside the live
tester; reconciliation never re-looks up an accepted charge from the current table.

### 8.2 Shipout Workspace

The highest-value surface in this spec, and the one that needs no carrier API at
all. It exists to reduce the unavoidable manual step to: **open carrier portal ->
paste prepared data -> generate waybill -> paste tracking number back**.

Contents per confirmed order:

- Recipient name, mobile, structured address, postal code
- Per-parcel weight and dimensions, parcel count
- Declared value / COD amount
- Order reference and item summary
- Calculated shipping charge, rate version, and confidence
- Protection status
- Per-field copy controls, so nothing is retyped
- Tracking-number entry per parcel, with carrier format validation
- Waybill state control (section 6.1)
- Pickup state, set only by explicit staff action

### 8.3 Reconciliation

When the carrier bill arrives, staff records `cost_actual` per shipment. The
workspace surfaces the variance against what the customer was charged and flags
rate-matrix rows that repeatedly under-quote. This is the only mechanism that
detects the matrix drifting into a loss.

---

## 9. Runtime decision logic

Per capability, not per path:

```text
RATE:
  IF carrier.supports_rate_api AND endpoint healthy -> live quote  (confidence 'exact')
  ELSE                                              -> K2 matrix   (confidence 'estimated')
  IF neither resolves                               -> 'unavailable'; fall back to
                                                       the existing pending_quote model

PROTECTION:
  IF protection product is defined AND order qualifies -> add as a separate line
  ELSE                                                 -> protection_status='not_required', fee 0

ON PLACE ORDER:
  freeze the shipping snapshot

BOOKING:
  IF carrier.supports_booking_api -> create shipment, store tracking + carrier ref
  ELSE                            -> route to Shipout Workspace

LABEL:
  IF carrier.supports_label_api   -> fetch and store in the private bucket
  ELSE                            -> staff prints from the carrier portal

TRACKING:
  IF carrier.supports_tracking_webhook -> ingest signed callbacks
  ELIF carrier tracking API            -> scheduled poll (needs job infrastructure)
  ELSE                                 -> manual number + carrier deep link
```

---

## 10. Dashboard surfaces

| Surface | Purpose | Path |
| :--- | :--- | :--- |
| **Shipout Workspace** | Prepared booking data, copy controls, tracking entry, waybill/pickup state | Both; primary in B |
| **Shipment panel** (per order) | Parcels, tracking numbers, waybill state, normalized status, event history | Both |
| **Exceptions queue** | `booking_failed`, `delivery_failed`, `returned_to_sender`, unmapped carrier codes, stale quotes | Both |
| **Rate matrix admin** | View/compare versions, capture a new version, mark active, review-date warning | B (and A's fallback) |
| **Reconciliation view** | Charged vs actual per shipment, variance, loss-making rows | Both |
| **Carrier health** | Per-capability status; explicitly says which capabilities are unavailable | A |

Every surface must name manual steps as manual, per G-013.

---

## 11. Recommended build order

**Phase 1 - Foundation.** Carriers, zones, structured destinations, versioned rate
matrix, product shipping dimensions, `shipments`, tracking-event tables, and
`quoteShipping()` returning `unavailable` for everything. No customer-visible change.

**Phase 2 - Shipout Workspace.** *Deliberately before customer quotation.* It
depends on no new product data, removes today's real admin cost, and works with the
current manual quote. Phase 3 is blocked on physically weighing and measuring every
SKU; that warehouse work runs in parallel with this.

**Phase 3 - Customer quotation.** Destination selection, matrix lookup, estimate on
cart/checkout, snapshot on order, requote delta rule.

**Phase 4 - Tracking.** Manual entry and carrier deep-link first; then event
ingestion when a carrier capability exists.

**Phase 5 - Carrier API adapter.** Rate first, then booking, label, pickup,
webhooks - each behind its capability flag. **Checkout is not rewritten.**

**Phase 6 - Reconciliation.** Actual cost capture, variance reporting, stale-matrix
and loss-making-row alerts.

Protection is a *slot* from Phase 1 (fields, statuses, zero fee) and becomes a
computed fee only after 12.2 is answered.

---

## 12. Owner decisions and remaining gates

**12.1 - Pilot rates resolved.** The initial manual pilot uses only the eight exact
localities in section 1.1. Macro-area values are planning floors, not quotable rates.
This resolves the workbook pilot and does not approve regional or nationwide coverage.

**12.2 - Shipping protection remains deferred.** Provider, formula, exclusions,
and claim flow remain undefined. Any order requiring special protection routes to
manual quotation. This does not block the standard pilot.

**12.3 - SUPERSEDED 2 September 2026. Checkout now shows an exact pilot fee.**
The owner directed that the pilot reach the customer, not only staff. This
reverses the original gate, and the reversal is recorded here rather than left
implicit.

The customer path is implemented fail-closed, so the reversal cannot widen what
K2 commits to:

- A number is shown only when the destination is one of the eight approved exact
  localities **and** the server returns `STANDARD_FEE`. Every other case renders
  the unchanged `Quoted after review` line.
- The quote is resolved inside `public.quote_guest_delivery_v1`, never in the
  browser. The storefront BFF holds a publishable key and cannot read
  `delivery_cost_rows`; only the outcome and the final charge cross the boundary.
- An order containing any SKU without a measured `products.shipping_weight_g`
  is never priced. `net_weight` is display text and is not consulted.
- The exception flags the storefront cannot observe are asserted as the ordinary
  case. Staff review still catches a real exception before handover, and 12.4
  already makes an accepted standard fee K2's to absorb.

`MAP-019`'s server-enforced accepted-quote snapshot remains outstanding:
`delivery_quote_snapshots` exists and is written, but freezing it onto the order
at Place Order is not yet wired.

**12.4 - Post-acceptance variance resolved.** K2 absorbs ordinary carrier variance
after a standard fee is accepted. Reconciliation informs only future rate versions.

**12.5 - Pilot origin resolved.** Warehouse A is the only origin for the controlled
pilot. Cebu Transit Hub remains a transit/administrative identity and is not a direct
shipping origin. Multi-origin rating remains future work.

**12.6 - Carrier questions remain.** API availability and scope, contractual rate
cards, volumetric divisor, COD fees/remittance, surcharges, and coverage still cap K2
at manual Logic B. They do not block the controlled workbook pilot because unknowns
and exceptions route to manual quotation.

### 12.7 Decision record and independent review

Alternatives considered were a carrier inquiry for every order, a national/regional
flat-rate table, and the selected exact-locality pilot. Per-order inquiry preserves
provider accuracy but creates the repeated work the owner wants to remove. A broad
flat rate is simple but extrapolates eight observations into unsupported coverage and
can hide remote, dimensional, protection, and tariff risk. The exact-locality pilot
removes repeat lookups only where evidence exists and fails closed everywhere else.

Independent review objected to regional extrapolation, ambiguous exceptions,
blank-versus-zero handling, duplicate effective rules, treating an editable workbook
as authorization, and re-looking up accepted orders after rate changes. The approved
design resolves those objections through exact-scope labels, explicit exception
inputs, fixed result codes, blank-as-unknown semantics, conflict-stop QC, an external
future approval receipt, and immutable accepted-quote snapshots. The final arbiter
review approved this design with no blocking objection.

---

## 12.8 Implementation status, 2 September 2026

Phase 1 (foundation) and the Phase 3 customer quotation path are implemented for
the controlled pilot. Phases 2, 4, 5, and 6 are not started.

| Piece | State | Where |
| :--- | :--- | :--- |
| Decision logic | Done | `src/lib/deliveryQuote.js`, 23 contract tests |
| Control tables + RLS | Done | `supabase/migrations/20260902_delivery_quote_control.sql` |
| Pilot seed (8 localities) | Done | `..._delivery_quote_pilot_seed.sql` |
| Owner-editable rates | Done | `..._delivery_quote_admin_command.sql`, admin BFF `delivery/*` |
| Rate matrix admin surface | Done | `src/views/admin/DeliveryRateControl.jsx` |
| Customer estimate | Done, gated | `..._delivery_guest_quote_boundary.sql`, `src/components/DeliveryEstimate.jsx` |
| Product shipping weight | Column added, **unpopulated** | `..._product_shipping_dimensions.sql` |
| Shipout Workspace | Not started | Phase 2 |
| Tracking, waybill, carrier API | Not started | Phases 4-5 |
| Reconciliation | Table only | `delivery_quote_snapshots.cost_actual_minor` |

**The customer estimate is inert until SKUs are weighed.** Every cart containing
an unweighed SKU resolves to the existing request model, so today the storefront
behaves exactly as it did before. Weighing and recording `shipping_weight_g` per
SKU is warehouse work, and the estimate activates per order as it is completed.

The quotation rules exist twice — once in JavaScript for staff, once in SQL for
customers — because the customer path must not be able to read costs. The SQL
twin is written as a narrow allowlist so any disagreement can only make the
customer path more conservative, and `tests/delivery-quote-parity.spec.js` pins
the shared constants and vocabulary so one cannot change without the other.

---

## 13. Invariants

- Checkout never hard-depends on a carrier API. Rating degrades; it does not fail.
- Outside the owner-approved exact-locality pilot, a quote is an estimate until a
  carrier confirms it and every surface says so. An accepted pilot `STANDARD_FEE` is
  K2's final customer charge, while the later carrier cost remains a separate actual.
- K2 never fabricates a tracking number, waybill, booking, pickup, or delivery event.
- An unmapped carrier status is surfaced, never guessed or dropped.
- Carrier credentials are server-only. They never appear in `VITE_` variables,
  browser code, or the repository.
- Browser automation or scraping of a carrier portal is not a production mechanism.
- Rate versions are immutable once used by a quote; corrections create a new version.
- No carrier connector is enabled until the owner supplies the provider account, fee
  schedule, rate limits, and sandbox reconciliation evidence required by G-013.
