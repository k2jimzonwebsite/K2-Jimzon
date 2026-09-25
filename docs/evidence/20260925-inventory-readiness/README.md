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

The production Admin host `https://admin.k2jimzon.com/admin-portal-k2-secure`
accepted the owner's Google sign-in choice and reached its required six-digit
authenticator challenge. The owner was asked to enter the code directly in the
browser. Authenticated staff intake, upload, and inventory actions remain
unverified pending that step. No code or recovery secret was requested in chat.

## Fresh recovery point

The existing `.env.local` credentials were used in process without printing
them. The encrypted files are local ignored artifacts under
`.tools/current-production-backups/` and were uploaded to the owner-only Drive
folder `K2 Production Backups` (`1mQuU8Jj6eWhDr-lpZV3YJDtaEwfAh8yo`). The
Drive connector profile was `k2jimzonwebsite@gmail.com`. For every uploaded
file, Drive metadata reported the intended parent, the exact local byte length,
`shared: false`, and only that account as owner. This metadata check is not an
independent download-and-hash of the remote bytes.

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
omits ACL replay, Vault, Storage objects, and provider settings; it is not a
grant-preserving rehearsal of the stock correction.

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

MAP-017 owns a grant-preserving current-schema rehearsal, managed-role limits,
owner recovery/access check, exact change authorization, controlled stock ACL
apply, and live postflight. The separate six provider-owned defaults still need
Supabase's supported answer. MAP-018 then owns its exact preflight, coordinated
intake migration and cleanup-boundary apply, postflight, and a real staff phone
journey with physical label, photos, opening count, cost, and owner publication
decision. Do not insert rows into `products`, batches, or Storage through the SQL
Editor as a substitute for those workflows.

If the feature-branch documentation must be reversed, revert its documentation
commit. No production change needs rollback from this check. To recover files,
retrieve the owner-only Drive artifacts, verify each checksum and the parts
manifest, reassemble the encrypted Storage envelope, then follow
`docs/runbooks/DATABASE_BACKUP_AND_RESTORE_RUNBOOK.md` in an isolated target.
The passphrase stays outside the repository and chat. Owner account recovery and
an independent remote download/hash check are still separate gates.
