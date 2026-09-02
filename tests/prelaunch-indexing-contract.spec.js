import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import {
  PRELAUNCH_PRODUCT_NOINDEX,
  PRODUCT_NOINDEX_SOURCE,
  PRODUCT_NOINDEX_HEADER,
  PRODUCT_NOINDEX_VALUE,
  productUrlsAllowedInSitemap,
} from '../scripts/prelaunch-indexing.mjs'

/**
 * The pre-launch gate has two halves in two different files: a header in
 * `vercel.storefront.json` and a sitemap exclusion driven by a constant. Half a
 * gate is worse than none — a sitemap advertising URLs the same deployment
 * serves `noindex` is the "Submitted URL marked noindex" error in Search
 * Console — so these bind the halves together in both directions.
 *
 * They are written to pass whether the gate is on or off, and to fail only when
 * the two halves disagree. Undoing the gate correctly, per
 * docs/PRELAUNCH_INDEXING.md, keeps this suite green.
 */

const vercelConfig = JSON.parse(readFileSync('vercel.storefront.json', 'utf8'))

function productNoindexRule() {
  return (vercelConfig.headers || []).find(entry => entry.source === PRODUCT_NOINDEX_SOURCE)
}

test.describe('pre-launch indexing gate', () => {
  test('the header and the switch agree', () => {
    const rule = productNoindexRule()

    if (PRELAUNCH_PRODUCT_NOINDEX) {
      expect(rule, `the gate is ON, so vercel.storefront.json must serve ${PRODUCT_NOINDEX_HEADER} on ${PRODUCT_NOINDEX_SOURCE}. See docs/PRELAUNCH_INDEXING.md.`).toBeTruthy()
      const header = rule.headers.find(h => h.key === PRODUCT_NOINDEX_HEADER)
      expect(header).toBeTruthy()
      expect(header.value).toBe(PRODUCT_NOINDEX_VALUE)
    } else {
      expect(rule, `the gate is OFF, so the ${PRODUCT_NOINDEX_SOURCE} noindex header must be removed from vercel.storefront.json. See step 2 of docs/PRELAUNCH_INDEXING.md.`).toBeFalsy()
    }
  })

  test('the sitemap exclusion follows the same switch', () => {
    expect(productUrlsAllowedInSitemap()).toBe(!PRELAUNCH_PRODUCT_NOINDEX)

    const emitter = readFileSync('scripts/emit-storefront-sitemap.mjs', 'utf8')
    // Pins the wiring, not the value: the emitter must consult the gate rather
    // than pass the catalog straight through.
    expect(emitter).toContain('productUrlsAllowedInSitemap() ? allProducts : []')
    // Product pages are still prerendered while the gate is on, so a shared
    // link opens a real page.
    expect(emitter).toContain('products: allProducts')
  })

  test('robots.txt still allows crawling so the header can be read', () => {
    // A Disallow here would hide the noindex header from the crawler that needs
    // to read it, and blocked URLs can still surface as bare links. This is the
    // most tempting wrong "fix", so it is pinned.
    const robots = readFileSync('public/robots.txt', 'utf8')
    expect(robots).toMatch(/^\s*Allow:\s*\/\s*$/m)
    expect(robots).not.toMatch(/^\s*Disallow:\s*\/product/mi)
  })

  test('only product pages are withheld', () => {
    // Withholding the finished marketing pages would cost real discovery. If a
    // future change needs a broader gate, that is a decision to take
    // deliberately, not to inherit from this one.
    for (const entry of vercelConfig.headers || []) {
      const robotsHeader = (entry.headers || []).find(h => h.key === PRODUCT_NOINDEX_HEADER)
      if (!robotsHeader) continue
      expect(
        entry.source,
        `${PRODUCT_NOINDEX_HEADER} is set on "${entry.source}". Only ${PRODUCT_NOINDEX_SOURCE} may carry it on the storefront.`,
      ).toBe(PRODUCT_NOINDEX_SOURCE)
    }
  })

  test('the undo procedure is documented and reachable', () => {
    // The gate is temporary. A temporary thing with no written way to remove it
    // becomes permanent, so its removal path is part of the contract.
    const doc = readFileSync('docs/PRELAUNCH_INDEXING.md', 'utf8')
    expect(doc).toContain('PRELAUNCH_PRODUCT_NOINDEX = false')
    expect(doc).toContain(PRODUCT_NOINDEX_SOURCE)
    expect(doc).toContain('npm run evidence:map024-catalog')

    const switchSource = readFileSync('scripts/prelaunch-indexing.mjs', 'utf8')
    expect(switchSource).toContain('docs/PRELAUNCH_INDEXING.md')
  })
})
