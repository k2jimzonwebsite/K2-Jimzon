# K2 Jimzon — Future Ideas Register

**Purpose:** Keep every promising future improvement in one durable place without
mistaking an idea for a feature that is already built, approved, connected, or live.

**Last updated:** 4 August 2026

This file is the source of truth for proposed future work. The current implemented
state remains documented in `SYSTEM_BRAIN_CURRENT.md`.

## How to use this register

Every idea receives an ID and one of these states:

| State | Meaning |
| --- | --- |
| `Idea` | Worth preserving, but not yet investigated or approved |
| `Researching` | Feasibility, API access, cost, risks, and workflow are being checked |
| `Ready for decision` | Options and dependencies are known; an owner must approve the direction |
| `Approved` | Accepted for a future implementation phase |
| `In progress` | Implementation has started |
| `Deferred` | Intentionally postponed, with the reason recorded |
| `Done` | Implemented, tested, documented, and moved into the current-state brain |

Rules for all future ideas:

- Never describe an API, payment provider, channel, metric, or automation as live
  until a real event has been verified end to end.
- Record dependencies, access limitations, recurring costs, and manual fallbacks.
- Preserve K2's inventory, lot, custody, consignment, Pasabuy, fulfillment, and
  audit rules; a convenience feature must not bypass them.
- Marketplace credentials and refresh tokens stay on the backend, never in the
  browser or mobile client.
- Human approval remains required for financially meaningful, destructive, or
  customer-facing AI actions unless a later policy explicitly authorizes them.
- When an idea becomes implementation work, create a scoped plan and tests rather
  than coding directly from this document.

---

## IDEA-001 — Multichannel Operations Settings and Control Center

**State:** `Researching`
**Priority:** High
**Area:** Settings, orders, fulfillment, inventory, messaging, channel health
**Proposed users:** Admin, operations staff, warehouse/packing staff, customer service
**Channels:** K2 Website, Pasabuy, Shopee, TikTok Shop, Lazada

### The idea

Prepare K2 so staff can operate every supported income channel from one responsive
website on a laptop, tablet, or mobile phone. The website should normalize each
marketplace's different APIs while keeping channel-specific restrictions visible.

The target experience includes:

- One order and fulfillment queue across Website, Pasabuy, Shopee, TikTok Shop,
  and Lazada.
- Shared inventory reservations that prevent two channels from selling the same
  final unit.
- Packing, ready-to-ship, label retrieval, and waybill printing from K2 where the
  marketplace API and account permissions allow it.
- A unified customer-service inbox where messages can be received and replied to
  only when the channel grants the required API capability.
- Marketplace deep links and clear manual fallbacks wherever an API capability is
  unavailable or still awaiting approval.
- Channel-specific returns, cancellations, shipment exceptions, and failed-sync
  queues instead of hiding them behind one generic order status.

### Why a new Settings area is needed

A single `Live / Not connected` badge is not enough. One marketplace connection
may support orders and labels while messaging remains unavailable. Settings should
therefore show readiness per account and per capability.

Recommended Settings structure:

#### 1. Channel accounts

Store non-secret connection metadata for every authorized shop/account:

- Marketplace and country/region
- Internal display name
- External seller/shop identifier
- Connection owner
- Authorization state and token-expiry warning
- Last successful event and reconciliation
- Current error or approval blocker
- Seller Center deep link

K2 may eventually operate more than one account on the same marketplace, so the
data model must not assume exactly one Shopee, TikTok Shop, or Lazada shop.

#### 2. Capability matrix

Track each capability independently:

- `orders.read`
- `orders.cancel`
- `inventory.read`
- `inventory.write`
- `listings.read`
- `listings.write`
- `fulfillment.pack`
- `fulfillment.ship`
- `shipping_documents.download`
- `messages.read`
- `messages.send`
- `returns.read`
- `returns.manage`
- `finance.read`

Suggested states are `unconfigured`, `awaiting_approval`, `testing`, `operational`,
`degraded`, `denied`, and `unsupported`. Evidence for `operational` should include
the last verified real event, not a manual toggle.

