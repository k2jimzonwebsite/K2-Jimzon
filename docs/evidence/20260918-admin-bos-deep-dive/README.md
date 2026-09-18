# Admin BOS Deep-Dive Audit — 18 September 2026 (documentation only)

Scope: all 47 Admin BOS source files (`src/views/admin/*`, guide/tour/graph components),
read in 4 lanes. Read-only audit: no code, schema, or test was changed for this document.
Storefront is out of scope (owner-confirmed good).

Method lenses: K2 operations rulebook + admin-dashboard model (decisions and
exceptions first, every KPI needs source/window/drill-down/states), the four
design skills (restrained palette, one primary action, progressive disclosure,
reduced motion), humanizer (plain staff words, no new facts), Karpathy
(surgical slices, no logic removal), brooks-lint (DRY, naming, coupling,
second-system effect). External `production-audit` engine NOT run (needs owner
approval, network, and secrets caution); recorded as a deferred option.

Already covered by earlier slices (not re-audited here): `Admin.jsx` shell,
`Overview.jsx` money-lens merger + continuity bar, `AdminWorkspaceUi.jsx`,
`HelpTip.jsx`, `useBodyScrollLock`, SECTIONS/widget/Start-Here copy.

## 1. Cross-cutting findings (highest value first)

### 1.1 Three scanner implementations do the same job
`ConsignmentScannerModal.jsx` (unified Milan/Manila, debounce, `cameraNote`,
`busyRef`, lot `aria-pressed`), `MilanPackingScannerModal.jsx` (389L),
`MobileScannerModal.jsx` (199L). Same camera/beep/tiles/manual-entry shape three
times with drifting names (`onScanItem` vs `onPackItem` vs `onScan`,
`totalPacked` vs `target/scanned`, `readerId` vs fixed ids). Consignment's is the
canonical candidate; Milan/Mobile should become thin `stage` wrappers. No logic
changes needed to merge; the wrappers keep their stage copy.

### 1.2 Four prompt-to-paste lenses for one intake doctrine
`ProductIntakeSessionModal.jsx` (1375L god-modal, 7 steps), `SmartPasteModal.jsx`
(JSON review + image handoff), `ScanToAiModal.jsx` (scan/type + dup-check +
prompt build), `ProductAiEnrichmentModal.jsx` (gap nudge + prompt copy). Same
two-Projects doctrine and copy-block repeated in four places. Slice: keep Intake
S3/S4 canonical, collapse the other three instruction panels behind one shared
"Why two Projects?" disclosure with a single copy-block.

### 1.3 Three photo lenses
SmartPaste gallery vs `PhotoManagerModal.jsx` vs
`ProductMediaCleanupModal.jsx` (assign vs cleanup vs orphan-removal). Keep all
three destinations; share one `ImageTriple` + one reason field.

### 1.4 Help/launcher sprawl (staff cannot tell where to ask vs launch)
CommandPalette (launcher) vs AdminAiCopilotModal (answers) vs
KeyboardShortcutsModal (list) vs AdminToolsWidget guide button (`146-154`) vs
UniversalScanLauncher vs `Alt+S`. Same shortcut list lives in 3 files
(`adminOperations.js`, palette, shortcuts modal + `adminGuide#shortcuts`); same
procedures searchable in palette and copilot; `REFERENCE_TOPICS` duplicates the
procedure registry and `SCAN_WORKFLOWS`. Slice: palette stays the only launcher
(footer links to guide + shortcuts), all lists render from `ADMIN_SHORTCUTS` +
`TOPICS`, delete the Tools guide button.

