// ============================================================================
// Admin design kit — one card, one button, one input, one heading, everywhere.
//
// Rules of the system:
//   • Surfaces come from four tokens only: adm-bg, adm-sunken, adm-surface,
//     adm-raised. Never write a raw hex in an admin screen again.
//   • Radius: rounded-adm-sm for controls, rounded-adm for containers.
//   • Padding: containers are p-3.5 on mobile, p-5 from sm up. Nothing else.
//   • Type: title/base/meta below. Body never exceeds 15px on mobile.
//   • Touch targets are 44px minimum; inputs are 16px so iOS never zooms.
// ============================================================================

// ── Shared class tokens (use when a full component doesn't fit) ──────────────
export const card = 'bg-adm-surface border border-adm-line rounded-adm shadow-adm'
export const cardSunken = 'bg-adm-sunken border border-adm-line rounded-adm'
export const input = 'adm-input'
export const btnPrimary = 'adm-btn bg-blue hover:bg-blue-deep text-white'
export const btnSuccess = 'adm-btn bg-forest hover:bg-forest/90 text-white'
export const btnDanger = 'adm-btn bg-crimson hover:bg-crimson-deep text-white'
export const btnGhost = 'adm-btn border border-adm-line bg-white/5 hover:bg-white/10 text-white/80'
export const label = 'adm-label'
export const chip = 'adm-chip'

// Type ramp — import these instead of hand-picking a text-* size per screen.
export const tTitle = 'text-lg sm:text-xl font-semibold tracking-tight text-white'
export const tSection = 'text-xs font-bold uppercase tracking-wider text-gold'
export const tBody = 'text-sm text-white/80 leading-relaxed'
export const tMeta = 'text-xs text-white/50'

// ── Page header — title + optional subtitle + optional right-side actions ────
// The subtitle is decorative on mobile: it costs a full line of vertical space
// on every screen for context the operator already has. Hidden below sm.
export function PageHeader({ title, sub, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-2xl font-semibold sm:font-bold tracking-tight text-white truncate">{title}</h1>
        {sub && <p className="hidden sm:block text-sm text-white/55 mt-1 leading-relaxed max-w-2xl">{sub}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  )
}

// ── Card container ───────────────────────────────────────────────────────────
export function Card({ children, className = '', sunken = false }) {
  return (
    <section className={`${sunken ? cardSunken : card} p-3.5 sm:p-5 ${className}`}>
      {children}
    </section>
  )
}

// ── Card heading (icon + gold label + optional right slot) ───────────────────
export function CardTitle({ icon, children, right }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-base leading-none shrink-0">{icon}</span>}
        <h2 className={`${tSection} truncate`}>{children}</h2>
      </div>
      {right}
    </div>
  )
}

// ── Buttons ──────────────────────────────────────────────────────────────────
export function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }) {
  const map = {
    primary: btnPrimary,
    success: btnSuccess,
    danger: btnDanger,
    ghost: btnGhost,
  }
  return (
    <button className={`${map[variant] || btnPrimary} ${size === 'sm' ? 'adm-btn-sm' : ''} ${className}`} {...rest}>
      {children}
    </button>
  )
}

// ── Labelled form field ──────────────────────────────────────────────────────
export function Field({ label: text, hint, children }) {
  return (
    <div className="min-w-0">
      {text && <span className={label}>{text}</span>}
      {children}
      {hint && <p className="mt-1 text-xs text-white/40 leading-snug">{hint}</p>}
    </div>
  )
}

export function Input({ className = '', ...rest }) {
  return <input className={`${input} ${className}`} {...rest} />
}

// ── KPI tile — the unit the Overview grid is built from ──────────────────────
export function StatTile({ label: text, value, tone = 'neutral', onClick, hint }) {
  const toneMap = {
    neutral: 'text-white',
    good: 'text-forest',
    warn: 'text-amber',
    bad: 'text-crimson',
  }
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`${card} p-3 sm:p-4 text-left w-full min-w-0 ${onClick ? 'hover:bg-adm-raised transition-colors' : ''}`}
    >
      <p className="text-xs font-medium text-white/50 truncate">{text}</p>
      <p className={`mt-0.5 text-xl sm:text-2xl font-bold tabular-nums tracking-tight ${toneMap[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-white/40 truncate">{hint}</p>}
    </Tag>
  )
}

// ── Sticky toolbar — filters/search above a list. Scrolls horizontally on
//    mobile instead of wrapping into a three-row wall of controls. ───────────
export function Toolbar({ children, className = '' }) {
  return (
    <div className={`sticky top-0 z-20 -mx-3.5 sm:mx-0 px-3.5 sm:px-0 py-2 bg-adm-bg/95 backdrop-blur-sm ${className}`}>
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">{children}</div>
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, sub, action }) {
  return (
    <div className={`${cardSunken} p-6 text-center`}>
      <p className="text-2xl leading-none">{icon}</p>
      <p className="mt-2 text-sm font-semibold text-white">{title}</p>
      {sub && <p className="mt-1 text-xs text-white/45 max-w-xs mx-auto leading-relaxed">{sub}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  )
}

// ── Modal shell — every admin modal should wrap in this so headers, footers,
//    scroll behaviour and safe-area insets stay identical across the app. ────
export function ModalShell({ title, sub, onClose, footer, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div
        className={`flex w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92dvh] flex-col overflow-hidden bg-adm-surface border border-adm-line rounded-t-adm sm:rounded-adm shadow-adm-float`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-adm-line bg-adm-sunken px-3.5 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white truncate">{title}</h2>
            {sub && <p className="hidden sm:block text-xs text-white/50 mt-0.5">{sub}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mr-1 flex h-11 w-11 items-center justify-center rounded-adm-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-5">{children}</div>

        {footer && (
          <div
            className="flex shrink-0 items-center justify-end gap-2 border-t border-adm-line bg-adm-sunken px-3.5 py-3"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Inline alert (error / ok / warn) ─────────────────────────────────────────
export function Alert({ kind = 'ok', children }) {
  if (!children) return null
  const map = {
    error: 'border-crimson/40 bg-crimson/10 text-crimson',
    ok: 'border-forest/40 bg-forest/10 text-forest',
    warn: 'border-amber/40 bg-amber/10 text-amber',
  }
  const icon = kind === 'error' ? '⚠️' : kind === 'warn' ? '⚠️' : '✓'
  return <div className={`p-3 rounded-adm-sm border text-sm font-semibold leading-snug ${map[kind]}`}>{icon} {children}</div>
}
