# K2 Jimzon Admin Assistance and Shortcut System

**Status:** Phase 1 implemented locally
**Updated:** 10 August 2026
**Authority:** This interface follows `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md`. It cannot override that rulebook, server permissions, state transitions, confirmations, or audit history.

## Purpose

The admin assistance layer reduces repetitive staff work while preserving operational truth. It has four connected parts:

1. one Scan center that routes staff into the correct record-first scanner;
2. laptop shortcuts for frequent navigation and tools;
3. adaptive, copy-ready research prompts for new products;
4. a grounded operations guide that retrieves and cites K2 procedures.

No shortcut or guide response changes stock, confirms payment, finalizes receiving, sends a customer message, prints a fake courier label, or advances an operational state by itself.

## Keyboard shortcuts

Shortcuts are disabled while focus is in an input, textarea, select, or editable field.

| Shortcut | Result |
| --- | --- |
| `Ctrl/Command + K` | Search commands, records, and procedures |
| `Alt + S` | Open Scan center |
| `Alt + G` | Open Operations guide |
| `Alt + A` | Open alerts and daily tasks |
| `?` | Show shortcut reference |
| `G`, then `H` | Command center |
| `G`, then `I` | Inventory |
| `G`, then `F` | Flight Consignments |
| `G`, then `O` | Fulfillment Hub |
| `G`, then `P` | Pasabuy Quotes |
| `G`, then `M` | Messages |

## Scan center contract

The Scan center asks for the operation before opening a scanner:

- **New product research:** duplicate-check a barcode when the database is available, then produce a human-reviewed draft prompt.
- **Order packing:** open the exact order, marketplace waybill, or K2 packing QR before product scans.
- **Milan box packing:** open the exact flight and box; each scan increments one matching unit.
- **Manila receiving:** independently recount the exact arriving box and reconcile exceptions.
- **Inventory lookup:** search the product master by barcode, SKU, product name, or origin.

A raw product barcode never selects an order, flight, or box globally. Wrong, excessive, unexpected, or duplicate scans remain visible exceptions.

## Adaptive product prompt

Staff can choose one of four research focuses:

- complete product draft;
- label and safety;
- uses, ordered instructions, and before/after transformation;
- marketplace readiness.

The installed manual workflow uses two private ChatGPT Projects:

- **K2 Product Content** accepts `PRODUCT_JSON` and returns one
  `k2.product-content.v3` object with exact product data, customer copy, SEO and
  headings, distinct use cases and ordered instructions, verification, unknowns,
  review notes, and the two product-specific media briefs.
- **K2 Product Image Studio** accepts `PRIMARY` or `AFTER`. `PRIMARY` edits the
  real front-package photo into a faithful 4:5 package-as-sold image. A changed
  logo, label, barcode, quantity, color, shape, seal, or claim invalidates the
  image. `AFTER` creates one separate 4:5 truthful prepared, applied, or in-use
  image tied to an approved use case.

The JSON uses `null` plus `unknown_fields` rather than persuasive filler. It
never contains SKU, price, stock, expiry, lot, delivery, review, or publication
state. Usage is split into purpose, specific use cases, supported amount/ratio,
ordered steps, expected result, and warnings. The prompt never assigns stock or
publishes the product. Smart Paste remains a human review step.

The workflow overview is recorded in `CHATGPT_PRODUCT_INTELLIGENCE_PROJECT.md`,
with separate setup checklists in `CHATGPT_PRODUCT_JSON_PROJECT.md` and
`CHATGPT_PRODUCT_IMAGE_PROJECT.md`. The exact copyable instructions are exported
from `src/views/admin/productResearchPrompt.js` and are available in the
Scan-to-AI result screen and Smart Paste image handoff.

### Current implementation boundary

This is a useful research foundation, not yet the approved end-to-end SKU intake:

- Scan to AI and Smart Paste are separate modals and do not preserve one intake
  session when a phone user switches to ChatGPT and returns.
- Add product, Add row, Smart Paste, and product enrichment are competing paths;
  some currently use a browser-random or AI/staff-supplied SKU.
- Smart Paste now validates the v3 JSON contract, rejects forbidden operational
  fields, flattens reviewed use cases for the legacy product column, preserves a
  temporary evidence/review summary in internal notes, and labels legacy JSON.
  Dedicated field-level provenance storage and individual accept/reject decisions
  remain unfinished.
- The enrichment modal now uses the same versioned PRODUCT_JSON request rather
  than maintaining a second price-producing prompt contract.
- Creating the product Draft is not yet followed by one guided, source-specific
  first-inventory workflow.

MAP-001 in `MASTER_ACTION_PLAN.md` owns the consolidation. The target behavior is
defined in the Product Master section of the operations rulebook; none of those
target improvements should be described as live until schema, server commands,
UI, permissions, and tests verify them.

## Grounded operations guide (RAG foundation)

Phase 1 is a local retrieval system. It searches a versioned procedure registry, weighs the current workspace, returns up to three relevant procedures, and displays each procedure's status, role, prerequisites, entry point, actions, blockers, expected canonical result, forbidden shortcuts, recovery, version, and sources. This provides the retrieval and grounding parts of RAG without pretending a paid LLM, embeddings service, or channel API is connected.

