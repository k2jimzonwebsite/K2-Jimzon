# MAP-019 native writer entry foundation — 28 October 2026

IDEA-20261027-02. The persistent goal remains active. This qualifies a private
native lock-entry foundation and complete scoped metadata inventory; it does
not qualify complete writer coverage, executable erasure or production release.

The old inventory listed 39 selected relations. The expanded metadata-only query
now captures all actual `auth`, `public` and `k2_private` relations, PK/FK columns,
triggers, role metadata and routine hashes. Owned run `a816ea4e` applies all six
prepared privacy/address migrations together and checks **151 relations and 194
routines** against an independent catalog declaration. Grant scopes, claim events,
Pasabuy/wholesale children, Auth descendants and soft-linked delivery quote
snapshots require explicit ownership mapping. Storage and Realtime remain
separate provider surfaces. No row value or routine body is emitted.

The new inactive migration adds FK-free private freeze records and four private
functions. Ordinary entry takes a shared transaction lock. A dedicated freezer
must enter READ COMMITTED before any mutation, row lock, stronger relation lock
or advisory lock; it then takes the exclusive gate. It must never acquire
account/customer/request locks afterward. Freeze identities are immutable and
their INSERT/UPDATE/DELETE/TRUNCATE paths require the already-held exclusive
gate. No application role receives these functions/table, and no public freeze
or erasure route is added. There are no ordinary-relation row guards yet.

Sequential design review accepted and resolved the lock-order and catalog
completeness objections. Independent implementation review found a TRUNCATE
bypass. Corrected failed-first run `84457016` reproduces its improper success;
the minimal ALWAYS statement guard fixes it without acquiring the gate after
TRUNCATE's table lock. Final review approves this bounded foundation with no
remaining Critical/Important finding.

Final owned run `b65ee2ce-988b-4e03-80fc-e076f71747dc` passes 13 actual native
groups: pre-held advisory/customer/table/write refusals, shared-upgrade and stale
isolation refusal, concurrent shared progress, both lock orders, two-second
expiry, absent-original-UUID freeze insertion, immutable identity and guarded
record mutations/TRUNCATE. Original 161-table/49,717-summed-row schema, data and
exact-sequence hashes match. The committed disposable clone is dropped, server
stopped, actual port refused and restored plaintext removed. Nine native source
pins match; twelve final source files are archived privately before extension.

`verify:development` ran once. Its Admin suite passed 90/91: the existing
loopback lost-reply test observed zero HTTP requests under sandbox restrictions.
The exact test passes 2/2 with permitted loopback; all unstarted prebuild steps
then exit 0, including 142 privacy/address tests, zero route/grant gaps, secret
scan and import integrity. This is reconciled development evidence, **not** a
claim that the original whole command exited 0. Passing unaffected suites were
not repeated. No release gate or application builds were run.

Failed runs are preserved separately: `330425da` could not prove cleanup under
sandbox loopback restrictions; a separate exact-path reconciliation later proves
stop/refusal/removal. `5c58c6c1` is the expected missing-implementation red.
`b478061b` timed out because the controller retained an AccessShareLock; it is
not qualifying TRUNCATE reproduction. The earlier 10-check `3133d25f` receipt
describes its earlier source. The companion JSON pins receipts, sources and logs.

Reproduce only against the existing owned local archive:

```powershell
node --env-file=.env.local scripts/rehearse-customer-privacy-current-schema.mjs --inventory-privacy-writers
node --env-file=.env.local scripts/rehearse-customer-privacy-current-schema.mjs --writer-barrier-protocol
```

These commands require local loopback access and load the archive passphrase;
they construct no production client. Original owners/ACLs and managed Vault
values are excluded. This establishes neither managed Auth compatibility nor
hosted customer/staff behavior or a capacity envelope.

The owning MAP-019 item requires the explicit complete OLD/NEW/parent/cascade
registry and drift-refusing statement/row guards next, then the versioned
manifest, permit, restore suppression and exact activation/data-retaining
deactivation package. Provider/scheduler/custody and genuine journeys remain
required before the authorized main/separate-artifact release. No production
SQL, keys, provider setting, main ref or production artifact changed.

Before activation recover through a scoped source reversal from `48773ac1` or
`.tools/map019-native-writer-20261028/before`; qualified source is retained under
`entry-qualified/`. Preserve all immutable identities/evidence and unrelated
images. No production data rollback applies, and erased personal data must never
be restored by source recovery.
