import { expect, test } from '@playwright/test'
import { validateBackupRehearsalTargets } from '../scripts/rehearse-database-backup-restore.mjs'

test('database backup rehearsal accepts only distinct loopback rehearsal databases', () => {
  expect(validateBackupRehearsalTargets(
    'postgresql://postgres@127.0.0.1:5432/k2_catalog_rehearsal_ci',
    'postgresql://postgres@127.0.0.1:5432/k2_restore_rehearsal_ci',
  )).toMatchObject({ valid: true, sourceDb: 'k2_catalog_rehearsal_ci', targetDb: 'k2_restore_rehearsal_ci' })
  expect(validateBackupRehearsalTargets(
    'postgresql://postgres@db.example.com:5432/k2_catalog_rehearsal_ci',
    'postgresql://postgres@127.0.0.1:5432/k2_restore_rehearsal_ci',
  )).toMatchObject({ valid: false, reason: 'SOURCE_NON_LOCAL_HOST_REJECTED' })
  expect(validateBackupRehearsalTargets(
    'postgresql://postgres@127.0.0.1:5432/postgres',
    'postgresql://postgres@127.0.0.1:5432/k2_restore_rehearsal_ci',
  )).toMatchObject({ valid: false, reason: 'SOURCE_REHEARSAL_DATABASE_NAME_REQUIRED' })
})
