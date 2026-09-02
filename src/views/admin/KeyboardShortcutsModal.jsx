import { ADMIN_SHORTCUTS } from './adminOperations'
import { XIcon } from '../../components/ui/icons'
import { AdminDialog } from '../../components/ui/AdminDialog'

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null
  const groups = [...new Set(ADMIN_SHORTCUTS.map(item => item.group))]

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <AdminDialog onClose={onClose} labelledBy="shortcut-title">
      <section
        className="w-full max-w-xl overflow-hidden rounded-adm border border-adm-line bg-adm-surface text-white shadow-adm-float"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-adm-line bg-adm-sunken px-5 py-4">
          <div>
            <h2 id="shortcut-title" className="text-base font-semibold">Keyboard shortcuts</h2>
            <p className="mt-1 text-sm text-white/50">Shortcuts pause while you type in a field. They never skip a confirmation or server rule.</p>
          </div>
          <button onClick={onClose} aria-label="Close shortcuts" className="flex h-10 w-10 items-center justify-center rounded-adm-sm text-white/50 hover:bg-white/5 hover:text-white">
            <XIcon size={18} />
          </button>
        </header>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5 custom-scrollbar">
          {groups.map(group => (
            <div key={group}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/35">{group}</p>
              <div className="divide-y divide-adm-line rounded-adm-sm border border-adm-line">
                {ADMIN_SHORTCUTS.filter(item => item.group === group).map(item => (
                  <div key={item.id} className="flex min-h-12 items-center justify-between gap-4 px-3 py-2.5">
                    <span className="text-sm text-white/75">{item.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.keys.map(key => <kbd key={key} className="min-w-7 rounded border border-white/15 bg-adm-sunken px-2 py-1 text-center font-mono text-xs text-white/70">{key}</kbd>)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      </AdminDialog>
    </div>
  )
}
