import { expect, test } from '@playwright/test'
import {
  CATALOG_COLUMNS, CATALOG_TEMPLATE_VERSION, classifyCatalogRows,
  buildCatalogCommitPayload, neutralizeSpreadsheetFormula, parseCatalogCsv, serializeCatalogCsv,
} from '../server/admin-bff/catalog-spreadsheet.js'
import { ADMIN_BFF_ROUTE_CONTROLS, ADMIN_BFF_ROUTES } from '../server/admin-bff/router.js'
import { readFile } from 'node:fs/promises'
import { validateCatalogRehearsalTarget } from '../scripts/rehearse-catalog-spreadsheet.mjs'

const exportedAt = '2026-08-22T10:00:00.000Z'
const operationId = '6a88b5f9-8be6-4f4d-a504-173c96f40df1'
const product = {
  catalog_id: 'e74a4161-72ca-4d72-8f59-37aa690e1869', sku: '0000123',
  catalog_record_version: 7, updated_at: exportedAt, name: 'Pasta, "Bronze"',
  description: '=not a formula', usage_instructions: 'Boil\nthen serve',
  storage_instructions: 'Dry', ingredients: 'Wheat', allergens: 'Gluten',
  country_of_origin: 'Italy', net_weight: '500', package_type: 'Bag',
  subcategory: 'Pasta', seo_keywords: ['pasta', 'italy'], primary_image_url: '',
  product_video_url: '', internal_notes: 'Buyer note',
}

test('catalog export is fixed-schema, Excel-compatible, and formula-safe', () => {
  const csv = serializeCatalogCsv([product], { operationId, exportedAt })
  expect(csv.startsWith('\uFEFF')).toBe(true)
  expect(neutralizeSpreadsheetFormula('=2+2')).toBe("'=2+2")
  const rows = parseCatalogCsv(csv)
  expect(Object.keys(rows[0])).toEqual(CATALOG_COLUMNS)
  expect(rows[0].template_version).toBe(CATALOG_TEMPLATE_VERSION)
  expect(rows[0].sku).toBe('0000123')
  expect(rows[0].description).toBe("'=not a formula")
  expect(rows[0].usage_instructions).toBe('Boil\nthen serve')
})

test('catalog preview classifies changes, stale rows, duplicates, and protected identity conflicts', () => {
  const base = parseCatalogCsv(serializeCatalogCsv([product], { operationId, exportedAt }))[0]
  const canonical = { ...product, description: "'=not a formula" }
  expect(classifyCatalogRows([{ ...base, name: 'Updated name' }], [canonical])[0]).toMatchObject({
    category: 'Changed', sku: '0000123', consequence: 'Updates approved catalog metadata only.',
  })
  expect(classifyCatalogRows([{ ...base, record_version: '6' }], [canonical])[0].category).toBe('Stale/Conflict')
  expect(classifyCatalogRows([base, base], [canonical])[1].category).toBe('Duplicate')
  expect(classifyCatalogRows([{ ...base, sku: 'REMAPPED' }], [canonical])[0].category).toBe('Protected/Ignored')
})

test('new catalog rows can only stage metadata drafts and formula-like input is invalid', () => {
  const blank = Object.fromEntries(CATALOG_COLUMNS.map((column) => [column, '']))
  const draft = { ...blank, template_version: CATALOG_TEMPLATE_VERSION, name: 'New item' }
  expect(classifyCatalogRows([draft], [])[0]).toMatchObject({
    category: 'New', consequence: 'Creates an unpublished Draft product; stock remains unchanged.',
  })
  expect(classifyCatalogRows([{ ...draft, name: '=IMPORTXML("x")' }], [])[0]).toMatchObject({
    category: 'Invalid', errors: ['FORMULA_LIKE_VALUE_BLOCKED'], formulaColumns: ['name'],
  })
})

test('catalog endpoints have explicit route controls and prepared version support', async () => {
  expect(ADMIN_BFF_ROUTES).toContain('catalog-export')
  expect(ADMIN_BFF_ROUTES).toContain('catalog-import/commit')
  expect(ADMIN_BFF_ROUTES).toContain('catalog-import/status')
  expect(ADMIN_BFF_ROUTE_CONTROLS['catalog-export']).toMatchObject({ method: 'GET', origin: true, csrf: false })
  expect(ADMIN_BFF_ROUTE_CONTROLS['catalog-import/preview']).toMatchObject({
    method: 'POST', origin: true, csrf: true, idempotency: true,
  })
  const migration = await readFile(new URL('../supabase/migrations/20260822_catalog_spreadsheet_identity.sql', import.meta.url), 'utf8')
  expect(migration).toContain('catalog_id uuid')
  expect(migration).toContain('catalog_record_version bigint')
  expect(migration).toContain('add column if not exists net_weight numeric')
  expect(migration).toContain('new.catalog_id=old.catalog_id')
})

