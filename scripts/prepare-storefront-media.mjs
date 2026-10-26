// Reproducible delivery copies of the already-reviewed public projection.
// Originals, catalog facts and storage are never changed.
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import sharp from 'sharp'

const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const catalog = JSON.parse(await fs.readFile('scripts/map024-evidence/published-catalog.json', 'utf8'))
const sources = [...new Set(catalog.flatMap(product => [product.primary_image_url, product.image_url, ...(product.lifestyle_images || []).slice(0, 1)]).filter(Boolean))]
const allowed = 'https://pixplcjqivlfflickobf.supabase.co/storage/v1/object/public/product-images/'
if (sources.some(url => !url.startsWith(allowed))) throw new Error('Unreviewed media origin; review the source projection first.')
await fs.mkdir('public/seo-media', { recursive: true })
await fs.mkdir('.tools/seo-improvements-20261026', { recursive: true })
const manifest = {}
const receipts = []
let next = 0
await Promise.all(Array.from({ length: 3 }, async () => {
  while (next < sources.length) {
    const url = sources[next++]
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error(`Reviewed media fetch failed: ${response.status} ${url}`)
    const original = Buffer.from(await response.arrayBuffer())
    const sourceHash = hash(original)
    if (!url.includes(sourceHash.slice(0, 16))) throw new Error('Reviewed upload digest does not match the original bytes.')
    const copies = {}
    for (const [size, width] of [['small', 256], ['large', 768]]) {
      const bytes = await sharp(original).rotate().resize({ width, height: width, fit: 'inside', withoutEnlargement: true }).webp({ lossless: true, effort: 4 }).toBuffer()
      const path = `/seo-media/${sourceHash.slice(0, 20)}-${width}.webp`
      await fs.writeFile(`public${path}`, bytes)
      await fs.writeFile(`public${path}.json`, JSON.stringify({
        prompt: `Source: reviewed K2 product image ${url}; SHA-256 ${sourceHash}. Source-pixel resize within ${width}px, no enlargement; lossless WebP. No AI generation or retouching. Original detail image retained.`,
        createdAt: new Date().toISOString(),
      }, null, 2) + '\n')
      copies[size] = { path, bytes: bytes.length, sha256: hash(bytes) }
    }
    manifest[url] = sourceHash.slice(0, 20)
    receipts.push({ url, originalBytes: original.length, sourceSha256: sourceHash, copies })
    if (receipts.length % 25 === 0) console.log(`Prepared ${receipts.length}/${sources.length} reviewed media sources`)
  }
}))
const wood = await fs.readFile('public/wood-bg.jpg')
const woodCopy = await sharp(wood).webp({ quality: 88, effort: 5 }).toBuffer()
await fs.writeFile('public/wood-bg.webp', woodCopy)
await fs.writeFile('public/wood-bg.webp.json', JSON.stringify({
  prompt: `Source: existing public/wood-bg.jpg; SHA-256 ${hash(wood)}. Source-pixel WebP transcode at quality 88 for the same storefront wood canvas; no AI generation or retouching.`,
  createdAt: new Date().toISOString(),
}, null, 2) + '\n')
const hashes = [...new Set(Object.values(manifest))].sort()
if (new Set(hashes.map(value => value.slice(0, 16))).size !== hashes.length) throw new Error('Ambiguous public media digest.')
await fs.writeFile('src/data/storefrontMedia.json', JSON.stringify(hashes, null, 2) + '\n')
await fs.writeFile('.tools/seo-improvements-20261026/media-receipt.json', JSON.stringify({ at: new Date().toISOString(), method: 'Source-pixel resizing and lossless WebP; no generated or retouched product image; original detail URLs preserved', sources: receipts.sort((a, b) => a.url.localeCompare(b.url)), wood: { originalBytes: wood.length, deliveredBytes: woodCopy.length, sourceSha256: hash(wood), sha256: hash(woodCopy) } }, null, 2))
console.log(`Prepared ${receipts.length} public image pairs; originals unchanged. Wood ${wood.length} -> ${woodCopy.length} bytes.`)
