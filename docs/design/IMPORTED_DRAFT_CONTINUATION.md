# Imported Draft continuation — design review, 9 October 2026

Related owner decision, IDEA-20261009-12: photo URLs in correct spreadsheet cells
already belong to their product row. Optional AI may flag possible mismatches or
suggest detail corrections; staff decides final output. Existing supplied images
are retained, no default image generation or automatic publication. Manual review
does not depend on AI availability. Local protected association is verified by
the 10 October receipt below; complete installation/live qualification remains open.

IDEA-20261007-01, owned by MAP-018. This is a design receipt, not a backlog.

Owner confirms imported products must complete the same packaging, photo and
product-detail reviews as manually added products before stock intake. Existing
SKU, source provenance and history must survive. Staff use the existing intake
steps; protected server commands own validation, saving and retries. Existing
stock intake, eligible-lot, publication and Website-assignment gates still apply.
No new product identity or stock may be invented to bridge a missing connection.

Assumptions: one selected zero-stock, unpublished Draft per intake; existing
Staff/Admin and AAL2 rules; existing bounded requests and timers; current product
version checked before association; same-key retry returns saved history without
another product, association, inventory movement or publication. Private photos
remain under the existing evidence ownership and cleanup rules. Operations
rulebook, System Brain, intake runbook and MAP own future maintenance. No change
to taxonomy, stocked-product reassignment or provider permissions is included.

The existing session-create payload cannot name an imported product. The existing
Draft saver returns early for an associated product, before review checks. An
early product_id assignment would therefore create a review bypass and is refused
as a design shortcut.

Recommended approach: extend existing intake. Select an eligible imported Draft,
create/resume a genuine review session, complete the current evidence and field
review steps, then atomically validate and associate the reviewed session with
the selected existing product. Keep product identity intact; any reviewed edits
use the existing protected master/version/provenance boundary. Resume remains
review-aware and does not mistake an unreviewed selection for a saved Draft.

Alternative: add a separate protected review-and-link action after the existing
review. This isolates association but introduces another command, receipt and UI
entry for staff to maintain. Both approaches must enforce identical gates.

Verification must cover incomplete evidence/review refusal with committed
no-write readback; stale version, wrong role/AAL2/owner, non-Draft, stocked or
published selection refusal; exact retry and response-loss resume; two concurrent
sessions selecting the same product; SKU/history preservation; then one connected
dummy import, review, eligible intake, publication, Website listing, order,
payment review, packing and handover. Local synthetic proof must remain distinct
from hosted provider/Auth/media and real funds/stock acceptance.

Decision register: same review steps and optional advisory AI approved by owner
9October. The owner's instruction to proceed approves extending the existing
intake flow. No further approach-selection question is required. No provider
write has occurred. The exact next action is in MAP-018, not in this document.

Structured review — Skeptic objections accepted:

- Selection is separate from product_id until reviewed association commits.
- Resume binds exact target UUID and catalog version; an unrelated active session
  refuses instead of silently adopting another product's review.
- Duplicate checks exclude the selected row only, retain other-product/variant
  rules and cooperate with the established identity-lock order.
- Only one session may own initial association. The concurrent loser refuses;
  same-command retry returns the first receipt without another write.
- An imported display photo is not three registered package-evidence uploads.
  Retain the supplied display photo and require actual existing review evidence.
- Only explicit staff-accepted fields are merged through the protected master
  boundary. Preserve SKU, provenance, media and all untouched imported values.
- AI output remains a candidate, never accepted field decisions or progress.

Implementation boundary under review: persist a separate review-target identity
in signed intake session provenance, keep product_id null during review, and use
an explicit reviewed existing-Draft command at save. Reuse current validators,
registered evidence, named product/version checks and receipt/audit controls.
Association must enter the existing category operating barrier in the required
mode before session/product resources; never upgrade after taking a shared entry
or add undeclared balance rows to make zero-stock verification pass. Guarded
installation must preserve current function metadata/ACLs and unrelated rows.
Native admission, concurrent writers, same-key replay and exact recovery must
prove the chosen protocol before any provider payload is accepted.

Constraint Guardian decisions — all four objections accepted:

- Existing-target session creation and reviewed association take **exclusive**
  category operating entry after signature verification and before receipts,
  session/product resources or identity keys. The verifier itself does not enter
  that barrier. The private Draft saver chooses exclusive entry for a bound target
  before its session lock; its nested shared entry observes the held exclusive
  mode. Existing shared writers and exclusive category mutations cooperate.
  The existing 2s lock/10s statement limits remain armed; no balances are invented.
