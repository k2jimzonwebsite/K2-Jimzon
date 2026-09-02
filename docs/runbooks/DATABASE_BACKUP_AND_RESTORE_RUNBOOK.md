# Database Backup and Restore Runbook

**State:** named production application-database and Storage object-byte backups,
both isolated local restores, owner-only Google Drive upload, all eight
independent retrieval checks, and whole-archive reassembly verified by 28 August
2026. Owner recovery access, Vault, bucket-policy/provider configuration, and
live Storage re-upload remain unverified.

The MAP-017 executor reads backup verification and owner recovery access as two
separate gates. A verified backup never implies verified account recovery; the
permanent apply remains unavailable until `OWNER_QUESTIONS.md` explicitly records
`Owner recovery access: Verified`.

## Required launch policy

- Target database recovery point objective: no more than 24 hours of committed
  data loss, plus a fresh backup immediately before every migration or risky
  operational cutover.
- Target recovery time objective: restore database service within 8 hours of an
  owner-authorized disaster declaration. This target remains provisional until
  a representative production-sized rehearsal passes.
- Retain 14 daily, 8 weekly, and 12 monthly encrypted database backups after the
  owner confirms storage capacity and the destination.
- Back up required private/public Storage objects weekly and before destructive
  media/evidence changes; retain a versioned object manifest with size, checksum,
  bucket, path, and backup time.
- The owner holds the encryption passphrase in an approved password manager and
  a separate offline recovery copy. The database URL and passphrase must never
  enter source, browser variables, logs, GitHub artifacts, or plaintext files.
- Store encrypted backups in an owner-controlled off-site destination with MFA,
  restricted sharing, version history, and recovery access independent of the
  primary Supabase account.

These are target controls, not an enabled schedule. Google Drive is the selected
off-site provider, using the owner-only, unshared `K2 Production Backups` folder
under `k2jimzonwebsite@gmail.com`. Connector write access, restricted sharing,
and exact provider byte sizes are verified. MFA, independent recovery access,
retention capacity, and the schedule mechanism remain pending.

## Verified isolated database rehearsal

`npm run rehearse:database-backup-restore` performs this fail-closed lifecycle:

1. Accept only loopback PostgreSQL URLs.
2. Require a `k2_catalog_rehearsal*` source and a distinct, empty
   `k2_restore_rehearsal*` target.
3. Fingerprint catalog data, operation receipts, row events, and sensitive
   function privileges.
4. Run `pg_dump --format=custom --no-owner` into memory.
5. Encrypt the dump with AES-256-GCM and scrypt-derived key material without
   writing plaintext to disk.
6. Decrypt only in memory, compare dump SHA-256 values with constant-time
   equality, and restore with `pg_restore --exit-on-error`.
7. Compare the restored database fingerprint exactly with the source.

The 22 August 2026 PostgreSQL 17.11 run backed up 38,005 dump bytes into a
38,069-byte encrypted envelope in 337 ms and restored it in 277 ms. Data,
catalog operation evidence, row-event evidence, and post-rollback privilege
state matched. These timings describe a tiny isolated rehearsal database and
must not be used as production RPO/RTO evidence.

## Prepared MAP-017 production backup command

The repository includes `npm.cmd run backup:map017-production -- ...`. It requires `K2_PRODUCTION_DATABASE_URL`
and `K2_BACKUP_PASSPHRASE` to be injected from an approved non-logging secret
source; neither value may be supplied as a command-line argument. The destination
must be an absolute path ending in `.k2backup` inside an already approved,
owner-controlled location.

```powershell
npm.cmd run backup:map017-production -- `
  --destination=D:\approved-k2-backups\map017-pre-migration.k2backup `
  --confirm-project=pixplcjqivlfflickobf `
  --confirm-purpose=MAP-017-pre-migration `
  --confirm-artifact-sha256=D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62 `
  --confirm-ledger-version=20260824143000
