# Pre-launch indexing gate — how to undo it

**Status: ON as of 2 September 2026.**

While this gate is on, `https://www.k2jimzon.com/product/*` is served
`X-Robots-Tag: noindex, nofollow` and no product URL appears in `sitemap.xml`.
Every other page — home, catalog, store, Pasabuy, Wholesale, Contact — is
indexed normally.

**The product pages still work.** Anyone with a link can open one, share it, and
buy from it. The gate is an instruction to search engines, not a restriction on
people.

---

## Why it was turned on

The owner decided on 2 September 2026 to publish the 27 products so the real
store could be reviewed by a person, while keeping the product pages out of
search until they carry real photographs and descriptions.

Measured that day, all 27 products had:

| Field | State |
| --- | --- |
| Name, retail/wholesale/VIP price, stock counts | Present on all 27 |
| `primary_image_url`, `secondary_images`, `lifestyle_images` | **Empty on all 27** |
| `description`, `short_description` | **Empty on all 27** |

The consequence in the rendered page, from `src/components/StorefrontMetadata.jsx`:

- Every product page declares the **same** fallback social image, because
  `absoluteUrl(product?.img || product?.primary_image_url, origin)` falls through
  to `SOCIAL_FALLBACK` for all of them.
- Every product page's description falls back to the generated line
  `"{name}, sourced in Italy and fulfilled in Manila by K2 Jimzon."`

Twenty-seven pages differing only by a noun, all declaring one image, is thin
near-duplicate content. It is not a penalty and it is fully recoverable, but a
new domain gets one first impression with a search engine, and spending it this
way costs ranking time that is slow to win back. Withholding the pages until
they are worth indexing is cheaper than repairing the impression afterwards.

The storefront **does** render an image for these products —
`ProductVisual.jsx` falls back to the house `ProductArt` label, and the 3D store
draws its own package label. Shoppers do not see broken images. That fallback is
good enough for a person looking at a shelf and not good enough to be a
product's canonical image in Google.

---

## How to undo it — the full checklist

Do all four steps in one change. Steps 1 and 2 are enforced against each other
by `tests/prelaunch-indexing-contract.spec.js`, which fails if only one is done.

### Before you start — confirm the reason is gone

Do not open this gate on a schedule. Open it when the content is real:

- [ ] Every product intended for search has a genuine `primary_image_url`.
- [ ] Every such product has its own `description` — not the generated fallback,
      and not a paraphrase shared across products.
- [ ] Spot-check three product pages in a browser and confirm the `og:image` and
      meta description differ per product.

If some products qualify and others do not, publish only the ready ones and
leave the rest unpublished. The gate is all-or-nothing by route; product
readiness is controlled per row by `published`.

### 1. Turn the switch off

In `scripts/prelaunch-indexing.mjs`:

```js
export const PRELAUNCH_PRODUCT_NOINDEX = false
```

This alone restores product URLs to `sitemap.xml`.

### 2. Remove the header

In `vercel.storefront.json`, delete this entry from `headers`:

```json
{
  "source": "/product/(.*)",
  "headers": [
    { "key": "X-Robots-Tag", "value": "noindex, nofollow" }
  ]
}
```

**Leave every other header alone.** In particular the `/(.*)` block carries the
security headers and the `/assets/(.*)` and `/ambient/(.*)` blocks carry cache
policy; none of them is part of this gate.

### 3. Refresh the catalog projection

The sitemap does not read the database. It reads
`scripts/map024-evidence/published-catalog.json`, which is produced separately:

```bash
npm run evidence:map024-catalog
```

Without this, the sitemap lists only products that were published the last time
the projection was generated.

### 4. Verify after deploying

```bash
curl -sI https://www.k2jimzon.com/product/rio-mare | grep -i x-robots-tag
```

Expect **no output**. Any `noindex` still present means the header survived —
check that Vercel picked up the config change.

Then confirm the sitemap lists products:

```bash
curl -s https://www.k2jimzon.com/sitemap.xml | grep -c "<loc>"
```

Expect more than 2. Two means only the stable routes are listed.

Finally, in Google Search Console, submit `sitemap.xml` again and use **URL
Inspection → Request indexing** on a few product pages. Removing `noindex` does
not make Google re-crawl promptly on its own; a new domain can otherwise wait
weeks.

---

## What this gate is not

- **Not a robots.txt change.** `public/robots.txt` still says `Allow: /`. That is
  correct and deliberate: a page must be *crawlable* for a crawler to read the
  `noindex` header on it. Blocking `/product/` in robots.txt instead would leave
  Google unable to see the instruction, and URLs blocked that way can still
  appear in results as bare links. Do not "help" by adding a `Disallow`.
- **Not a reason to leave products unpublished.** Publishing controls whether a
  product exists for shoppers. This gate controls only whether search engines
  index its page. They are independent.
- **Not permanent, and not a penalty.** Nothing here is recorded against the
  domain. When the gate comes off, the pages are evaluated fresh.

---

## Related

- `scripts/prelaunch-indexing.mjs` — the switch and its rationale
- `tests/prelaunch-indexing-contract.spec.js` — pins the header and the sitemap
  to the same switch
- `MASTER_ACTION_PLAN.md` — the publication and photography work this gate waits on
