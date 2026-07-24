import { useState } from 'react'
import { DAILY_FLOW } from './adminGuide'

// A read-and-go daily walkthrough. New staff read it top-to-bottom and can jump
// straight to each screen — so the workflow needs no verbal explaining.
export default function StartHereGuide({ isOpen, onClose, onNavigate }) {
  const [open, setOpen] = useState({})
  if (!isOpen) return null

  const jump = (section) => { if (section && onNavigate) onNavigate(section); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0E121E] text-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-white/10 bg-[#09090b] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Start here — your daily workflow</h2>
            <p className="mt-0.5 text-sm text-white/50">Read top to bottom. This is everything you do in a shift.</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white">✕</button>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <ol className="space-y-2.5">
            {DAILY_FLOW.map((s, i) => (
              <li key={i} className="rounded-xl border border-white/10 bg-[#161922] p-3.5">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue/15 text-sm font-bold text-blue">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{s.icon} {s.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/65">{s.body}</p>
                    {s.more && (
                      <div className="mt-1.5">
                        <button onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))} className="text-xs font-medium text-blue hover:underline">
                          {open[i] ? 'Less ▴' : 'More info ▸'}
                        </button>
                        {open[i] && <p className="mt-1 text-xs leading-relaxed text-white/50">{s.more}</p>}
                      </div>
                    )}
                  </div>
                  {s.section && (
                    <button onClick={() => jump(s.section)} className="shrink-0 self-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white">
                      Open →
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 bg-[#09090b] px-6 py-4">
          <p className="text-sm text-white/60">
            Stuck on anything? Click the floating <span className="font-semibold text-white">🧭 Guide</span> button and ask — e.g. “where do I pack my box?”
          </p>
        </div>
      </div>
    </div>
  )
}
