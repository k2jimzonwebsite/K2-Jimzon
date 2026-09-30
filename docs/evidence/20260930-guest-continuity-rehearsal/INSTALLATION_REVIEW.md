# Existing K2 guest installation and recovery review

MAP-017/019/020/022; IDEA-20260930-07/-08/-09. This is a prepared payload/receipt
record, not another backlog or live authorization. Existing K2
`pixplcjqivlfflickobf` is the only provider target. No extra project is needed.

## Exact prepared installation

The local review file is
`.tools/current-production-backups/guest-install-existing-k2-20260930-review.sql`,
204,529 bytes, SHA-256
`c2642a0fefd8142d0393f50ded41576b4f63dd416a154740f70a4970054cacf3`.
It is a transaction body composed from the 18 ordered/hash-checked sources in
`local-dependencies-receipt.json`; it contains no source transaction or psql
wrappers. Use an atomic migration tool or a reviewed BEGIN/COMMIT wrapper.

Its guard binds the exact database/cluster, absent new scope, eleven existing
function definition hashes/owners/ACLs, four existing table contracts, ten
migration versions and zero linked conversations. Any change refuses apply.
Current private before captures and the legacy preflight query are in the same
ignored directory; no credentials or plaintext row data are in the SQL.

The scope is 33 function names (25 public, 8 private), 24 new tables (13 public,
11 private) and three notification hooks. `guest-install-scope.json` freezes
their names. The existing conversations customer FK changes from Auth users to
canonical customers; its currently unlinked historical rows stay unclaimed and
their reference values remain NULL. Existing order/Pasabuy/message rows receive
additive links/fields. The local complete-chain witness checks excluded history
and legacy RPC ACL preservation.

Installation grants the named new signed/staff functions and narrow public
delivery-locality read. It configures no signing/contact keys or delivery prices,
enables no flag/connection, retires no legacy direct writer, and installs no
moderation wrapper. Existing production behavior and catalog acceptance still
require postflight verification. All 16 prepared route RPCs remain absent live.

## Captured deactivation procedure

`supabase/guest_install_state_capture.sql` captures metadata only on the exact
target before installation and again after successful installation. The fresh
live before capture has zero of the 33 functions, 24 tables and three hooks.
Keep both complete JSON captures private. `generateGuestInstallDeactivation`
in `scripts/guest-install-recovery.mjs` accepts only complete same-target
captures with that empty prior scope and generates exact guarded SQL.

The generated SQL first compares installed definitions/owners/ACLs, table and
column security metadata, policies/constraints and hook definitions. It refuses
later changes or a different database/cluster. It then revokes added function,
table and column access for PUBLIC/anon/authenticated and removes only the three
notification hooks. Postflight checks effective browser access and unchanged
function bodies/owners. It preserves tables, data, relationships and signing
material; it is deactivation, not restoration of the old schema. Existing
legacy permission findings are unchanged and remain MAP-017 work.

The local sample SQL and full before/after snapshots stay in the ignored backup
directory. That sample binds the local restore and must never be used on K2.
Provider recovery must be generated from its actual installed after capture
before configuring keys or connecting Preview. No provider recovery was applied.

## Passing evidence and remaining approval gates

The real local recovery witness, rerun with explicit UTF8 at 11:39 UTC, retained
customer/grant/conversation/message/scope records, closed all added browser
function/table/column privileges, denied an actual anonymous command, refused
function/table/column/hook drift and wrong database/cluster, and rolled back.
The actual exact live installation file was refused on the local target.
`local-install-recovery-receipt.json` records hashes and scope. Two focused
contracts and final development verification pass; local PostgreSQL is stopped.

The fresh backup was created at 11:25:39 UTC, backup ID
`current-pixplcjqivlfflickobf-2026-09-30T112539278Z-37846053a218`.
Its encrypted envelope is 848,023 bytes, SHA-256
`37846053a2188981fe2615367abaa4d7dcd218d605422d319c6fdae3639ebc23`.
It restored into a new empty UTF8 loopback target at 11:37:47 UTC: 51 public
relations, current ledger `20260928092634`, and matching 14-row archive fingerprint.
The initial failures exposed Windows early stdin EOF and WIN1252 decoding;
the wrappers now accept only a successful supplied-input closure and pin UTF8.
Integrity, exit-status, archive/health and legacy-row checks remain required.
Redacted evidence: `current-backup-manifest.json` and
`current-backup-restore-receipt.json`. Vault, Storage bytes, provider state and
managed-role membership are outside this local restore proof.

Owner recovery access was attested Verified on 2 September in
`K2 Jimzon - Brain/OWNER_QUESTIONS.md`; no rotation/workstation/contact change is
known. Do not request that unchanged attestation again. The new envelope's
off-site upload/independent retrieval are still pending and distinct from that
account/key attestation. A fresh backup remains required immediately before apply.

No live SQL/ACL/key/environment/routing/flag/connection was changed, and the
single authorized live conversation is unused. Remaining execution lives in
MAP-017: finish off-site backup/retrieval and the exact
branch-only connection/configuration package before its specific approval.
Shipping validation, Website membership and all-route/real-host acceptance
remain MAP-018/019/020/023 gates; the full two-site inventory launch is active.

Independent source review found no actionable findings. Fresh read-only Node
assertions covered frozen scope, capture refusals and the stdin success/error
matrix; the reviewer matched the 18-source function/table inventory. It did not
repeat SQL/Playwright, access secrets or contact providers. This does not close
managed-role, all-route or live acceptance gates.
