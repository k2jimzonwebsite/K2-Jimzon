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
      aria-label={onClick ? 'K2 Jimzon home' : undefined}
      className={'group text-left leading-none py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson/40 ' + (onClick ? 'cursor-pointer' : 'cursor-default')}
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
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-crimson px-5 py-3 text-sm font-bold text-white shadow-sm transition-[transform,background-color,box-shadow] duration-150 ease-out-quart hover:bg-crimson-deep hover:shadow-card active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ' +
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
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-navy/20 bg-transparent px-5 py-3 text-sm font-bold text-navy transition-[transform,border-color,background-color] duration-150 ease-out-quart hover:border-navy/45 hover:bg-navy/[0.04] active:scale-[0.97] ' +
        className
      }
    >
      {children}
    </button>
  )
}

// Live stock cue — green when healthy, red when scarce (urgency = key action).
export function StockPill({ stock, className = '' }) {
  const unknown = stock === null || stock === undefined || !Number.isFinite(Number(stock))
  const soldOut = !unknown && stock <= 0
  const low = stock <= 5
  return (
    <span
      data-testid="stock-count"
      aria-label={unknown ? 'Stock check pending' : soldOut ? 'Sold out' : `${stock} units available`}
      className={
        'inline-flex min-h-6 items-center gap-1.5 font-sans text-xs font-bold tabular-nums ' +
        className + ' ' +
        (unknown ? 'text-navy-soft' : soldOut || low ? 'text-crimson' : 'text-forest')
      }
    >
      <span className={'h-1.5 w-1.5 rounded-full ' + (unknown ? 'bg-navy-soft' : soldOut || low ? 'bg-crimson' : 'bg-forest')} />
      {unknown ? 'Stock check pending' : soldOut ? 'Sold out' : low ? `Only ${stock} available` : `${stock} available`}
    </span>
  )
}

// Extracted UI Components

// Standardized section eyebrow
export function Kicker({ children, className = '' }) {
  return (
    <p className={'text-xs font-bold uppercase tracking-[0.22em] text-crimson ' + className}>
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
        className={`${btnPad} min-h-[44px] min-w-[44px] flex items-center justify-center text-navy-soft hover:text-navy transition-colors`} 
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
        className={`${btnPad} min-h-[44px] min-w-[44px] flex items-center justify-center text-navy-soft hover:text-navy disabled:cursor-not-allowed disabled:opacity-35 transition-colors`}
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
    <section className={'overflow-hidden rounded-2xl border border-line bg-paper shadow-sm ' + className} {...props}>
      {tricolor && <Tricolor />}
      {children}
    </section>
  )
}
