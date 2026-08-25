# K2 Jimzon — Production Deployment & Build Pipeline

## 1. Dual Vercel Project Architecture

Storefront and Admin BOS are deployed as **two independent Vercel projects** linked to the same repository:

```
                          ┌───────────────────────────┐
                          │   K2 JIMZON REPOSITORY    │
                          └─────────────┬─────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
  ┌─────────────────────────────┐               ┌─────────────────────────────┐
  │   k2-jimzon-storefront      │               │       k2-jimzon-admin       │
  │     (Vercel Project)        │               │      (Vercel Project)       │
  ├─────────────────────────────┤               ├─────────────────────────────┤
  │ Build: `npm run build:sf`   │               │ Build: `npm run build:admin`│
  │ Output: `dist/`             │               │ Output: `dist/`             │
  │ Config: `vercel.storefront` │               │ Config: `vercel.admin.json` │
  │ API: `api/storefront/`      │               │ API: `api/admin/`           │
  └─────────────────────────────┘               └─────────────────────────────┘
```

---

## 2. Target-Specific Build Configurations

### Storefront Deployment Settings
- **Build Command**: `npm run build:storefront`
- **Output Directory**: `dist`
- **Configuration File**: `vercel.storefront.json`
- **Environment Variables**:
  - `K2_DEPLOYMENT_TARGET`: `storefront`
  - `K2_STOREFRONT_BFF_ENABLED`: `true`
  - `K2_GUEST_GRANT_SECRET`: `[High-Entropy Secret]`
  - `CLOUDFLARE_TURNSTILE_SECRET_KEY`: `[Turnstile Secret]`
  - `VITE_SUPABASE_URL`: `https://...supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_...`

### Admin BOS Deployment Settings
- **Build Command**: `npm run build:admin`
- **Output Directory**: `dist`
- **Configuration File**: `vercel.admin.json`
- **Environment Variables**:
  - `K2_DEPLOYMENT_TARGET`: `admin`
  - `K2_ADMIN_BFF_ENABLED`: `true`
  - `K2_ADMIN_COOKIE_SECRET`: `[High-Entropy 32-byte AES Secret]`
  - `SUPABASE_SERVICE_ROLE_KEY`: `[Supabase Service Role Key]`
  - `VITE_SUPABASE_URL`: `https://...supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_...`

---

## 3. Automated Build Boundary Verification

Every production build automatically runs `scripts/verify-build-boundary.mjs`:
- Inspects every generated module in `dist/.vite/manifest.json`.
- Fails the build immediately if an Admin component (e.g. `Admin.jsx`, `InventoryGrid.jsx`, `StaffPermissionManager.jsx`) is detected in a Storefront build.
- Fails the build if sourcemaps or unreviewed localhost endpoints are detected.
- Runs `scripts/scan-secrets.mjs` against the output directory to guarantee zero secret leaks.

---

## 4. Pre-Deployment Cutover Checklist

Before promoting a release to production:
1. Run full prebuild validation: `npm run prebuild` (must exit 0 with 0 security gaps).
2. Run full contract suite: `npm run test:contracts` (all 179 contracts must pass).
3. Verify both production builds: `npm run build:storefront` and `npm run build:admin`.
4. Check that no uncommitted sensitive files exist: `git status`.
5. Ensure any database DDL changes have passed isolated rehearsal and have recorded owner authorization in `K2 Jimzon - Brain/OWNER_QUESTIONS.md`.