```

The command checks exact project/TLS identity and PostgreSQL client/server major
parity, runs custom-format `pg_dump` without putting credentials in arguments,
captures the deterministic count/SHA-256 fingerprint of `products_old` before
and after the dump, requires the owner-audited count of exactly 14 and no drift,
encrypts the dump in memory, and exclusively creates only:

- the authenticated `.k2backup` envelope; and
- `<envelope>.manifest.json`, containing redacted identity, sizes, checksums, and
  `restoreVerification: Pending`. Manifest format 2 contains only the legacy row
  count and fingerprint; AES-GCM associated data authenticates them with the
  envelope, and no legacy row values are written to the manifest or logs.

Existing destinations are never overwritten or deleted. Copy the backup ID into
OWNER-005 only after the envelope and manifest are durably stored and independently
downloaded/checksummed. Change restore verification to `Verified` only after the
same envelope is successfully restored into a distinct isolated database and its
schema, authorization, and representative-data fingerprints pass.

The exact provider inventory was queried read-only on 26 August 2026 with
`npm.cmd run evidence:map017-backups`. It returned PITR disabled, WAL-G enabled,
and zero available backup entries. Do not translate WAL-G enablement into a
backup receipt. The encrypted raw logical envelope command remains provisional
until an isolated restore passes. Supabase's official backup guidance states that
database backups exclude Storage objects; Storage export, manifest and restore
must be evidenced separately.

The 27 August refresh returned the same zero-backup inventory. The portable
backup/encrypt/restore lifecycle and 51 focused contracts passed fresh. A
28 August default-run retry passed the artifact, rollback, dry-run, and fixture
parser checks but could not start the bundled PostgreSQL child process
(`portable PostgreSQL startup failed: unknown failure`); no database write or
production connection occurred. The last approved workspace run remains the
isolated lifecycle evidence. A redacted `supabase db dump --linked --dry-run`
also passed using the credential
already held in native CLI storage, but the approved envelope command must not
scrape command output or export that secret. To continue, obtain the session-
pooler connection string from Supabase Connect, store its database password and
a new 24-plus-character backup passphrase in the approved password manager, then
place only these local non-committed entries in `.env.local`:

```text
K2_PRODUCTION_DATABASE_URL=<percent-encoded session-pooler URL with sslmode=require>
K2_BACKUP_PASSPHRASE=<owner-held passphrase>
```

Do not send either value through chat, print them, or put them in a command line.
After the production envelope exists, use a separately named empty loopback
database through `K2_MAP017_RESTORE_TARGET_URL` for restore verification.

## Prepared MAP-017 isolated restore verification

After an approved production envelope has been copied to the controlled restore
workstation, inject the passphrase and an exact dedicated loopback database URL
from the non-logging secret source, then run:

```powershell
npm.cmd run verify:map017-production-restore -- `
  --envelope=D:\approved-k2-backups\map017-pre-migration.k2backup `
  --confirm-isolated-restore
```

The target database name must begin with
`k2_map017_restore_verification_`. The command refuses a non-loopback target, a
non-empty target, an unauthenticated or mismatched envelope/manifest, and a
PostgreSQL client/server major mismatch. It restores without source ownership or
privileges and creates `<envelope>.restore-verification.json` only after the
expected public schema, key tables, migration ledger, and pre-MAP-017 receipt
boundary pass. It then recomputes the restored `products_old` fingerprint and
requires exact equality with the authenticated 14-row source fingerprint. It
never drops the target automatically; the operator must retain
evidence and separately approve disposal.

The portable PostgreSQL 17.11 rehearsal passed this path with a real custom
archive and a second isolated database. On 27 August 2026 the exact production
application-database archive also passed in
`k2_map017_restore_verification_production_20260827`: 51 public relations, the
required tables and ledger, and the authenticated 14-row legacy fingerprint
matched. Because plain PostgreSQL lacks managed `supabase_vault`, the verifier
excludes and records only Vault-owned TOC entries; Vault recovery is not claimed.
Both backup and restore sessions use UTC for deterministic timestamp fingerprints.
The rehearsal includes 14 seeded legacy rows and rejects manifest tampering or
any restored row drift.
Do not update OWNER-005 until the exact approved production envelope has passed,
representative data has been checked, the receipt is retained, and the separate
Storage-object recovery gate is satisfied.

## Verified MAP-017 production Storage backup

`npm.cmd run backup:map017-storage -- ...` enumerates K2 Storage metadata over
the validated production database connection and refuses private buckets,
missing sizes, unsafe or duplicate paths, unexpected project identity, weak
passphrases, or an existing destination. It downloads public object bytes
read-only, requires exact database-recorded sizes, computes per-object SHA-256
values, and places paths, MIME types, sizes, hashes, and bytes only inside one
AES-256-GCM `.k2storage` envelope. The adjacent manifest exposes only the backup
identity, bucket/count/byte summary, aggregate fingerprint, and archive/envelope
checksums.

On 27 August 2026 backup
`map017-storage-pixplcjqivlfflickobf-2026-08-27T141713000Z-6e60fb24d07a`
captured all 36 `product-images` objects and 115,573,916 bytes. Its encrypted
SHA-256 is
`6E60FB24D07A80CB8FDBDBBC7F0EE3EFF86FEE0EE0A9657E9D4F5C94607AE312`.
`npm.cmd run verify:map017-storage-restore -- ...` decrypted it only in memory,
restored all files into
`k2_map017_storage_restore_verification_production_20260827`, and re-read every
file to require exact size and SHA-256 equality. The restored count, byte total,
and aggregate fingerprint matched. This is file-level recovery proof; it does not
prove Supabase bucket policies, provider settings, or live upload into another
Supabase project.

## Verified owner-only off-site upload

The owner explicitly authorized uploading only the encrypted/redacted artifacts.
Eight files are stored in Drive folder `K2 Production Backups`, ID
`1mQuU8Jj6eWhDr-lpZV3YJDtaEwfAh8yo`; do not upload the repository. Google reports
every file under that parent, at the exact local byte length, `shared: false`,
and with only owner `k2jimzonwebsite@gmail.com` in its permissions.

The 115,580,694-byte `.k2storage` envelope exceeds the connector's 100 MiB input
limit, so `npm.cmd run split:encrypted-backup -- ...` created two encrypted
transport parts without decrypting it. The parts manifest records their order,
sizes, hashes, and original-envelope hash. `npm.cmd run
verify:encrypted-backup-parts -- ...` must reconstruct the exact original SHA-256
before restore.

Independent downloads match the local SHA-256 for all eight Drive files. Part
001 was downloaded through a normal owner-authenticated Drive session to avoid
the connector/runtime IPC frame limit and verified with:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath '<downloaded-path>\map017-storage-pre-migration-20260827-01.k2storage.part001'
```

