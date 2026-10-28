# MAP-019 customer delivery details — 28 October 2026

Owner request / IDEA-20261028-01: improve profile/settings so signed-in shoppers
can reuse recipient, contact, address and location details. The owner selected
multiple saved addresses with one default. Ordering must still work as a guest.
The idea is ACCEPT/MERGE into existing MAP-019; this is a qualified local slice,
not completion of that item or production activation.

## Prepared behavior and authority

The existing private account-settings row holds up to ten addresses, one default,
recipient name, fulfillment phone, house/unit/street, canonical Philippine area,
optional four-digit postal code and landmark. The signed settings action remains
the only write boundary. Phone normalization does not modify verified Auth
contact. Native validation checks the actual PSGC parent chain and derives the
display address. No geography is inferred from legacy free text.

Address saves use the actor lock, expected address revision and latest exact
operation/payload retry. Reuse of an old revision conflicts; this is not a
global historical operation-ID registry. The initialized latch and locked legacy
profile writer prevent a deleted address returning through delayed profile saves.
Invalid first saves cannot leave a partial profile row.

Checkout applies recipient/name/phone/street/geography together only while that
group is untouched. Explicit selection replaces the group and clears delivery
approval. Manual edits, actor changes and held-order snapshots have separate
tests. Order-update email remains separate. No new address PII browser storage,
customer identity, order model, stock model or quote authority was introduced.

The inline list/editor preserves K2's current identity. Lost save replies retain
the original command; retry uses the same payload. Read-back reconciliation
compares normalized values. A stale editor for an address removed elsewhere
keeps its draft and explains recovery rather than reporting a false save.

## Passing evidence

- `node --test tests/customer-address-book.test.mjs tests/customer-address-book-api.test.mjs`:
  10 passed. Closed selectors, Auth/origin, UTF-8 body limit, normalized contact,
  signed dispatch, explicit conflicts and coherent prefill are covered.
- `node scripts/test-customer-account-ui.mjs`: 48 passed, including eleven saved
  delivery cases plus existing account/settings/sign-out and wholesale journeys.
  They use fabricated Auth/provider responses and synthetic products/people.
- `node scripts/rehearse-customer-privacy-current-schema.mjs --address-book-protocol`:
  receipt `10a08624-a159-45ab-b130-a1b97281caf5` passed. Serial bootstrap,
  revision/exact retry/stale operation/default/last deletion/legacy guard and
  ownership/grant cases pass. Two independent PostgreSQL sessions prove one
  winner and one conflict for simultaneous first saves and existing revisions.
  The existing closure test populates new fields before proving settings-row
  removal. Rollback preserves all 161 tables / 49,717 summed rows, schema, data
  and exact sequence values/is_called. Disposable clone removal, cluster stop,
  refused loopback port and restored plaintext removal pass.
- Both Important independent review findings were reproduced before fixes:
  an open editor with a changing profile name; JSONB destination key order on
  lost-reply reconciliation. Dedicated Chromium regressions now pass. The
  removed-elsewhere draft case also failed before its fix and passes afterward.
- One bounded visual batch: 375/1440, light/dark, reduced motion, no horizontal
  overflow, keyboard focus and minimum 44px controls. Captures are in
  `docs/acceptance/customer-addresses-20261028/`. The images contain synthetic data.
- The measured storefront CSS failure was 30.10/30.00 kB gzip. Moving identical
  Admin-only typography declarations to the Admin module preserves their order
  and values and retains storefront tabular numerals. Final local storefront
  budget: JS 147.44/150.50 kB, CSS 29.82/30.00 kB. Admin: 227.44/300 kB minified.
  Both emitted-artifact boundary and secret checks pass.
- `npm run test:vercel-output`: 3 passed, separate API artifacts still bundle.
- Final development receipt is recorded in the companion JSON. The initial gate
  detected a dynamic RPC name; literal RPC dispatch and its focused inventory/API
  checks pass. No failing gate is silently reclassified.

Focused independent re-review: APPROVED for this qualified local-source slice.
The reviewer repeated the cross-form Chromium probe, confirmed normalized
read-back, removed-address draft handling and exact Admin CSS conservation,
and checked all 24 current source hashes. No Critical/Important defect remained.

## Limits, release boundary and recovery

The native restore uses the existing 26 October encrypted archive. Managed ACLs,
owners and Vault exclusions remain disclosed by that harness. Transaction
rollback conservation is not a committed production downgrade or a managed
Auth/provider/hosted test. Physical-device interaction, genuine hosted saved
addresses, persistence through real sign-in and real order submission are not
verified. No K2 SQL/provider setting, main push or live Vercel promotion occurred.
The CSS result above is a local build, not a fresh Vercel result.

Before applying the new migration, prepare the exact existing-body/grant/schema
preconditions, backup/restore and data-retaining deactivation packet. Run exact-K2
preflight and zero-failed readiness, obtain the named owner authorization and
qualify actual hosted reads/saves/guest checkout. Do not replay unrelated privacy
migrations to install this feature. These remaining actions, earlier phase-only
authority recovery and native freeze/permit/restore dependencies stay MAP-019.

Before application, recovery is a scoped feature-source revert. After addresses
exist, retain saved data/columns and the initialized legacy-write guard while
deactivating the new writer/UI if needed. Do not drop saved personal details or
restore an unsafe old profile writer. No production deactivation packet has been
applied. Unrelated modified historical images remain outside the source commit.
