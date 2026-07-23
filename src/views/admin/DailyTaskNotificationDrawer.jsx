import { useState } from 'react'

export default function DailyTaskNotificationDrawer({ isOpen, onClose, onNavigate }) {
  const [tasks, setTasks] = useState([
    {
      id: 'TASK-101',
      priority: 'high',
      type: 'expiry',
      title: '🔴 Critical FEFO Expiration (14 Days Left)',
      subtitle: 'KIKO Milano 3D Lipgloss (Shade 05) Batch #092',
      details: '4 units expiring on 05-Aug-2026 in Makati Hub.',
      actionLabel: '⚡ Create 20% Off Clearance',
      targetSection: 'inventory',
      completed: false
    },
    {
      id: 'TASK-102',
      priority: 'high',
      type: 'cargo',
      title: '🛬 Italy Cargo Box Handover Pending',
      subtitle: 'Flight Box MIL-BOX-092 Arrived at NAIA',
      details: 'Assigned to Elena Guerrero (Makati Hub) · 10 SKUs inside.',
      actionLabel: '⚡ Claim Custody Stock',
      targetSection: 'omni_hub',
      completed: false
    },
    {
      id: 'TASK-103',
      priority: 'medium',
      type: 'custody',
      title: '📦 Low Staff Custody Alert',
      subtitle: 'Elena Guerrero has 0 units of Lavazza Oro',
      details: '2 pending Shopee orders require stock. Juan Dela Cruz has 4 units.',
      actionLabel: '⚡ 1-Click Transfer from Juan',
      targetSection: 'omni_hub',
      completed: false
    },
    {
      id: 'TASK-104',
      priority: 'medium',
      type: 'pasabuy',
      title: '🛍️ Pending Pasabuy Customer Quote',
      subtitle: 'Maria Santos requested Mulino Bianco Holiday Tin',
      details: 'Landed cost calculated: ₱450 (Air Freight + 12% Duty).',
      actionLabel: '💬 Send Viber Quote',
      targetSection: 'pasabuy_manager',
      completed: false
    }
  ])

  const [message, setMessage] = useState(null)

  if (!isOpen) return null

  const handleExecuteTask = (task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: true } : t))
    setMessage({ success: true, text: `✓ Executed: ${task.actionLabel}! Task marked complete.` })
    
    setTimeout(() => {
      setMessage(null)
      if (onNavigate && task.targetSection) {
        onNavigate(task.targetSection)
        onClose()
      }
    }, 1500)
  }

  const activeTasks = tasks.filter(t => !t.completed)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0A101D] border-l border-white/10 h-full flex flex-col shadow-2xl text-white">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#09090b]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-amber/20 text-amber px-2 py-0.5 rounded border border-amber/30 uppercase">
                Daily Operations Center
              </span>
              <span className="text-sm font-mono text-white/50">{activeTasks.length} Pending Tasks</span>
            </div>
            <h2 className="font-serif text-xl font-bold text-white mt-1">Today's tasks</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-sm">
          
          {message && (
            <div className="p-3 rounded-xl bg-forest/20 border border-forest/40 text-forest text-sm font-mono animate-in fade-in">
              {message.text}
            </div>
          )}

          {activeTasks.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <span className="text-3xl">🎉</span>
              <p className="font-bold text-white">All Daily Tasks Complete!</p>
              <p className="text-white/50 text-xs">No urgent expirations or pending cargo box handovers today.</p>
            </div>
          ) : (
            activeTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-xl border space-y-3 transition-all ${
                  task.priority === 'high' ? 'bg-[#09090b] border-crimson/40 shadow-lg' : 'bg-[#09090b] border-amber/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${
                    task.priority === 'high' ? 'bg-crimson/20 text-crimson border-crimson/30' : 'bg-amber/20 text-amber border-amber/30'
                  }`}>
                    {task.priority === 'high' ? 'High Priority' : 'Action Required'}
                  </span>
                  <span className="text-xs text-white/60">{task.id}</span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-base">{task.title}</h3>
                  <p className="text-neutral-300 font-semibold mt-0.5">{task.subtitle}</p>
                  <p className="text-white/60 text-xs mt-1">{task.details}</p>
                </div>

                <button
                  onClick={() => handleExecuteTask(task)}
                  className="w-full bg-forest hover:bg-forest/90 text-white font-bold text-sm py-2.5 rounded-lg transition-all shadow-md min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  {task.actionLabel}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#09090b] text-xs font-mono text-white/60 text-center">
          K2 Jimzon BOS · Automated Task Engine Active
        </div>

      </div>
    </div>
  )
}
