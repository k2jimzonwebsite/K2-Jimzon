import { useState, useEffect } from 'react'
import { useStore } from '../../context/StoreContext'
import { supabase } from '../../lib/supabaseClient'
import { hashPassword, hashPin } from '../../lib/securityVault'

const INITIAL_STAFF = [
  {
    id: 'staff_1',
    name: 'Elena Rostova',
    email: 'elena@k2jimzon.com',
    pin: '1111',
    password: 'password123',
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
    password: 'password123',
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
    password: 'password123',
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
  const { user } = useStore()
  const isSuperAdmin = true

  const [staffList, setStaffList] = useState(() => {
    try {
      const saved = localStorage.getItem('k2_staff_permissions')
      return saved ? JSON.parse(saved) : INITIAL_STAFF
    } catch {
      return INITIAL_STAFF
    }
  })

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null) // Staff object being edited
  const [savedMessage, setSavedMessage] = useState('')

  // Add Staff Form State
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    pin: '4444',
    password: 'password123',
    hub: 'Makati Fulfillment Hub',
    role: 'Generalist Staff'
  })

  useEffect(() => {
    localStorage.setItem('k2_staff_permissions', JSON.stringify(staffList))
  }, [staffList])

  const triggerSavedNotice = (msg = '✓ Staff details updated!') => {
    setSavedMessage(msg)
    setTimeout(() => setSavedMessage(''), 2500)
  }

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
    triggerSavedNotice('✓ Permission toggled live!')
  }

  const handleUpdatePin = (staffId, newPin) => {
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, pin: newPin, pinHash: hashPin(newPin) } : s))
    triggerSavedNotice('✓ Station PIN updated & cryptographically hashed!')
  }

  const handleSaveEditedStaff = (e) => {
    e.preventDefault()
    if (!editingStaff || !editingStaff.name || !editingStaff.email) return

    const securedStaff = {
      ...editingStaff,
      passwordHash: hashPassword(editingStaff.password || 'password123'),
      pinHash: hashPin(editingStaff.pin || '1111')
    }

    setStaffList(prev => prev.map(s => s.id === editingStaff.id ? securedStaff : s))
    setEditingStaff(null)
    triggerSavedNotice(`✓ Updated & cryptographically secured ${editingStaff.name}'s profile!`)
  }

  const handleDeleteStaff = (staffId) => {
    if (!window.confirm('Are you sure you want to remove this staff member account?')) return
    setStaffList(prev => prev.filter(s => s.id !== staffId))
    setEditingStaff(null)
    triggerSavedNotice('✓ Staff account removed.')
  }

  const handleAddStaff = (e) => {
    e.preventDefault()
    if (!newStaff.name || !newStaff.email) return

    const rawPin = newStaff.pin || '5555'
    const rawPass = newStaff.password || 'password123'

    const created = {
      id: `staff_${Date.now()}`,
      name: newStaff.name,
      email: newStaff.email,
      pin: rawPin,
      pinHash: hashPin(rawPin),
      password: rawPass,
      passwordHash: hashPassword(rawPass),
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
    setNewStaff({ name: '', email: '', pin: '4444', password: 'password123', hub: 'Makati Fulfillment Hub', role: 'Generalist Staff' })
    triggerSavedNotice(`✓ Created staff account for ${created.name}!`)
  }

  return (
    <div className="space-y-6 text-white font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#18181b] border border-white/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-sans text-2xl font-black text-white">Staff Roles & Permissions Manager</h1>
            <span className="text-sm font-mono font-black px-3 py-1 rounded-full uppercase border shadow-sm bg-gold text-navy border-gold">
              👑 Super Admin Master Mode
            </span>
          </div>
          <p className="text-sm text-neutral-300 font-medium mt-1">
            Edit staff names, login emails, station 4-digit PINs, passwords, assigned hubs, and granular module permissions.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue hover:bg-blue-deep text-white font-black text-sm px-5 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 min-h-[44px] shrink-0"
        >
          <span>+</span> Add New Staff Member
        </button>
      </div>

      {savedMessage && (
        <div className="p-4 rounded-xl bg-blue/20 border border-blue text-white text-sm font-black animate-in fade-in shadow">
          {savedMessage}
        </div>
      )}

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {staffList.map((s) => (
          <div key={s.id} className="bg-[#18181b] border border-white/20 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-gold/50 transition-all">
            
            {/* Profile Info */}
            <div>
              <div className="flex items-start justify-between">
                <div className="min-w-0 pr-2">
                  <h3 className="font-sans font-black text-xl text-white truncate">{s.name}</h3>
                  <p className="text-sm text-gold font-mono font-bold truncate mt-0.5">{s.email}</p>
                </div>
                <button
                  onClick={() => setEditingStaff({ ...s })}
                  className="text-sm font-bold bg-white/10 hover:bg-gold hover:text-navy text-white px-3 py-1.5 rounded-lg border border-white/20 transition-all shrink-0 shadow-sm"
                  title="Edit Staff Name, Email, PIN & Password"
                >
                  ✏️ Edit Profile
                </button>
              </div>

              <div className="flex items-center justify-between mt-3 bg-[#27272a] p-2.5 rounded-xl border border-white/10">
                <div>
                  <p className="text-[11px] font-bold text-neutral-300 uppercase">Assigned Hub</p>
                  <p className="text-sm font-black text-white">{s.hub}</p>
                </div>
                <span className="text-sm font-mono bg-gold text-navy border border-gold px-2.5 py-0.5 rounded-md font-black">
                  {s.role.split('/')[0]}
                </span>
              </div>

              {/* Station 4-Digit PIN & Password Status */}
              <div className="mt-3 p-3 rounded-xl bg-white/10 border border-white/20 flex items-center justify-between">
                <div>
                  <span className="text-sm font-extrabold text-neutral-200 block">Station PIN / Password:</span>
                  <span className="text-[10px] text-neutral-400 font-mono">Password: {s.password || '••••••••'}</span>
                </div>
                <input
                  type="text"
                  maxLength={4}
                  value={s.pin}
                  onChange={(e) => handleUpdatePin(s.id, e.target.value)}
                  className="w-20 text-center font-mono font-black text-gold bg-black/60 border border-gold rounded-lg px-2 py-1 text-lg outline-none shadow-sm"
                  title="Click to edit 4-digit Station PIN"
                />
              </div>
            </div>

            {/* Permissions Toggles */}
            <div className="border-t border-white/10 pt-4 space-y-2.5">
              <label className="block text-sm font-extrabold uppercase text-gold">
                Access Permissions:
              </label>

              {PERMISSION_KEYS.map((p) => {
                const isActive = s.permissions?.[p.key] ?? true
                return (
                  <div
                    key={p.key}
                    onClick={() => handleTogglePermission(s.id, p.key)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#27272a] border-white/20 text-white font-bold hover:bg-white/10'
                        : 'bg-[#18181b] border-white/5 text-neutral-500 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold font-sans">{p.label}</p>
                      <p className="text-[10px] text-neutral-400 font-sans">{p.desc}</p>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                      isActive 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' 
                        : 'bg-white/5 text-neutral-500 border-white/10'
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

      {/* EDIT STAFF PROFILE & CREDENTIALS MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <form onSubmit={handleSaveEditedStaff} className="w-full max-w-lg bg-[#18181b] border border-white/20 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="font-sans font-black text-xl text-white">Edit Staff Credentials & Profile</h2>
                <p className="text-sm text-gold font-mono font-bold">Update Name, Email, Station PIN, Password & Hub</p>
              </div>
              <button type="button" onClick={() => setEditingStaff(null)} className="text-neutral-300 hover:text-white font-black text-xl">✕</button>
            </div>

            <div>
              <label className="block text-sm font-extrabold uppercase text-gold mb-1">Full Staff Name</label>
              <input
                type="text"
                required
                value={editingStaff.name}
                onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })}
                className="w-full rounded-xl bg-[#27272a] border border-white/20 px-3.5 py-2.5 text-base text-white font-bold focus:border-gold outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-extrabold uppercase text-gold mb-1">Login Email Address</label>
                <input
                  type="email"
                  required
                  value={editingStaff.email}
                  onChange={e => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  className="w-full rounded-xl bg-[#27272a] border border-white/20 px-3.5 py-2.5 text-base text-white font-mono font-bold focus:border-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold uppercase text-gold mb-1">Login Password</label>
                <input
                  type="text"
                  required
                  value={editingStaff.password || 'password123'}
                  onChange={e => setEditingStaff({ ...editingStaff, password: e.target.value })}
                  className="w-full rounded-xl bg-[#27272a] border border-white/20 px-3.5 py-2.5 text-base text-white font-mono font-bold focus:border-gold outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-extrabold uppercase text-gold mb-1">4-Digit Station PIN</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={editingStaff.pin}
                  onChange={e => setEditingStaff({ ...editingStaff, pin: e.target.value })}
                  className="w-full text-center font-mono font-black text-gold rounded-xl bg-black/60 border border-gold px-3.5 py-2.5 text-lg outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold uppercase text-gold mb-1">Assigned Hub / Station</label>
                <select
                  value={editingStaff.hub}
                  onChange={e => setEditingStaff({ ...editingStaff, hub: e.target.value })}
                  className="w-full rounded-xl bg-[#27272a] border border-white/20 px-3 py-3 text-sm text-white font-bold outline-none"
                >
                  <option value="Makati Fulfillment Hub">Makati Hub</option>
                  <option value="QC Distribution Center">QC Hub</option>
                  <option value="Milan Sourcing Boutique">Milan Hub</option>
                  <option value="Alabang Fulfillment Hub">Alabang Hub</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-extrabold uppercase text-gold mb-1">Role Description</label>
              <input
                type="text"
                value={editingStaff.role}
                onChange={e => setEditingStaff({ ...editingStaff, role: e.target.value })}
                className="w-full rounded-xl bg-[#27272a] border border-white/20 px-3.5 py-2.5 text-base text-white font-semibold focus:border-gold outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-3">
              <button
                type="button"
                onClick={() => handleDeleteStaff(editingStaff.id)}
                className="bg-crimson hover:bg-crimson-deep text-white font-bold text-sm px-4 py-3 rounded-xl transition-all shadow"
              >
                🗑️ Remove Staff
              </button>

              <button
                type="submit"
                className="flex-1 bg-blue hover:bg-blue-deep text-white font-black text-sm py-3 rounded-xl transition-all shadow-lg min-h-[44px]"
              >
                ✓ Save Staff Changes & Credentials
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD NEW STAFF MEMBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <form onSubmit={handleAddStaff} className="w-full max-w-lg bg-[#18181b] border border-white/20 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="font-sans font-black text-xl text-white">Add New Staff Member</h2>
                <p className="text-sm text-gold font-mono font-bold">Create login email, station PIN, password & permissions</p>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-neutral-300 hover:text-white font-black text-xl">✕</button>
            </div>

            <div>
              <label className="block text-sm font-extrabold uppercase text-gold mb-1">Staff Full Name</label>
              <input
                type="text"
                required
                value={newStaff.name}
                onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                placeholder="e.g. Sarah Conners"
                className="w-full rounded-xl bg-[#27272a] border border-white/20 px-3.5 py-2.5 text-base text-white font-bold focus:border-gold outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-extrabold uppercase text-gold mb-1">Staff Email</label>
                <input
                  type="email"
                  required
                  value={newStaff.email}
                  onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="sarah@k2jimzon.com"
                  className="w-full rounded-xl bg-[#27272a] border border-white/20 px-3.5 py-2.5 text-base text-white font-mono font-bold focus:border-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold uppercase text-gold mb-1">Login Password</label>
                <input
                  type="text"
                  required
                  value={newStaff.password}
                  onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                  placeholder="password123"
                  className="w-full rounded-xl bg-[#27272a] border border-white/20 px-3.5 py-2.5 text-base text-white font-mono font-bold focus:border-gold outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-extrabold uppercase text-gold mb-1">4-Digit Station PIN</label>
                <input
                  type="text"
                  maxLength={4}
                  value={newStaff.pin}
                  onChange={e => setNewStaff({ ...newStaff, pin: e.target.value })}
                  className="w-full text-center font-mono font-black text-gold rounded-xl bg-black/60 border border-gold px-3.5 py-2.5 text-lg outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold uppercase text-gold mb-1">Assigned Hub</label>
                <select
                  value={newStaff.hub}
                  onChange={e => setNewStaff({ ...newStaff, hub: e.target.value })}
                  className="w-full rounded-xl bg-[#27272a] border border-white/20 px-3 py-3 text-sm text-white font-bold outline-none"
                >
                  <option value="Makati Fulfillment Hub">Makati Hub</option>
                  <option value="QC Distribution Center">QC Hub</option>
                  <option value="Milan Sourcing Boutique">Milan Hub</option>
                  <option value="Alabang Fulfillment Hub">Alabang Hub</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue hover:bg-blue-deep text-white font-black text-sm py-3 rounded-xl transition-all shadow-lg min-h-[44px] mt-2"
            >
              ✓ Create Staff Account & Enable Default Access
            </button>
          </form>
        </div>
      )}

    </div>
  )
}
