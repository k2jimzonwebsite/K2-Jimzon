import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import {
  REFERENCE_FIELDS,
  isReferenceField,
  normalizeReferenceName,
  findDuplicateOption,
  cleanReferenceName,
  referenceOptionLabel,
} from '../src/views/admin/referenceTables.js'

/**
 * `Warehouse` and `Supplier` map to `warehouse_id` and `supplier_id`. Sheet mode
 * rendered them as free-text inputs and sent the typed string to `products`, so
 * every edit failed with SHEET_SAVE_FAILED and the field was unfillable. These
 * pin the fix and the duplicate guard that makes inline creation safe.
 */

test.describe('sheet reference fields', () => {
  test('every id column the sheet exposes is declared a reference', () => {
    const sheet = readFileSync('src/views/admin/Sheet.jsx', 'utf8')
    const fieldMap = /const FIELD_MAP = \{([\s\S]*?)\n\}/.exec(sheet)?.[1] ?? ''
    expect(fieldMap).toBeTruthy()

    // Any future `*_id` column added to the sheet must be registered here, or it
    // silently gets a text box and reintroduces the same unfillable-cell bug.
    const idColumns = [...fieldMap.matchAll(/'([a-z_]+_id)'/gu)].map(match => match[1])
    expect(idColumns.length).toBeGreaterThan(0)
    for (const column of idColumns) {
      expect(isReferenceField(column), `${column} is a foreign key in FIELD_MAP but is not in REFERENCE_FIELDS, so it renders as free text`).toBe(true)
    }
  })

  test('reference cells render a dropdown, never a text input', () => {
    const sheet = readFileSync('src/views/admin/Sheet.jsx', 'utf8')
    // The reference branch must come before the generic text-input fallback,
    // otherwise the fallback wins and the bug returns.
    const referenceAt = sheet.indexOf('isReferenceField(field)')
    const textFallbackAt = sheet.indexOf('type={typeof val === \'number\' ? \'number\' : \'text\'}')
    expect(referenceAt).toBeGreaterThan(-1)
    expect(textFallbackAt).toBeGreaterThan(-1)
    expect(referenceAt).toBeLessThan(textFallbackAt)

    const cell = readFileSync('src/views/admin/ReferenceSelectCell.jsx', 'utf8')
    expect(cell).toContain('<select')
  })

  test('names that differ only by case or spacing are treated as one', () => {
    const options = [{ id: 'w1', name: 'Manila Hub' }]
    for (const typo of ['manila hub', 'MANILA HUB', '  Manila   Hub  ', 'Manila  hub']) {
      expect(findDuplicateOption(options, typo)?.id, `"${typo}" must match the existing warehouse`).toBe('w1')
    }
  })

  test('a genuinely different name is not collapsed into an existing one', () => {
    // Guessing that two differently worded names mean one place would merge
    // real, separate locations. Only near-identical spellings collide.
    const options = [{ id: 'w1', name: 'Manila Hub' }]
    for (const distinct of ['Manila Hub 2', 'Cebu Hub', 'Manila']) {
      expect(findDuplicateOption(options, distinct)).toBeNull()
    }
  })

  test('unusable names are refused before they reach the database', () => {
    expect(cleanReferenceName('  Manila   Hub ')).toBe('Manila Hub')
    expect(cleanReferenceName('')).toBeNull()
    expect(cleanReferenceName('   ')).toBeNull()
    expect(cleanReferenceName('x'.repeat(121))).toBeNull()
    // Control characters read as an invisible difference between two otherwise
    // identical names — the duplicate problem wearing a disguise.
    expect(cleanReferenceName('Manila\u0000Hub')).toBeNull()
    expect(cleanReferenceName('Manila\u007fHub')).toBeNull()
  })

  test('an empty list and an unreadable one are shown differently', () => {
    const cell = readFileSync('src/views/admin/ReferenceSelectCell.jsx', 'utf8')
    // "nothing exists yet, add one" and "this cannot be edited here" are
    // different situations; offering a create button for the second produces a
    // failure the person cannot act on.
    expect(cell).toContain('if (error)')
    expect(cell).toContain('Unavailable')
  })

  test('creation re-reads before inserting', () => {
    const hook = readFileSync('src/views/admin/useReferenceOptions.js', 'utf8')
    const createAt = hook.indexOf('const createOption')
    const readAt = hook.indexOf('await query.list()', createAt)
    const insertAt = hook.indexOf('await query.insert(name)', createAt)
    expect(readAt).toBeGreaterThan(createAt)
    // A stale in-memory list is exactly how two staff create the same warehouse
    // seconds apart, so the duplicate check must run against a fresh read.
    expect(readAt).toBeLessThan(insertAt)
  })

  test('lookup tables are named as literals, not built at runtime', () => {
    // A variable table name reports as a dynamic operation in the security
    // inventory, where it is indistinguishable from a genuinely dynamic one.
    // Keeping these literal keeps that count at zero and preserves the signal.
    const hook = readFileSync('src/views/admin/useReferenceOptions.js', 'utf8')
    expect(hook).not.toMatch(/\.from\(\s*(?!['"])/u)
    for (const config of Object.values(REFERENCE_FIELDS)) {
      expect(hook).toContain(`.from('${config.table}')`)
    }
  })

  test('a dropdown cannot rename or delete what products point at', () => {
    // Renaming a warehouse from a cell would silently change the meaning of
    // every product already assigned to it.
    const hook = readFileSync('src/views/admin/useReferenceOptions.js', 'utf8')
    expect(hook).not.toContain('.update(')
    expect(hook).not.toContain('.delete(')
  })

  test('reusing an existing row is reported, not silent', () => {
    const cell = readFileSync('src/views/admin/ReferenceSelectCell.jsx', 'utf8')
    expect(cell).toContain('result.reused')
  })

  test('the CSV importer applies one warehouse to the whole file', () => {
    const modal = readFileSync('src/views/admin/BulkCsvImportModal.jsx', 'utf8')
    expect(modal).toContain('warehouse_id: warehouseId || null')
    expect(modal).toContain('field="warehouse_id"')
  })

  test('every declared reference names a table and a label column', () => {
    for (const [field, config] of Object.entries(REFERENCE_FIELDS)) {
      expect(config.table, `${field} needs a table`).toBeTruthy()
      expect(config.noun, `${field} needs a noun for UI copy`).toBeTruthy()
      expect(config.columns).toContain('id')
      expect(config.columns).toContain('name')
    }
  })

  test('an option with a secondary column stays distinguishable', () => {
    // Two sites can share a name; the location is what tells them apart.
    expect(referenceOptionLabel({ name: 'Main', location: 'Manila' }, 'location')).toBe('Main — Manila')
    expect(referenceOptionLabel({ name: 'Main' }, 'location')).toBe('Main')
    expect(referenceOptionLabel({ name: '  ' }, null)).toBe('(unnamed)')
    expect(normalizeReferenceName(' A  b ')).toBe('a b')
  })
})
