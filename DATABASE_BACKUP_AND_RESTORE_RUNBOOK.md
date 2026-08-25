# Database Backup and Restore Runbook

**State:** local PostgreSQL database backup/restore rehearsal verified; no
production or off-site backup is claimed.

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

These are target controls, not an enabled schedule. The exact off-site provider,
owner access test, retention capacity, and schedule mechanism remain pending.

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
fingerprints fail, required Storage objects are absent, or owner recovery access
is not proven. Never overwrite production as a restore test.

## Current blockers

- `OWNER_CONTROLLED_BACKUP_DESTINATION_PENDING`: no approved off-site destination,
  access test, retention capacity, or custodian evidence exists.
- `PRODUCTION_BACKUP_CREDENTIAL_PENDING`: the launch-safe server-side export job
  has not received production database authority.
- `STORAGE_BACKUP_IMPLEMENTATION_PENDING`: authenticated object enumeration,
  encrypted transfer, manifest verification, and isolated restore remain to be
  implemented and rehearsed.
- `SCHEDULE_OWNER_PENDING`: no reliable free-plan scheduler, missed-run alert,
  overlap lock, or named daily reviewer has been accepted.

Until these are cleared, run backups manually before approved changes and do
not claim disaster recovery readiness.
