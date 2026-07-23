import { useState, useEffect } from 'react'
import { useStore } from '../../context/StoreContext'
import { supabase } from '../../lib/supabaseClient'

const INITIAL_STAFF = [
  {
    id: 'staff_1',
    name: 'Elena Rostova',
    email: 'elena@k2jimzon.com',
    pin: '1111',
    hub: 'Makati Fulfillment Hub',
    role: 'Generalist / Fulfillment Lead',
    permissions: {
      can_edit_inventory: true,
      can_manage_coupons: true,
      can_print_waybills: true,
      can_manage_inbox: true,
      can_view_financials: false,
      can_transfer_stock: true,
      can_manage_pasabuy: true
    }
  },
  {
    id: 'staff_2',
    name: 'Juan Cruz',
    email: 'juan@k2jimzon.com',
    pin: '2222',
    hub: 'QC Distribution Center',
    role: 'Generalist / Logistics Specialist',
    permissions: {
      can_edit_inventory: true,
      can_manage_coupons: true,
      can_print_waybills: true,
      can_manage_inbox: true,
      can_view_financials: false,
      can_transfer_stock: true,
      can_manage_pasabuy: true
    }
  },
  {
    id: 'staff_3',
    name: 'Marco Rossi',
    email: 'marco@k2jimzon.com',
    pin: '3333',
    hub: 'Milan Sourcing Boutique',
    role: 'Italy Sourcing Specialist',
    permissions: {
      can_edit_inventory: true,
      can_manage_coupons: false,
      can_print_waybills: false,
      can_manage_inbox: true,
      can_view_financials: true,
      can_transfer_stock: true,
      can_manage_pasabuy: true
    }
  }
]

const PERMISSION_KEYS = [
  { key: 'can_edit_inventory', label: '📦 Edit Catalog & Stock', desc: 'Add/edit products, stock counts, and prices' },
  { key: 'can_manage_coupons', label: '🏷️ Create Coupons & Hunts', desc: 'Create promo codes and secret voucher drops' },
  { key: 'can_print_waybills', label: '🖨️ Print Waybills & Slips', desc: 'Generate Shopee/Lazada packing slips & barcodes' },
  { key: 'can_manage_inbox', label: '💬 Customer Messaging', desc: 'Reply to Viber, WhatsApp, and Storefront chats' },
  { key: 'can_transfer_stock', label: '👤 Transfer Stock Custody', desc: 'Reallocate stock between staff members and hubs' },
  { key: 'can_manage_pasabuy', label: '✈ Manage Pasabuy Quotes', desc: 'Calculate landed costs and dispatch quotes' },
  { key: 'can_view_financials', label: '💰 View Master P&L & COGS', desc: 'Access net cash profit metrics & COGS breakdowns' },
]

