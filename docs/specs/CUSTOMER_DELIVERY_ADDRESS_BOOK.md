29 October2026 / MAP-019 HOSTED SYNTHETIC ADDRESS ACCEPTANCE: owner requested agent entry and explicitly chose dummy data. Fresh exactK2preflight/readiness8verified/2owner/3script-unreachedconnector/0failed precedes one normal account Save address action. Address saved acknowledgement, one default Test address and dummy profile name persist after reload; stored phone/recipient match exactly. Existing4-itemcart checkout selects that default and restores recipient/street/all4PSGCselections; mobile is populated but its exact input value is automation-masked. No order was submitted; cart4unchanged, returned to Account. Dummy data remains saved/default, with no real personal-data acceptance claim or Auth/SMS/schema/directSQL/category/stock/payment changes. CI40831331901is completed/success/all3jobs. Evidence/limits/normal edit recovery: docs/acceptance/ACCOUNT_CATEGORY_FOOTER_20261029.md/json.

29 October2026 / MAP-019 LIVE edd115df update: both canonical artifacts and actual authenticated account/Grid/Sheet controls are verified. The existing first delivery Mobile number form opens directly; Grid/Sheet create and assign through the same product decision/recovery authority, and native footer categories follow successful normal listed-product refresh. Actual data saves remain separate acceptance. Current receipt/limits/recovery: docs/acceptance/ACCOUNT_CATEGORY_FOOTER_20261029.md/json. Earlier prepared-only notes below are superseded for source/deployment/UI, not owner-data/staff-write acceptance.

# Customer profile and saved delivery details

29 October / IDEA-20261029-02: prepared discoverability correction opens the existing first-address editor once per account-keyed mount when a ready book is empty; its fulfillment field is labeled **Mobile number**. Cancel/reopen remains explicit, same-account refresh preserves drafts, and no automatic save or separate phone store is introduced. Existing saved-address list/edit/default, pending literal commands and account ownership stay authoritative. Local browser evidence passes; actual owner save/reload/default checkout remains MAP-019. Evidence/recovery: `docs/acceptance/ACCOUNT_CATEGORY_FOOTER_20261029.md` and JSON.

IDEA-20261028-01, accepted into MAP-019. The owner requests reusable name,
contact, location and shipping details and explicitly selects multiple saved
addresses with one default. Guest ordering remains available. This is a design
contract; implementation steps and unfinished work live only in MAP-019.

The existing source saves a name and one free-text address. Checkout fills empty
fields from those settings and the signed-in contact, but its PSGC area picker
starts separately. It cannot restore a delivery destination, recipient phone or
multiple address choices. Existing signed-in settings work before guest-history
linking; that independence must remain.

## Confirmed outcome and boundaries

Customers may add, edit, remove and choose a default delivery address. A saved
address includes a label, recipient name, delivery contact number, street/unit,
canonical Philippine region/province/city/barangay path, optional postal code and
optional landmark. Delivery contact is for fulfillment; it is not a verified
sign-in identity and cannot link history or change Auth. No mandatory GPS,
birthday, gender or unrelated personal data is collected. Current Philippine
delivery coverage remains; no new international delivery promise is added.

On a later signed-in visit, checkout offers the default and other saved choices.
Its complete delivery group (recipient name, delivery phone, address and PSGC
destination) replaces only automatically sourced fallbacks while the group is
untouched. Any deliberate edit prevents partial automatic replacement; choosing
a different saved address explicitly replaces the group and invalidates the quote. A changed account clears
the previous account draft, never exposes its saved list,
and cannot alter a held pending order. Manual fields and uncertain submitted
orders retain their existing recovery rules. Customers review the current
delivery charge for each basket; no stored address implies a stored price or
payment approval. Guest checkout has the same forms and submission rights as
before, with no sign-in prompt blocking progress.

## Source of truth and security

Extend the existing private `customer_account_settings` row, scoped solely by
the verified current Auth UUID. Store a bounded address book with stable UUIDs,
one valid default and a revision. Enforce at most ten addresses and the existing 24,576-byte UTF-8 signed payload limit. Preserve the legacy free-text address without
guessing geography; once a structured default exists its display string is a
derived compatibility projection, not another address authority. Existing order
recipient/address/delivery snapshots never change after an account edit.

Use the existing signed `account/settings` boundary and signer actions. Reads
return the address book and revision. Address writes are explicit, contain the
expected revision and original operation UUID, validate a closed bounded shape
and canonical PSGC relationships server-side, and serialize on the settings row.
An exact lost-reply retry reconciles its original result; stale or changed
payloads cannot overwrite a newer address book. Preserve the normal profile
write contract and notifications. Do not make recipient contacts into new Auth
or canonical customer identities. Private address data is not placed in shared
browser storage, public caches or logs. Existing account closure removes the
whole settings row; qualification must prove the new fields are covered.

Reuse one area-selection component/hook and the current reference API for the
address editor and checkout. Saved codes are restored by validating each parent
against current reference results, not trusting stored labels or silently
guessing a replacement locality. A stale or unavailable reference is recoverable
and requires selection/retry before quoting; the server remains authoritative.
No duplicate tariff, stock, order or customer system is introduced.

## Interaction and verification contract

Keep K2's wood canvas, Fraunces/Source Sans hierarchy, semantic colors and
existing navigation. Account settings are an Operate surface: clear profile,
verified sign-in contacts and a compact address list with one inline editor.
Use visible labels, autocomplete/input modes, field-specific errors, keyboard
focus, 44px controls and explicit loading/empty/offline/conflict/unknown-save
states. Removing the default identifies the replacement; an unsaved editor is
preserved through a recoverable error and never falsely reports a saved change.

