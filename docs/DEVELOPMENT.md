# K2 Jimzon — Local Development & Testing Guide

## 1. Prerequisites

- **Node.js**: `v20.x` or `v22.x` / `v24.x`
- **npm**: `v10.x+`
- **OS**: Windows, macOS, or Linux
- **Local PostgreSQL Runtime**: The repository includes an isolated portable PostgreSQL 17.11 engine in `.tools/postgresql-17.11/` for offline testing.

---

## 2. Getting Started

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy the sample environment file:
   ```bash
   cp .env.example .env.local
   ```

3. Verify security gates and environment contracts:
   ```bash
   npm run prebuild
   ```

---

## 3. Running Development Servers

Because Storefront and Admin are separate applications, you can run them individually or in combined development mode:

| Command | Target | Port | URL |
| :--- | :--- | :--- | :--- |
| `npm run dev:storefront` | Customer Storefront | `5173` | `http://localhost:5173` |
| `npm run dev:admin` | Staff Admin BOS | `5174` | `http://localhost:5174` |
| `npm run dev` | Combined Workstation | `5173` | `http://localhost:5173` (Toggle in top bar) |

---

## 4. Verification & Testing Commands

The repository enforces a strict, multi-layered verification harness:

### A. Prebuild Security Gates
```bash
npm run prebuild
```
Runs 9 automated gates:
- `security:test`: Secret scanner self-test.
- `security:test-env-contract`: Deployment environment contract test.
- `security:test-files` & `security:files`: Sensitive file policy validation.
- `security:test-env-source` & `security:env-source`: Environment source boundary verification.
- `security:dependency-policy`: Dependency license and package policy audit.
- `security:surfaces`: Zero-gap security surface inventory audit.
- `security:secrets`: Scans 930+ files for accidentally hardcoded secrets.
- `check:imports`: Verifies import integrity and module resolution.

### B. API & Security Contracts (179 Tests)
```bash
npm run test:contracts
```
Executes all contract specifications covering Storefront Auth, Guest Commerce BFF, Admin BFF, Product Intake, Schema Truth, Security Headers, Edge Functions, Request Timeout, Shopee Ingress, and Customer Retention.

### C. Portable PostgreSQL 17 Rehearsals
```bash
# Verify MAP-017 RLS & Authorization Rehearsal
npm run verify:map017-portable

# Verify MAP-018 Intake Evidence Cleanup Rehearsal
npm run verify:map018-cleanup-portable

# Verify MAP-019 Account Claim Lifecycle Rehearsal
npm run rehearse:map019-account-claim

# Verify MAP-020 Rate Limits & Ingress Rehearsals
npm run verify:map020-preauth-rate-portable
npm run verify:map020-storefront-auth-rate-portable
npm run verify:map020-shopee-ingress-portable
```

### D. Playwright E2E UI Journeys
```bash
# Run Storefront Smoke Tests (8 Tests)
npm run test:smoke

# Run Admin Dashboard Redesign Tests (15 Tests)
npm run test:admin-ui

# Run Customer Account & Wholesale UI Tests (3 Tests)
npm run test:customer-account-ui
```

### E. Isolated Production Builds
```bash
# Build & verify Storefront bundle boundary
npm run build:storefront

# Build & verify Admin bundle boundary
npm run build:admin
```