### 1.5 Color speaks a different dialect per area (the "so colorful" root cause)
Each area grew its own brand color, all colliding with status meaning:
Milan = crimson (`MilanPackingScannerModal:159,197,212,237,288,373`) though
nothing is dangerous; Manila = forest (`MobileScannerModal:111,117,129,144`)
though nothing succeeded; intake = amber (`ProductIntakeSessionModal:577,615,
623,733,954,1053`); Sheet/Staff labels = gold; Pasabuy sourcing map = cyan
(`PasabuyManager:278`); ScanToAi EDITABLE + CSV hover = purple
(`ScanToAiModal:259`, `BulkCsvImportModal:293`); `StaffPermissionManager:26`
paints the Admin role crimson, colliding with crimson = error everywhere else;
`Suppliers:74` paints every PO status blue; `ConsignmentManager:256` status pill
is always blue; `ChannelIntegrations:180` hardcodes five channel hex colors.
Amber errors appear where the BOS uses crimson
(`PurchaseOrders:46`, `AutomaticIntakePanel:45,48`); copilot uses `red-500`
(`AdminAiCopilotModal:119`) while the set speaks `crimson`; ToolsWidget
`Stat tone=good` renders gold (`AdminToolsWidget:658`) where the set reads
gold as warning. Rule to apply: crimson = destructive/error, amber/gold =
warning/attention, forest = verified success, blue = info/selection/primary
action, everything else neutral. Status pills, banners, and metric tones are
already correct and stay untouched.

### 1.6 Copy: ticket leaks, typos, and a jargon glossary to fix
Leaks of internal IDs to staff: `ReservationHolds:173` eyebrow `MAP-023`,
`SmartPasteModal:274` MAP-001 reference, `OwnerCountClose:1005`
`Pending MAP-023/MAP-026 composition`, `JntVipDispatchModal:731` hardcoded
`JWORLDBASKETPH` sender. Typo: `adminGuide.js:79` "Scan quantity five five
times". Emoji in staff UI: `JntVipDispatchModal:292,298,310` (zap, rocket,
camera). Nepotism term: `JntVipDispatchModal:331,432` "Staff / Sister".
Inconsistent verbs: `ConsignmentScannerModal:100,108,114` (Milan packing scan
vs Pack a flight box vs Done scanning vs Review counts; Italy/Milan and
Philippines/Manila drift); `Inbox` vs `Customers` mappers overlap.
Jargon to humanize (keep domain terms, fix the glue): lapse/lapsed
(`ReservationHolds:118,204`), custody claims (`Admin.jsx` omni desc, fixed),
pack-to-ship, guarded workflow (`UniversalScanLauncher:34`), exact-shop /
customer-free (`OwnerCountClose`, intentional terms needing one-line
definitions), `Payment not assumed` (`OmniOperationsHub:551`), `Delivery
unquoted` (`OmniOperationsHub:549`), ultra-fast marketing
(`MilanPackingScannerModal:279`), `1-tap booking assistant`
(`JntVipDispatchModal:161`), Bulk+Batch redundancy
(`JntVipDispatchModal:199`), POV (`MilanPackingScannerModal:160`), "Discrepancies"
(`MobileScannerModal:119`), invented fallback `Authentic Italian Product`
(`DiscrepancyReconciliationModal:93`, must not fabricate).

### 1.7 Accessibility punchlist (all <44px or unlabeled)
Guide toggle `ConsignmentManager:230` (`py-1`); Omni table actions
`adm-btn-sm` + submit without `min-h` (`OmniOperationsHub:572,514`) + row
Confirm buttons (`554-556`); extension chips `min-h-9`
(`ReservationHolds:222`) + row Extend (`292-300`); copy chips tiny
(`JntVipDispatchModal:582,597,613`) with no `aria-live` for Copied; manual
inputs placeholder-only in Milan (`229-235`), Mobile (`161-167`), Sheet cells
(`621`) and status selects (`527-542`); Sheet checkbox `w-4 h-4` (`569`) and
CSV checkboxes (`BulkCsvImportModal:397,441`); Staff checkboxes
(`StaffPermissionManager:522,397,436`); ScanToAi toggles/close
(`131/139/146`); SmartPaste close ~32px (`180`) + `autoFocus` yank (`198`);
Consignment `autoFocus` steals mobile keyboard (`126`); UniversalScanLauncher
close 40px (`36`); KeyboardShortcutsModal close 40px (`21`); CommandPalette rows
~42px (`177`) + label-less search (`152`); StoreAssetStudio Approve/Discard
36px (`404/411`); tabs without `tablist`/`aria-selected`/arrow keys
(`DeliveryRateControl:316`, `Kanban:11`, `ShopAllocationManager:182-210`);
`DeleteProductsModal:216` error missing `role=alert`; tables missing `scope`
(PackingSlip, PurchaseOrders, Sheet, Discrepancy); `PackingSlipModal` no
`describedBy`; `th` scope gaps as noted.