| Before | After | Why |
| --- | --- | --- |
| One free-text saved address. | Multiple labeled addresses and one default. | Reuse delivery details for recurring destinations. |
| No saved recipient delivery phone. | Fulfillment contact stored with each address. | Couriers can reach the intended recipient without changing sign-in identity. |
| Checkout separately repeats the PSGC area picker. | Restore and validate the selected saved destination. | Avoid repeat entry while retaining route and tariff checks. |
| Empty-field prefill has no ownership/touched tracking. | Account-scoped prefill preserves edits and held requests. | Prevent delayed reads or account changes from mixing personal details. |

Required evidence: failed-first pure/API/native/browser regressions for defaults,
limits, shape/contact/PSGC validation, per-actor isolation, revision conflicts,
exact retry, closure coverage, default restore and selection, manual edits,
late reads/account switch, pending-order freeze, repricing and unchanged guest
ordering. Inspect one combined mobile/desktop light/dark batch and at most one
fix confirmation. Provider migrations and live activation remain separately
qualified/authorized; local synthetic evidence is never a live customer claim.

Alternatives: keep one free-text address (owner declined); create a parallel
customer/contact/quote system (rejected); use browser-only saved addresses
(rejected for cross-device continuity/privacy). Extending the existing private
settings record is the smallest canonical continuation. Sequential design review
and its decisions are recorded below before implementation.

## Skeptic review and resolved contracts

Initial Skeptic disposition REVISE. All four objections are accepted:

1. A last-operation slot does not prove global UUID uniqueness. Logical address
   operation identity is the immutable tuple of actor, expected address revision
   and operation UUID. An exact latest tuple/payload retry returns its saved
   address result; changed bytes for that tuple refuse. After an intervening
   write, the original tuple is a stale conflict without a write or success
   claim. Deliberately changing the expected revision is a new intent, for which
   the UI generates a new UUID. No permanent historical UUID journal is claimed.
2. A permanent address-book-initialized flag distinguishes untouched legacy text
   from an intentionally empty structured book. Removing the last entry clears
   default and compatibility text. The legacy profile writer uses the same
   closure-aware actor lock and row lock; once initialized its supplied address
   must match the canonical projection, otherwise it returns a conflict. A late
   legacy request cannot resurrect an erased destination or rewrite the book.
3. Recipient name, delivery phone, street/address text and PSGC destination form one coherent prefill group.
   Automatic default selection requires both to be untouched. A late read never
   adds saved geography to a manually entered street or overwrites a selected
   area. Explicit address choice replaces the whole group and invalidates the
   quote. Same-user edits survive refresh. An account switch clears that actor's
   form draft before the next actor's defaults; an existing held checkout stays
   unchanged and the guest draft before first sign-in stays manual.
4. The existing settings row requires a nonempty profile name. The address
   command includes explicit displayName for bootstrap, collected once inline
   when no profile exists and reused for the recipient unless the customer
   selects a different recipient. It never invents a profile identity from a
   gift recipient. Insert-on-conflict-do-nothing then row lock/revision check
   gives simultaneous revision-zero saves one winner and one conflict; an
   existing profile name is never overwritten by that bootstrap argument.

Required failed-first sequences include A/rev0 then B/rev1 then stale/changed A,
last-address removal plus delayed legacy profile write, partial delivery typing
before late settings, and first-row concurrent saves. Preserve the existing
closure-aware verifier and its actor lock. Re-review follows before coding.

A fifth Skeptic atomicity objection is accepted: a rejected command must not
persist a partial profile bootstrap. Validate the entire command, PSGC chain,
default, profile name and canonical hash before any settings mutation. Under the
preserved closure-aware actor lock, select the actor row FOR UPDATE. A missing
row with nonzero expected revision refuses without writing; valid revision zero
uses one complete final INSERT ON CONFLICT DO NOTHING RETURNING, with no
intermediate bootstrap row or later failure-return branch. Existing rows check
latest tuple/hash and expected revision before their single UPDATE. Unexpected
SQL failure rolls back the statement; any caught exception uses a block that
also encloses its mutations. Nonce/rate consumption is separate from settings
conservation. Test complete settings before/after rejected bootstrap commands
and simultaneous first saves.

Final Skeptic disposition: APPROVED for local implementation/testing after all
five objections are accepted and resolved; none rejected. Guardian, Advocate
and Arbiter review follow. No production authorization or test result follows
from design approval.

Final Guardian and User Advocate dispositions: APPROVED for local tests after
accepting the complete delivery-group/provenance clarification, including gift
recipients distinct from profile/Auth contacts and delayed settings reads.
Final Arbiter: APPROVED for local implementation/testing; all six objections
accepted/resolved, none rejected, no unresolved local design blocker. The book
limit is ten and the UTF-8 signed body cap is 24,576 bytes. This design evidence
is not implementation, live authorization, a passing test or completed recovery.


### 28 October implementation qualification (local only)

The bounded implementation is now prepared in the existing settings authority.
The native serial and two real-session races pass on the isolated restored schema,
including populated-field closure compatibility and full rollback conservation.
All 48 account/wholesale browser cases pass. Independent implementation review
found two Important defects: a changed profile name could hide a required name
field, and JSONB key ordering could confuse lost-reply reconciliation. Both were
reproduced in Chromium and fixed; a removed-elsewhere editor regression also passes.
Mobile/desktop light/dark captures preserve the existing surface. Exact evidence,
source pins, limitations and data-retaining recovery are recorded in
`docs/acceptance/MAP019_CUSTOMER_ADDRESSES_20261028.md` and its JSON companion.
This supersedes the earlier design-only status; no live behavior follows.
