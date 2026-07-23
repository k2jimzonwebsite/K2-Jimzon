import { CheckIcon } from './icons'

// Italian-green trust badge — authenticity, freshness, stock states only.
export function TrustBadge({ children, solid = false }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ' +
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
export function BizBadge({ children, solid = false }) {
  return (
    <span className={
      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ' +
      (solid 
        ? 'bg-blue text-white shadow-card' 
        : 'bg-blue-wash text-blue ring-1 ring-blue/15')
    }>
      {children}
    </span>
  )
}

// The brand rule: an organic warm Terracotta hairline.
export function Tricolor({ className = '' }) {
  return <div className={'h-0.5 bg-crimson opacity-80 rounded-full ' + className} aria-hidden="true" />
}

export function Wordmark({ size = 'text-2xl', onClick, light = false }) {
  return (
    <button
      onClick={onClick}
      className={'group text-left leading-none py-1 ' + (onClick ? 'cursor-pointer' : 'cursor-default')}
    >
      <span className={'font-serif font-semibold tracking-tight text-crimson ' + size}>
        K2 Jimzon
      </span>
      <span
        className={
          'mt-1 block text-xs font-medium uppercase tracking-[0.32em] ' +
          (light ? 'text-white/60' : 'text-navy-soft')
        }
      >
        Direct Italian imports
      </span>
    </button>
  )
}

export function TerracottaButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={
        'inline-flex items-center justify-center gap-2 rounded-xl bg-crimson px-5 py-3 text-base font-semibold text-white shadow-card transition-all duration-200 hover:-translate-y-px hover:bg-crimson-deep hover:shadow-float active:translate-y-0 disabled:opacity-40 ' +
        className
      }
    >
      {children}
    </button>
  )
}

// Kept as aliases so existing imports keep working.
export const RedButton = TerracottaButton
export const CrimsonButton = TerracottaButton

export function GhostButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={
        'inline-flex items-center justify-center gap-2 rounded-xl border border-navy/20 px-5 py-3 text-base font-semibold text-navy transition-colors hover:border-navy/50 hover:bg-navy/[0.03] ' +
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
        'inline-flex items-center gap-1.5 text-xs font-semibold ' +
        (low ? 'text-crimson' : 'text-forest')
      }
    >
      <span className={'h-1.5 w-1.5 rounded-full pulse-dot ' + (low ? 'bg-crimson' : 'bg-forest')} />
      {low ? `Only ${stock} left` : `In stock · ${stock}`}
    </span>
  )
}

// Extracted UI Components

// Standardized section eyebrow
export function Kicker({ children, className = '' }) {
  return (
    <p className={'text-sm font-bold uppercase tracking-[0.2em] text-crimson ' + className}>
      {children}
    </p>
  )
}

// Reusable stepper for cart/quantity inputs
export function QuantityStepper({ value, onChange, max, size = 'sm', className = '' }) {
  const isSm = size === 'sm'
  const btnPad = isSm ? 'p-2' : 'p-3'
  const iconSize = isSm ? 14 : 16
  const width = isSm ? 'w-7 text-sm' : 'w-9 text-base'
  const atLimit = value >= max

  return (
    <div className={'flex items-center rounded-xl border border-line bg-cream shadow-sm ' + className}>
      <button 
        onClick={() => onChange(Math.max(1, value - 1))} 
        className={`${btnPad} text-navy-soft hover:text-navy transition-colors`} 
        aria-label="Decrease quantity"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      </button>
      <span className={`${width} text-center font-semibold tabular`}>{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={atLimit}
        className={`${btnPad} text-navy-soft hover:text-navy disabled:cursor-not-allowed disabled:opacity-35 transition-colors`}
        aria-label={atLimit ? 'Maximum available stock reached' : 'Increase quantity'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}

// Shared Tuscan rounded-3xl surface
export function TuscanCard({ children, className = '', tricolor = false, ...props }) {
  return (
    <section className={'overflow-hidden rounded-3xl border border-line bg-cream/90 backdrop-blur-md shadow-card ' + className} {...props}>
      {tricolor && <Tricolor />}
      {children}
    </section>
  )
}
