/**
 * Foreign-key columns in Sheet mode, and how to fill them safely.
 *
 * `Warehouse` and `Supplier` are not text. They map to `warehouse_id` and
 * `supplier_id`, which hold the id of a row in another table. Sheet mode used to
 * render them as free-text inputs and send whatever was typed straight to
 * `products`, so every edit failed on a type or foreign-key error and reverted
 * with SHEET_SAVE_FAILED. The field was unfillable by any means.
 *
 * A dropdown is the only correct control for a foreign key: it can offer only
 * ids that exist, so an invalid one cannot be produced.
 *
 * These names are the join between a column on `products` and the table it
 * points at. Adding a reference column here is all that is needed to give it a
 * dropdown.
 */
export const REFERENCE_FIELDS = Object.freeze({
  warehouse_id: Object.freeze({
    table: 'warehouses',
    // Singular, lower case: composed into UI strings like "Add a warehouse".
    noun: 'warehouse',
    // `warehouses` is (id, name, location, created_at). `location` is optional
    // and is shown after the name so two sites sharing a name stay tellable
    // apart in a list.
    columns: 'id, name, location',
    secondaryColumn: 'location',
  }),
  supplier_id: Object.freeze({
    table: 'suppliers',
    noun: 'supplier',
    columns: 'id, name',
    secondaryColumn: null,
  }),
  brand_id: Object.freeze({
    table: 'brands',
    noun: 'brand',
    columns: 'id, name',
    secondaryColumn: null,
  }),
  category_id: Object.freeze({
    table: 'categories',
    noun: 'category',
    columns: 'id, name',
    secondaryColumn: null,
  }),
})

/** Whether a `products` column is a reference to another table. */
export function isReferenceField(field) {
  return Object.hasOwn(REFERENCE_FIELDS, field)
}

/**
 * Compare names the way a person would, so near-identical entries collide.
 *
 * The owner asked to be able to create a warehouse straight from the dropdown,
 * accepting that it is faster. The hazard that comes with it is that "Manila",
 * "manila " and "Manila  Hub" become three real locations, and stock then
 * splits between them silently — the split is invisible until a count is short.
 * Collapsing case and internal whitespace makes the first two collide so the
 * existing row is reused; the third is a genuinely different name and is left
 * alone, because guessing that two differently worded names mean one place is
 * how a tool destroys real data.
 */
export function normalizeReferenceName(value) {
  return String(value ?? '').trim().replace(/\s+/gu, ' ').toLocaleLowerCase()
}

/**
 * The existing option a proposed name would duplicate, if any.
 * @returns {{id: string, name: string}|null}
 */
export function findDuplicateOption(options, proposedName) {
  const target = normalizeReferenceName(proposedName)
  if (!target) return null
  return options.find(option => normalizeReferenceName(option.name) === target) || null
}

/** A name that is safe to insert, or null when it is unusable. */
export function cleanReferenceName(value) {
  const text = String(value ?? '').trim().replace(/\s+/gu, ' ')
  if (!text || text.length > 120) return null
  // Control characters would render as invisible differences between two
  // otherwise identical names, which is the duplicate problem in another form.
  if ([...text].some(ch => ch.codePointAt(0) < 0x20 || ch.codePointAt(0) === 0x7f)) return null
  return text
}

/** How one option reads in a dropdown. */
export function referenceOptionLabel(option, secondaryColumn) {
  const name = String(option?.name ?? '').trim() || '(unnamed)'
  const secondary = secondaryColumn ? String(option?.[secondaryColumn] ?? '').trim() : ''
  return secondary ? `${name} — ${secondary}` : name
}
