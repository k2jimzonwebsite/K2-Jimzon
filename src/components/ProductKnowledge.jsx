import { useMemo, useState } from 'react'
import { getProductKnowledge, buildStaffHandoffContext, UNAVAILABLE_TEXT } from '../lib/productKnowledge'
import { useProductKnowledgeVersion } from '../lib/useProductKnowledgeVersion'
import { Kicker } from './ui/bits'

/**
 * MAP-027 — approved product knowledge on the standard product page.
 *
 * Renders only what a human has approved. Native `<details>` carries the
 * accordion so keyboard use, screen readers, and in-page find all work without
 * custom ARIA, and the content is present in the DOM rather than gated behind a
 * transition that never fires in a headless render.
 *
 * `Ask K2 Staff` hands off through the existing guest conversation boundary with
 * bounded product context. It promises no response time and asserts no staff
 * presence.
 */

const FIELD_LABELS = {
  description: 'About this product',
  uses: 'What you can make with it',
  pairings: 'Goes well with',
  preparation: 'How to prepare it',
  taste: 'Taste',
  origin: 'Origin',
  ingredients: 'Ingredients',
  allergens: 'Allergens',
  storage: 'Storage',
  packaging: 'Packaging',
  certifications: 'Certifications',
}

const FIELD_ORDER = Object.keys(FIELD_LABELS)

export default function ProductKnowledge({ product, onAskStaff }) {
  const sku = product?.sku || product?.id || ''
  // Knowledge loads after the catalog. Without the version here this memo
  // would keep the empty state it computed before the load finished.
  const knowledgeVersion = useProductKnowledgeVersion()
  const knowledge = useMemo(() => getProductKnowledge(sku), [sku, knowledgeVersion])
  const [question, setQuestion] = useState('')
  const [sent, setSent] = useState(false)

  const orderedFields = FIELD_ORDER
    .filter(key => knowledge.fields[key])
    .map(key => ({ key, label: FIELD_LABELS[key], value: knowledge.fields[key] }))

  const handleAsk = (event) => {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return
    if (typeof onAskStaff === 'function') {
      onAskStaff(buildStaffHandoffContext(product, trimmed))
    }
    setQuestion('')
    setSent(true)
  }

  return (
    <section className="mt-10 border-t border-line pt-8" aria-labelledby="product-knowledge-heading">
      <h2 id="product-knowledge-heading" className="font-serif text-2xl font-semibold text-navy">
        Product details
      </h2>

      {!knowledge.hasFields && (
        <p className="mt-3 text-sm leading-7 text-navy-soft">
          {UNAVAILABLE_TEXT} Staff confirm product details before payment instructions are provided.
        </p>
      )}

      {knowledge.hasFields && (
        <div className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-paper">
          {orderedFields.map(field => (
            <details key={field.key} className="group">
              <summary className="flex min-h-[44px] cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-navy focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-crimson">
                {field.label}
                <span aria-hidden="true" className="ml-4 text-navy-soft transition-transform duration-200 ease-out-quint group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <p className="px-4 pb-4 text-sm leading-7 text-navy-soft">{field.value}</p>
            </details>
          ))}
        </div>
      )}

      <h2 className="mt-10 font-serif text-2xl font-semibold text-navy">Common questions</h2>
      {!knowledge.hasFaqs && (
        <p className="mt-3 text-sm leading-7 text-navy-soft">
          No reviewed questions for this product yet. Ask below and staff will answer directly.
        </p>
      )}
      {knowledge.hasFaqs && (
        <div className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-paper">
          {knowledge.faqs.map(faq => (
            <details key={faq.question} className="group">
              <summary className="flex min-h-[44px] cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-navy focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-crimson">
                {faq.question}
                <span aria-hidden="true" className="ml-4 text-navy-soft transition-transform duration-200 ease-out-quint group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <p className="px-4 pb-4 text-sm leading-7 text-navy-soft">{faq.answer}</p>
            </details>
          ))}
        </div>
      )}

      <div className="mt-10">
        <Kicker className="text-navy">Ask K2 staff</Kicker>
        <form onSubmit={handleAsk} className="mt-3">
          <label htmlFor="ask-k2-staff" className="block text-sm leading-7 text-navy-soft">
            Ask about this product and staff will reply in your messages.
          </label>
          <div className="mt-2 flex flex-wrap gap-3">
            <input
              id="ask-k2-staff"
              type="text"
              value={question}
              onChange={event => { setQuestion(event.target.value); setSent(false) }}
              placeholder="For example: is this the whole bean or ground?"
              className="min-h-[44px] flex-1 rounded-xl border border-line bg-paper px-4 text-sm text-navy placeholder:text-navy-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
            />
            <button
              type="submit"
              disabled={!question.trim()}
              className="min-h-[44px] rounded-xl bg-crimson px-5 text-sm font-semibold text-white shadow-card transition-transform duration-150 ease-out-quint active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
            >
              Send to staff
            </button>
          </div>
          {/* States review hours as fact. Promises no reply time, asserts no presence. */}
          <p className="mt-2 text-[13px] leading-6 text-navy-soft" role="status">
            {sent
              ? 'Sent. Your question is in your messages with the product it refers to.'
              : 'Messages are reviewed during Manila business hours. No response time is promised.'}
          </p>
        </form>
      </div>
    </section>
  )
}
