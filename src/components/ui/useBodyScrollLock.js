import { useEffect } from 'react'

// Locks background page scroll while a modal overlay is open and restores
// the previous value on close. Nested overlays nest safely: each level
// saves and restores its own previous value. Tour-style overlays that keep
// the live UI interactive must NOT use this hook.
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [active])
}