### 1.8 Mobile 375px punchlist
Wide tables needing scroll review: Omni `min-w-[860px]` (`570`), Delivery
`min-w-[52rem]` x4 (`92`), Sheet ~30 cols (`476`), ShopAllocation
`min-w-[720px]` (`291`), PurchaseOrders `min-w-[780px]` (`48`), Consignment
`min-w-[820px]` (`275`, verify card fallback), Customers `min-w-[900/1060px]`
(`142/156`, cards mitigate), Coupon `min-w-[900px]` (`209`), Discrepancy
`min-w-[500px]` (`70`), ReservationHolds `min-w-[44rem]` (`262`).
Squeeze risks: Omni `truncate/line-clamp-1` hides address/method (`543`);
J&T stepper + Exit Guide (`257`), `truncate max-w-xs` address (`767`); Milan
`grid-cols-3` SRP/Batch/BestBefore (`333`); Mobile header (`93`); Sheet sticky
SKU overlap (`499/601`); Delivery snapshot row (`474`); ShopAllocation stats
`grid-cols-3` (`606`); Tools `grid-cols-4/3` (`265/523/541`) + stale drag math
on resize (`57-58,83-84,98-100`); PIN `tracking-[0.4/0.5em]` clipping
(`AdminAuthModal:251,289`, `StaffPermissionManager:273,283`); PackingSlip
4-col table has no scroll wrapper (`43`); PackingSlip `window.print()` prints
the whole admin (only header hidden, `17`).

### 1.9 Logic/data risks (no change made; ranked by blast radius)
1. Milan instant-write path (`MilanPackingScannerModal:105-125`): single tap
writes inventory with auto-SKU `IT-${code.slice(-6)}` (collision-prone),
hardcoded `srp:750` and `bestBefore 2028-12-31`, no confirm. Highest-risk
single item in this audit.
2. Sheet enriches the wrong row: `Sheet:365` enriches `visibleRows[0]`
regardless of intent.
3. Transfer approve has no confirm though reject does
(`ShopAllocationManager:384-402`); `masterAvailable || 0` (`85`) hides unknown;
`limit(25)` transfers silently truncated (`71`); `thinStockCount` computed
never shown (`111-113`); no-data returns `DEFAULT_SHOPS` zeros that look real
(`62-64`).
4. Intake publish fires on select-change without confirm
(`ProductIntakeSessionModal:1309`); Mobile `onFinishScanning` syncs incomplete
with no confirm (`MobileScannerModal:116`); beep-before-result
(`MobileScannerModal:60-63`) and no debounce (vs Consignment 1200ms) risk
double counts; `updatedItem` falsy is silent.
5. J&T `handleSaveTracking` closes without checking `{ok:false}`
(`JntVipDispatchModal:110-135`): silent close on failed save.
6. Stale/race reads: Omni 30s poll + realtime double-fetch (`116-128`),
`selectedOrderId` race (`255-256`); InventoryGrid 30s poll vs saves (`221`);
Pasabuy 30s poll overwrites editing quote (`122`); Customers realtime refetch
storm (`108`); StoreAssetStudio whole-record replace can resurrect stale
(`195`); OwnerCountClose fee/stock effects race on step change (`748-791`)
with shared `busy` (`641`) blocking parallel steps.
7. Silent truncations/limits: Customers `limit(500)` (`97`), OwnerCountClose
and reservation release bounds (handled but need re-run notice discipline).
8. Weak guards: handover `minLength 3` (`OmniOperationsHub:769`); effectiveFrom
client-only (`DeliveryRateControl:512`); CSV suffix-only check
(`BulkCsvImportModal:46`); cleanup delete needs only a 3-char reason
(`ProductMediaCleanupModal:106`); coupon blank start defaults to now silently
(`CouponManager:92`); `Number('')` to 0 on qty (`BatchExpiryManagerModal:354`);
`String(order.paymentStatus)` can render `undefined`
(`PackingSlipModal:49`); `Discrepancy:26-28` shows `0/0 Matched` fake-match on
empty items; Customers `131-132` render 'Pending'/'Unavailable' as numeric
metrics; ToolsWidget Margin shows `0/0.0%` for empty inputs (`515-518`).
9. Duplicated formatters/logic to unify later (no behavior change):
`fetchSecureSnapshot` vs `fetchLiveOrders` (Omni `131-176` vs `208-259`),
box-grouping (Omni `166-174` vs `271-279`), `Th/Td/DataTable`
(DeliveryRateControl `73-99`), `peso` vs `money`, `mapLot/sellablePreview`
already shared well (BatchExpiry), `loadFees/loadStock/loadCoverage`
(OwnerCountClose `682-730`), act/lock boilerplate (AutomaticIntakePanel
`18-39`), chunk/uncertain mirrors (Delete modal vs BulkCsvImportModal),
secure-vs-legacy branch duplications (Suppliers, BulkCsvImport, GlobeCms,
SystemDevOpsModal vs ChannelIntegrations).

