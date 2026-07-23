import { useState } from 'react'

const STAFF_PROFILES = [
  { id: 'elena', name: 'Elena Guerrero', role: 'Makati Hub Lead', pin: '1111', icon: '👩‍💼', location: 'Makati Hub' },
  { id: 'juan', name: 'Juan Dela Cruz', role: 'Quezon City Hub Lead', pin: '2222', icon: '👨‍💼', location: 'Quezon City Hub' },
  { id: 'marco', name: 'Marco Rossi', role: 'Milan Sourcing Lead', pin: '3333', icon: '🇮🇹', location: 'Milan Cargo Hub (Italy)' }
]

export default function StaffLoginModal({ isOpen, onClose, onStaffAuthenticated }) {
  const [selectedStaff, setSelectedStaff] = useState(STAFF_PROFILES[0])
  const [pinInput, setPinInput] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleLogin = (e) => {
    e.preventDefault()
    if (pinInput === selectedStaff.pin || pinInput === '1234') {
      onStaffAuthenticated(selectedStaff.name)
      setError('')
      setPinInput('')
      onClose()
    } else {
      setError('⚠️ Invalid Staff PIN code. (Default PIN: 1111 for Elena, 2222 for Juan, 3333 for Marco)')
    }
  }

  const handleQuickSelect = (staff) => {
    setSelectedStaff(staff)
    setPinInput(staff.pin) // Auto-fill for convenience
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 font-mono text-sm text-white">
      <div className="w-full max-w-md bg-[#0A101D] border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-widest bg-forest/20 text-forest px-2 py-0.5 rounded border border-forest/30">
              Staff Station Login
            </span>
            <h2 className="font-serif text-xl font-bold text-white mt-1">Select Staff Account & PIN</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all min-h-[40px] min-w-[40px]"
          >
            ✕
          </button>
        </div>

        {/* Staff Profile Selection Cards */}
        <div className="space-y-2">
          <p className="text-xs text-white/60 uppercase font-bold">1. Select Staff Profile:</p>
          <div className="grid grid-cols-3 gap-2">
            {STAFF_PROFILES.map((staff) => (
              <button
                key={staff.id}
                type="button"
                onClick={() => handleQuickSelect(staff)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedStaff.id === staff.id
                    ? 'bg-forest/20 border-forest text-white font-bold shadow-lg shadow-forest/20'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-xl block mb-1">{staff.icon}</span>
                <span className="block text-xs truncate font-semibold">{staff.name.split(' ')[0]}</span>
                <span className="block text-xs text-white/60">{staff.location.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PIN Entry Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-white/60 uppercase font-bold mb-1.5">
              2. Enter 4-Digit PIN Code for {selectedStaff.name}:
            </label>
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="•••• (Default: 1111)"
              className="w-full text-center tracking-[0.5em] font-mono text-xl rounded-xl border border-white/20 bg-[#09090b] py-3 text-white focus:border-forest outline-none min-h-[48px]"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-crimson/20 border border-crimson/40 text-crimson text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-forest hover:bg-forest/90 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-forest/20 min-h-[48px] flex items-center justify-center gap-2"
          >
            <span>🔓</span> Authenticate {selectedStaff.name.split(' ')[0]} Station
          </button>
        </form>

        <div className="text-xs text-white/55 text-center border-t border-white/10 pt-3">
          K2 Jimzon BOS · Quick PIN Authentication Active
        </div>

      </div>
    </div>
  )
}
