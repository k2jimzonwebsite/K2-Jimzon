# Imported Draft continuation — design review, 9 October 2026

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

Decision register: same review steps approved by owner9October. Both approaches
were presented; recommended existing-flow approach is awaiting explicit selection.
No implementation or provider write has occurred. The exact next action is in
MAP-018, not in this document.
