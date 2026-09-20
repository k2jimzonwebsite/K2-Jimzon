// Shared help marker for quieter Admin BOS headings. Explanations stay
// available on hover and keyboard focus without taking permanent screen space.
import { useId } from 'react'

export default function HelpTip({ label, text, className = '' }) {
  const tipId = useId()
  if (!text) return null
  return (
    <span className={`group relative inline-flex shrink-0 items-center ${className}`}>
      <button
        type="button"
        aria-label={`About: ${label}`}
        aria-describedby={tipId}
        title={typeof text === 'string' ? text : undefined}
        className="flex h-11 w-11 items-center justify-center rounded-full text-xs font-bold text-white/45 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70 cursor-help"
      >
        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 group-hover:border-white/30">?</span>
      </button>
      <span
        role="tooltip"
        id={tipId}
        className="invisible fixed inset-x-4 bottom-[calc(70px+env(safe-area-inset-bottom))] z-50 rounded-adm-sm border border-adm-line bg-adm-sunken p-2.5 text-xs font-normal leading-relaxed text-white/70 opacity-0 shadow-adm-float transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-1 sm:w-64 sm:max-w-[calc(100vw-2rem)]"
      >
        {text}
      </span>
    </span>
  )
}
