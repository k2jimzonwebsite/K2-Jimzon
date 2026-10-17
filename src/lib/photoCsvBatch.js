import Papa from 'papaparse'

export const PHOTO_BATCH_KEY = 'k2-photo-csv-v1'
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const SHA = /^[a-f0-9]{64}$/
const filename = value => typeof value === 'string' && value.length > 0 && value.length <= 180 && !/[\\/\u0000-\u001f]/.test(value) && !/^[=+@-]/.test(value)
const url = value => typeof value === 'string' && value.length <= 2048 && /^https:\/\/[^\s]+$/.test(value)
const fail = message => { throw new Error(message) }
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const snapshot = product => ({ primary: product.primary_image_url || null, lifestyle: product.lifestyle_images || [], secondary: product.secondary_images || [] })
const legacy = value => value ? { url: value, objectPath: null } : null
const hash = async file => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('')

function fileIndex(files) {
  const index = new Map()
  if (files.length > 400 || files.reduce((sum, file) => sum + file.size, 0) > 256 * 1024 * 1024) fail('Choose at most 400 photos and 256 MB per batch.')
  for (const file of files) {
    if (!filename(file.name) || index.has(file.name)) fail('Photo filenames must be unique and contain no folders: ' + file.name)
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 4 * 1024 * 1024) fail('Use PNG, JPEG or WebP files up to 4 MB: ' + file.name)
    index.set(file.name, file)
  }
  return index
}

export async function preparePhotoBatch(csvText, files, products, actorId) {
  if (!UUID.test(actorId)) fail('Verify the current staff session before reviewing photos.')
  if (typeof csvText !== 'string' || new TextEncoder().encode(csvText).length > 65536) fail('Photo CSV must be no larger than 64 KB.')
  const parsed = Papa.parse(csvText.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy' })
  if (parsed.errors.length || !equal(parsed.meta.fields, ['sku', 'primary_file', 'after_file']) || !parsed.data.length || parsed.data.length > 200) fail('Use sku,primary_file,after_file headers and 1–200 rows.')
  const index = fileIndex(files), seen = new Set(), used = new Set(), rows = []
  for (const input of parsed.data) {
    const sku = input.sku?.trim()
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(sku) || seen.has(sku)) fail('Each existing SKU must appear exactly once: ' + sku)
    seen.add(sku)
    const matches = products.filter(product => product.sku === sku)
    if (matches.length !== 1 || matches[0].status !== 'Draft') fail('Only exact existing Draft SKUs can receive this batch: ' + sku)
    const product = matches[0], before = snapshot(product)
    if (!input.primary_file && !input.after_file) fail('Choose a primary or AFTER file for ' + sku)
    const selected = {}
    for (const [slot, column] of [['primary', 'primary_file'], ['after', 'after_file']]) {
      const name = input[column]
      if (!name) continue
      if (!filename(name) || !index.has(name)) fail('Missing photo file for ' + sku + ': ' + name)
      if (slot === 'primary' ? before.primary : before.lifestyle.length) fail('This slot already has a photo. Keep it out of the fill-missing batch: ' + sku + ' ' + slot)
      if (used.has(name)) fail('Use a separate reviewed file for each SKU and slot: ' + name)
      used.add(name)
      const file = index.get(name)
      selected[slot] = { name, size: file.size, type: file.type, sha256: await hash(file), key: crypto.randomUUID() }
    }
    rows.push({ sku, name: product.name, before, files: selected, uploaded: {}, command: null, key: crypto.randomUUID(), done: false })
  }
  return { version: 1, id: crypto.randomUUID(), actorId, reason: '', rows }
}

function validateBatch(batch) {
  const invalid = () => fail('Saved photo recovery cannot be read safely. Keep the recovery data and contact the administrator.')
  if (batch?.version !== 1 || !UUID.test(batch.id) || !UUID.test(batch.actorId) || typeof batch.reason !== 'string' || batch.reason.length > 500 || !Array.isArray(batch.rows) || !batch.rows.length || batch.rows.length > 200) invalid()
  const skus = new Set()
  const validSnapshot = value => value && (value.primary === null || url(value.primary)) && Array.isArray(value.lifestyle) && value.lifestyle.length <= 1 && value.lifestyle.every(url) && Array.isArray(value.secondary) && value.secondary.length <= 5 && value.secondary.every(url)
  const validMedia = value => value && url(value.url) && typeof value.objectPath === 'string' && value.objectPath.startsWith(batch.actorId + '/product-media/') && value.objectPath.length <= 256
  for (const row of batch.rows) {
    if (!row || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(row.sku) || skus.has(row.sku) || !UUID.test(row.key) || typeof row.name !== 'string' || !validSnapshot(row.before) || typeof row.done !== 'boolean' || !row.files || !Object.keys(row.files).length || Object.keys(row.files).some(slot => !['primary', 'after'].includes(slot)) || !row.uploaded || Object.keys(row.uploaded).some(slot => !row.files[slot])) invalid()
    skus.add(row.sku)
    for (const [slot, file] of Object.entries(row.files)) {
      if (!filename(file.name) || !SHA.test(file.sha256) || !UUID.test(file.key) || !Number.isInteger(file.size) || file.size < 1 || file.size > 4 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || (slot === 'primary' ? row.before.primary : row.before.lifestyle.length)) invalid()
      if (row.uploaded[slot] && !validMedia(row.uploaded[slot])) invalid()
    }
    if (row.command !== null && !equal(row.command, assignment(row, batch.reason))) invalid()
    if (row.done && !row.command) invalid()
  }
  return batch
}

