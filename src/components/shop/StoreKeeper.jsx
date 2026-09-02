import { useState } from 'react'
import { getProductKnowledge } from '../../lib/productKnowledge'
import StoreKeeperAvatar from './StoreKeeperAvatar'

/**
 * MAP-027 — the K2 shopkeeper.
 *
 * Orients the customer to the shelf they are looking at and takes a question.
 * It is deliberately not a chatbot: it says only what the shelf model and
 * approved product knowledge already establish, and anything it cannot answer
 * goes to a real person through the canonical conversation boundary.
 *
 * MAP-027 forbids simulating staff presence and generative answers from
 * unsupported knowledge. So: no typing indicator, no "online" claim, no
 * response-time promise, and no invented product facts.
 */

export default function StoreKeeper({ shelf, product, onAskStaff, moment }) {
  const [question, setQuestion] = useState('')
  const [sent, setSent] = useState(false)
  const [open, setOpen] = useState(() => (
    typeof window === 'undefined' || window.innerWidth > 900
  ))
  const acknowledged = moment?.id === 'added'

  const knowledge = product ? getProductKnowledge(product.sku || product.id) : null
  const count = shelf?.products?.length ?? 0

  // What the keeper says, derived only from established facts.
  let line
  if (product) {
    line = knowledge?.fields?.uses
      || knowledge?.fields?.description
      || `I can pass your question about ${product.name} to the team — we have not written up this one yet.`
  } else if (shelf?.isCounter) {
    line = shelf.blurb
  } else if (shelf) {
    line = `${shelf.blurb} There ${count === 1 ? 'is' : 'are'} ${count} ${count === 1 ? 'item' : 'items'} on this shelf. Tap one and I will tell you what it is good for.`
  } else {
    line = 'Pick a shelf and I will walk you through it.'
  }

  /**
   * What her face is doing, from state the store already has.
   *
   * `delighted` is the basket acknowledgement and clears itself; `listening`
   * means the customer is mid-question. Neither claims a person is present.
  */
  let expression = moment?.expression || 'idle'
  if (question.trim()) expression = 'listening'
  else if (product && !moment?.expression) expression = 'speaking'

  const handleAsk = (event) => {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return
    // The store owns the product context and builds the bounded handoff; the
    // keeper only carries the customer's words across.
    if (typeof onAskStaff === 'function') onAskStaff(trimmed)
    setQuestion('')
    setSent(true)
  }

  return (
    <section
      className="k2-store-guide flex flex-col gap-4" aria-label="K2 shopkeeper"
      data-open={open ? 'true' : 'false'}
      data-moment={moment?.id || 'idle'}
    >
      <button
        type="button"
        className="k2-store-guide-toggle"
        aria-expanded={open}
        aria-controls="k2-store-guide-panel"
        aria-label={open ? 'Minimize K2 shopkeeper' : 'Open K2 shopkeeper'}
        onClick={() => setOpen(value => !value)}
      >
        <StoreKeeperAvatar
          expression={expression}
          waving={moment?.gesture === 'wave' || moment?.gesture === 'celebrate'}
          size={open ? 150 : 92}
        />
        <span className="k2-store-guide-toggle-copy">
          <strong>K2 shopkeeper</strong>
          <span>{open ? 'Tuck me away' : 'Need a hand?'}</span>
        </span>
        <span className="k2-store-guide-toggle-icon" aria-hidden="true">{open ? '‹' : '›'}</span>
      </button>

      {open && (
        <div id="k2-store-guide-panel" className="k2-store-guide-panel">
          <p
            className="k2-store-guide-speech"
            aria-live="polite"
          >
            {acknowledged ? moment.message : (product ? line : moment?.message || line)}
          </p>

          {product && knowledge?.fields?.pairings && (
            <p className="k2-store-guide-pairing">
              <span>Goes well with: </span>
              {knowledge.fields.pairings}
            </p>
          )}

          <form onSubmit={handleAsk} className="k2-store-guide-form">
            <label htmlFor="keeper-question">
              Ask about {product ? 'this item' : 'this shelf'}
            </label>
            <div>
              <input
                id="keeper-question"
                type="text"
                value={question}
                onChange={event => { setQuestion(event.target.value); setSent(false) }}
                placeholder="What can I cook with this?"
              />
              <button type="submit" disabled={!question.trim()}>Ask</button>
            </div>
            {/* States review hours as fact. No presence claim, no reply-time promise. */}
            <p role="status">
              {sent
                ? 'Opening the conversation here in the store…'
                : 'A real person answers, right here. Messages are reviewed during Manila business hours.'}
            </p>
          </form>
        </div>
      )}
    </section>
  )
}
