import { BarcodeIcon, BoxIcon, PlaneIcon, SearchIcon, XIcon } from '../../components/ui/icons'
import { SCAN_WORKFLOWS } from './adminOperations'

const ICONS = {
  new_product: BarcodeIcon,
  pack_order: BoxIcon,
  milan_box: PlaneIcon,
  manila_box: PlaneIcon,
  inventory_lookup: SearchIcon,
}

export default function UniversalScanLauncher({ isOpen, onClose, onNavigate, onInventoryTool }) {
  if (!isOpen) return null

  const choose = workflow => {
    onClose()
    if (workflow.action) onInventoryTool?.(workflow.action)
    else if (workflow.section) onNavigate?.(workflow.section)
  }

  return (
    <div className="fixed inset-0 z-[105] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-center-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-t-adm border border-adm-line bg-adm-surface text-white shadow-adm-float sm:rounded-adm"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-adm-line bg-adm-sunken px-5 py-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-blue"><BarcodeIcon size={17} /><span className="text-xs font-semibold uppercase tracking-[0.12em]">Scan center</span></div>
            <h2 id="scan-center-title" className="text-lg font-semibold">What are you scanning?</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/50">The scan center sends you to the correct guarded workflow. Select the order, flight, or box before unit scans can change operational records.</p>
          </div>
          <button onClick={onClose} aria-label="Close scan center" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-adm-sm text-white/50 hover:bg-white/5 hover:text-white"><XIcon size={18} /></button>
        </header>

        <div className="grid max-h-[68vh] gap-2 overflow-y-auto p-4 custom-scrollbar sm:grid-cols-2">
          {SCAN_WORKFLOWS.map(workflow => {
            const WorkflowIcon = ICONS[workflow.id] || BarcodeIcon
            return (
              <button
                key={workflow.id}
                onClick={() => choose(workflow)}
                className="group flex min-h-[132px] items-start gap-3 rounded-adm-sm border border-adm-line bg-white/[0.025] p-4 text-left transition-[transform,background-color,border-color] duration-150 hover:border-blue/40 hover:bg-blue/[0.06] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-adm-sm border border-adm-line bg-adm-sunken text-blue"><WorkflowIcon size={19} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{workflow.title}</span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-white/55">{workflow.description}</span>
                  <span className="mt-3 block text-xs font-medium text-blue">Open {workflow.destination} →</span>
                </span>
              </button>
            )
          })}
        </div>
        <footer className="border-t border-adm-line bg-adm-sunken px-5 py-3 text-xs leading-relaxed text-white/45">
          One physical unit = one scan. Unexpected, excessive, or mismatched codes become visible exceptions; they are never silently accepted.
        </footer>
      </section>
    </div>
  )
}
