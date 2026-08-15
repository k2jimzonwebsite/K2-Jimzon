import { useState } from 'react'
import { DAILY_FLOW } from './adminGuide'
import WorkflowGuideModal from '../../components/admin/guides/WorkflowGuideModal'

// A read-and-go daily walkthrough. New staff read it top-to-bottom and can jump
// straight to each screen or visual diagram — so the workflow needs no verbal explaining.
export default function StartHereGuide({ isOpen, onClose, onNavigate }) {
  const [open, setOpen] = useState({})
  const [guideModalTab, setGuideModalTab] = useState(null)

  if (!isOpen) return null

  const jump = (section) => { if (section && onNavigate) onNavigate(section); onClose() }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
        <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-adm border border-white/12 bg-adm-surface text-white shadow-2xl">
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between border-b border-adm-line bg-adm-sunken px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">📋</span>
                <h2 className="text-lg font-semibold text-white">Start here — your daily workflow</h2>
              </div>
              <p className="mt-0.5 text-sm text-white/50">Read top to bottom. This is everything you do in a shift.</p>
            </div>
            <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-adm-sm bg-white/5 text-white/50 hover:bg-white/10 hover:text-white">✕</button>
          </div>

          {/* Quick Visual Guide Banner */}
          <div className="border-b border-white/10 bg-gradient-to-r from-sky-500/10 via-amber-500/10 to-emerald-500/10 px-6 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-white/80">
                <span className="text-sm">🗺️</span>
                <span>Visual diagrams available for Flights, Custody, FEFO & Packing</span>
              </div>
              <button
                onClick={() => setGuideModalTab('flights')}
                className="shrink-0 rounded-md border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-xs font-bold text-sky-400 hover:bg-sky-500/25"
              >
                Open Diagrams →
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <ol className="space-y-2.5">
              {DAILY_FLOW.map((s, i) => (
                <li key={i} className="rounded-adm-sm border border-adm-line bg-adm-surface p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue/15 text-sm font-bold text-blue">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">{s.title}</p>
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
                    <div className="flex flex-col gap-1.5 self-center">
                      {s.section && (
                        <button onClick={() => jump(s.section)} className="shrink-0 rounded-adm-sm border border-adm-line bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white">
                          Open →
                        </button>
                      )}
                      {s.section === 'consignment' && (
                        <button
                          onClick={() => setGuideModalTab('flights')}
                          className="shrink-0 rounded-adm-sm border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-400 hover:bg-sky-500/20"
                        >
                          Diagram 🗺️
                        </button>
                      )}
                      {s.section === 'omni_hub' && (
                        <button
                          onClick={() => setGuideModalTab('fulfillment')}
                          className="shrink-0 rounded-adm-sm border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-[10px] font-bold text-purple-400 hover:bg-purple-500/20"
                        >
                          Diagram 🗺️
                        </button>
                      )}
                      {s.section === 'pasabuy_manager' && (
                        <button
                          onClick={() => setGuideModalTab('pasabuy')}
                          className="shrink-0 rounded-adm-sm border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold text-cyan-400 hover:bg-cyan-500/20"
                        >
                          Diagram 🗺️
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-adm-line bg-adm-sunken px-6 py-4">
            <p className="text-sm text-white/60">
              Stuck on anything? Open the <span className="font-semibold text-white">Operations guide</span> or view visual diagrams for exact rules.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Workflow Modal */}
      {guideModalTab && (
        <WorkflowGuideModal
          isOpen={!!guideModalTab}
          defaultTab={guideModalTab}
          onClose={() => setGuideModalTab(null)}
          onNavigate={onNavigate}
        />
      )}
    </>
  )
}

