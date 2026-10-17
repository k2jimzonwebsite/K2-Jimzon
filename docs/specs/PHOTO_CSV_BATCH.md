# CSV photo batches

MAP-023 / IDEA-20261017-01. Local implementation, not a hosted capability until explicitly promoted.

The existing Upload CSV dialog has a photo-files mode. Staff choose a mapping CSV with exact headers sku,primary_file,after_file and select local PNG/JPEG/WebP files. Each row matches one existing Draft. A blank cell retains its slot; a nonblank cell can fill only an empty primary or AFTER slot. No stock, price, brand/category, review, Website or publication mutation is added.

The design reuses existing authenticated upload and photo-assignment endpoints. It adds no importer, SQL, provider settings or migration. Preview shows SKU/name, local thumbnails and target slots before explicit approval and a10–500-character reason. Limit200rows/400files/4MiB each/256MiB total; upload and verification are sequential.

Recovery stores original actor, file SHA-256/size/type, stable upload and assignment keys, immutable assignment payloads, upload receipts and completed rows in localStorage k2-photo-csv-v1 before dispatch. Recovery requires the same actor and unchanged original files for unconfirmed uploads. Confirmed uploads are never repeated. Each assignment attempt rechecks current Draft/photos against its original or exact expected snapshot; post-save readback must match. A batch-wide Web Lock prevents competing local batch writers. No request retry is automatic.

The current media command provides no atomic expected-version comparison across other devices or manual photo writers. The pre-send check narrows drift exposure but does not prove all concurrency schedules. Keep these SKUs out of concurrent editing while running a batch. No claim of cross-device atomicity.

Decisions: reuse existing endpoints over new ZIP transport/bulk SQL; fill-empty over replacement to preserve saved photos; hashes over filenames alone for reload recovery; fail/retain over clearing unknown commands. Existing Admin product palette, typography,44px controls, visible errors and reduced-motion behavior are preserved. No decorative motion or new dependencies.

Evidence: docs/acceptance/PHOTO_CSV_BATCH_20261017.json; docs/design-checkpoints/20261017-photo-csv. Synthetic green rectangles are test fixtures, not K2 product media.
