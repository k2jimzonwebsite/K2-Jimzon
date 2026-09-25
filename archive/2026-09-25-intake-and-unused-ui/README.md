# Reversible intake and unused UI archive — 25 September 2026

Owner request: use one scan-first product intake and preserve old code for recovery. This archive is source history, not an application entry point. No database, provider, production host, or deployment was changed by this archive.

## Moved out of active source

| Original path | Archived path | Reason | SHA-256 |
| --- | --- | --- | --- |
| `src/components/admin/tour/AddInventoryChooserModal.jsx` | `src/components/admin/tour/AddInventoryChooserModal.jsx` here | Active chooser asked manual/automatic before scan and advertised a barcode scan as automatic stock intake. Inventory now launches the scan directly. | `1b5aeba8d30dd203300f5f0ac38f2bdaa39f852974eab45b8f0b21e9b7bd160d` |
| `src/components/ui/adminKit.jsx` | `src/components/ui/adminKit.jsx` here | No active runtime importer; `AdminWorkspaceUi.jsx` and `AdminDialog.jsx` are the current primitives. | `e47093be8e1388989bee20deb39bf7032ae4527c93a94d2173ace106786ff8af` |

`originals/` contains byte-for-byte `HEAD` snapshots of `Admin.jsx`, `InventoryGrid.jsx`, `ScanToAiModal.jsx`, `Sheet.jsx`, and `tourData.js` before this cleanup. They preserve removed inline code as well as prior wiring. Their SHA-256 values, in that order, are `51b9ccc94e125771e1538b2159b68152ca11166e86274b559cc948d77bf5eb70`, `751416296b70e53a1461575b7cc2f92dc3a2f5a5b739bf75276ae31083efefeb`, `ae8434eff6a7bd9629a4fb4af0586bd8bc0019647d5887792999195272c8645d`, `2225fd42acd9483faf052c1364eafc7fe464703a13732dcedec81028af8b6821`, and `32a9e82bb5e8b23e35013a429260d495cfeb42310b078902b1d1a25dd06a101c`.
The snapshots intentionally preserve pre-existing trailing spaces; the active-file diff passes `git diff --check` when `originals/` is excluded.

To recover, copy the needed file from this folder back to its original path and restore its callers and tests together. To recover the entire pre-cleanup state, use the parent Git commit; the snapshots are a readable fallback. Never copy an archived browser product-write path into a secure Admin deployment without the MAP-017/018/020 checks.

## Reachability audit

A static graph started from `src/main.jsx`, all three Vite app targets, and the Admin service worker. It followed relative static and dynamic imports. It found 219 reachable files among 229 `src` JS/JSX/CSS/JSON files and flagged 10 candidates. Each candidate was checked for server, Vite, script, test and documentation references before movement:

| Candidate | Disposition |
| --- | --- |
| `DeliveryEstimate.jsx` | Retain: prepared shipping quote pilot gated by MAP-023; source contracts cover it. |
| `adminKit.jsx` | Archive: no runtime importer; stale documentation corrected in this change. |
| `connectorRuntime.js` | Retain: MAP-011 verifier uses it. |
| `disabledLazySupabaseClient.js` | Retain: Vite Admin target alias uses it. |
| `marketplaceCoverage.js` | Retain: server snapshot staging and contracts use it. |
| `ownedStock.js` | Retain: Admin BFF lots and contracts use it. |
| `shelfLifeGate.js` | Retain: integrity and pilot health scripts use it. |
| `database.types.js` | Retain: schema contract and integrity verification use it. |
| `MilanPackingScannerModal.jsx` | Retain pending MAP review: unmounted UI, but named in workflow, scripts and contracts; feature status needs reconciliation. |
| `MobileScannerModal.jsx` | Retain pending MAP review: unmounted UI, but named in workflow and contracts; feature status needs reconciliation. |

An import graph alone cannot prove that route files, scripts, migrations, static assets, test fixtures or dynamic provider entry points are unused. Those were not moved. The remaining review is recorded in MAP-021.

## Workflow boundary

The candidate branch routes Inventory and Sheet launch actions to the protected seven-step session when the Admin BFF flag is enabled. With the current production flag off, actions start with the existing scanner and then the manual ChatGPT/Smart Paste review. Sheet's formerly missing scanner-to-Smart-Paste callback is connected. An exact known barcode opens the existing product's lot review. This does not activate the prepared session database, paid API, or server stock commands. MAP-017/018/020 and OWNER-007 still govern those gates.

## Local verification receipt

On this candidate: focused Admin/tour/intake contracts 46/46 passed; `npm run verify:development` passed; the Admin Vite build passed with 752 modules; Admin budget passed at 224.70/300.00 kB; the target boundary passed after the normal static-404 and Admin-head postbuild steps; the built artifact secret scan passed over 81 files; guarded Admin browser tests passed 6/6. The first direct boundary check failed only because the manual Vite build had not yet emitted the required static 404; after those two normal postbuild steps, it passed. These checks do not prove the signed intake commands or physical staff workflow on a real host. The full release gate has not been run for this candidate.
