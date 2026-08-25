# K2 Jimzon — Master Operations Workflow Graph Specification

**Status:** PRODUCTION INTEGRATED & ACCESSIBLE VIA ADMIN BOS  
**Surface:** Admin Business Operating System (BOS)  
**Primary Module:** `src/components/admin/master-workflow-graph/`  
**Route / Section:** `workflow_graph` (Admin Navigation & Header Shortcut)  
**Governance:** Operations Rulebook §1–§24, SYSTEM_BRAIN_CURRENT.md & K2 Pasabuy Commerce Operations  

---

## 1. Executive Summary & Operational Sections

The **Master Operations Workflow Graph** organizes K2 Jimzon's cross-border logistics and warehouse operations into 4 clear operational domains:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                            Admin BOS Master Workflow Graph                               │
│                                                                                          │
│  [ All Workflows ] [ ✈️ Italy & Cross-Border ] [ 📥 Manila Intake ] [ 🏢 Warehouse ] [ 📦 Orders ] │
└────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                             │
      ┌──────────────────────────────────────┴──────────────────────────────────────┐
      │                                                                             │
      ▼                                                                             ▼
┌───────────────────────────────┐                             ┌─────────────────────────────────┐
│   Phase 1: Italy (Cousin)     │                             │    Phase 2: Air Cargo Transit   │
│ - Milan Supermarkets / Bottega│                             │ - Malpensa (MXP) -> NAIA (MNL)  │
│ - Save EUR store receipts (€) ├────────────────────────────►│ - Air Waybill Tracking         │
│ - Pack Flight Cargo Box       │                             │ - Stock status: 'in_transit'    │
│ - Apply Security Seal Tape    │                             └────────────────┬────────────────┘
└───────────────────────────────┘                                              │
                                                                               ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                               Phase 3: Manila Hub Arrival & Unboxing                          │
│ - Scan box QR & verify tamper seal serial against Milan manifest                              │
│ - Open box on stainless steel inspection bench & perform physical QC check                     │
│ - Laser-scan printed manufacturer barcode (EAN-13) for catalog lookup                         │
└──────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
         ┌───────────────────────────┐                   ┌───────────────────────────┐
         │ Branch A: Existing SKU    │                   │ Branch B: New Product     │
         │ - Instant catalog match   │                   │ - Uncataloged Italian SKU │
         │ - Register FEFO batch lot │                   │ - Landed cost floor (€->₱)│
         │ - Best Before Date (YYYY) │                   │ - AI Image Studio prompts │
         │ - Landed cost floor (₱)   │                   │ - Ingredients & Allergens │
         │ - Place on shelf (FEFO)   │                   │ - Master SKU creation     │
         └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                       │                                               │
                       └───────────────────────┬───────────────────────┘
                                               ▼
                                 ┌───────────────────────────┐
                                 │ Phase 4: Commit & Sync    │
                                 │ - Manager authorizes      │
                                 │ - Live stock increments   │
                                 │ - Storefront/Shopee/Lazada│
                                 └───────────────────────────┘
```

---

## 2. Operational Domains & Workflows

### ✈️ Section 1: Italy & Cross-Border (`cross_border`)
- **`cross_border_lifecycle` (Italy Sourcing to Manila Intake Lifecycle):**
  - Step 1: Milan Sourcing & Store Purchase by Cousin (Esselunga, Coop, Eataly, fiscal receipts).
  - Step 2: Milan Box Packing & Manifest Pre-Tagging (Flight Box ID, unit counts, security seal).
  - Step 3: Air Cargo International Transit (Flight AZ-784, tracking status `in_transit`).
  - Step 4: Manila Airport Receipt & Seal Verification (Seal serial number cross-checked).
  - Step 5: Physical Box Opening & Item Quality Check (Stainless steel bench inspection).
  - Step 6: Decision Branch: Existing SKU vs New Product (Laser scan lookup).
  - Step 7: Commit Stock & Multi-Channel Sync (Storefront, Shopee, Lazada).

### 📥 Section 2: Manila Intake & Catalog (`intake_branching`)
- **`existing_stock_intake` (Quick Intake for Existing Catalog SKU):**
  - Step 1: Barcode Scan & Existing SKU Match.
  - Step 2: New FEFO Batch Lot & Expiry Registration (Best Before Date + Landed Cost).
  - Step 3: Physical Lot Sticker Printing.
  - Step 4: Shelf Bin Placement (Newer stock behind older stock).
  - Step 5: Commit Added Stock to Live Channels.
- **`new_product_intake` (New Product Intake & Catalog Creation):**
  - Step 1: Master SKU Registration & Sourcing Passport.
  - Step 2: Pricing Matrix & Landed Cost Floor (€ -> ₱ conversion).
  - Step 3: ChatGPT & AI Studio Photorealistic Image Generation.
  - Step 4: Before/After Unboxing Experience Setup.
  - Step 5: Ingredients, Allergens & Preparation Guide.
  - Step 6: Review & Live Storefront Activation.

### 🏢 Section 3: Warehouse & Custody (`warehouse_custody`)
- **`inventory_handover` (Two-Party Inventory Custody Handshake):**
  - Enforces Operations Rulebook §10: Sender creates transfer offer; receiver independently scans all units and signs with session PIN.
- **`monthly_count` (Monthly Cycle Count & Inventory Audit):**
  - Enforces Operations Rulebook §15: Warehouse zone freeze, blind barcode counting, automated variance detection, secondary recount with reason codes, and manager authorization.

### 📦 Section 4: Orders & Fulfillment (`orders_fulfillment`)
- **`new_order` (Order Fulfillment & Packing Workflow):**
  - FEFO stock reservation, customer messaging, bank payment verification, 2-factor barcode scan at packing station, honeycomb packing, and courier handover.
- **`pasabuy_lifecycle` (Pasabuy Custom Sourcing Workflow):**
  - Custom shopper request triage, Milan store research, itemized quote approval, 50% deposit, Milan purchase, and Manila delivery.

---

## 3. Component Architecture & File Layout

All code and data definitions reside in `src/components/admin/master-workflow-graph/`:

| File | Purpose & Responsibilities |
| :--- | :--- |
| **`MasterWorkflowGraph.jsx`** | Central orchestrator. Manages domain section tabs (`WORKFLOW_SECTIONS`), workflow selector pills, keyword search filter, shift progress tracker, and step navigation. |
| **`WorkflowSvgCanvas.jsx`** | Dynamic SVG rendering engine. Dynamically measures DOM node coordinates with `ResizeObserver` and draws smooth Bezier curves, animated dashed pulse strokes, and directional arrow markers. |
| **`WorkflowDetailDrawer.jsx`** | Granular step drill-down panel. Renders shift checklists, barcode simulation runner, failure recovery accordion, rulebook safety invariants, actor tags, location badges, and direct navigation jump triggers. |
| **`AiPromptStudioCard.jsx`** | Dedicated prompt engineering studio. Generates luxury editorial prompts for ChatGPT (DALL-E 3), Midjourney v6, and FLUX.1 with category presets, negative prompts, and camera settings. |
| **`workflowData.js`** | Single source of truth data dictionary containing complete node definitions, checklists, simulation fixtures, troubleshooting guides, and AI prompt templates. |
