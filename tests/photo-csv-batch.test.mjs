import test from 'node:test'
import assert from 'node:assert/strict'
import { preparePhotoBatch, runPhotoBatch, readPhotoBatch, writePhotoBatch } from '../src/lib/photoCsvBatch.js'

const actor = '11111111-1111-4111-8111-111111111111'
const product = { sku: 'K2-PASTA', name: 'Pasta', status: 'Draft', primary_image_url: null, lifestyle_images: ['https://k2.test/after.png'], secondary_images: ['https://k2.test/side.png'] }
const file = Object.assign(new Blob(['native photo'], { type: 'image/png' }), { name: 'pasta.png' })
const csv = 'sku,primary_file,after_file\nK2-PASTA,pasta.png,\n'
const storage = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) } }

test('mapping resolves exact existing Draft and retains untouched photo slots', async () => {
  const batch = await preparePhotoBatch(csv, [file], [product], actor)
  assert.equal(batch.rows.length, 1)
  assert.deepEqual(batch.rows[0].before.lifestyle, product.lifestyle_images)
  assert.equal(batch.rows[0].files.primary.name, 'pasta.png')
  assert.match(batch.rows[0].files.primary.sha256, /^[a-f0-9]{64}$/)
})

test('invalid identities, duplicate files/SKUs, missing files, existing slots and live targets refuse before upload', async () => {
  for (const [text, files, products] of [
    [csv.replace('K2-PASTA', 'UNKNOWN'), [file], [product]],
    [csv + 'K2-PASTA,pasta.png,\n', [file], [product]],
    [csv, [file, file], [product]],
    [csv, [], [product]],
    [csv, [file], [{ ...product, primary_image_url: 'https://k2.test/saved.png' }]],
    [csv, [file], [{ ...product, status: 'Live' }]],
    ['sku,primary_file,after_file\nK2-PASTA,,pasta.png', [file], [product]],
    ['sku,primary_file,after_file\nK2-PASTA,,', [file], [product]],
    ['sku,primary_file,after_file\nK2-PASTA,../pasta.png,', [file], [product]],
  ]) await assert.rejects(preparePhotoBatch(text, files, products, actor))
})

test('lost assignment reply survives reload and retries original payload/key without uploading twice', async () => {
  const store = storage(), calls = [], uploads = []
  const batch = await preparePhotoBatch(csv, [file], [product], actor)
  batch.reason = 'Reviewed missing primary photo'
  let current = { ...product }, lost = true
  const io = {
    actor: async () => actor,
    products: async () => [current],
    upload: async (_, key) => { uploads.push(key); return { ok: true, media: { publicUrl: 'https://k2.test/new.png', objectPath: actor + '/product-media/new.png' } } },
    assign: async (payload, key) => {
      calls.push({ payload: structuredClone(payload), key })
      current = { ...current, primary_image_url: payload.primary.url }
      if (lost) { lost = false; return { ok: false, code: 'REQUEST_TIMEOUT' } }
      return { ok: true }
    },
    persist: value => writePhotoBatch(store, value),
  }
  await assert.rejects(runPhotoBatch(batch, [file], io), /REQUEST_TIMEOUT/)
  const recovered = readPhotoBatch(store)
  assert.ok(recovered.rows[0].command)
  assert.equal(recovered.rows[0].done, false)
  await runPhotoBatch(recovered, [], io)
  assert.equal(uploads.length, 1)
  assert.deepEqual(calls[1], calls[0])
  assert.deepEqual(calls[1].payload.lifestyle, [{ url: product.lifestyle_images[0], objectPath: null }])
  assert.deepEqual(calls[1].payload.secondary, [{ url: product.secondary_images[0], objectPath: null }])
  assert.equal(readPhotoBatch(store).rows[0].done, true)
})

test('actor change, byte substitution and current-media drift stop before mutation', async () => {
  for (const kind of ['actor', 'bytes', 'drift']) {
    const batch = await preparePhotoBatch(csv, [file], [product], actor)
    batch.reason = 'Approved package photo'
    let writes = 0
    const replacement = Object.assign(new Blob(['different'], { type: 'image/png' }), { name: file.name })
    await assert.rejects(runPhotoBatch(batch, kind === 'bytes' ? [replacement] : [file], {
      actor: async () => kind === 'actor' ? 'other-actor' : actor,
      products: async () => [{ ...product, primary_image_url: kind === 'drift' ? 'https://k2.test/concurrent.png' : null }],
      upload: async () => { writes++; return { ok: false } }, assign: async () => { writes++; return { ok: false } }, persist() {},
    }))
    assert.equal(writes, 0)
  }
})

