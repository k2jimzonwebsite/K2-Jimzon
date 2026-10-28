# MAP-019 bounded recovery fix — 28 October 2026

Owner direction: continue fixing the recorded release blockers. This implements
the already approved phase-only recovery design under IDEA-20261027-02 and
MAP-019. The saved-address/CSS slice is independently recorded in
`MAP019_CUSTOMER_ADDRESSES_20261028.md/json` and published as `f8f7f02d`.

The previous implementation could exhaust its clock without publishing a checked
prefix, and repeated hold retries restarted an already completed phase. Nested
scopes also reset their deadline. Failed-first tests reproduced these conditions:
missing inherited-deadline support, nonprogressing steady replay, and forty
identical hold retries without completion.

## Changed behavior

`bounds.js` supplies an absolute monotonic deadline and checked remaining time.
Admin preparation, native operations, journal replay and proof checks inherit the
earlier deadline; the maximum remains nine seconds. Replay uses observed complete
step costs and reserves the latter half of remaining time for head validation,
finalization and the following action. It publishes only incomplete validated
prefixes after an unchanged-head read while the scope is live.

`native-holds.js` keeps one disposable exact method/export identity, phase
(INITIAL/SUBMIT/CONFIRM and derived release subphases) and release-command hash.
It stores no trusted current fact, completed authority state or receipt. A fresh
native read and complete current CONFIRM view retain generation, head, seal,
witness and fencing checks before projection. Release receipts come from the
freshly replayed operation. Overlapping hold calls remain pending. Cold loss
discards the cursor and reconstructs normally.

The fixture now records bounded retries of the same Admin actor/key/body rather
than assuming the first retry must complete. Existing one-hold/one-event,
resolution, assignment, historical-refusal and null-origin assertions remain.

## Evidence

- Final `npm run verify:development`: exit 0, including 142 privacy/address cases.
  Inherited preparation time, steady replay, apply/release, derived release,
  resumed fencing and existing integrity/late-I/O/cold reconstruction cases pass.
- `npm run test:vercel-output`: 3 passed; separate server artifacts still bundle.
- Final `node --env-file=.env.local scripts/rehearse-customer-privacy-current-schema.mjs --hold-coordinator-protocol`:
  receipt `47423d36-7619-4d36-923c-79495048ce42`, exit 0. It passes 20 native
  protocol groups, four actual PostgreSQL concurrency races, a lock-wait expiry
  check and 13 composed groups using actual isolated Miniflare R2, maintained
  SQLite witness and restored native SQL. No production client is constructed.
- Full original conservation: 161 tables, 49,717 summed rows; schema, data and
  exact sequence values/is_called match before/after. Disposable database clone
  removal, PostgreSQL stop/refused port, workerd disposal/refused port and
  restored plaintext removal all pass. Every native receipt source hash matches
  current bytes. Portable values and source pins are in the companion JSON.
- Measured local history revision 11 scans in 2,014 ms. Customer-only creation
  returns pending in 6,331 ms, retries pending in 3,102 ms and succeeds in
  2,515 ms, actually reaching the injected lost projection reply and retaining one
  hold/event. Lost resolution retries pending in 6,790 ms then succeeds in
  1,420 ms. These are individual invocation timings, not a capacity guarantee.
- Independent review approves continued local qualification with no remaining
  Critical/Important defect. Nine focused regressions and two separate probes
  pass. A candidate deleted between SUBMIT and resumed CONFIRM causes
  `AUTHORITY_INTEGRITY` and zero native transitions; steady latency plus lost
  projection reply recovers once and drives derived release.

Failed runs remain visible: `b495b0fe` refused before restore because the backup
passphrase environment was not loaded. `d0919f71` preserved eight earlier composed
checks but failed the old single-retry 503-versus-200 assertion. Both verified
owned cleanup; the latter also preserved all original hashes. They are not
passing evidence. The corrected fixture run above is the passing result.

## Limits, recovery and next required action

Non-hold registration/freeze/authorization and native customer setup remain
synthetic. The existing archive excludes managed ACL/owner/Vault details. This
does not qualify all-writer freeze, executable erasure, provider durability,
production growth/contention or genuine hosted Auth/PostgREST/customer/staff
journeys. Steady synthetic 6/8 ms object delays and the measured local history
are the liveness envelope. Complete observed history is not atomic custody
against removal of already-read objects. No cached result substitutes for checks.

No production SQL/provider configuration, main push or live promotion occurred.
The default authority remains unconfigured. Native all-writer freeze, retention
manifest/permit and restore suppression must be complete before preparing and
qualifying the exact drift-guarded activation/deactivation package. Fresh
backup/restore, exact-K2 preflight, zero-failed readiness, named owner approval
and real-host acceptance remain MAP-019; it stays open.

Before activation, recover by reverting only this scoped source slice to feature
parent `f8f7f02d`, or use the preserved
`.tools/map019-phase-recovery-20261028/before` copies. Keep unrelated dirty images
and earlier accepted work. Discarding disposable memory is safe; reconstruct
from native facts, the complete journal and witness. Never reset/rewrite immutable
operation identities or restore erased personal data from this source rollback.


Source publication receipt: `39116b61676ead7a3ef658ad026d06db8a6eb041` is on
`codex/customer-privacy-owner-decisions`; remote ref matches and normal commit/push
hooks pass. GitHub reports both Vercel storefront and Admin preview builds
successful, with exact dashboard links in the JSON. These are build-status
observations, not production or authenticated hosted behavior. This final
receipt-only update does not require an application rerun or another deployment
acceptance wait. The next required action remains native all-writer
freeze/manifest/permit/restore preparation under MAP-019.
