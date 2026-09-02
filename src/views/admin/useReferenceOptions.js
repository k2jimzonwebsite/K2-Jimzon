import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  REFERENCE_FIELDS,
  cleanReferenceName,
  findDuplicateOption,
} from './referenceTables'

/**
 * Reads and writes the lookup tables behind Sheet mode's dropdowns.
 *
 * Every table name below is a literal. An earlier version selected the table by
 * variable, from `config.table`, which works but reports as a dynamic table
 * operation in the security inventory — the scanner cannot prove the name is
 * confined to this frozen list, and a reviewer reading the report cannot
 * either. Writing the four queries out costs a few lines and keeps the
 * inventory's dynamic-operation count at zero, so a genuinely dynamic table
 * reference added later still stands out.
 *
 * Each entry lists and inserts by name. Nothing here updates or deletes: a
 * dropdown that could rename or remove a warehouse in passing would rewrite
 * what every product pointing at it means.
 */
const REFERENCE_QUERIES = Object.freeze({
  warehouse_id: Object.freeze({
    list: () => supabase.from('warehouses').select('id, name, location').order('name', { ascending: true }),
    insert: (name) => supabase.from('warehouses').insert({ name }).select('id, name, location').single(),
  }),
  supplier_id: Object.freeze({
    list: () => supabase.from('suppliers').select('id, name').order('name', { ascending: true }),
    insert: (name) => supabase.from('suppliers').insert({ name }).select('id, name').single(),
  }),
  brand_id: Object.freeze({
    list: () => supabase.from('brands').select('id, name').order('name', { ascending: true }),
    insert: (name) => supabase.from('brands').insert({ name }).select('id, name').single(),
  }),
  category_id: Object.freeze({
    list: () => supabase.from('categories').select('id, name').order('name', { ascending: true }),
    insert: (name) => supabase.from('categories').insert({ name }).select('id, name').single(),
  }),
})

/**
 * Loads the rows each foreign-key dropdown can offer, and creates new ones.
 *
 * Tables are loaded once when the sheet opens rather than per cell: a sheet of
 * 27 products renders over a hundred reference cells, and a fetch behind each
 * would be a hundred requests for four small lists.
 *
 * A table that cannot be read is recorded as an error, not as an empty list.
 * The difference matters at the cell: empty means "nothing exists yet, add
 * one", while an error means "this cannot be edited here", and offering a
 * create button in the second case produces a failure nobody can act on.
 */
export function useReferenceOptions() {
  const [state, setState] = useState(() => {
    const initial = {}
    for (const field of Object.keys(REFERENCE_FIELDS)) {
      initial[field] = { options: [], loading: true, error: '' }
    }
    return initial
  })

  const loadField = useCallback(async (field) => {
    const query = REFERENCE_QUERIES[field]
    if (!query || !supabase) {
      setState(prev => ({ ...prev, [field]: { options: [], loading: false, error: 'unavailable' } }))
      return
    }
    const { data, error } = await query.list()
    setState(prev => ({
      ...prev,
      [field]: error
        ? { options: [], loading: false, error: error.message }
        : { options: data || [], loading: false, error: '' },
    }))
  }, [])

  useEffect(() => {
    for (const field of Object.keys(REFERENCE_FIELDS)) loadField(field)
  }, [loadField])

  /**
   * Create a row in the referenced table, or reuse one that already means the
   * same thing.
   *
   * Returns `{ ok, id, reused, name, error }`. `reused: true` says an existing
   * row was matched rather than a new one made, which the caller reports so
   * nobody is left believing they added something they did not.
   */
  const createOption = useCallback(async (field, rawName) => {
    const config = REFERENCE_FIELDS[field]
    const query = REFERENCE_QUERIES[field]
    if (!config || !query) return { ok: false, error: 'Unknown reference field.' }

    const name = cleanReferenceName(rawName)
    if (!name) return { ok: false, error: `Enter a ${config.noun} name (up to 120 characters).` }

    // Re-read immediately before inserting. The in-memory list can be minutes
    // old, and another member of staff adding the same warehouse in that window
    // is exactly the case this guard exists for.
    const { data: current, error: readError } = await query.list()
    if (readError) return { ok: false, error: readError.message }

    const duplicate = findDuplicateOption(current || [], name)
    if (duplicate) {
      setState(prev => ({ ...prev, [field]: { options: current, loading: false, error: '' } }))
      return { ok: true, id: duplicate.id, reused: true, name: duplicate.name }
    }

    const { data: inserted, error: insertError } = await query.insert(name)
    if (insertError) return { ok: false, error: insertError.message }

    setState(prev => ({
      ...prev,
      [field]: {
        options: [...(current || []), inserted].sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''))),
        loading: false,
        error: '',
      },
    }))
    return { ok: true, id: inserted.id, reused: false, name: inserted.name }
  }, [])

  return { referenceState: state, createOption, reloadReference: loadField }
}
