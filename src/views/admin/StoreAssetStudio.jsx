import { useMemo, useState } from 'react'
import { useAdminStore } from '../../context/AdminStoreContext'
import { getProductKnowledge } from '../../lib/productKnowledge'
import {
  approveDraft, buildAssetRequest, draftFromResearch, planStoreAssets,
} from '../../lib/storeAssetPlan'
import { parseProductResearchPaste } from './productResearchContract'
import { adminBffEnabled, saveProductKnowledgeBff } from '../../services/adminBffService'
import { supabase } from '../../lib/supabaseClient'

/**
 * MAP-027 — the store asset queue.
 *
 * Inventory is the source of truth, so the work list is not maintained by hand:
 * it is computed from the published catalog every time this opens. Check a new
 * consignment in and its items appear here, already ranked by whether a
 * customer is currently looking at an empty panel.
 *
 * The flow is produce, then deliberate, then publish — and the middle step is
 * not skippable. Generated content arrives as `draft`, which the public
 * knowledge projection refuses to serve. A person reads each field, edits it if
 * it is wrong, and approves it individually. Nothing on this screen can put
 * machine-written copy in front of a customer without that action.
 *
 * There is no API key here. The request is built to the existing
 * `k2.product-content.v3` contract and handed off; the returned document is
 * pasted or posted back. That keeps the provider a deployment decision rather
 * than something wired into the review tool.
 */

const PRIORITY_STYLE = {
  urgent: 'bg-red-500/15 text-red-300 border-red-500/30',
  high: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  normal: 'bg-blue/15 text-blue border-blue/30',
  low: 'bg-white/5 text-white/50 border-white/10',
}

/**
 * Trim provenance to what the command accepts.
 *
 * The record carries a contract version and other drafting details that are
 * useful locally but are not part of the stored shape. Sending them would be
 * rejected as an unknown key, so they are dropped here rather than at the
 * boundary — a save should not fail over a field nobody needs kept.
 */
function publishableProvenance(provenance) {
  const out = {}
  for (const key of ['source', 'model', 'generatedAt', 'approvedBy', 'approvedAt']) {
    const value = String(provenance?.[key] ?? '').trim()
    if (value) out[key] = value.slice(0, 200)
  }
  return out
}

const PRIORITY_LABEL = {
  urgent: 'In stock, panel empty',
  high: 'Panel empty',
  normal: 'Partly written',
  low: 'Optional gaps',
}