#### 3. Order and inventory policies

- Map marketplace SKUs/variants to the K2 product master.
- Define which K2 inventory locations/lots may supply each channel.
- Reserve stock exactly once using the marketplace order and line identifiers.
- Keep `on_hand`, `reserved`, `available`, `in_transit`, `damaged`, `expired`, and
  `unaccounted` quantities separate.
- Push stock changes through a durable command queue with retries rather than a
  fragile direct database trigger.
- Reconcile marketplace orders and inventory on a schedule because webhooks can be
  delayed, duplicated, missed, or delivered out of order.
- Require a reason and audit event for manual stock overrides.

#### 4. Fulfillment and waybill settings

- Default packing location and permitted stock locations per channel account
- Pickup/drop-off preferences exposed by the marketplace
- Label format preference: original PDF, A4, or 4 x 6 where supported
- Printer instructions per workstation or mobile device
- Batch-print limits and safe reprint behavior
- A shipping-document history containing channel, package, version, retrieval
  result, staff actor, and timestamp

K2 must retrieve the marketplace or courier's real shipping document. The existing
K2 packing slip must never be represented as a courier waybill.

Initial no-subscription printing approach:

- Laptop: open the original PDF and print through the installed printer driver.
- Mobile/tablet: open the PDF and use the device's system print service with a
  compatible Wi-Fi/AirPrint/Mopria printer.
- Direct raw Bluetooth thermal printing is a later device-specific enhancement,
  not a launch assumption.

#### 5. Messaging settings

- Enable inbound and outbound messaging independently per channel.
- Display the channel's session rules, attachment limits, and approval state.
- Configure default assignment, response SLA, templates, and escalation rules.
- Link conversations to relevant orders, packages, returns, and customer records.
- Mark a reply `sent` only after the external channel acknowledges delivery.
- Preserve failed, recalled, blocked, and rate-limited messages as explicit states.
- When sending is unavailable, provide a verified Seller Center deep link and a
  copy-response fallback; never display a working-looking Send button.

TikTok Shop customer-service access may require special approval. Lazada documents
an IM API with channel rules. Shopee Philippines messaging capability must be
confirmed from the exact scopes granted to K2's Open Platform application.

#### 6. Webhook, sync, and error health

- Per-channel webhook URL and verification status
- Last inbound event, last scheduled pull, and last outbound command
- Token-expiry and reauthorization warnings
- Queue depth, retry count, rate-limit state, and dead-letter failures
- Manual `Reconcile now` action with permissions, progress, and audit logging
- Searchable external request/event IDs for support investigations

Webhook endpoints require stable public HTTPS URLs. Development can proceed with
mock fixtures before domain and partner-app setup, but true end-to-end verification
must wait for approved credentials and reachable callback URLs.

#### 7. Roles, safeguards, and audit

Permissions should be capability-based, for example:

- View orders
- Reserve/release stock
- Pack orders
- Generate/reprint labels
- Mark ready to ship
- Reply to customers
- Approve refunds/cancellations
- Edit channel mapping/settings
- Reauthorize a marketplace account

Every sensitive action should record the staff actor, source device/session,
external request ID, previous state, new state, reason, and result.

### Recommended technical shape

Core operations should use the marketplace's official REST APIs and webhooks:

```text
Marketplace APIs and webhooks
        -> channel-specific backend adapters
        -> idempotent event inbox
        -> normalized K2 operational records
        -> responsive Admin queues
        -> durable outbound command queue
        -> channel-specific backend adapters
        -> Marketplace APIs
```

Each adapter translates marketplace-specific orders, lines, packages, statuses,
documents, messages, and errors into K2's shared model. Raw payloads should be
retained only as permitted and protected appropriately for troubleshooting.

The browser must call K2's authenticated backend, never a marketplace API directly.
The backend owns signatures, OAuth exchanges, token refresh, rate limiting,
idempotency, retries, and secret storage.

### Role of MCP

MCP is optional and comes after the operational API layer. A future K2 MCP server
could safely expose approved tools to an AI assistant, such as:

- List orders blocked from fulfillment
- Find failed waybill downloads
- Summarize urgent conversations
- Draft a response using order and shipment context
- Identify inventory at risk of overselling
- Prepare, but not silently execute, a packing batch

MCP does not provide Shopee, TikTok Shop, or Lazada permissions and should not be
the source of truth. Customer replies, inventory mutations, shipping actions, and
other meaningful writes must use the same authorized K2 command layer and audit
rules as the human dashboard.

### What can be prepared before API access

- A responsive Multichannel Settings workspace
- Multi-account channel and capability data contracts
- Mock/sandbox channel adapters with recorded fixtures
- Normalized order, line, package, shipping-document, return, and message models
- Idempotent webhook/event handling
- Outbound command queue, retry model, and failure states
- Unified order and fulfillment queue
- Waybill download/print user interface using test PDFs clearly marked as fixtures
- Inbox order/shipment/return context
- Seller Center fallback links
- Role permissions and immutable audit events
- API access checklist for every marketplace

No mock result may make a channel appear operational in production.

### Proposed delivery order

1. **Settings foundation** — accounts, capabilities, health, permissions, and
   truthful states.
2. **Order intake** — read-only order/detail synchronization with idempotency and
   scheduled reconciliation.
3. **Inventory reservations** — safe reservations followed by controlled outbound
   stock synchronization.
4. **Fulfillment and waybills** — package actions, original-document retrieval,
   printing, reprints, and failure recovery.
5. **Returns and cancellations** — explicit channel-aware exception handling.
6. **Messaging** — activate read/send only for capabilities K2 is actually granted.
7. **MCP copilot** — read-heavy operational assistance, drafts, summaries, and
   confirmation-gated tools.

### Dependencies and decisions still needed

- Exact approved scopes visible in each Shopee, TikTok Shop, and Lazada developer
  application
- Number of seller accounts per marketplace and whether more may be added later
- Printer type/model and desired paper format at each packing location
- Which staff roles may pack, print, reply, cancel, refund, reconcile, and edit
  channel settings
- Whether channel stock shares one pool or uses channel/location allocations
- Required service-level targets for packing and customer replies
- Marketplace retention and privacy rules for buyer details and chat history
- Stable public HTTPS callback URLs and production secret storage

### Definition of done for the future feature

- Staff can see exactly which capability is available, blocked, degraded, or
  awaiting approval for every connected account.
- Repeated or out-of-order events cannot duplicate an order, message, reservation,
  or fulfillment action.
- Inventory reconciles across lots, reservations, locations, owners, and channels.
- Staff can pack and print the real marketplace waybill from laptop or mobile, with
  a recoverable failure path.
- Unified inbox replies are externally sent only where the channel confirms them.
- Every sensitive action and external response is attributable and auditable.
- Manual Seller Center workflows remain usable when an API is unavailable.

---

## IDEA-002 — Product Transformation Stories and Usage Master

**State:** `Researching`
**Priority:** High
**Area:** Storefront product media, Product Master, catalog authoring
**Proposed users:** Shoppers, catalog staff, content editors, wholesale buyers
**Related surfaces:** Home, product cards, Product Master, Inventory editor, AI Sourcing

### The idea

Every eligible product should communicate both **what the customer receives** and
**what the product becomes or enables**. For example:

- Pasta package → plated spaghetti
- Coffee bag → finished espresso
- Pesto jar → prepared pesto pasta
- Biscuit package → served merienda plate
- Skincare package → texture/application ritual, without unsupported efficacy claims
- Household product → product in its intended use context

The Home experience introduces this transformation on every eligible product. The
Product Master page then expands it into the complete process, instructions, usage,
ingredients or materials, finished result, pairings, and related products.

This is not a generic decorative before/after gimmick. It is a consistent product
education system that connects imagery to truthful preparation and use guidance.

### Current foundation that must be preserved

The project already contains:

- A draggable `BeforeAfterSlider`
- An `InteractiveReveal` used by the featured Home product
- A Product Master gallery that can place the comparison first
- Admin inputs for a primary image and an after-use/lifestyle image
- Fields for usage instructions, ingredients, allergens, storage, finished-product
  details, pairings, and product video
