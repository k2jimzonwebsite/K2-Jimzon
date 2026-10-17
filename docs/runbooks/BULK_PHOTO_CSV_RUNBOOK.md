# Product photo CSV

MAP-023 / IDEA-20261017-01. Prepared locally; verify the released Admin before using these controls in production.

1. From Upload CSV choose Upload photo files by CSV. Download its photo CSV template.
2. Use exact existing Draft SKUs and exact local filenames in sku,primary_file,after_file. Blank cells keep current photos. Do not put a currently populated slot in the batch. Keep variant/identity holds outside the upload CSV.
3. Select the mapping CSV and image files, then Review photo assignments. Check each SKU, preview and empty target slot. Add the change reason and approve.
4. Upload and assign runs sequentially through normal Admin photo commands. Keep the selected SKUs out of concurrent editing. It stops on failed/unconfirmed upload, assignment, cleanup, account change or current-media drift.
5. If interrupted, reopen the photo CSV mode in the original staff account. Reselect the original unchanged files for unconfirmed uploads. Continue saved photo batch retains exact original keys and commands, skips confirmed uploads and completed rows, and verifies current state. Never erase an unknown/corrupt journal or create a replacement batch to bypass it.
6. Download photo batch result. Only after all rows verify, acknowledge the completed batch. This removes the local completed journal; original server receipts remain.

Recovery: retain result JSON and localStorage k2-photo-csv-v1. Divergent media/non-Draft targets require reconciliation of original actor/key/payload against current media and canonical command receipts; the UI deliberately has no discard-unknown control. Uploaded but unassigned objects remain in existing Unused uploads review, not silently deleted. Current handler has no atomic compare-and-swap with other devices/manual writers; do not claim that guarantee.

No credential, SQL or service-role workflow is used here. Apply repository K2 preflight/readiness and owner release rules before any later production step.
