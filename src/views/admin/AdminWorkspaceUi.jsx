import { AlertIcon, CheckIcon, ClockIcon, InboxIcon } from '../../components/ui/icons'

const TONES = {
  neutral: 'border-white/12 bg-white/[0.045] text-white/60',
  info: 'border-blue/35 bg-blue/10 text-blue',
  success: 'border-forest/35 bg-forest/10 text-forest',
  warning: 'border-amber/35 bg-amber/10 text-amber',
  danger: 'border-crimson/40 bg-crimson/10 text-crimson',
}

export function WorkspaceIntro({ eyebrow, title, description, status, statusTone = 'neutral', actions }) {
  return (
    <header className="border-b border-adm-line pb-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue">{eyebrow}</p>}
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">{title}</h2>
          {description && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-white/50">{description}</p>}
        </div>
        {(status || actions) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {status && <StatusPill tone={statusTone}>{status}</StatusPill>}
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}

export function MetricRail({ items, columns = 'lg:grid-cols-4' }) {
  return (
    <dl className={`grid grid-cols-2 overflow-hidden rounded-adm border border-adm-line bg-adm-surface ${columns}`}>
      {items.map((item, index) => (
        <div key={item.label} className={`min-w-0 border-adm-line px-3 py-3 sm:px-4 sm:py-3.5 ${index >= 2 ? 'border-t' : ''} ${index % 2 ? 'border-l' : ''} ${index ? 'lg:border-l' : 'lg:border-l-0'} lg:border-t-0`}>
          <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">
            {item.label}
            {item.flag && <span className={`h-1.5 w-1.5 rounded-full ${item.flag}`} aria-hidden="true" />}
          </dt>
          <dd className={`mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight ${item.tone || 'text-white'}`}>{item.value}</dd>
          {item.detail && <p className="mt-1 truncate text-[11px] text-white/40" title={item.detail}>{item.detail}</p>}
        </div>
      ))}
    </dl>
  )
}

export function SectionHeading({ title, description, count, action }) {
  return (
    <div className="flex flex-col gap-2 border-b border-adm-line pb-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {count !== undefined && <span className="font-mono text-xs text-white/40">{count}</span>}
        </div>
        {description && <p className="mt-1 text-xs leading-relaxed text-white/45">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatusPill({ tone = 'neutral', children, className = '' }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-semibold ${TONES[tone] || TONES.neutral} ${className}`}>{children}</span>
}

export function StateBanner({ tone = 'neutral', children, role }) {
  const Icon = tone === 'danger' || tone === 'warning' ? AlertIcon : tone === 'success' ? CheckIcon : ClockIcon
  return (
    <div role={role || (tone === 'danger' ? 'alert' : 'status')} className={`flex items-start gap-2.5 rounded-adm-sm border p-3 text-sm leading-relaxed ${TONES[tone] || TONES.neutral}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

export function EmptyState({ title, description, icon: Icon = InboxIcon }) {
  return (
    <div className="border border-dashed border-adm-line px-5 py-10 text-center">
      <Icon size={24} className="mx-auto text-white/30" />
      <p className="mt-3 text-sm font-semibold text-white/75">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-white/40">{description}</p>}
    </div>
  )
}

export const secondaryButton = 'adm-btn border border-adm-line bg-white/[0.04] text-white/70 transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-adm-line-strong hover:bg-white/[0.07] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70'
export const primaryButton = 'adm-btn bg-blue text-white transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-blue-deep active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70'
