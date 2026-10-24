import { useEffect } from 'react'

// Keep the two storefront drawers modal for keyboard and assistive technology.
export function useStorefrontDialog(open, panelRef) {
  useEffect(() => {
    if (!open || !panelRef.current) return
    const panel = panelRef.current
    const layer = panel.parentElement
    const background = [...layer.parentElement.children].filter(e => e !== layer)
    const previous = background.map(e => e.inert)
    background.forEach(e => { e.inert = true })
    const containFocus = event => {
      if (event.key !== 'Tab') return
      const controls = [...panel.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')]
        .filter(e => !e.disabled && e.tabIndex >= 0 && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')
      const first = controls[0]
      const last = controls.at(-1)
      if (!first) { event.preventDefault(); return }
      if (!panel.contains(document.activeElement) || (event.shiftKey && (document.activeElement === first || document.activeElement.tabIndex < 0))) {
        event.preventDefault(); (event.shiftKey ? last : first).focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus()
      }
    }
    window.addEventListener('keydown', containFocus, true)
    return () => {
      background.forEach((e, i) => { e.inert = previous[i] })
      window.removeEventListener('keydown', containFocus, true)
    }
  }, [open, panelRef])
}