test('storage failure refuses dispatch and malformed recovery is retained', async () => {
  const batch = await preparePhotoBatch(csv, [file], [product], actor)
  batch.reason = 'Approved missing photo'
  let writes = 0
  await assert.rejects(runPhotoBatch(batch, [file], { actor: async () => actor, products: async () => [product], persist() { throw Error('Storage full') }, upload() { writes++ } }), /Storage full/)
  assert.equal(writes, 0)
  const store = storage(); store.setItem('k2-photo-csv-v1', '{broken')
  assert.throws(() => readPhotoBatch(store), /recovery/i)
  assert.equal(store.getItem('k2-photo-csv-v1'), '{broken')
})

test('multi-product batch resumes at failed row and never replays completed rows', async () => {
  const second = { ...product, sku: 'K2-COFFEE' }
  const file2 = Object.assign(new Blob(['coffee photo'], { type: 'image/png' }), { name: 'coffee.png' })
  const batch = await preparePhotoBatch(csv + 'K2-COFFEE,coffee.png,\n', [file, file2], [product, second], actor)
  batch.reason = 'Reviewed native covers for two Drafts'
  let products = [{ ...product }, { ...second }], failSecond = true
  const uploads = [], assignments = [], store = storage()
  const io = { actor: async () => actor, products: async () => products, persist: value => writePhotoBatch(store, value),
    upload: async (image, key) => {
      uploads.push({ name: image.name, key })
      if (image.name === 'coffee.png' && failSecond) { failSecond = false; return { ok: false, code: 'RATE_LIMITED' } }
      return { ok: true, media: { publicUrl: 'https://k2.test/' + image.name, objectPath: actor + '/product-media/' + image.name } }
    },
    assign: async (payload, key) => { assignments.push({ sku: payload.sku, key }); products = products.map(row => row.sku === payload.sku ? { ...row, primary_image_url: payload.primary.url } : row); return { ok: true } },
  }
  await assert.rejects(runPhotoBatch(batch, [file, file2], io), /RATE_LIMITED/)
  const restored = readPhotoBatch(store)
  assert.equal(restored.rows[0].done, true)
  await runPhotoBatch(restored, [file2], io)
  assert.deepEqual(assignments.map(row => row.sku), ['K2-PASTA', 'K2-COFFEE'])
  assert.equal(uploads[1].key, uploads[2].key)
  assert.equal(uploads.filter(row => row.name === file.name).length, 1)
})

test('account changes after upload or media drift during upload refuse assignment', async () => {
  for (const change of ['actor', 'media']) {
    const batch = await preparePhotoBatch(csv, [file], [product], actor)
    batch.reason = 'Reviewed native missing cover'
    let uploaded = false, assignments = 0
    await assert.rejects(runPhotoBatch(batch, [file], {
      actor: async () => uploaded && change === 'actor' ? 'another-actor' : actor,
      products: async () => [{ ...product, primary_image_url: uploaded && change === 'media' ? 'https://k2.test/other.png' : null }],
      persist() {},
      upload: async () => { uploaded = true; return { ok: true, media: { publicUrl: 'https://k2.test/new.png', objectPath: actor + '/product-media/new.png' } } },
      assign: async () => { assignments++; return { ok: true } },
    }))
    assert.equal(assignments, 0)
    assert.ok(batch.rows[0].uploaded.primary)
  }
})

test('recovery refuses a changed literal command and a competing batch', async () => {
  const batch = await preparePhotoBatch(csv, [file], [product], actor)
  const store = storage()
  writePhotoBatch(store, batch)
  const other = await preparePhotoBatch(csv, [file], [product], actor)
  assert.throws(() => writePhotoBatch(store, other), /Another photo batch/)
  batch.rows[0].command = { sku: 'FOREIGN' }
  assert.throws(() => writePhotoBatch(store, batch), /recovery/)
})

test('saved but unconfirmed command cannot overwrite later media or a non-Draft target', async () => {
  for (const drift of ['primary', 'status']) {
    const batch = await preparePhotoBatch(csv, [file], [product], actor)
    batch.reason = 'Approved missing native photo'
    const io = { actor: async () => actor, products: async () => [product], persist() {},
      upload: async () => ({ ok: true, media: { publicUrl: 'https://k2.test/new.png', objectPath: actor + '/product-media/new.png' } }),
      assign: async () => ({ ok: false, code: 'RATE_LIMITED' }),
    }
    await assert.rejects(runPhotoBatch(batch, [file], io), /RATE_LIMITED/)
    assert.ok(batch.rows[0].command)
    let writes = 0
    io.products = async () => [{ ...product, primary_image_url: drift === 'primary' ? 'https://k2.test/later.png' : null, status: drift === 'status' ? 'Live' : 'Draft' }]
    io.assign = async () => { writes++; return { ok: true } }
    await assert.rejects(runPhotoBatch(batch, [], io), /reconcile/i)
    assert.equal(writes, 0)
    assert.equal(batch.rows[0].done, false)
  }
})