### 1.10 States scorecard
Exemplary (copy these patterns): ReservationHolds, OwnerCountClose,
BatchExpiryManagerModal, PhotoManagerModal, DeleteProductsModal,
ConsignmentScannerModal, BulkCsvImportModal. Gaps concentrated in: scanner
camera-failure silence (Milan/Mobile `catch(()=>{})`), empty-scanner `0/0`
reads-complete, UniversalScanLauncher no empty state, PackingSlip empty
`tbody`, J&T missing skeleton, ShopAllocation no-data zeros, Customers
Pending/Unavailable-as-numbers.

## 2. Prioritized declutter backlog (removes no logic; maps to MAP row 2)

Slice A (copy): fix typo `adminGuide.js:79`; remove J&T emoji; replace
"Sister" with "Manila receiver"; define exact-shop/customer-free/lapse once
in the guide; humanize §1.6 glue strings.
Slice B (color): apply the one-accent rule to §1.5 list (highest visibility:
Milan crimson brand, Manila forest brand, intake amber theme stays only if
scoped as that modal's single hue, Staff Admin-crimson chip, Suppliers PO
statuses, Consignment always-blue pill, ChannelIntegrations hex colors,
ToolsWidget Stat-good gold, copilot red-500, CSV purple hover).
Slice C (structure): scanners under Consignment modal (§1.1); prompt panels
under one disclosure (§1.2); photo triple under shared components (§1.3);
HelpLauncher single-source (§1.4); FilterBar/EmptyState/table-fallback
sharing per lane-B proposal §3.
Slice D (a11y/mobile): work through §1.7 then §1.8 top-down; PackingSlip
print CSS + scroll wrapper first (customer-facing paper).
Slice E (logic risks): confirm-gate §1.9 items 1-5 before any other behavior
work; each needs its own MAP-scoped slice with failing-first test.

## 4. Application log (slices A, B, D, E applied 18 September; C sequenced)

