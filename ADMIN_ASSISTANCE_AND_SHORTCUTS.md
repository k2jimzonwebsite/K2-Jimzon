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
- usage and before/after transformation;
- marketplace readiness.

Every generated prompt requires packaging photos as primary evidence, direct source URLs for external facts, explicit `Unknown — verify manually` values, exact variant identity, review notes, draft-only status, and exactly two image concepts: the product before use and the truthful prepared/applied result after use.

The prompt never assigns stock or publishes the product. Smart Paste remains a human review step.

## Grounded operations guide (RAG foundation)

Phase 1 is a local retrieval system. It searches a versioned procedure registry, weighs the current workspace, returns up to three relevant procedures, and displays each procedure's rulebook source. This provides the retrieval and grounding parts of RAG without pretending a paid LLM, embeddings service, or channel API is connected.

Covered procedure families include:

- command center and shortcuts;
- product research, variants, catalog, stock, expiry, and FEFO;
- Milan packing, Manila receiving, discrepancy control, and custody;
- website order requests, order-first packing, delivery labels, and payments;
- Pasabuy, suppliers, coupons, customers, messages, and customer exceptions;
- marketplace readiness, roles/security, failures/retries, and globe presentation.

If retrieval has no approved answer, the guide says the procedure is undocumented. It does not guess.

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
- `src/views/admin/adminGuide.js` — grounded procedure registry and retrieval
- `src/views/admin/AdminAiCopilotModal.jsx` — cited guide interface
- `tests/admin-assistance.spec.js` — focused safety and retrieval checks