export default function StoreAssetStudio() {
  const { products: listedProducts, reloadKnowledge } = useAdminStore()

  const [openSku, setOpenSku] = useState(null)
  const [paste, setPaste] = useState('')
  const [parseError, setParseError] = useState('')
  // What has been approved but not yet published. Approving is a judgement and
  // publishing is a write; keeping them separate lets a reviewer work through a
  // product's fields and FAQs and commit them in one deliberate action.
  const [reviewed, setReviewed] = useState({})
  const [reviewedFaqs, setReviewedFaqs] = useState({})
  const [drafts, setDrafts] = useState({})
  const [publishing, setPublishing] = useState('')
  const [publishError, setPublishError] = useState('')
  const [publishNotice, setPublishNotice] = useState('')

  const plan = useMemo(
    () => planStoreAssets(listedProducts || [], getProductKnowledge),
    // `publishNotice` changes only after a successful write, which is exactly
    // when the queue is stale: a published product should drop off it.
    [listedProducts, publishNotice],
  )

  const openItem = plan.items.find((item) => item.sku === openSku) || null
  const openDraft = openSku ? drafts[openSku] : null

  const request = useMemo(
    () => (openItem ? buildAssetRequest(openItem) : null),
    [openItem],
  )

  const ingest = () => {
    setParseError('')
    let research
    try {
      // The same parser the product research flow uses, so a document that is
      // valid there is valid here — one contract, not two dialects.
      research = parseProductResearchPaste(paste)
    } catch (error) {
      setParseError(error?.message || 'That document could not be read.')
      return
    }
    if (!research) {
      setParseError('That document could not be read as a product content record.')
      return
    }
    const drafted = draftFromResearch(research, { model: 'external' })
    if (Object.keys(drafted.fields).length === 0 && drafted.faqs.length === 0) {
      setParseError('The document parsed but contained none of the fields this product is missing.')
      return
    }
    setDrafts((current) => ({ ...current, [openSku]: drafted }))
    setPaste('')
  }

  const editField = (key, value) => {
    setDrafts((current) => ({
      ...current,
      [openSku]: {
        ...current[openSku],
        fields: {
          ...current[openSku].fields,
          [key]: { ...current[openSku].fields[key], value },
        },
      },
    }))
  }

  const approve = (key) => {
    const record = drafts[openSku]?.fields?.[key]
    if (!record) return
    const approved = approveDraft(record, { value: record.value, approvedBy: 'staff' })
    setReviewed((current) => ({
      ...current,
      [openSku]: { ...(current[openSku] || {}), [key]: approved },
    }))
    setDrafts((current) => {
      const next = { ...current[openSku].fields }
      delete next[key]
      return { ...current, [openSku]: { ...current[openSku], fields: next } }
    })
  }

  const reject = (key) => {
    setDrafts((current) => {
      const next = { ...current[openSku].fields }
      delete next[key]
      return { ...current, [openSku]: { ...current[openSku], fields: next } }
    })
  }

  const removeDraftFaq = (index) => {
    setDrafts((current) => ({
      ...current,
      [openSku]: {
        ...current[openSku],
        faqs: current[openSku].faqs.filter((_, position) => position !== index),
      },
    }))
  }

  const approveFaq = (index) => {
    const record = drafts[openSku]?.faqs?.[index]
    if (!record) return
    // Same gate as a field: approving records who did it and when, and an
    // edited answer is attributed to the person who edited it.
    const approved = approveDraft(record, { value: record.answer, approvedBy: 'staff' })
    setReviewedFaqs((current) => ({
      ...current,
      [openSku]: [...(current[openSku] || []), { ...record, ...approved, answer: approved.value }],
    }))
    removeDraftFaq(index)
  }

  const editFaqAnswer = (index, answer) => {
    setDrafts((current) => ({
      ...current,
      [openSku]: {
        ...current[openSku],
        faqs: current[openSku].faqs.map((faq, position) =>
          position === index ? { ...faq, answer } : faq),
      },
    }))
  }

  /**
   * Write a product's reviewed knowledge to the database.
   *
   * The command replaces the whole record for a SKU, which is what makes a
   * removed FAQ actually disappear. That means already-published knowledge has
   * to be sent again alongside the new approvals — otherwise publishing one
   * field would silently delete everything approved before it.
   */
  const publish = async (sku) => {
    if (!sku || publishing) return
    const existing = getProductKnowledge(sku)
    const approvedFields = reviewed[sku] || {}
    const approvedFaqs = reviewedFaqs[sku] || []

    const fields = [
      ...Object.entries(existing.fields)
        .filter(([key]) => !(key in approvedFields))
        .map(([key, value]) => ({ key, status: 'approved', value, provenance: {} })),
      ...Object.entries(approvedFields).map(([key, record]) => ({
        key,
        status: 'approved',
        value: record.value,
        provenance: publishableProvenance(record.provenance),
      })),
    ]

    const faqs = [
      ...existing.faqs.map((faq) => ({
        question: faq.question, answer: faq.answer, status: 'approved', provenance: {},
      })),
      ...approvedFaqs.map((faq) => ({
        question: faq.question,
        answer: faq.answer,
        status: 'approved',
        provenance: publishableProvenance(faq.provenance),
      })),
    ]

    if (fields.length === 0 && faqs.length === 0) return

    setPublishing(sku)
    setPublishError('')
    setPublishNotice('')
    const result = adminBffEnabled()
      ? await saveProductKnowledgeBff(sku, fields, faqs)
      : await supabase.rpc('save_product_knowledge_v1', {
        p_sku: sku, p_fields: fields, p_faqs: faqs,
      })
    setPublishing('')

    const failed = adminBffEnabled() ? !result?.ok : Boolean(result?.error)
    if (failed) {
      setPublishError('That knowledge could not be published. Nothing was changed.')
      return
    }

    setReviewed((current) => ({ ...current, [sku]: {} }))
    setReviewedFaqs((current) => ({ ...current, [sku]: [] }))
    await reloadKnowledge()
    setPublishNotice(`Published. ${fields.length} field${fields.length === 1 ? '' : 's'} and ${faqs.length} question${faqs.length === 1 ? '' : 's'} are now live for ${sku}.`)
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-adm-line bg-adm-sunken p-5">
        <h2 className="text-lg font-semibold text-white">Store assets</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-white/60">
          Computed from the published catalog. A product appears here as soon as it is listed and
          drops off once its assets are approved. Generated copy is never public until someone on
          this screen approves it.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ['Products needing work', plan.total],
            ['Showing an empty panel', plan.blockingCustomers],
            ['In stock and empty', plan.urgent],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-adm-line bg-black/20 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-white/45">{label}</dt>
              <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {publishNotice && (
        <p role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {publishNotice}
        </p>
      )}

      {plan.total === 0 && (
        <p className="rounded-2xl border border-adm-line bg-adm-sunken p-6 text-sm text-white/60">
          Every listed product has its store assets approved. Nothing to review.
        </p>
      )}

      <ul className="space-y-3">
        {plan.items.map((item) => {
          const isOpen = item.sku === openSku
          const approvedHere = Object.keys(reviewed[item.sku] || {})
          const approvedFaqsHere = reviewedFaqs[item.sku] || []
          const draftFaqs = drafts[item.sku]?.faqs || []
          const readyToPublish = approvedHere.length > 0 || approvedFaqsHere.length > 0
          return (
            <li key={item.sku} className="rounded-2xl border border-adm-line bg-adm-sunken">
              <button
                type="button"
                onClick={() => { setOpenSku(isOpen ? null : item.sku); setPaste(''); setParseError('') }}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{item.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-white/40">{item.sku}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {approvedHere.length > 0 && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                      {approvedHere.length} approved
                    </span>
                  )}
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${PRIORITY_STYLE[item.priority]}`}>
                    {PRIORITY_LABEL[item.priority]}
                  </span>
                  <span className="text-xs text-white/40">{item.gaps.length} missing</span>
                </div>
              </button>

              {isOpen && (
                <div className="space-y-5 border-t border-adm-line p-4">
                  {item.gaps.some((gap) => gap.key === 'image') && (
                    <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-200">
                      No shelf photograph. The virtual store wraps the product&rsquo;s own image
                      onto the package, so until one is uploaded against this SKU in Inventory the
                      shelf shows a drawn label instead of the real pack.
                    </p>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">
                      Missing assets
                    </h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {item.gaps.map((gap) => (
                        <li
                          key={gap.key}
                          className={`rounded-full border px-2.5 py-1 text-xs ${
                            gap.required
                              ? 'border-red-500/30 bg-red-500/10 text-red-300'
                              : 'border-white/10 bg-white/5 text-white/55'
                          }`}
                        >
                          {gap.label}{gap.required ? ' · required' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <details className="rounded-xl border border-adm-line bg-black/20">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-white/80">
                      Generation request ({request?.missing.length || 0} fields)
                    </summary>
                    <pre className="max-h-64 overflow-auto border-t border-adm-line px-4 py-3 text-xs leading-5 text-white/60">
{JSON.stringify(request, null, 2)}
                    </pre>
                  </details>

                  <div>
                    <label
                      htmlFor={`ingest-${item.sku}`}
                      className="block text-xs font-semibold uppercase tracking-wide text-white/45"
                    >
                      Returned content document
                    </label>
                    <textarea
                      id={`ingest-${item.sku}`}
                      value={paste}
                      onChange={(event) => { setPaste(event.target.value); setParseError('') }}
                      rows={4}
                      placeholder="Paste the k2.product-content.v3 document returned for this SKU"
                      className="mt-2 w-full resize-y rounded-xl border border-adm-line bg-black/30 px-3 py-2 font-mono text-xs text-white/80 placeholder:text-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                    />
                    {parseError && (
                      <p role="alert" className="mt-2 text-xs text-red-300">{parseError}</p>
                    )}
                    <button
                      type="button"
                      onClick={ingest}
                      disabled={!paste.trim()}
                      className="mt-2 min-h-[38px] rounded-lg bg-blue px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Load as drafts
                    </button>
                  </div>

                  {openDraft && Object.keys(openDraft.fields).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">
                        Awaiting your decision — not visible to customers
                      </h3>
                      {Object.entries(openDraft.fields).map(([key, record]) => (
                        <div key={key} className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-white">{key}</p>
                            <span className="rounded-full border border-amber-500/30 px-2 py-0.5 text-xs font-semibold text-amber-300">
                              draft
                            </span>
                          </div>
                          <textarea
                            value={record.value}
                            onChange={(event) => editField(key, event.target.value)}
                            rows={3}
                            aria-label={`Draft ${key}`}
                            className="mt-2 w-full resize-y rounded-lg border border-adm-line bg-black/30 px-3 py-2 text-sm leading-6 text-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => approve(key)}
                              className="min-h-[36px] rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => reject(key)}
                              className="min-h-[36px] rounded-lg border border-adm-line px-3 text-sm font-semibold text-white/70"
                            >
                              Discard
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isOpen && draftFaqs.length > 0 && (
                    <div className="rounded-xl border border-adm-line bg-black/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
                        Drafted questions
                      </p>
                      <p className="mt-1 text-xs leading-5 text-white/40">
                        A question is only shown to a customer once it is approved here.
                      </p>
                      <ul className="mt-3 space-y-3">
                        {draftFaqs.map((faq, index) => (
                          <li key={`${faq.question}-${index}`} className="rounded-lg border border-adm-line bg-adm-sunken p-3">
                            <p className="text-sm font-medium text-white">{faq.question}</p>
                            <label className="mt-2 block">
                              <span className="sr-only">{`Answer to: ${faq.question}`}</span>
                              <textarea
                                value={faq.answer}
                                onChange={(event) => editFaqAnswer(index, event.target.value)}
                                rows={3}
                                className="adm-input w-full resize-y text-sm"
                              />
                            </label>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => approveFaq(index)}
                                disabled={!String(faq.answer || '').trim()}
                                className="adm-btn min-h-10 bg-emerald-600 text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Approve question
                              </button>
                              <button
                                type="button"
                                onClick={() => removeDraftFaq(index)}
                                className="adm-btn min-h-10 border border-adm-line bg-adm-raised text-white/70"
                              >
                                Discard
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {readyToPublish && (
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                        Approved, not yet published
                      </p>
                      <ul className="mt-2 space-y-2">
                        {Object.entries(reviewed[item.sku] || {}).map(([key, record]) => (
                          <li key={key} className="text-sm text-white/75">
                            <span className="font-medium text-white">{key}</span>
                            <span className="ml-2 text-xs text-white/40">{record.provenance.source}</span>
                            <p className="mt-1 text-sm leading-6 text-white/60">{record.value}</p>
                          </li>
                        ))}
                        {approvedFaqsHere.map((faq, index) => (
                          <li key={`${faq.question}-${index}`} className="text-sm text-white/75">
                            <span className="font-medium text-white">{faq.question}</span>
                            <p className="mt-1 text-sm leading-6 text-white/60">{faq.answer}</p>
                          </li>
                        ))}
                      </ul>

                      {publishError && (
                        <p role="alert" className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-300">
                          {publishError}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => publish(item.sku)}
                        disabled={publishing === item.sku}
                        className="adm-btn mt-3 min-h-11 bg-emerald-600 text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {publishing === item.sku ? 'Publishing…' : 'Publish to the store'}
                      </button>
                      <p className="mt-2 text-xs leading-5 text-white/45">
                        Publishing writes this product&rsquo;s approved knowledge to the catalog. It
                        appears on the product page and in the store the next time either loads.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
