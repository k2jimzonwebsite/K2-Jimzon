import { useCallback, useEffect, useRef, useState } from 'react'

// Shared warehouse PCs stay signed in when staff walk away. After this long
// without input the shell warns first, then signs out. The window is
// deliberately long so packing and scanning sessions are never cut mid-task;
// lower IDLE_TIMEOUT_MS if the owner wants a stricter shop-floor policy.
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000
export const IDLE_WARNING_MS = 2 * 60 * 1000

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel']

export function useIdleLock({ enabled, onIdle }) {
  const [idleWarning, setIdleWarning] = useState(false)
  const timers = useRef({ warn: null, idle: null })
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  const clear = () => {
    if (timers.current.warn) window.clearTimeout(timers.current.warn)
    if (timers.current.idle) window.clearTimeout(timers.current.idle)
    timers.current = { warn: null, idle: null }
  }

  const arm = () => {
    clear()
    timers.current.warn = window.setTimeout(() => setIdleWarning(true), IDLE_TIMEOUT_MS - IDLE_WARNING_MS)
    timers.current.idle = window.setTimeout(() => {
      setIdleWarning(false)
      onIdleRef.current?.()
    }, IDLE_TIMEOUT_MS)
  }

  const staySignedIn = useCallback(() => {
    setIdleWarning(false)
    arm()
  }, [])

  useEffect(() => {
    if (!enabled) {
      setIdleWarning(false)
      clear()
      return undefined
    }
    arm()
    const onActivity = () => {
      setIdleWarning(false)
      arm()
    }
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }))
    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity))
      clear()
    }
  }, [enabled])

  return { idleWarning, staySignedIn }
}
