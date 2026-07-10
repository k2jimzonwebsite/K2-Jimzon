import { CheckIcon } from './icons'

// Italian-green trust badge — authenticity, freshness, stock states only.
export function TrustBadge({ children, solid = false }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] ' +
        (solid
          ? 'bg-forest text-white'
          : 'bg-forest-wash text-forest ring-1 ring-forest/15')
      }
    >
      <CheckIcon size={11} className="shrink-0" />
      {children}
    </span>
  )
}

// Philippine-blue badge — wholesale / business contexts ONLY.
export function BizBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-wash px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-blue ring-1 ring-blue/15">
      {children}
    </span>
  )
}

// The brand rule: a quiet 2px Italian-red hairline.
export function Tricolor({ className = '' }) {
  return <div className={'tricolor ' + className} aria-hidden="true" />
}

export function Wordmark({ size = 'text-2xl', onClick, light = false }) {
  return (
    <button
      onClick={onClick}
      className={'group text-left leading-none ' + (onClick ? 'cursor-pointer' : 'cursor-default')}
    >
      <span className={'font-serif font-semibold tracking-tight text-crimson ' + size}>
        K2 Jimzon
      </span>
      <span
        className={
          'mt-1 block text-[10px] font-medium uppercase tracking-[0.32em] ' +
          (light ? 'text-white/60' : 'text-navy-soft')
        }
      >
        Direct Italian imports
      </span>
    </button>
  )
}

export function RedButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={
        'inline-flex items-center justify-center gap-2 rounded-md bg-crimson px-5 py-3 text-[14px] font-semibold text-white shadow-card transition-all duration-200 hover:-translate-y-px hover:bg-crimson-deep hover:shadow-float active:translate-y-0 disabled:opacity-40 ' +
        className
      }
    >
      {children}
    </button>
  )
}

// Kept as an alias so existing imports keep working.
export const CrimsonButton = RedButton

export function GhostButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={
        'inline-flex items-center justify-center gap-2 rounded-md border border-navy/20 px-5 py-3 text-[14px] font-semibold text-navy transition-colors hover:border-navy/50 hover:bg-navy/[0.03] ' +
        className
      }
    >
      {children}
    </button>
  )
}

// Live stock cue — green when healthy, red when scarce (urgency = key action).
export function StockPill({ stock }) {
  const low = stock <= 5
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 text-[11.5px] font-semibold ' +
        (low ? 'text-crimson' : 'text-forest')
      }
    >
      <span className={'h-1.5 w-1.5 rounded-full pulse-dot ' + (low ? 'bg-crimson' : 'bg-forest')} />
      {low ? `Only ${stock} left` : `In stock · ${stock}`}
    </span>
  )
}
