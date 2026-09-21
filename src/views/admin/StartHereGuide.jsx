import { lazy, Suspense, useState } from 'react'
import { XIcon } from '../../components/ui/icons'
import { useBodyScrollLock } from '../../components/ui/useBodyScrollLock'
import { DAILY_FLOW } from './adminGuide'

const WorkflowGuideModal = lazy(() => import('../../components/admin/guides/WorkflowGuideModal'))

// A read-and-go daily walkthrough. New staff read it top-to-bottom and can jump
// straight to each screen or visual diagram — so the workflow needs no verbal explaining.
export default function StartHereGuide({ isOpen, onClose, onNavigate, onOpenOperationsGuide }) {
  const [open, setOpen] = useState({})
  const [guideModalTab, setGuideModalTab] = useState(null)
  useBodyScrollLock(isOpen)

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
                <h2 className="text-lg font-semibold text-white">Start here: your daily workflow</h2>
              </div>
              <p className="mt-0.5 text-sm text-white/50">Read from top to bottom. Each step tells you where to go and what to check.</p>
            </div>
            <button onClick={onClose} aria-label="Close guide" className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-adm-sm bg-white/5 text-white/50 hover:bg-white/10 hover:text-white cursor-pointer"><XIcon size={18} /></button>
          </div>

          {/* Quick Visual Guide Banner */}
          <div className="border-b border-adm-line bg-adm-sunken px-6 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-white/80">
                <span>Interactive workflow map and staff instructions</span>
              </div>
              <button
                onClick={() => setGuideModalTab('master_graph')}
                className="shrink-0 rounded-md border border-adm-line bg-white/[0.04] min-h-11 px-3 text-xs font-bold text-white/70 hover:bg-white/[0.08] hover:text-white cursor-pointer"
              >
                Open workflow map →
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
                          <button onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))} className="inline-flex min-h-11 items-center text-xs font-medium text-blue hover:underline cursor-pointer">
                            {open[i] ? 'Less ▴' : 'More info ▸'}
                          </button>
                          {open[i] && (
                            <p className="mt-1 rounded border border-adm-line bg-adm-sunken p-2 text-xs leading-relaxed text-white/70">
                              {s.more}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <button
                        onClick={() => jump(s.section)}
                        className="shrink-0 rounded-adm-sm border border-adm-line bg-adm-elevated min-h-11 px-3 text-xs font-medium text-white hover:bg-white/10 cursor-pointer"
                      >
                        Go →
                      </button>
                      {s.section === 'consignment' && (
                        <button
                          onClick={() => setGuideModalTab('flights')}
                          className="shrink-0 rounded-adm-sm border border-adm-line bg-white/[0.04] min-h-11 px-3 text-xs font-bold text-white/70 hover:bg-white/[0.08] hover:text-white cursor-pointer"
                        >
                          Diagram
                        </button>
                      )}
                      {s.section === 'inventory' && (
                        <button
                          onClick={() => setGuideModalTab('custody')}
                          className="shrink-0 rounded-adm-sm border border-adm-line bg-white/[0.04] min-h-11 px-3 text-xs font-bold text-white/70 hover:bg-white/[0.08] hover:text-white cursor-pointer"
                        >
                          Diagram
                        </button>
                      )}
                      {s.section === 'omni_hub' && (
                        <button
                          onClick={() => setGuideModalTab('fulfillment')}
                          className="shrink-0 rounded-adm-sm border border-adm-line bg-white/[0.04] min-h-11 px-3 text-xs font-bold text-white/70 hover:bg-white/[0.08] hover:text-white cursor-pointer"
                        >
                          Diagram
                        </button>
                      )}
                      {s.section === 'pasabuy_manager' && (
                        <button
                          onClick={() => setGuideModalTab('pasabuy')}
                          className="shrink-0 rounded-adm-sm border border-adm-line bg-white/[0.04] min-h-11 px-3 text-xs font-bold text-white/70 hover:bg-white/[0.08] hover:text-white cursor-pointer"
                        >
                          Diagram
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-white/60">
                Stuck on anything? Open the <span className="font-semibold text-white">Operations guide</span> or view visual diagrams for exact rules.
              </p>
              {onOpenOperationsGuide && (
                <button onClick={() => { onClose(); onOpenOperationsGuide() }} className="min-h-11 shrink-0 rounded-adm-sm bg-blue px-3 text-xs font-semibold text-white hover:bg-blue-deep">
                  Browse procedures →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Workflow Modal */}
      {guideModalTab && (
        <Suspense fallback={null}>
          <WorkflowGuideModal
            isOpen
            defaultTab={guideModalTab}
            onClose={() => setGuideModalTab(null)}
            onNavigate={onNavigate}
          />
        </Suspense>
      )}
    </>
  )
}