test('catalog commit payload rechecks the file and allows only explicit New or Changed rows', async () => {
  const csvText = serializeCatalogCsv([product], { operationId, exportedAt })
  const fileSha256 = (await import('node:crypto')).createHash('sha256').update(csvText).digest('hex')
  const chain = {
    select() { return chain }, order() { return chain },
    limit() { return Promise.resolve({ data: [product], error: null }) },
  }
  const client = { from() { return chain } }
  const parsed = parseCatalogCsv(csvText)
  parsed[0].name = 'Reviewed updated name'
  const changedCsv = `\uFEFF${(await import('papaparse')).default.unparse(parsed, { columns: CATALOG_COLUMNS })}`
  const changedHash = (await import('node:crypto')).createHash('sha256').update(changedCsv).digest('hex')
  const payload = await buildCatalogCommitPayload(client, {
    csvText: changedCsv, fileSha256: changedHash, selectedRowNumbers: [2],
    reason: 'Approved catalog copy correction after package review.',
    operationId, chunkIndex: 0, finalChunk: true,
  })
  expect(payload.rows).toHaveLength(1)
  expect(payload.rows[0]).toMatchObject({ rowNumber: 2, kind: 'update', sku: '0000123', expectedVersion: 7 })
  expect(payload.fileSha256).toBe(changedHash)
  await expect(buildCatalogCommitPayload(client, {
    csvText, fileSha256, selectedRowNumbers: [2], reason: 'Approved catalog copy correction.',
    operationId, chunkIndex: 0, finalChunk: true,
  })).rejects.toThrow('CATALOG_SELECTION_INVALID')
})

test('prepared catalog commit is signed, atomic, receipt-backed, and revokes direct product writes', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260822_catalog_spreadsheet_commit.sql', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_catalog_import_v1')
  expect(migration).toContain('catalog_import_operations')
  expect(migration).toContain('catalog_import_row_events')
  expect(migration).toContain('for update')
  expect(migration).toContain('K2_CATALOG_STALE_CONFLICT')
  expect(migration).toContain('generate_k2_sku_internal')
  expect(migration).toContain("trim(v_values->>'net_weight'),'')::numeric")
  expect(migration).toContain('revoke insert,update,delete on table public.products from authenticated')
  expect(migration).toContain("set search_path=''" )
  expect(migration).toContain('read_admin_catalog_import_status_v1')
  const modal = await readFile(new URL('../src/views/admin/BulkCsvImportModal.jsx', import.meta.url), 'utf8')
  expect(modal).toContain('commitCatalogCsvBff')
  expect(modal).toContain('selectedRowNumbers')
  expect(modal).toContain('I reviewed the selected before/after values')
  expect(modal).toContain('Download redacted result CSV')
  expect(modal).toContain('Check durable server status')
  expect(modal).toContain('min-h-11')
  expect(modal).not.toContain('window.confirm')
  const rollback = await readFile(new URL('../supabase/catalog_spreadsheet_rollback.sql', import.meta.url), 'utf8')
  expect(rollback).toContain('revoke execute on function public.execute_admin_catalog_import_v1')
  expect(rollback).toContain('grant insert,update on table public.products to authenticated')
  expect(rollback).not.toContain('drop table')
})

test('catalog signed boundary allowlists the larger bounded import command', async () => {
  for (const path of [
    '../supabase/migrations/20260812_admin_fulfillment_bff_boundary.sql',
    '../supabase/migrations/20260822_admin_session_registry.sql',
  ]) {
    const migration = await readFile(new URL(path, import.meta.url), 'utf8')
    expect(migration).toContain("'catalog_import_chunk'")
    expect(migration).toContain("case when p_action='catalog_import_chunk' then 1048576 else 16384 end")
  }
})

test('catalog commit rejects non-numeric net weight before signing', async () => {
  const row = { ...product, net_weight: '500 grams' }
  const csvText = serializeCatalogCsv([row], { operationId, exportedAt })
  const fileSha256 = (await import('node:crypto')).createHash('sha256').update(csvText).digest('hex')
  const chain = {
    select() { return chain }, order() { return chain },
    limit() { return Promise.resolve({ data: [{ ...product, net_weight: '450' }], error: null }) },
  }
  await expect(buildCatalogCommitPayload({ from() { return chain } }, {
    csvText, fileSha256, selectedRowNumbers: [2], reason: 'Reviewed package weight against supplier evidence.',
    operationId, chunkIndex: 0, finalChunk: true,
  })).rejects.toThrow('REQUEST_INVALID')
})

test('catalog PostgreSQL rehearsal runner refuses remote and ordinary databases', () => {
  expect(validateCatalogRehearsalTarget(
    'postgresql://postgres@127.0.0.1:5432/k2_catalog_rehearsal_ci',
  )).toMatchObject({ isLocal: true, database: 'k2_catalog_rehearsal_ci' })
  expect(validateCatalogRehearsalTarget(
    'postgresql://postgres@db.pixplcjqivlfflickobf.supabase.co:5432/k2_catalog_rehearsal_ci',
  )).toMatchObject({ isLocal: false, reason: 'NON_LOCAL_HOST_REJECTED' })
  expect(validateCatalogRehearsalTarget(
    'postgresql://postgres@127.0.0.1:5432/postgres',
  )).toMatchObject({ isLocal: false, reason: 'REHEARSAL_DATABASE_NAME_REQUIRED' })
})