- Local demonstration products with structured ingredients, steps, and bundles

These pieces should be consolidated rather than replaced.

### Current gaps to fix

1. **Inconsistent image contract:** an older migration defines
   `after_use_image_url` and `sample_image_urls`, while newer UI code reads and
   writes `lifestyle_images[0]` and `secondary_images`. Real uploaded images can
   therefore disappear or fail to save depending on the installed schema.
2. **Home coverage is incomplete:** the featured Latest Consignment card supports
   the reveal, but ordinary product cards show only the package image.
3. **Structured guides are not production-backed:** live products can store a
   plain `usage_instructions` string, but complete guide steps, guide ingredients,
   bundle relationships, timing, and serving details currently depend mainly on
   exact-SKU local demonstration data.
4. **Legacy duplication:** the active shopper path opens `MasterProduct`, while a
   separate older `ProductDetail` implementation still contains overlapping media
   and guide logic. One Product Master should become the maintained source.
5. **Fallback behavior is ambiguous:** products without a real result/use image
   must show a polished single-image card, not generated filler or another
   product's lifestyle image.

### Canonical production content contract

Use one explicit meaning for each field:

| Content | Meaning | Example |
| --- | --- | --- |
| `primary_image_url` | Product/package the customer receives | Barilla pasta box |
| `after_use_image_url` | Truthful prepared result or use context | Plated spaghetti |
| `gallery_image_urls` | Additional packaging, detail, ingredient, and serving views | Back label, pasta texture |
| `transformation_label_before` | Customer-facing label for the first state | `Package` |
| `transformation_label_after` | Customer-facing label for the second state | `Prepared` |
| `usage_summary` | Short practical instruction | `Boil in salted water for 9 minutes` |
| `preparation_steps` | Ordered, independently editable steps | Drain, sauce, plate |
| `guide_ingredients` | Ingredients/materials needed, with optional quantities | Pasta, sauce, salt |
| `finished_result` | Expected truthful outcome | Al dente, approximately four servings |
| `serving_and_pairing_notes` | Ways to serve or compatible K2 products | Pair with pesto or passata |
| `safety_and_storage_notes` | Product-specific cautions and storage | Allergens, patch-test note, refrigeration |
| `guide_video_url` | Optional reviewed demonstration | Preparation clip |

The exact database naming may differ after migration design, but one canonical
contract must be used by migrations, admin forms, imports, product normalization,
Home cards, and Product Master.

### Safe migration and compatibility approach

1. Inspect the live `products` schema before writing SQL.
2. Choose one canonical after-use field and one canonical gallery field.
3. Copy legacy values only when the target is empty; never overwrite a reviewed
   photo with an inferred value.
4. During transition, the reader may safely fall back in this order:

   ```text
   canonical after-use image
   -> legacy after_use_image_url
   -> first approved lifestyle image
   -> no comparison
   ```

5. Remove compatibility reads only after every live product has been reconciled.
6. Add database constraints or server validation that reject blank URLs, duplicated
   gallery entries, and unsupported guide shapes.
7. Record catalog changes in the existing product audit trail.

No migration should be given to the user until it has been verified against the
actual live column inventory and tested on a representative copy or transaction.

### Home product experience

Every eligible product shown on Home should make the transformation discoverable,
but the interaction must remain usable on mobile:

- **Featured product:** full draggable comparison with persistent labels and a
  short `Drag to reveal` or `Swipe to reveal` instruction.
- **Standard Home card:** a lightweight `Product / Prepared` toggle or controlled
  reveal. It must not hijack vertical page scrolling.
- **Keyboard:** arrow keys adjust a focused comparison, and buttons/toggles have
  visible focus states.
- **Reduced motion:** use an immediate image switch instead of animated clipping.
- **Missing after image:** show the primary product photograph normally and omit
  the comparison control completely.
- **Performance:** responsive image sizes, lazy loading below the fold, stable
  aspect ratios, and no download of full-resolution result images until needed.

The result image is supporting evidence, not a substitute for the product name,
price, stock state, or clear link to Product Master.

### Product Master experience

