// Store merchandising labels reuse products.subcategory. category_id remains
// the independent operational taxonomy (shelf life, family eligibility, etc.).
const clean = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
export const getStoreCategory = product => clean(product?.subcategory)
  || clean(product?.categories?.name || product?.category_name || product?.category) || 'Uncategorised'

export function storeCategoryEntries(products = []) {
  const counts = new Map()
  for (const product of products) {
    const name = getStoreCategory(product)
    if (name === 'Uncategorised' || name === 'All') continue
    counts.set(name, (counts.get(name) || 0) + 1)
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count }))
}

export function resolveStoreCategoryName(value, entries = []) {
  const name = clean(value)
  if (!name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(value)
    || ['all', 'uncategorised'].includes(name.toLowerCase())) throw Error('Enter a store category of 1–120 characters. All and Uncategorised are reserved.')
  return entries.find(entry => entry.name.toLowerCase() === name.toLowerCase())?.name || name
}

// One staff action, separate protected/versioned receipts. Never claim atomic
// success or skip an uncertain row to continue with more writes.
export async function applyStoreCategoryBatch({ products, category, read, save, isCurrent = () => true, onProgress = () => {} }) {
  const destination = resolveStoreCategoryName(category)
  const result = { saved: [], skipped: [], remaining: [...products], error: '' }
  try {
    if (new Set(products.map(p => p.sku)).size !== products.length) throw Error('Selection contains duplicate products. Refresh the inventory.')
    for (const product of products) {
      if (!isCurrent()) throw Error('Batch stopped. Unsent products still need review.')
      const latest = await read(product.sku)
      if (!isCurrent()) throw Error('Batch stopped. Unsent products still need review.')
      if (!latest.ok || latest.product?.sku !== product.sku
        || typeof latest.product.updated_at !== 'string' || !Number.isFinite(Date.parse(latest.product.updated_at))) {
        throw Error(latest.error || `Could not verify ${product.sku}. Refresh before continuing.`)
      }
      const currentCategory = clean(latest.product.subcategory)
      if (currentCategory === destination) result.skipped.push(product.sku)
      else {
        if (currentCategory !== clean(product.subcategory)) throw Error(`Store category changed for ${product.sku}. Refresh before continuing.`)
        const response = await save({ sku: product.sku, patch: { subcategory: destination },
          expectedUpdatedAt: latest.product.updated_at, reason: `Admin assigned store category: ${destination}` })
        if (!response.ok) throw Error(response.error || `Save was not confirmed for ${product.sku}. Review the pending product decision.`)
        result.saved.push(product.sku)
      }
      result.remaining.shift()
      if (isCurrent()) onProgress({ ...result, saved: [...result.saved], skipped: [...result.skipped], remaining: [...result.remaining] })
    }
  } catch (error) { result.error = error.message }
  return result
}
