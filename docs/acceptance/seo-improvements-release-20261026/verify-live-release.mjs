import fs from 'node:fs'
import assert from 'node:assert/strict'
const origin = 'https://www.k2jimzon.com'
const catalog = JSON.parse(fs.readFileSync('scripts/map024-evidence/published-catalog.json', 'utf8'))
const ready = catalog.filter(r => r.search_indexable === true).map(r => `${origin}/product/${encodeURIComponent(r.sku)}`).sort()
const held = catalog.filter(r => r.search_indexable === false).map(r => `${origin}/product/${encodeURIComponent(r.sku)}`).sort()
const rows = []
async function read(url) {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) })
  const body = await response.text()
  const row = { url, status: response.status, contentType: response.headers.get('content-type'), robots: response.headers.get('x-robots-tag'), cache: response.headers.get('cache-control'), title: body.match(/<title>([^<]*)<\/title>/i)?.[1] || null, canonical: body.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i)?.[1] || null, metaRobots: body.match(/<meta[^>]*name="robots"[^>]*content="([^"]*)"/i)?.[1] || null }
  rows.push(row)
  return { row, body }
}
try {
  const xml = await read(`${origin}/sitemap.xml`)
  assert.equal(xml.row.status, 200)
  const urls = [...xml.body.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1])
  assert.equal(urls.length, 111)
  assert.deepEqual(urls.filter(u => u.includes('/product/')).sort(), ready)
  assert(held.every(url => !urls.includes(url)))
  assert(urls.every(url => url.startsWith(origin + '/') && !/admin|checkout|account|messages|confirmation/.test(url)))
  const robots = await read(`${origin}/robots.txt`)
  assert.match(robots.body, /Allow:\s*\//)
  assert.match(robots.body, /Sitemap: https:\/\/www\.k2jimzon\.com\/sitemap\.xml/)
  for (const url of [`${origin}/pasabuy`, ...['K2-SKU-001001', 'K2-SKU-001017', 'K2-SKU-001173'].map(sku => `${origin}/product/${sku}`)]) {
    const { row } = await read(url)
    assert.equal(row.status, 200)
    assert.equal(row.canonical, url)
    assert(!/noindex/i.test(row.robots || ''))
    assert(!/noindex/i.test(row.metaRobots || ''))
  }
  const hold = await read(held[0])
  assert.equal(hold.row.status, 200)
  assert.match(hold.row.metaRobots, /noindex/)
  const account = await read(`${origin}/account`)
  assert.match(account.row.robots, /noindex/)
  const wrongHost = await read(`${origin}/admin-portal-k2-secure`)
  assert.equal(wrongHost.row.status, 404)
  const admin = await read('https://admin.k2jimzon.com/')
  assert.equal(admin.row.status, 200)
  assert.match(admin.row.robots, /noindex/)
  const session = await read('https://admin.k2jimzon.com/api/admin/session')
  assert.equal(session.row.status, 401)
  for (const route of ['contact', 'privacy', 'terms', 'returns']) {
    const {row,body}=await read(origin+'/'+route);
    assert.equal(row.status,200);assert.equal(row.canonical,origin+'/'+route);
    assert(!row.title.startsWith('K2 Jimzon — Italian imports'));
    assert.match(body,/data-k2-organization-jsonld/);
  }
  const product=await read(origin+'/product/K2-SKU-001001');
  const data=JSON.parse(product.body.match(/<script type="application\/ld\+json" data-k2-product-jsonld>(.*?)<\/script>/s)[1]);
  assert.equal(data.brand.name,'Combino');assert.equal(data.weight.value,1000);assert.equal(data.gtin13,undefined);
  for(const path of ['/wood-bg.webp','/seo-media/10eff3b03c25f453e29d-256.webp','/fonts/fraunces-normal-7234ed860a9c.woff2','/fonts/brand.css']){
    const response=await fetch(origin+path,{signal:AbortSignal.timeout(20000)});const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(response.status,200);assert(bytes.length>0);
    if(path.includes('/seo-media/')||path.endsWith('.woff2'))assert.match(response.headers.get('cache-control'),/immutable/);
    rows.push({url:origin+path,status:response.status,bytes:bytes.length,contentType:response.headers.get('content-type'),cache:response.headers.get('cache-control')});
  }
  fs.writeFileSync('.tools/seo-improvements-release-20261026/live-release-hosts.json', JSON.stringify({ at: new Date().toISOString(), pass: true, sitemapUrls: urls.length, readyProducts: ready.length, heldProducts: held.length, rows }, null, 2))
  console.log('LIVE_RELEASE_OK:111canonical URLs,107ready products,9held,Pasabuy metadata and private/Admin boundaries verified.')
} catch (error) {
  fs.writeFileSync('.tools/seo-improvements-release-20261026/live-release-hosts-failure.json', JSON.stringify({ at: new Date().toISOString(), pass: false, error: error.message, rows }, null, 2))
  throw error
}