Product Master should be the authoritative customer education page:

1. **Transformation hero** — package/result comparison with truthful custom labels
2. **What it is** — reviewed description, origin, size, and key differentiators
3. **How to use or prepare it** — ordered steps with timing and quantities
4. **What is needed** — included product plus pantry/material requirements
5. **Expected result** — texture, finish, serving size, or appropriate use context
6. **Safety and storage** — allergens, cautions, expiry/storage guidance
7. **Ways to enjoy it** — pairings and related K2 products
8. **Optional demonstration** — reviewed video or additional gallery media

Food, beauty, and household products use the same framework with category-specific
language. Do not label a skincare or cosmetic image `Before / After` when it could
imply guaranteed physical results. Prefer `Product / In use`, `Texture / Applied`,
or another reviewed label.

### Admin authoring and review

The product editor should provide one guided `Transformation & Usage` workspace:

- Primary/package image upload
- Result/use-context image upload
- Customer-facing labels for both states
- Gallery management with ordering and alt text
- Usage summary
- Repeatable preparation/use steps
- Repeatable ingredient/material rows with quantity, unit, and `included by K2`
- Finished-result description
- Serving/pairing suggestions
- Safety, allergen, and storage review
- Optional video
- Desktop and mobile preview

Publishing checks should distinguish `recommended` from `required`:

- A valid primary image is required.
- An after-use image is recommended for eligible products but must be real and
  reviewed; absence must never block a product that cannot truthfully use one.
- Food preparation claims, timings, and allergens require human review.
- Beauty/health claims require especially conservative language and evidence.
- AI may draft descriptions or steps, but a staff member must approve them before
  storefront publication.

### Suggested delivery order

1. **Schema audit and contract** — confirm live columns and define canonical media
   and guide fields.
2. **Compatibility migration** — reconcile legacy image fields without losing data.
3. **Product normalizer** — one mapping used consistently across every storefront
   and admin surface.
4. **Admin authoring** — production-backed transformation and structured-guide editor.
5. **Product Master consolidation** — retain one authoritative page and retire
   duplicated legacy display logic after route verification.
6. **Home cards** — apply the mobile-safe comparison to every eligible Home product.
7. **Content validation** — accessibility, performance, accuracy, and category
   claim review.
8. **Regression tests** — schema mapping, fallbacks, mobile gestures, keyboard use,
   missing-media states, and production product rendering.

### Decisions still needed

- Whether structured guide fields live directly on `products` as JSON or in
  versioned related tables
- Which product categories require, recommend, or prohibit result imagery
- Standard transformation labels per category
- Whether result images must be photographed by K2 or may use licensed brand media
- Image dimensions, compression limits, and moderation/approval ownership
- Whether preparation bundles are merchandising suggestions or real purchasable
  bundle records with synchronized inventory

### Definition of done

- Every product reads from one documented production media contract.
- Legacy after-use and gallery data is migrated without silent loss.
- Every eligible Home product offers a clear, mobile-safe package/result view.
- Products without an approved result image render honestly without fake content.
- Product Master presents database-backed steps, ingredients/materials, finished
  result, pairings, safety, storage, and optional video.
- Admin staff can author, preview, validate, and publish the entire experience.
- Food, beauty, and household terminology avoids misleading outcome claims.
- Automated tests protect the data mapping, fallbacks, accessibility, and responsive
  interaction.

---

## Idea index

| ID | Idea | State | Priority | Next decision |
| --- | --- | --- | --- | --- |
| IDEA-001 | Multichannel Operations Settings and Control Center | Researching | High | Inspect marketplace app scopes and define the settings/data contract |
| IDEA-002 | Product Transformation Stories and Usage Master | Researching | High | Audit live product media columns and approve the canonical content contract |

## Template for the next idea

```markdown
## IDEA-000 — Short name

**State:** Idea
**Priority:** Low / Medium / High
**Area:**
**Proposed users:**

### The idea

### Operational problem it solves

### Expected outcome

### Dependencies and limitations

### Risks and safeguards

### Decisions still needed

### Suggested delivery phase

### Definition of done
```
