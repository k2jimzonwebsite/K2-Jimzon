# 🏛️ K2 Jimzon Business Operating System (BOS) & E-Commerce Platform

> **Version:** 2026.7 Production-Ready  
> **Tech Stack:** React 19, Vite 6, TailwindCSS 4, Supabase (PostgreSQL + Auth + RLS), Playwright E2E Testing Suite.

---

## 📖 System Overview

K2 Jimzon BOS is a multi-channel e-commerce and logistics operating system tailored specifically for importing Italian luxury cosmetics, boutique pantry items, and specialty food products from Milan to Manila.

### 🌟 Key Subsystems:
1. **Public Storefront (`/`)**: High-converting shopper experience with 3D product view, search, category filters, cart slider, and COD/GCash payment checkout.
2. **Italy Pasabuy Sourcing Portal (`/pasabuy`)**: Direct shopper custom item request form with budget (€) and Viber contact integration.
3. **Wholesale B2B Reseller Portal (`/wholesale`)**: Bulk volume wholesale application and commercial pricing tiers.
4. **Isolated Admin BOS Cockpit (`/admin-portal-k2-secure`)**: 
   - **Real Supabase Auth + 2FA Gate** (`AdminAuthModal.jsx`).
   - **AES-256 Client Secret Encryption Vault** (`securityVault.js`).
   - **Master Financial Landed P&L Cockpit** (`Overview.jsx`): Real-time Gross Sales (₱), Italy Sourcing (€ FX), Air Freight (€14/kg) & 12% Duties, and Net Cash Profit (₱).
   - **Daily Actionable Task & Expiration Center** (`DailyTaskNotificationDrawer.jsx`): 1-click execution for clearance sales, NAIA box handovers, low stock transfers, Pasabuy quotes.
   - **Fulfillment & Staff Stations** (`OmniOperationsHub.jsx`): Barcode pack-to-ship verification (+1), NAIA flight box handovers, staff custody claims, 1-click inter-staff stock transfers.
   - **1-Click Air Waybill Generator** (`PackingSlipModal.jsx`): Shopee/Lazada style shipping labels (J&T Express, Lalamove, LEX) with tracking barcodes.
   - **Multi-Location & Staff Custody Allocations** (`StaffAllocationModal.jsx`): Single PIM SKU stock breakdown per staff custodian (Makati, QC, Milan).
   - **FEFO Multi-Batch Expiration Manager** (`BatchExpiryManagerModal.jsx`): Expiry color health badges, batch breakdown, pinned priority batch lock.
   - **Product Master PIM & Excel Sheet Mode** (`InventoryGrid.jsx` & `Sheet.jsx`): Sticky frozen SKU columns, 1-tap horizontal scroll jump buttons.
   - **Automated Messaging Bot Webhook** (`Inbox.jsx`): Real-time automated stock checks, pricing, checkout links, and Pasabuy request parsing.
   - **Custom Pasabuy Landed Cost Engine** (`PasabuyManager.jsx`): EUR FX + Air Freight + Duty Tax calculator, margin slider, 1-click Viber quote dispatcher.
   - **Customer CRM & Mass Marketing Broadcasts** (`CustomerCrmBroadcast.jsx`): Customer lifetime spend (₱), VIP wholesale roles, campaign templates, mass email/SMS broadcast sender.

---

## 🛠️ Local Development Setup

### 1. Clone & Install Dependencies
```bash
cd "c:\Users\jerze\K2 JImzon"
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ENCRYPTION_SECRET=your-32-character-secret
```

### 3. Launch Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.  
To access the Admin Portal, go to [http://localhost:5173/admin-portal-k2-secure](http://localhost:5173/admin-portal-k2-secure).

---

## 🧪 Testing

### Run Playwright End-to-End Test Suite
```bash
node scratch/master_feature_audit_suite.js
```
Runs an automated test across all 14 core subsystems and user flows.

---

## 🚀 Production Deployment

This project is pre-configured for 1-click deployment on **Vercel**, **Netlify**, or **Cloudflare Pages**.

- **Vercel Configuration:** [`vercel.json`](file:///c:/Users/jerze/K2%20JImzon/vercel.json)
- **Netlify Configuration:** [`netlify.toml`](file:///c:/Users/jerze/K2%20JImzon/netlify.toml)
- **Database Security Migration:** [`supabase/README_MIGRATIONS.md`](file:///c:/Users/jerze/K2%20JImzon/supabase/README_MIGRATIONS.md)

---

## 📚 Architectural Blueprints

- **System Logic Blueprint:** [`SYSTEM_LOGIC_BLUEPRINT.md`](file:///c:/Users/jerze/K2%20JImzon/SYSTEM_LOGIC_BLUEPRINT.md)
- **Admin Workflow Blueprint:** [`ADMIN_WORKFLOW_BLUEPRINT.md`](file:///c:/Users/jerze/K2%20JImzon/ADMIN_WORKFLOW_BLUEPRINT.md)
