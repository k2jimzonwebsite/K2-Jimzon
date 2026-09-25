# Inventory listing readiness, 25 September 2026

## Request and current result

The owner asked to finish the accessible browser/computer work so staff can start
inventory listing. This is an operational check under MAP-017 and MAP-018, not a
new queue item. Real new-product intake is **not ready** on the production
database. No production schema, grant, inventory row, product, or Storage object
was changed during this check.

## Live read-only findings

In the owner-authenticated Supabase SQL Editor for project
`pixplcjqivlfflickobf`, read-only queries on 25 September returned:

- At 05:06:03 UTC, `public.get_public_product_stock()` still had a PostgreSQL
  `PUBLIC` execute grant. Explicit `anon`, `authenticated`, and `service_role`
  execute grants were also present. The prepared MAP-017 narrow correction is
  therefore still source-only and needs its current-schema rehearsal and
  controlled apply gate.
- At 05:07:02 UTC, `anon` still had stock-view `SELECT`, but
  `public.product_intake_sessions` and the
  `create_product_draft_server(uuid,uuid,jsonb,jsonb)`,
  `create_product_first_inventory_server(uuid,uuid,text,jsonb)`, and
  `transition_product_publication_server(uuid,text)` functions were absent.
  MAP-018's intake migration is not production state. A staff sign-in cannot
  safely create a new canonical product through that prepared path yet.

At approximately 05:33 UTC, the repository's read-only live exporter also
captured the complete current structural metadata to the ignored local file
`.tools/current-production-backups/live-schema-metadata-20260925.json`.
The command below exited 0 and wrote the ignored local report
`live-schema-audit-20260925.json`:

```powershell
node scripts/schema-truth-audit.mjs --export=.tools/current-production-backups/live-schema-metadata-20260925.json --json --allow-findings --output=.tools/current-production-backups/live-schema-audit-20260925.json
```

It reports **13 critical, 0 high** findings: the stock function's `PUBLIC`
execute grant; anonymous execution of `get_storefront_chat_v1`,
`submit_storefront_chat_v1`, `validate_coupon`, `submit_order_request`,
`submit_order_request_v2`, and `submit_pasabuy_request`; and six
`supabase_admin` default-privilege groups for future functions, tables and
sequences. The audit is metadata evidence, not a change or runtime-role test.
The six transitional grants need the signed guest replacement; the six
provider-owned defaults need Supabase's supported correction path.

The production Admin host `https://admin.k2jimzon.com/admin-portal-k2-secure`
accepted the owner's Google sign-in choice and reached its required six-digit
authenticator challenge. The owner was asked to enter the code directly in the
browser. At that point authenticated staff intake, upload, and inventory
actions were unverified. No code or recovery secret was requested in chat.

At approximately 06:05 UTC the owner reported that the browser is already
signed in. Codex computer use returned `Browsers: Error: User unavailable`, so
the signed-in page and AAL2 claim could not be inspected from this task. A fresh
Supabase migration-list read still ended at `20260921033348`
(`admin_globe_direct_rpc`). A fresh read-only SQL probe returned no
`public.product_intake_sessions` relation and zero functions named
`create_product_draft_server`, `create_product_first_inventory_server`, or
`transition_product_publication_server`. The complete
`supabase/map018_product_intake_preflight.sql` executed on production without
error; it made no schema or data change. This establishes compatibility of its
checked prerequisites only. The MAP-017 activation gate and exact-host staff
acceptance remain open. A fresh stock ACL read returned explicit `anon` and
`authenticated` execute, anonymous stock-view select, and the extra `PUBLIC`
execute unchanged. The prepared correction file still hashes to
`3A1E23629325D0620F0CF4BC7E5CF0F929FF3851DBD562CFDAE0933FC8C04BBC`.
No production write SQL was applied.

## Fresh recovery point

The existing `.env.local` credentials were used in process without printing
them. The encrypted files are local ignored artifacts under
`.tools/current-production-backups/` and were uploaded to the owner-only Drive
folder `K2 Production Backups` (`1mQuU8Jj6eWhDr-lpZV3YJDtaEwfAh8yo`). The
Drive connector profile was `k2jimzonwebsite@gmail.com`. For every uploaded
file, Drive metadata reported the intended parent, the exact local byte length,
`shared: false`, and only that account as owner. At 05:39 UTC, the newly
uploaded database envelope was independently fetched as raw bytes through the
Drive connector. A SHA-256 implementation checked against the known empty and
`abc` test vectors hashed the returned 828,633 bytes to
`6a323d697f234665122959a2c06220ad4c99ae49b706dff059d3c78019f58f62`,
exactly matching the local encrypted envelope. The two large Storage transport
parts and five redacted manifests/receipts were then independently downloaded
through short-lived Drive file references into the ignored local directory
`.tools/current-production-backups/remote-verify-20260925/`. All seven files
matched their local sources in byte length and SHA-256. The repository's
`verifyEncryptedBackupParts` checked the two downloaded parts against the
downloaded manifest and reassembled the encrypted Storage envelope to SHA-256
`db3adda45dfd67f1ae4e19d53df14eab637012b162109cb1beb6a905d9067341`.
Thus all eight uploaded files passed independent retrieval and checksum checks.
This does not include a live Supabase project restore or provider configuration.

