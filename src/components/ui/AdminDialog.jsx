import { cloneElement, isValidElement, useCallback, useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function assignRef(ref, value) {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}

function visibleFocusableElements(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE)].filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') return false
    const style = window.getComputedStyle(element)
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0
  })
}

export function AdminDialog({
  children,
  onClose,
  closeDisabled = false,
  initialFocusRef,
  labelledBy,
  describedBy,
  contentRef,
}) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const closeDisabledRef = useRef(closeDisabled)
  onCloseRef.current = onClose
  closeDisabledRef.current = closeDisabled

  const childRef = isValidElement(children) ? children.props.ref : null
  const setDialogRef = useCallback((node) => {
    dialogRef.current = node
    assignRef(childRef, node)
    assignRef(contentRef, node)
  }, [childRef, contentRef])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined

    previousFocusRef.current = document.activeElement
    const frame = window.requestAnimationFrame(() => {
      const currentFocus = document.activeElement
      const requestedFocus = initialFocusRef?.current
      const fallbackFocus = visibleFocusableElements(dialog)[0] || dialog
      const target = requestedFocus || (dialog.contains(currentFocus) ? currentFocus : fallbackFocus)
      target?.focus({ preventScroll: true })
    })

    const onKeyDown = (event) => {
      const openDialogs = [...document.querySelectorAll('[data-admin-dialog="true"]')]
      if (openDialogs.at(-1) !== dialog) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (closeDisabledRef.current) return
        onCloseRef.current?.()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = visibleFocusableElements(dialog)
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus({ preventScroll: true })
        return
      }

      const first = focusable[0]
      const last = focusable.at(-1)
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        const boundary = event.shiftKey ? last : first
        boundary.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown, true)
      previousFocusRef.current?.focus({ preventScroll: true })
    }
  }, [initialFocusRef])

  if (!isValidElement(children)) {
    throw new TypeError('AdminDialog requires exactly one element child')
  }

  return cloneElement(children, {
    ref: setDialogRef,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    'data-admin-dialog': 'true',
    tabIndex: children.props.tabIndex ?? -1,
  })
}