Required SHA-256:
`47BB9160986C5C306C9026171FCC1DB1C4C92A8CA8C40902C410AE04F26FA350`.
The downloaded Drive copy matched. Reassembling it with part 002 also matched the
original encrypted archive digest
`6E60FB24D07A80CB8FDBDBBC7F0EE3EFF86FEE0EE0A9657E9D4F5C94607AE312`.
Do not mark OWNER-005 recovery access verified until the separate account-level
recovery check is demonstrated.

On 28 August the connector profile read-only check confirmed the signed-in
account is `k2jimzonwebsite@gmail.com`. A raw part-001 fetch again returned the
exact size, but in-tool hashing was refused because the base64 response would
exceed the connector/runtime IPC frame; no bytes were emitted or persisted.

On 30 August an authenticated Drive session under that same owner account listed
the unshared folder, read both restore-verification receipts, and downloaded the
complete 674,413-byte database envelope. The repository's fail-closed artifact
validator then used the locally retained passphrase without logging it and
authenticated/decrypted the exact named envelope, including its manifest,
custom-dump signature, byte length, and dump SHA-256. Retrieval and decryption
capability are therefore evidenced on the current recovery workstation. This
does not by itself prove password-manager/offline-copy custody or current Google
2-Step Verification recovery email/phone; those owner confirmations remain the
only MAP-017 recovery-access gate.

## Production procedure before activation

1. Confirm the incident/change owner, backup reason, source project reference,
   expected migration ledger, and clean destination capacity.
2. Obtain the database connection only from the approved server-side secret
   manager. Never paste it into a command that will be logged or committed.
3. Create a PostgreSQL custom-format dump with the same major-version client as
   the source server. Stop if `pg_dump` reports any error.
4. Encrypt immediately with a fresh AES-256-GCM salt and IV. Record only the
   encrypted file checksum, byte length, source project reference, schema ledger,
   and UTC time.
5. Upload only the encrypted envelope and redacted manifest to the approved
   owner-controlled off-site destination. Verify download and checksum from a
   separate authenticated session.
6. Export required Storage objects and their redacted manifest through an
   authenticated server process; encrypt before off-site upload.
7. At least monthly and before major cutover, restore into a disposable isolated
   project/database, run schema/grant/RLS/data-health checks, verify representative
   records and Storage checksums, record measured RPO/RTO, then destroy the
   isolated copy after evidence retention.

## Failure and stop conditions

Stop and record `BACKUP_BLOCKED` or `RESTORE_FAILED` if the dump is empty,
credentials or keys could be logged, encryption authentication fails, the
encrypted checksum changes, the restore target is not isolated and empty, the
client/server major versions are incompatible, the migration ledger differs,
the `products_old` source count is not exactly 14, its fingerprint changes during
the dump, restored fingerprint equality fails, required Storage objects are
absent, or owner recovery access
is not proven. Never overwrite production as a restore test.

## Current blockers

- `OWNER_RECOVERY_ACCESS_PENDING`: owner-only Drive upload, exact sizes, all
  eight independent retrieval/SHA-256 checks, and whole-archive reassembly pass.
  Owner-account retrieval and exact database-envelope decryption also pass on
  the current recovery workstation. Approved password-manager plus separate
  offline-copy custody and MFA recovery email/phone currency remain unverified.
- `STORAGE_PROVIDER_RESTORE_BOUNDARY_PENDING`: all current object bytes and paths
  pass encrypted local backup/restore, but bucket-policy/provider configuration
  and live re-upload into an isolated Supabase project remain unverified.
- `SCHEDULE_OWNER_PENDING`: no reliable free-plan scheduler, missed-run alert,
  overlap lock, or named daily reviewer has been accepted.

Until these are cleared, run backups manually before approved changes and do
not claim disaster recovery readiness.
