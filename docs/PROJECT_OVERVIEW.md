# K2 Jimzon — Project Overview

## 1. Mission & Commercial Identity

**K2 Jimzon** is a specialized direct Italian import operation based in the Philippines. It bridges authentic European luxury, beauty, personal care, gourmet food, and lifestyle goods directly from Milan and European supply channels to Philippine consumers, collectors, and wholesale buyers.

K2 Jimzon operates a multi-tier commercial model:
1. **Curated Storefront Retail**: Hand-selected Italian goods available for immediate purchase.
2. **Pasabuy (Custom Sourcing)**: On-demand sourcing of specific European items requested by customers, verified and quoted by staff in Italy/PH.
3. **Wholesale & Commercial Distribution**: B2B bulk supply for boutique retailers and hospitality clients.
4. **Multi-Channel Marketplace Integrations**: Synchronized selling through Shopee, TikTok Shop, and Lazada.

---

## 2. The Physical Logistics & Inventory Lifecycle

The physical operations of K2 Jimzon are governed by strict chain-of-custody and quality gates:

```
[Milan Sourcing & Packing]
         │
         ▼
[Packing Scan & Box Manifest]
         │ (International Air Freight)
         ▼
[Manila Receiving Scan & Discrepancy Reconciliation]
         │
         ▼
[Staff Custodian Allocation (Regional Hub)]
         │
         ▼
[FEFO Shelf-Life Inventory Gating]
         │
    ┌────┴───────────────────────────┐
    ▼                                ▼
[Ordinary Retail (90+ Days)]    [Clearance Approval (31-89 Days)]
    │                                │
    └────────────────┬───────────────┘
                     ▼
       [Order Allocation & Packaging]
                     │
                     ▼
         [Waybill & Delivery Handover]
```

### Non-Negotiable Operational Principles
- **No Invisible Inventory**: Stock is never created arbitrarily in a database cell. Every single item belongs to a verified physical batch, flight manifest, or documented opening balance.
- **First-Expired, First-Out (FEFO)**: Inventory reservation automatically picks the earliest-expiring sellable batch.
- **Shelf-Life Gating**:
  - **90+ Days Shelf Life**: Normal retail and wholesale allocation.
  - **31–89 Days Shelf Life**: Requires explicit clearance workflow with staff justification and audit logging.
  - **0–30 Days / Expired / Damaged**: Automatically quarantined and blocked from order allocation.
- **Chain of Custody**: Every batch in inventory is assigned to a specific **Staff Custodian** located at a specific **Regional Hub** (e.g. Manila Hub, Cebu Hub).

---

## 3. The Dual-Surface Digital Platform

K2 Jimzon is designed as two distinct production user experiences built on top of a single unified operational core:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          K2 JIMZON PLATFORM                            │
├───────────────────────────────────┬────────────────────────────────────┤
│         CUSTOMER STOREFRONT       │              ADMIN BOS             │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Luxury Wood Editorial Aesthetic │ • High-Density Operational Command │
│ • Curated Catalog & 3D Globe      │ • Product Master & Variant Intake  │
│ • Passwordless Guest Commerce     │ • Milan & Manila Barcode Scanners  │
│ • Scoped Universal Messaging      │ • Consignments & Flight Manifests  │
│ • Pasabuy Sourcing Request Wizard │ • Multi-Channel & Stock Controls   │
│ • Wholesale Tier Inquiries        │ • Staff RBAC & AAL2 Step-Up MFA    │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 4. Key Architectural Differentiators

1. **Strict Target Isolation**: Storefront and Admin are compiled into separate, immutable production artifacts. Storefront bundles contain **zero Admin code, routes, or staff auth logic**.
2. **Backend-For-Frontend (BFF) Security Layer**: Browser clients never communicate directly with sensitive database tables using broad service privileges. All mutations pass through hardened BFF endpoints with CSRF, origin checks, and HMAC rate limits.
3. **Scoped Guest Commerce**: Buyers can request orders and chat with staff without creating accounts. The server issues encrypted, scoped `HttpOnly` cookies granting access only to that specific customer order.
4. **Auditability & Traceability**: Every critical operational action (lot reconciliation, clearance approval, staff invite, MFA reset) writes an immutable audit record to private database ledgers.