export default function StaffPermissionManager() {
  const { user, isAdmin } = useStore()
  const isSuperAdmin = true // Admin Mission Control unlocks full master editing control

  const [staffList, setStaffList] = useState(() => {
    try {
      const saved = localStorage.getItem('k2_staff_permissions')
      return saved ? JSON.parse(saved) : INITIAL_STAFF
    } catch {
      return INITIAL_STAFF
    }
  })

  const [showAddModal, setShowAddModal] = useState(false)
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    pin: '4444',
    hub: 'Makati Fulfillment Hub',
    role: 'Generalist Staff'
  })

  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    localStorage.setItem('k2_staff_permissions', JSON.stringify(staffList))
  }, [staffList])

  const handleTogglePermission = (staffId, permKey) => {
    setStaffList(prev => prev.map(s => {
      if (s.id === staffId) {
        return {
          ...s,
          permissions: {
            ...s.permissions,
            [permKey]: !s.permissions[permKey]
          }
        }
      }
      return s
    }))
    triggerSavedNotice()
  }

  const handleUpdatePin = (staffId, newPin) => {
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, pin: newPin } : s))
    triggerSavedNotice()
  }

  const handleAddStaff = (e) => {
    e.preventDefault()
    if (!newStaff.name || !newStaff.email) return

    const created = {
      id: `staff_${Date.now()}`,
      name: newStaff.name,
      email: newStaff.email,
      pin: newStaff.pin || '5555',
      hub: newStaff.hub,
      role: newStaff.role,
      permissions: {
        can_edit_inventory: true,
        can_manage_coupons: true,
        can_print_waybills: true,
        can_manage_inbox: true,
        can_view_financials: false,
        can_transfer_stock: true,
        can_manage_pasabuy: true
      }
    }

    setStaffList(prev => [...prev, created])
    setShowAddModal(false)
    setNewStaff({ name: '', email: '', pin: '4444', hub: 'Makati Fulfillment Hub', role: 'Generalist Staff' })
    triggerSavedNotice()
  }

  const triggerSavedNotice = () => {
    setSavedMessage('✓ Permissions updated live!')
    setTimeout(() => setSavedMessage(''), 2000)
  }

  return (
    <div className="space-y-6 text-white font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0E121E] border border-white/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-sans text-2xl font-black text-white">Staff Roles & Permissions Manager</h1>
            <span className={`text-xs font-mono font-black px-3 py-1 rounded-full uppercase border shadow-sm ${isSuperAdmin ? 'bg-gold text-navy border-gold' : 'bg-blue text-white border-blue'}`}>
              {isSuperAdmin ? '👑 Super Admin Master Mode' : '👁️ General Staff View'}
            </span>
          </div>
          <p className="text-xs text-white/80 font-medium mt-1">
            Manage station 4-digit PIN logins and granular access controls for all team members.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue hover:bg-blue-deep text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 min-h-[44px]"
          >
            <span>+</span> Add New Staff Member
          </button>
        )}
      </div>

      {savedMessage && (
        <div className="p-3.5 rounded-xl bg-blue/20 border border-blue text-white text-xs font-bold animate-in fade-in">
          {savedMessage}
        </div>
      )}

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {staffList.map((s) => (
          <div key={s.id} className="bg-[#0E121E] border border-white/20 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-gold/50 transition-all">
            
            {/* Profile Info */}
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-sans font-black text-xl text-white">{s.name}</h3>
                  <p className="text-xs text-white/80 font-mono font-semibold">{s.email}</p>
                </div>
                <span className="text-xs font-mono bg-gold/20 text-gold border border-gold/40 px-2.5 py-1 rounded-lg font-extrabold">
                  {s.hub}
                </span>
              </div>

              <p className="text-xs text-gold font-bold mt-2.5">Role: {s.role}</p>

              {/* Station 4-Digit PIN Editor */}
              <div className="mt-3 p-3 rounded-xl bg-white/10 border border-white/20 flex items-center justify-between">
                <span className="text-xs font-bold text-white/90">Station 4-Digit PIN:</span>
                {isSuperAdmin ? (
                  <input
                    type="text"
                    maxLength={4}
                    value={s.pin}
                    onChange={(e) => handleUpdatePin(s.id, e.target.value)}
                    className="w-20 text-center font-mono font-black text-gold bg-black/60 border border-gold rounded-lg px-2 py-1 text-base outline-none shadow-sm"
                  />
                ) : (
                  <span className="font-mono font-black text-gold text-base">{s.pin}</span>
                )}
              </div>
            </div>

            {/* Permissions Toggles */}
            <div className="border-t border-white/15 pt-4 space-y-2.5">
              <label className="block text-xs font-extrabold uppercase text-gold">
                Access Permissions:
              </label>

              {PERMISSION_KEYS.map((p) => {
                const isActive = s.permissions?.[p.key] ?? true
                return (
                  <div
                    key={p.key}
                    onClick={() => isSuperAdmin && handleTogglePermission(s.id, p.key)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue/20 border-blue text-white font-bold'
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold font-sans">{p.label}</p>
                      <p className="text-[10px] text-white/40 font-sans">{p.desc}</p>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      isActive ? 'bg-forest text-white' : 'bg-white/10 text-white/40'
                    }`}>
                      {isActive ? 'ENABLED' : 'LOCKED'}
                    </span>
                  </div>
                )
              })}
            </div>

          </div>
        ))}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <form onSubmit={handleAddStaff} className="w-full max-w-md bg-[#0A101D] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-serif font-bold text-lg text-white">Add New Staff Member</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-white/40 hover:text-white">✕</button>
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Staff Full Name</label>
              <input
                type="text"
                required
                value={newStaff.name}
                onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                placeholder="e.g. Sarah Conners"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-blue outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Staff Email</label>
              <input
                type="email"
                required
                value={newStaff.email}
                onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder="sarah@k2jimzon.com"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-blue outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">4-Digit Station PIN</label>
                <input
                  type="text"
                  maxLength={4}
                  value={newStaff.pin}
                  onChange={e => setNewStaff({ ...newStaff, pin: e.target.value })}
                  className="w-full text-center font-mono font-bold text-amber rounded-xl bg-black/40 border border-amber/40 px-3.5 py-2.5 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">Assigned Hub</label>
                <select
                  value={newStaff.hub}
                  onChange={e => setNewStaff({ ...newStaff, hub: e.target.value })}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2.5 text-xs text-white outline-none"
                >
                  <option value="Makati Fulfillment Hub">Makati Hub</option>
                  <option value="QC Distribution Center">QC Hub</option>
                  <option value="Milan Sourcing Boutique">Milan Hub</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-forest hover:bg-forest/90 text-white font-bold py-3 rounded-xl transition-all shadow-lg min-h-[44px] mt-2"
            >
              ✓ Create Staff Account & Enable Default Access
            </button>
          </form>
        </div>
      )}

    </div>
  )
}