| Artifact | Evidence | Drive file ID |
| --- | --- | --- |
| `pre-inventory-readiness-20260925.k2backup` | Encrypted database envelope, 828,633 bytes, SHA-256 `6a323d697f234665122959a2c06220ad4c99ae49b706dff059d3c78019f58f62` | `1OnNuHyAZhTBZvbgWqDff7f9tHGSC8R3U` |
| `.k2backup.manifest.json` | Redacted database manifest | `1lRkTciyRNWs230swcVXjBnwIqyynIlT2` |
| `.k2backup.restore-verification.json` | Isolated database restore receipt | `1Hl6zVwnbxuEr3SKxe7cM4fFz33ntJsJV` |
| `.k2storage.manifest.json` | Redacted Storage manifest | `1ebTSbSRkUjs7cgxOldGw2WtU2JtD1Gng` |
| `.k2storage.parts.json` | Encrypted transport part order and hashes | `1oHBIacij6HDmXZqqlwk4dogn7IEpPSSS` |
| `.k2storage.restore-verification.json` | File-level Storage restore receipt | `1LD6grgcPpqVnkgDSTqZ7zN2Z0nCHFMid` |
| `.k2storage.part001` | Encrypted transport part, 67,108,864 bytes | `1EOY61GL2fjGBoTK5R9YCsHkcg5TEPYZC` |
| `.k2storage.part002` | Encrypted transport part, 48,471,830 bytes | `1Py56GsdCnTxlounF9AamRuNyc3Vs2u2L` |

The database backup ID is
`current-pixplcjqivlfflickobf-2026-09-25T050921099Z-6a323d697f23`.
`scripts/verify-current-production-restore.mjs` restored it to a dedicated
empty local PostgreSQL 17 database and exited 0: 51 public relations, latest
migration `20260921033348`, with 10 managed entries excluded. That restore
omits ACL replay, Vault, Storage objects, and provider settings.

## Current-schema local migration rehearsals, 25 September

The encrypted database archive was also authenticated and decrypted in memory
for a second, separate restore into `k2_current_acl_restore_20260925`. This
restore kept archived privileges and excluded only the same 10 managed Vault
entries. The already present non-login local placeholders for six missing
Supabase-managed role names allowed the archive ACLs to load. The baseline had
51 public relations, ledger version `20260921033348`, and the stock function ACL
`{=X/postgres,postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres}`.

Applying `20260925_map017_stock_public_execute.sql` on that isolated clone exited
0. The resulting ACL removed `=X/postgres` while preserving explicit `anon`,
`authenticated`, and `service_role` grants; `dashboard_user` lost inherited
execute. Both `anon` and `authenticated` read all 21 current stock-view rows
under their own local roles. Applying the paired recovery SQL exited 0 and
restored the original ACL, 51 public relations, and ledger version. The
placeholder roles do not reproduce Supabase role membership, provider defaults,
or Vault behavior; this is current application-schema and archived-ACL
compatibility evidence, not a production permission change.

On the independent `k2_current_restore_20260925` clone,
`map018_product_intake_preflight.sql`, the full
`20260811_product_intake_and_sku_gate.sql` migration, the full
`20260824_map018_intake_evidence_cleanup_boundary.sql` migration, and
`map018_product_intake_postflight.sql` each exited 0 in order. The postflight
checks intake table/RLS, browser role boundaries, three server command grants,
private evidence bucket/policies, and publication status wiring. This clone
now contains local rehearsal changes; the encrypted source backup remains
unchanged. No production migration was applied, and this local check does not
prove provider Storage behavior, exact-host staff access, or a real listing.
The isolated PostgreSQL server was stopped after these checks;
`pg_isready -h 127.0.0.1 -p 55432` returned no response.

The Storage backup ID is
`map017-storage-pixplcjqivlfflickobf-2026-09-25T051032028Z-db3adda45dfd`.
`scripts/map017-storage-backup.mjs restore` re-read all 36 restored
`product-images` objects (115,573,916 source bytes) and matched the content
fingerprint. The 115,580,694-byte encrypted envelope was split with
`scripts/split-encrypted-backup.mjs`; its verify command reassembled the parts
to SHA-256 `db3adda45dfd67f1ae4e19d53df14eab637012b162109cb1beb6a905d9067341`.
This proves local file recovery, not Supabase bucket policies or live upload
behavior. The unsplit `.k2storage` remains local only because it exceeds the
Drive connector limit.

## Next action and recovery

MAP-017 owns managed-role/provider review, exact change authorization for this
stock SQL, controlled stock ACL apply, and live postflight. OWNER-005 already
records `Owner recovery access: Verified` from the 2 September attestation. The
separate six provider-owned defaults still need Supabase's supported answer.
MAP-018 then owns its live preflight, coordinated intake migration and
cleanup-boundary apply, live postflight, and a real staff phone
journey with physical label, photos, opening count, cost, and owner publication
decision. Do not insert rows into `products`, batches, or Storage through the SQL
Editor as a substitute for those workflows.

If the feature-branch documentation must be reversed, revert its documentation
commit. No production change needs rollback from this check. To recover files,
retrieve the owner-only Drive artifacts, verify each checksum and the parts
manifest, reassemble the encrypted Storage envelope, then follow
`docs/runbooks/DATABASE_BACKUP_AND_RESTORE_RUNBOOK.md` in an isolated target.
The passphrase stays outside the repository and chat. The owner recovery
attestation and all eight offsite retrieval checks are recorded. Supabase
provider settings, managed-role membership, Vault and live Storage re-upload
remain outside these backup checks.

The Chrome computer-use bridge timed out three times around 05:30 UTC and later
reported `User unavailable` with no browser inventory. The last observed Admin
state was the six-digit authenticator challenge, not a verified sign-in. Recheck
the browser when control returns; do not infer that the owner completed MFA.