Applied, all verified (`test:contracts` incl. new `admin-guardrails-contract`
4/4, `test:admin-ui` 31/33 with the same 2 pre-existing baseline failures,
`build:admin` 198.02 kB / 300 kB):
- A (copy): `adminGuide.js:79` typo fixed ("Scan every unit one by one…");
J&T "Staff / Sister" x2 → "Staff / Manila receiver"; lapse → expire
(`ReservationHolds:117,204`); Omni slash-jargon/unquoted/unassumed plain words
(`OmniOperationsHub:510,549,551`); Inbox Phase-2 empty state simplified;
exact-shop defined in the channel guide; customer-free defined in the Pasabuy
guide. Correction during apply: the reported J&T emoji did not exist in the
file (regex miss); the real emoji found later in
`MilanPackingScannerModal:294,300` (zap, rocket) plus camera/note emoji were
removed. One revert: the Customers banner rewrite tripped
`admin-logic-regressions.spec.js:100`, which pins the exact legacy string, so
the original wording stands and the jargon note stays in §1.6.
- B (color): Kanban/Suppliers/Coupon-dialog/Cleanup kickers neutral;
PurchaseOrders + AutomaticIntake errors to crimson; Pasabuy cyan, CSV purple,
ShopAllocation hub colors neutral; ToolsWidget Stat-good to forest; copilot
red-500 to crimson; Coupon save/decision gold to blue; SmartPaste Identity +
SEO headings neutral; Pasabuy filters 44px; InventoryGrid SRP white.
Exempted with reason: scanner stage themes, role-identity chips, channel icon
tiles, calculator/intake single-hue tool themes, Suppliers PO + Consignment
status pills (unknown vocabulary, would risk wrong semantics).
- D (a11y): `.adm-btn-sm` raised to the 44px floor in CSS (covers J&T + Omni
small buttons); closes brought to 44px (ScanCenter, Shortcuts, ScanToAi,
SmartPaste); Consignment guide toggle 44px; Pasabuy filters 44px; StoreAsset
Approve/Reject 44px; Milan/Mobile inputs labeled + 44px, tiles labeled;
Sheet/CommandPalette inputs labeled; cameraNote live region; th scope on
PackingSlip, PurchaseOrders, Discrepancy; J&T copy chips 44px;
DeleteProducts error gets role=alert and loses its emoji. Deferred: checkbox
hit areas (44px boxes would break form layouts; needs a design pass), tab
keyboard support (roles without arrow-key nav would be a false claim),
scanner live regions.
- E (logic, failing-first `tests/admin-guardrails-contract.spec.js`,
registered in `test:contracts`): transfer Approve is now two-step with the
SKU quantity named (button also de-greened to primary blue); J&T save surfaces
`{ok:false}` instead of closing; Milan instant draft needs an arming tap that
names SKU/SRP/batch/expiry; Manila finish needs a second tap when short.
E4 needed no change: intake publish already requires reason>=10, offline guard,
and retained-command replay.
- C (structural merges: scanners, J&T guide branches, shared fields, HelpLauncher)
NOT applied: blind merges of camera/finance flows without visual verification
would risk more than they save. Designs stay specified in §2/Slice C for
sequenced slices with screenshots.
- Copy/help follow-up: `HelpTip` now provides a 44px target and uses a
viewport-bound phone panel; Channel Readiness tabs were shortened to
`Readiness` and `Stock allocation`; the command-center channel and payment
explanations were humanized without changing record meaning. New browser cases
failed first at the 28px target and old copy, then passed 3/3. Full Admin UI is
33/35 with only the same stale em-dash expectation and period-refresh fixture;
the Admin build passes at 198.22 kB / 300.00 kB after the security prebuild.

## 4. Not covered by this audit

Live Supabase state, RLS/grants, deployed Vercel hosts, provider credentials,
real-device runs, screen-reader pass, and the external production-audit engine
(deferred; needs owner approval). Suite state after slices A/B/D/E:
`test:contracts` 657/657 green (incl. new `admin-guardrails-contract` 4/4),
`test:admin-ui` 31/33 (2 failures reproduce on the unmodified baseline), 42/42
guide/tour/dialog contracts green, `build:admin` 198.02 kB / 300 kB.