Covered procedure families include:

- command center and shortcuts;
- product research, variants, catalog, stock, expiry, and FEFO;
- Milan packing, Manila receiving, discrepancy control, and custody;
- website order requests, order-first packing, delivery labels, and payments;
- Pasabuy, suppliers, coupons, customers, messages, and customer exceptions;
- marketplace readiness, roles/security, failures/retries, and globe presentation.

The current registry is `2026-08-30-draft.12` and is explicitly not locked. It
includes the SuperAdmin-only paid-AI spend-control procedure and the enabled
sales-computation procedure. The latter directs staff to canonical
status-separated Overview totals, their read-only exact-fact record drilldown,
the mutually exclusive Payment × fulfillment reconciliation, the fixed
customer-free selected-period CSV, and all four non-posting Sales Planner modes.
The reconciliation preserves the difference between not verified and unpaid,
and its four buckets reproduce the selected-period total. Check a price asks
for fixed peso fees and channel fee rate separately, automatically applies the
percentage fee to gross sales, shows the cost breakdown, and upward-cent-rounds
the fee-aware break-even price; Find target price solves and upward-cent-rounds a
minimum recommendation from reviewed assumptions; Find max discount solves and
downward-cent-rounds the maximum total allowance a chosen price can absorb
while preserving the target margin. It refuses the discount result when the
chosen price misses the target even without discount, and the total allowance
remains authoritative over the rounded per-unit display. Find units needed
solves the minimum whole units for a positive planned-
profit target, recomputes the achieved scenario, and shows that one fewer unit
misses; it refuses non-positive contribution and requirements above 100,000
units. That result is a planning target, not a quota, order, reservation, or
guarantee. Every valid mode offers Copy planning summary. Its customer-free
plain text keeps the timestamp, mode, assumptions, result, and opening warning
together; invalid calculations cannot copy, and clipboard denial has an inline
retry instruction. The procedure forbids extracted, copied, or planned results from being reported as approved
price, actual profit, landed cost, settlement, accounting, or backup truth. If
retrieval has no documented answer, the guide says the procedure is
undocumented. It does not guess. Prepared and unavailable procedures remain
searchable so staff can see the exact blocker and valid manual boundary; guide
retrieval itself never executes a command.

## Future server-backed RAG

When the procedure library becomes too large for the local registry, add a server-backed knowledge service in this order:

1. `knowledge_documents`: document ID, title, authority level, version, status, audience/role, effective date, superseded-by ID, and source path.
2. `knowledge_chunks`: document ID, section, text, search vector, checksum, and citation anchor.
3. PostgreSQL full-text retrieval with role filters. This works without a paid vector service.
4. Optional embeddings and semantic reranking only after an approved provider and cost plan exist.
5. A server endpoint that retrieves authorized chunks first, then asks an LLM to answer only from those chunks.
6. Every answer returns citations, document version, confidence/coverage, and an “undocumented” fallback.
7. Draft documents never answer production procedures; superseded documents remain auditable but are excluded from current retrieval.

Never put service-role keys or marketplace secrets in browser code. Never let an LLM call a state-changing operation without the same permission, validation, confirmation, reason, idempotency, and audit requirements as a human action.

## Safe workflow automation policy

K2 automation should be **state-aware assistance** first:

- show the next valid action and blocker;
- prefill verified context;
- open the correct record and scanner;
- validate before commit;
- require confirmation for sensitive actions;
- record the actor, reason, time, before/after state, and linked records.

Do not implement silent autonomous transitions for purchasing, receiving, inventory, payment, customer messaging, refunds, price approval, or shipment completion.

## Implementation files

- `src/views/admin/adminOperations.js` — shortcut and scan registries
- `src/views/admin/UniversalScanLauncher.jsx` — operation-first scan entry point
- `src/views/admin/KeyboardShortcutsModal.jsx` — shortcut reference
- `src/views/admin/productResearchPrompt.js` — adaptive evidence-first prompt
- `src/views/admin/productResearchContract.js` — versioned parser and validator
- `src/views/admin/adminGuide.js` — grounded procedure registry and retrieval
- `src/views/admin/staffProcedureRegistry.js` — MAP-023 procedure contracts and coverage/status truth
- `src/lib/aiSpendControls.js` — fail-closed paid-AI control contract and USD-micros normalization
- `src/lib/salesCalculations.js` — bounded sales-summary and non-posting planning math
- `server/admin-bff/ai-spend-controls.js` — exact server payload validation and feature gate
- `supabase/migrations/20260830_paid_ai_spend_controls.sql` — prepared private SuperAdmin config/audit boundary
- `src/views/admin/AdminAiCopilotModal.jsx` — cited guide interface
- `tests/admin-assistance.spec.js` — focused safety and retrieval checks
- `tests/staff-workflow-guide-contract.spec.js` — required coverage and nine-field completeness gate
- `tests/map018-paid-ai-controls.spec.js` — paid path caps, confirmations, role, and migration contract checks
