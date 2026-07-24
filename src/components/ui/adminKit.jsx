// ============================================================================
// Admin design kit — one card, one button, one heading, everywhere.
// Import these instead of re-styling each screen so the dashboard feels like
// a single, clean product. Mobile-first: 16px inputs, 44px+ touch targets.
// ============================================================================

// ── Shared class tokens (use when a full component doesn't fit) ──────────────
export const card = 'bg-[#161922] border border-white/10 rounded-2xl shadow-lg'
export const input = 'w-full rounded-xl border border-white/15 bg-black/30 px-4 min-h-12 py-3 text-base text-white placeholder:text-white/35 focus:border-blue focus:outline-none transition-colors'
export const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-blue hover:bg-blue-deep text-white font-bold min-h-12 px-5 disabled:opacity-50 transition-all active:scale-[.99]'
export const btnSuccess = 'inline-flex items-center justify-center gap-2 rounded-xl bg-forest hover:bg-forest/90 text-white font-bold min-h-12 px-5 disabled:opacity-50 transition-all active:scale-[.99]'
export const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 font-semibold min-h-12 px-5 transition-all'
export const label = 'block text-xs font-bold uppercase tracking-wider text-white/45 mb-1.5'

// ── Page header — title + optional subtitle + optional right-side actions ────
export function PageHeader({ title, sub, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-serif text-2xl font-bold text-white tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-white/55 mt-1 leading-relaxed max-w-2xl">{sub}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  )
}

// ── Card container ───────────────────────────────────────────────────────────
export function Card({ children, className = '' }) {
  return <section className={`${card} p-4 sm:p-5 ${className}`}>{children}</section>
}

// ── Card heading (icon + gold label + optional right slot) ───────────────────
export function CardTitle({ icon, children, right }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-lg leading-none">{icon}</span>}
        <h2 className="text-sm font-bold uppercase tracking-wider text-gold truncate">{children}</h2>
      </div>
      {right}
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
  return <div className={`p-3.5 rounded-xl border text-sm font-semibold ${map[kind]}`}>{icon} {children}</div>
}
