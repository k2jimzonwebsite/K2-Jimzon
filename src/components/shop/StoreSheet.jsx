import { useEffect, useRef } from 'react'

/**
 * MAP-027 — an overlay panel inside the store.
 *
 * The right rail carries a deliberate reading order: what K2 is saying, then
 * the selected product, then the basket. Anything long — the full FAQ set, a
 * conversation thread — would push that order apart and leave the customer
 * scrolling past the thing they came for. So the long surfaces open *over* the
 * scene instead, and the rail keeps its shape.
 *
 * It is a dialog in the real sense: focus moves in, Tab is trapped, Escape
 * closes it, and focus returns to whatever opened it. That last part matters in
 * this store specifically — Escape at the top level leaves the store entirely,
 * so a sheet that did not swallow the key would eject the customer from the
 * building when they meant to close a panel.
 */

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'textarea:not([disabled])', 'select:not([disabled])', 'details', '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function StoreSheet({ open, onClose, title, subtitle, children, footer }) {
  const panelRef = useRef(null)
  const headingRef = useRef(null)
  const restoreTo = useRef(null)

  // Remember what had focus before the sheet took it, so closing puts the
  // customer back on the button they pressed rather than at the top of the page.
  useEffect(() => {
    if (!open) return undefined
    restoreTo.current = document.activeElement
    headingRef.current?.focus({ preventScroll: true })
    return () => {
      const target = restoreTo.current
      if (target && typeof target.focus === 'function' && document.contains(target)) {
        target.focus({ preventScroll: true })
      }
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        // Stop the store's own Escape handler from also firing and closing the
        // whole store behind this sheet.
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = panelRef.current?.querySelectorAll(FOCUSABLE)
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    // Capture phase, so this runs before the store's window-level listener.
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="k2-store-sheet-layer">
      <button
        type="button"
        className="k2-store-sheet-scrim"
        aria-label={`Close ${title}`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="k2-store-sheet"
      >
        <header className="k2-store-sheet-head">
          <div>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="font-serif text-xl font-semibold text-[#2B2B2B] focus:outline-none"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-[13px] leading-6 text-navy-faint">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] shrink-0 rounded-full border border-[#E4DCD1] px-4 text-sm font-semibold text-[#2B2B2B] transition-colors hover:border-[#C6A867] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
          >
            Close
          </button>
        </header>

        <div className="k2-store-sheet-body">{children}</div>

        {footer && <footer className="k2-store-sheet-foot">{footer}</footer>}
      </div>
    </div>
  )
}