- Staff+AAL2 may review and correct only this selected, unpublished, zero-stock
  Draft through the protected intake command and the hardened Draft validator.
  This is a narrowly scoped extension of intake review authority, not a call to
  the separately signed Admin Product Master command, nor a change to its ACL or
  Admin+AAL2 rules. Stocked, published, non-Draft or previously associated products
  refuse. Protected product identity, supplied media, prices and inventory fields
  cannot be corrected through this path. Audit retains before/after reviewed facts.
- The signed session-create command validates product UUID and exact catalog
  version and writes the reserved `imported_draft_target` provenance binding.
  Step patches cannot supply that key; database patches always retain its existing
  value. Direct session writes remain closed. Missing, malformed or mismatched
  bindings refuse; ordinary sessions cannot acquire one during review.
- Merge only present product fields whose decisions are exactly `accepted`.
  Canonical editable review fields are name, short_name, description,
  card_description, why_buy, usage_instructions, ingredients, allergens,
  storage_instructions, package_type, subcategory, origin, size,
  finished_product_details, seo_keywords and pairings. Normalized parser aliases
  are short→short_name, inside→description, whyBuy→why_buy. Ambiguous aliases refuse.
  Text corrections must be nonempty strings; null/blank means unknown and retains
  the imported value, never deletes it. Explicit empty arrays may clear only the
  two allowed list fields after staff acceptance. Category, brand, barcode, SKU,
  import/source history, supplied media, slug, status, approval and financial/stock
  fields retain their current values. Unsupported accepted identity/taxonomy
  changes refuse rather than silently pretending they were saved. The existing
  catalog version trigger and command audit apply atomically with association.

Alternative rejected: invoke the Admin Master command using an intake signature,
or grant Staff broader Master privileges. That would cross existing role/action
boundaries. Reusing the hardened intake gate with the narrow merge above satisfies
the owner's staff-final review requirement without expanding general edit powers.

User Advocate decisions — all four objections accepted:

- Target mode loads the server's imported detail snapshot into the existing field
  review controls. Staff may continue manually without a ChatGPT account, paid AI
  request or mandatory JSON paste. Package evidence and review gates remain.
- Imported values and newly loaded/pasted AI candidates start unchecked. Only
  saved explicit staff decisions resume as checked. Accepting the name is still
  required; unselected corrections retain the current imported value.
- Keep the imported snapshot visible beside the proposed fields in the existing
  review area. Loading a candidate does not alter that snapshot, decisions,
  association or saved progress. AI unavailable/rejected retains manual review.
  Imported-target mode offers content advice, not generated replacement images.
- Show product name and original SKU; use “Save reviewed details” and “Existing
  Draft reviewed” labels. Explain that the spreadsheet photo stays while package
  photos remain necessary. An unrelated active session asks staff to finish that
  review; a stale version asks them to reload the product and start a fresh review
  of its current details. Same-target changed-version restart creates a new
  session, never rewrites the old binding or carries its accepted decisions.
  Lost replies retain the exact command for recovery, never imply refusal.

The four required design skills preserve the existing Admin typography, dense
readable layout, keyboard access, 44px controls and complete loading/error states.
No separate comparison framework, importer AI mapping or new product flow is added.

Integrator/Arbiter disposition: **APPROVED, design only**. All 15 objections
(Skeptic7, Constraint4, User Advocate4) accepted and resolved; none rejected or
open. Proceed with implementation and committed behavioral evidence. This is not
production qualification or provider activation approval.

Implementation inspection clarification: spreadsheet-created rows have no brand
or category assignment. Intake must permit their **first** assignment to existing
brand/category names through its current resolver, while refusing reassignment of
an existing non-null taxonomy identity. No category is created, stocked taxonomy
is never changed, and current category/lot gates still qualify actual inventory.
The editable target fields reuse the existing review controls, with visible text
inputs for manual correction. This resolves a missing connection needed for the
approved import-to-intake behavior, not broader Product Master authority.

**10 October implementation review and evidence:** Independent code review identified and then accepted corrections for visible reviewNotes/unknownFields, usable same-product/version reload, and authoritative imported image-claim/attachment refusal before paid/storage work. Staff approvals remain unchecked for newly loaded advice; editing resets acceptance. Reviewed UI uses the existing modal body scroll instead of a cramped nested160px review pane. Maintained contracts42/0, actual-component UI26/0 and native56/0; development gate exit0 after final code edit. The native connected proof includes concurrent one-winner association, first existing taxonomy assignment, coherent origin aliases, exact stock/handover retries and original identity/media/history retention. Cold/drift/recovery/current-writer integration and provider/hosted qualification remain MAP-018/023/025. Prepared SHA26ec4db0... is not an activation migration. Full durable receipt: docs/acceptance/DUMMY_PRODUCTION_ACCEPTANCE_20261009.md.
