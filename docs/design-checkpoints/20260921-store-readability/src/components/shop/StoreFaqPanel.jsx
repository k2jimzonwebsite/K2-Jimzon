import { useMemo, useState } from 'react'
import { FAQS } from '../../data/site'
import { getProductKnowledge } from '../../lib/productKnowledge'
import { useProductKnowledgeVersion } from '../../lib/useProductKnowledgeVersion'

/**
 * MAP-027 — every answer the store is allowed to give, in one place.
 *
 * Two sources, both already published elsewhere, neither written for this panel:
 *
 *   - how the shop works, from the storefront's own FAQ set
 *   - per-product questions, from the approved product knowledge projection
 *
 * The approval gate still applies. `getProductKnowledge` only ever returns
 * approved entries, so a drafted or AI-generated answer cannot reach a customer
 * by being collected here. A product with nothing approved simply contributes
 * nothing — it is not padded with an apology row.
 *
 * This lives in a sheet rather than the right rail because the full set runs to
 * dozens of entries; inlining it would bury the selected product under a wall of
 * accordions.
 */

export default function StoreFaqPanel({ products = [], focusSku = '' }) {
  const [query, setQuery] = useState('')
  const knowledgeVersion = useProductKnowledgeVersion()

  // Product answers, gathered across whatever is actually on the shelves.
  const productFaqs = useMemo(() => {
    const groups = []
    for (const product of products) {
      const sku = product?.sku || product?.id
      if (!sku) continue
      const knowledge = getProductKnowledge(sku)
      if (!knowledge.hasFaqs) continue
      groups.push({ sku, name: product?.name || sku, faqs: knowledge.faqs })
    }
    return groups
  }, [products, knowledgeVersion])

  const needle = query.trim().toLowerCase()
  const matches = (...values) =>
    !needle || values.some((value) => String(value || '').toLowerCase().includes(needle))

  const shopFaqs = FAQS.filter((faq) => matches(faq.q, faq.a))
  const visibleProductFaqs = productFaqs
    .map((group) => ({
      ...group,
      faqs: group.faqs.filter((faq) => matches(faq.question, faq.answer, group.name)),
    }))
    .filter((group) => group.faqs.length > 0)

  // The selected item first: someone who opened this while holding a jar is
  // almost always asking about that jar.
  const orderedProductFaqs = focusSku
    ? [...visibleProductFaqs].sort((a, b) => (a.sku === focusSku ? -1 : b.sku === focusSku ? 1 : 0))
    : visibleProductFaqs

  const empty = shopFaqs.length === 0 && orderedProductFaqs.length === 0

  return (
    <div className="space-y-6">
      <label htmlFor="store-faq-search" className="block text-[13px] font-semibold text-[#5C5449]">
        Search the answers
        <input
          id="store-faq-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="delivery, pasabuy, storage…"
          className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#E4DCD1] bg-white px-4 text-sm text-[#2B2B2B] placeholder:text-navy-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
        />
      </label>

      {empty && (
        <p className="rounded-2xl border border-[#E4DCD1] bg-[#FBF9F6] p-5 text-sm leading-7 text-[#5C5449]">
          Nothing matches &ldquo;{query.trim()}&rdquo;. Ask K2 directly and a person will answer.
        </p>
      )}

      {shopFaqs.length > 0 && (
        <section aria-labelledby="store-faq-shop">
          <h3
            id="store-faq-shop"
            className="text-[13px] font-semibold uppercase tracking-[0.12em] text-navy-faint"
          >
            How the shop works
          </h3>
          <div className="mt-3 divide-y divide-[#E4DCD1] border-y border-[#E4DCD1]">
            {shopFaqs.map((faq) => (
              <Answer key={faq.q} question={faq.q} answer={faq.a} defaultOpen={Boolean(needle)} />
            ))}
          </div>
        </section>
      )}

      {orderedProductFaqs.map((group) => (
        <section key={group.sku} aria-labelledby={`store-faq-${group.sku}`}>
          <h3
            id={`store-faq-${group.sku}`}
            className="text-[13px] font-semibold uppercase tracking-[0.12em] text-navy-faint"
          >
            {group.name}
            {group.sku === focusSku && (
              <span className="ml-2 rounded-full bg-crimson/10 px-2 py-0.5 text-[12px] font-semibold normal-case tracking-normal text-crimson">
                On your shelf
              </span>
            )}
          </h3>
          <div className="mt-3 divide-y divide-[#E4DCD1] border-y border-[#E4DCD1]">
            {group.faqs.map((faq) => (
              <Answer
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
                defaultOpen={Boolean(needle) || group.sku === focusSku}
              />
            ))}
          </div>
        </section>
      ))}

      {productFaqs.length === 0 && (
        <p className="text-[13px] leading-6 text-navy-faint">
          Item-specific answers appear here once staff have approved them for a product.
        </p>
      )}
    </div>
  )
}

/**
 * One question.
 *
 * `open` is driven rather than left to the browser so a search can reveal every
 * match at once — a hit the customer has to expand by hand is not a found
 * answer. Keyed on `defaultOpen` so toggling it re-mounts with the new state.
 */
function Answer({ question, answer, defaultOpen = false }) {
  return (
    <details key={String(defaultOpen)} open={defaultOpen} className="group py-1">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#2B2B2B] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-crimson">
        {question}
        <span
          aria-hidden="true"
          className="shrink-0 text-navy-faint transition-transform duration-200 ease-out-quint group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <p className="pb-3 pr-6 text-sm leading-7 text-[#5C5449]">{answer}</p>
    </details>
  )
}
