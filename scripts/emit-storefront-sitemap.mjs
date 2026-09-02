#!/usr/bin/env node
/**
 * MAP-028 B1 — emit `dist/sitemap.xml` as part of the storefront build.
 *
 * `generate-sitemap.mjs` has existed and been tested for some time, but it was
 * only ever a manual evidence script: its output never reached `dist/`, so no
 * sitemap was deployed and `robots.txt` said so. This wires the existing,
 * reviewed generator into the build without changing any of its rules.
 *
 * It does not read the database. The catalog projection is produced separately
 * by `read-published-catalog.mjs`, which needs owner-held K2 credentials. When
 * that projection is absent or contains no publishable product, the sitemap is
 * still emitted with the storefront's stable public routes — a crawl manifest
 * for the pages that certainly exist is strictly better than none, and inventing
 * product URLs that 404 would be worse than both.
 *
 * Storefront target only. The admin deployment must never publish a sitemap.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateSitemap, K2_STOREFRONT_ORIGIN } from './map024-evidence/generate-sitemap.mjs'
import { generateProductPages } from './map024-evidence/generate-product-pages.mjs'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const catalogPath = path.join(rootDir, 'scripts', 'map024-evidence', 'published-catalog.json')
const distDir = path.join(rootDir, 'dist')

function resolveTarget() {
  const explicit = String(process.env.K2_DEPLOYMENT_TARGET || '').trim()
  if (explicit) return explicit
  // Mirrors the build-target artifact vite emits, so this agrees with what was
  // actually built rather than with what the environment claims.
  try {
    const marker = JSON.parse(fs.readFileSync(path.join(distDir, 'k2-build-target.json'), 'utf8'))
    return String(marker.target || '')
  } catch {
    return ''
  }
}

function readCatalog() {
  try {
    const parsed = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function emitSitemap({ target = resolveTarget(), origin = K2_STOREFRONT_ORIGIN } = {}) {
  if (target !== 'storefront') {
    return { written: false, reason: `target is "${target || 'unset'}", not storefront` }
  }
  if (!fs.existsSync(distDir)) {
    return { written: false, reason: 'dist/ does not exist; run the build first' }
  }

  const products = readCatalog()
  const xml = generateSitemap({ products, origin })
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xml, 'utf8')
  const template = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8')
  const pages = generateProductPages({ template, products, origin })
  for (const [segment, html] of pages) {
    const directory = path.join(distDir, 'product', segment)
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(path.join(directory, 'index.html'), html, 'utf8')
  }

  // Count what actually made it in, so the build log states the truth rather
  // than implying the whole catalog was published.
  const productUrls = (xml.match(/<loc>/g) || []).length - 2
  return { written: true, products: products.length, productUrls, productPages: pages.size }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('emit-storefront-sitemap.mjs')) {
  const result = emitSitemap()
  if (!result.written) {
    console.log(`[sitemap] skipped — ${result.reason}`)
  } else {
    console.log(`[sitemap] dist/sitemap.xml written with ${productUrlLabel(result)}`)
    console.log(`[metadata] ${result.productPages} product page${result.productPages === 1 ? '' : 's'} prerendered`)
    if (result.products > 0 && result.productUrls === 0) {
      console.log('[sitemap] NOTE: the catalog projection contains no product marked published=true,')
      console.log('[sitemap] so only the stable public routes are listed. Publish products, re-run')
      console.log('[sitemap] `npm run evidence:map024-catalog`, and rebuild to list them.')
    }
  }
}

function productUrlLabel(result) {
  const count = result.productUrls
  return `2 stable routes and ${count} product ${count === 1 ? 'URL' : 'URLs'}`
}
