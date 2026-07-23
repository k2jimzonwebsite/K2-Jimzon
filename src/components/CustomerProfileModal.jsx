import { useState, useEffect } from 'react'
import { useStore } from '../context/StoreContext'
import { XIcon, CheckIcon } from './ui/icons'

export default function CustomerProfileModal({ isOpen, onClose }) {
  const { user, isWholesale, claimedVouchers, coupons } = useStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [saved, setSaved] = useState(false)

  // Profile Form State
  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('k2_customer_profile')
      if (stored) return JSON.parse(stored)
    } catch (e) {}
    return {
      fullName: user?.email ? user.email.split('@')[0] : 'K2 Gourmet Patron',
      email: user?.email || 'patron@k2jimzon.com',
      mobile: '0917 888 2026',
      address: '128 Bonifacio High Street, BGC, Taguig City, Metro Manila',
      birthday: '1992-08-18',
      preferredCategories: ['Espresso & Coffee', 'Pistachio Creams', 'Italian Biscuits'],
      marketingConsent: true,
    }
  })

  // Password Change State
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirmPass: '' })
  const [passMsg, setPassMsg] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem('k2_customer_profile', JSON.stringify(profile))
    } catch (e) {}
  }, [profile])

  if (!isOpen) return null

  const handleSaveProfile = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleUpdatePassword = (e) => {
    e.preventDefault()
    if (!passwords.newPass || passwords.newPass !== passwords.confirmPass) {
      setPassMsg({ error: true, text: 'New passwords do not match!' })
      return
    }
    setPassMsg({ error: false, text: '🔒 Password updated successfully!' })
    setPasswords({ current: '', newPass: '', confirmPass: '' })
    setTimeout(() => setPassMsg(null), 4000)
  }

  const mockOrders = [
    { id: 'K2-89210', date: '2026-07-20', total: 2798, status: 'In Transit', items: 'Pistì Pistachio Cream (600g), Lavazza Oro (1kg)' },
    { id: 'K2-87102', date: '2026-07-05', total: 1499, status: 'Delivered', items: 'Nutella Biscuits Pouch (304g) x 2' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-paper shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-navy">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-shell px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-lg border border-gold/30">
              👤
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-navy leading-tight">My Customer Account</h2>
              <p className="text-xs text-navy-soft">Shopee/Lazada-style Profile & Delivery Settings</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-navy-faint hover:bg-line hover:text-navy transition-colors">
            <XIcon size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-line bg-shell/50 px-6 gap-2 overflow-x-auto custom-scrollbar">
          {[
            { id: 'profile', label: '👤 Profile & Delivery', icon: '👤' },
            { id: 'security', label: '🔐 Password & Security', icon: '🔐' },
            // TODO(pre-deploy): re-enable once real order history is wired to Supabase (orders now carry customer_email)
            // { id: 'orders', label: '📦 My Orders', icon: '📦' },
            { id: 'rewards', label: '🎁 Voucher Wallet', icon: '🎁' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-gold text-gold bg-gold/5'
                  : 'border-transparent text-navy-soft hover:text-navy hover:bg-shell'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body Contents */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">

          {/* TAB 1: Profile & Delivery Settings */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-soft mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                    required
                    className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm font-semibold text-navy focus:border-gold outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-soft mb-1">Mobile Phone Number</label>
                  <input
                    type="text"
                    value={profile.mobile}
                    onChange={e => setProfile({ ...profile, mobile: e.target.value })}
                    required
                    placeholder="0917 XXX XXXX"
                    className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm font-semibold text-navy focus:border-gold outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-soft mb-1">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={e => setProfile({ ...profile, email: e.target.value })}
                  required
                  className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm font-semibold text-navy focus:border-gold outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-soft mb-1">Default Delivery Address (Metro Manila / Provincial)</label>
                <textarea
                  rows={2}
                  value={profile.address}
                  onChange={e => setProfile({ ...profile, address: e.target.value })}
                  required
                  className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm font-semibold text-navy focus:border-gold outline-none transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-soft mb-1">Birthday (Exclusive Perks)</label>
                  <input
                    type="date"
                    value={profile.birthday}
                    onChange={e => setProfile({ ...profile, birthday: e.target.value })}
                    className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm font-semibold text-navy focus:border-gold outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer pt-4">
                    <input
                      type="checkbox"
                      checked={profile.marketingConsent}
                      onChange={e => setProfile({ ...profile, marketingConsent: e.target.checked })}
                      className="w-4 h-4 rounded text-gold focus:ring-gold border-line"
                    />
                    <span className="text-xs font-medium text-navy-soft">Receive private Viber/Email notifications for new Milan arrivals</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                {saved ? (
                  <span className="text-xs font-bold text-blue flex items-center gap-1.5 animate-in fade-in">
                    <CheckIcon size={16} /> Profile settings updated successfully!
                  </span>
                ) : <span />}
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gold hover:bg-gold-deep text-navy font-bold text-xs shadow-md transition-transform active:scale-95 ml-auto"
                >
                  Save Profile Settings
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Security & Password */}
          {activeTab === 'security' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="p-4 rounded-xl bg-gold/10 border border-gold/30 text-xs font-medium text-navy space-y-1">
                <p className="font-bold text-gold flex items-center gap-1.5">
                  <span>🔒</span> Account Security & Authentication
                </p>
                <p className="text-navy-soft">Update your password or manage credentials for direct storefront access.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-soft mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwords.current}
                  onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm font-semibold text-navy focus:border-gold outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-soft mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwords.newPass}
                    onChange={e => setPasswords({ ...passwords, newPass: e.target.value })}
                    placeholder="Min 6 characters"
                    required
                    className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm font-semibold text-navy focus:border-gold outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-soft mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwords.confirmPass}
                    onChange={e => setPasswords({ ...passwords, confirmPass: e.target.value })}
                    placeholder="Re-enter password"
                    required
                    className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm font-semibold text-navy focus:border-gold outline-none transition-colors"
                  />
                </div>
              </div>

              {passMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold ${passMsg.error ? 'bg-crimson/15 text-crimson border border-crimson/30' : 'bg-blue/15 text-blue border border-blue/30'}`}>
                  {passMsg.text}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-navy hover:bg-navy/90 text-cream font-bold text-xs shadow-md transition-transform active:scale-95"
                >
                  Update Password
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: My Orders */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-navy-soft uppercase tracking-wider">Recent Orders & Handover Status</p>
              {mockOrders.map(ord => (
                <div key={ord.id} className="p-4 rounded-xl border border-line bg-cream flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-gold">{ord.id}</span>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase ${
                      ord.status === 'Delivered' ? 'bg-blue/15 text-blue border border-blue/30' : 'bg-gold/20 text-gold border border-gold/40'
                    }`}>
                      ● {ord.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-navy">{ord.items}</p>
                  <div className="flex items-center justify-between text-xs text-navy-soft pt-1 border-t border-line/50">
                    <span>Ordered on: {ord.date}</span>
                    <span className="font-extrabold text-navy text-sm">Total: ₱{ord.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: Voucher Wallet */}
          {activeTab === 'rewards' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gold uppercase tracking-wider">VIP Patron Tier</p>
                  <p className="text-sm font-extrabold text-navy">Gold Club Member (580 Points)</p>
                </div>
                <span className="px-3 py-1 bg-gold text-navy font-bold text-xs rounded-full shadow-sm">
                  👑 VIP Status Active
                </span>
              </div>

              <p className="text-xs font-bold text-navy-soft uppercase tracking-wider pt-2">Claimed Vouchers ({claimedVouchers.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {claimedVouchers.map(code => {
                  const details = coupons.find(c => c.code === code)
                  return (
                    <div key={code} className="p-3.5 rounded-xl border border-gold/40 bg-gold/5 flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-extrabold text-gold">{code}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gold/20 text-gold">Ready to use</span>
                      </div>
                      <p className="text-xs font-medium text-navy-soft">{details?.description || 'Exclusive Merienda Discount Voucher'}</p>
                      <p className="text-[10px] text-navy-faint font-mono">Min Spend: ₱{details?.minSpend || 0}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-line bg-shell px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-line hover:bg-line/70 text-navy font-bold text-xs transition-colors"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  )
}
