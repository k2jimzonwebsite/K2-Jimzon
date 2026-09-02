/**
 * Pre-launch search-indexing gate for product pages.
 *
 * ============================================================================
 * THIS IS TEMPORARY. See docs/PRELAUNCH_INDEXING.md for how to remove it.
 * ============================================================================
 *
 * Why it exists, recorded 2 September 2026:
 *
 * All 27 products carry a name, a price, and a stock count, but none has a
 * photograph or a description. `StorefrontMetadata.jsx` therefore gives every
 * product page the same fallback social image and a generated one-line
 * description built from the product name. Twenty-seven pages that differ only
 * by a noun is thin, near-duplicate content, and a brand-new domain gets one
 * first impression with a search engine. Spending it on those pages costs
 * ranking time that is slow to win back — not a penalty, but a self-inflicted
 * delay.
 *
 * The owner's decision was to publish the products anyway, so the real store
 * can be reviewed by a person, and to withhold the product pages from search
 * until they carry real photographs and real descriptions.
 *
 * The gate is deliberately narrow. Only `/product/*` is withheld. The home,
 * Pasabuy, Wholesale, Contact, catalog, and store pages are finished, are not
 * duplicates of each other, and stay indexable — withholding them would cost
 * real discovery for no benefit.
 *
 * ONE SWITCH, TWO EFFECTS. The constant below drives the sitemap, and a
 * contract test asserts that `vercel.storefront.json` agrees with it. Turning
 * the gate off without also removing the header, or the reverse, fails the
 * suite rather than shipping a sitemap that advertises URLs the same
 * deployment tells crawlers to ignore — which is the "Submitted URL marked
 * noindex" error in Search Console, and the usual way this kind of gate rots.
 */

/**
 * While true, product pages are served `noindex` and are kept out of the
 * sitemap. Set to `false` to launch product pages into search; see the
 * checklist in docs/PRELAUNCH_INDEXING.md, which must be worked through in the
 * same change.
 */
export const PRELAUNCH_PRODUCT_NOINDEX = true

/** The route pattern in `vercel.storefront.json` that carries the header. */
export const PRODUCT_NOINDEX_SOURCE = '/product/(.*)'

/** The exact header value that pattern must serve while the gate is on. */
export const PRODUCT_NOINDEX_HEADER = 'X-Robots-Tag'

/**
 * `nofollow` accompanies `noindex` on purpose. Product pages link to each other
 * through related-product links; following those would have a crawler discover
 * the very pages being withheld, and spend crawl budget confirming each one is
 * also excluded.
 */
export const PRODUCT_NOINDEX_VALUE = 'noindex, nofollow'

/**
 * Whether a product URL may appear in `sitemap.xml`.
 *
 * A sitemap is a request to index. While the gate is on, that request would
 * contradict the header on the same URL, so no product URL is listed at all.
 */
export function productUrlsAllowedInSitemap() {
  return !PRELAUNCH_PRODUCT_NOINDEX
}
