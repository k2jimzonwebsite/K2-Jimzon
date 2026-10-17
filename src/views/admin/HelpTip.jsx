// Shared help marker for quieter Admin BOS headings. Supports tap-to-toggle
// and outside/Escape dismissal on phones, plus hover and keyboard focus on desktop.
import { useEffect, useId, useRef, useState } from 'react'

const activeTipSetters = new Set()

function notifyOtherTips(activeSetter) {
  for (const setter of activeTipSetters) {
    if (setter !== activeSetter) setter(false)
  }
}

export default function HelpTip({ label, text, className = '' }) {
  const tipId = useId()
  const rootRef = useRef(null)
  const pointerDownRef = useRef(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    activeTipSetters.add(setOpen)
    return () => {
      activeTipSetters.delete(setOpen)
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  if (!text) return null

  const openExclusively = (next) => {
    if (next) notifyOtherTips(setOpen)
    setOpen(next)
  }

  return (
    <span
      ref={rootRef}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') openExclusively(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse' && !rootRef.current?.contains(document.activeElement)) {
          setOpen(false)
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          pointerDownRef.current = false
          setOpen(false)
        }
      }}
      className={`group relative inline-flex shrink-0 items-center ${className}`}
    >
      <button
        type="button"
        aria-label={`About: ${label}`}
        aria-expanded={open}
        aria-describedby={tipId}
        onPointerDown={() => {
          pointerDownRef.current = true
        }}
        onFocus={() => {
          if (!pointerDownRef.current) openExclusively(true)
        }}
        onClick={() => {
          pointerDownRef.current = false
          openExclusively(!open)
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70 cursor-help select-none touch-manipulation"
      >
        <span
          aria-hidden="true"
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm transition-colors ${
            open ? 'border-blue bg-blue/20 text-white' : 'border-white/25 group-hover:border-white/40'
          }`}
        >
          ?
        </span>
      </button>
      <span
        role="tooltip"
        id={tipId}
        className={`${
          open ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
        } fixed inset-x-4 bottom-[calc(70px+env(safe-area-inset-bottom))] z-50 rounded-adm-sm border border-adm-line bg-adm-sunken p-3 text-sm font-normal leading-relaxed break-words text-white/90 shadow-adm-float transition-opacity duration-150 sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-72 sm:max-w-[calc(100vw-2rem)]`}
      >
        <span className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-white sm:hidden">
          <span>Quick help</span>
          <span className="text-white/50 font-normal">Tap ? to close</span>
        </span>
        <span>{text}</span>
      </span>
    </span>
  )
}