export function readPhotoBatch(storage) {
  const raw = storage.getItem(PHOTO_BATCH_KEY)
  if (raw === null) return null
  try {
    if (raw.length > 1024 * 1024) throw Error()
    return validateBatch(JSON.parse(raw))
  } catch { fail('Saved photo recovery cannot be read safely. Keep the recovery data and contact the administrator.') }
}

export function writePhotoBatch(storage, batch) {
  validateBatch(batch)
  const text = JSON.stringify(batch)
  if (text.length > 1024 * 1024) fail('Photo batch recovery is too large.')
  const existing = readPhotoBatch(storage)
  if (existing && (existing.id !== batch.id || existing.actorId !== batch.actorId)) fail('Another photo batch needs reconciliation first.')
  storage.setItem(PHOTO_BATCH_KEY, text)
  if (storage.getItem(PHOTO_BATCH_KEY) !== text) fail('Photo recovery storage could not be confirmed. No next command was sent.')
}

function assignment(row, reason) {
  return { sku: row.sku, primary: row.uploaded.primary || legacy(row.before.primary), lifestyle: row.uploaded.after ? [row.uploaded.after] : row.before.lifestyle.map(legacy), secondary: row.before.secondary.map(legacy), reason }
}

export async function runPhotoBatch(batch, files, io) {
  validateBatch(batch)
  if (batch.reason.trim().length < 10) fail('Add a reason of 10–500 characters.')
  const index = fileIndex(files)
  const actor = async () => { if (await io.actor() !== batch.actorId) fail('The staff account changed. Return to the original account before retrying this saved batch.') }
  await actor()
  // Files are checked before any write. Confirmed uploads need no reselected file.
  for (const row of batch.rows.filter(row => !row.done)) {
    for (const [slot, expected] of Object.entries(row.files)) {
      if (row.uploaded[slot]) continue
      const file = index.get(expected.name)
      if (!file || file.size !== expected.size || file.type !== expected.type || await hash(file) !== expected.sha256) fail('Reselect the original unchanged photo: ' + expected.name)
    }
  }
  io.persist(batch)
  for (const row of batch.rows) {
    if (row.done) continue
    await actor()
    if (!row.command) {
      const current = (await io.products()).find(product => product.sku === row.sku)
      if (!current || current.status !== 'Draft' || !equal(snapshot(current), row.before)) fail('Current photos or status changed. Keep this batch and reconcile ' + row.sku + ' before continuing.')
      for (const [slot, expected] of Object.entries(row.files)) {
        if (row.uploaded[slot]) continue
        await actor()
        io.persist(batch)
        const result = await io.upload(index.get(expected.name), expected.key, batch.actorId)
        if (!result.ok) fail('Upload stopped for ' + row.sku + ': ' + (result.code || 'unconfirmed response') + '. Retry retains the same file and key.')
        const media = result.media
        if (!url(media?.publicUrl) || !media?.objectPath?.startsWith(batch.actorId + '/product-media/')) fail('Upload receipt could not be verified. Keep this batch and retry the same file.')
        row.uploaded[slot] = { url: media.publicUrl, objectPath: media.objectPath }
        io.persist(batch)
      }
      // Recheck after potentially slow uploads, before creating the literal command.
      const latest = (await io.products()).find(product => product.sku === row.sku)
      if (!latest || latest.status !== 'Draft' || !equal(snapshot(latest), row.before)) fail('Photos changed during upload. Reconcile ' + row.sku + ' before assignment.')
      row.command = assignment(row, batch.reason)
      io.persist(batch)
    }
    await actor()
    const expected = { primary: row.command.primary?.url || null, lifestyle: row.command.lifestyle.map(item => item.url), secondary: row.command.secondary.map(item => item.url) }
    const beforeRetry = (await io.products()).find(product => product.sku === row.sku)
    if (!beforeRetry || beforeRetry.status !== 'Draft' || (!equal(snapshot(beforeRetry), row.before) && !equal(snapshot(beforeRetry), expected))) fail('Current photos or status differ from this saved command. Keep it and reconcile ' + row.sku + ' before retrying.')
    const result = await io.assign(row.command, row.key, batch.actorId)
    if (!result.ok || result.cleanupPending) fail('Assignment stopped for ' + row.sku + ': ' + (result.code || (result.cleanupPending ? 'cleanup pending' : 'unconfirmed response')) + '. Retry the same saved command.')
    await actor()
    const current = (await io.products()).find(product => product.sku === row.sku)
    if (!current || current.status !== 'Draft' || !equal(snapshot(current), expected)) fail('The receipt is confirmed but current photos differ. Reconcile ' + row.sku + '; the saved command is retained.')
    row.done = true
    io.persist(batch)
  }
  return batch
}
