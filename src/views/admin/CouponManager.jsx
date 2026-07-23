import { useState } from 'react'
import { useStore } from '../../context/StoreContext'

export default function CouponManager() {
  const { coupons, createCoupon, toggleCouponStatus, deleteCoupon } = useStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [broadcastCode, setBroadcastCode] = useState(null)
  const [copiedText, setCopiedText] = useState(false)

  // Form State
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('percentage') // 'percentage' | 'fixed'
  const [value, setValue] = useState(10)
  const [minSpend, setMinSpend] = useState(1000)
  const [maxUses, setMaxUses] = useState(50)
  const [expiryDate, setExpiryDate] = useState('2026-12-31')
  const [isHunt, setIsHunt] = useState(false)
  const [clue, setClue] = useState('')

  const handleCreate = (e) => {
    e.preventDefault()
    if (!code.trim()) return

    createCoupon({
      code,
      description,
      type,
      value,
      minSpend,
      maxUses,
      expiryDate,
      isHunt,
      clue,
    })

    // Reset Form
    setCode('')
    setDescription('')
    setType('percentage')
    setValue(10)
    setMinSpend(1000)
    setMaxUses(50)
    setIsHunt(false)
    setClue('')
    setShowCreateModal(false)
  }

  const handleCopyBroadcast = (c) => {
    const text = `🎁 EXCLUSIVE K2 JIMZON VOUCHER DROP! 🇮🇹\n\nCode: ${c.code}\nDiscount: ${c.type === 'percentage' ? c.value + '% OFF' : '₱' + c.value + ' OFF'}\nMin Spend: ₱${c.minSpend.toLocaleString()}\n${c.isHunt ? '🔍 Secret Clue: ' + c.clue : 'Claim on storefront now!'}\n\nType this code at checkout on k2jimzon.ph!`
    navigator.clipboard.writeText(text)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  const activeCount = coupons.filter(c => c.isActive).length
  const huntCount = coupons.filter(c => c.isHunt && c.isActive).length
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300 font-sans text-white/90">
      
      {/* Header Banner */}
      <div className="bg-[#05080f] border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-amber/20 text-amber px-2 py-0.5 rounded border border-amber/30">
              Promotions & Social Engagement Engine
            </span>
            <span className="text-xs text-white/50">Voucher Creation & Secret Hunt Drops</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-white">Coupons & Voucher Hunt Manager</h1>
          <p className="text-xs text-white/60 mt-1 max-w-2xl">
            Create discount codes, set min spend rules, and deploy secret "Voucher Hunt" drops for your social media audience to discover and claim!
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-amber hover:bg-amber/90 text-navy font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-amber/20 shrink-0 flex items-center gap-2 min-h-[44px]"
        >
          <span>🎟️</span> + Create New Coupon / Secret Drop
        </button>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#05080f] border border-white/10 p-5 rounded-2xl shadow-md">
          <p className="text-xs font-mono uppercase tracking-wider text-white/40">Active Coupons</p>
          <p className="text-2xl font-serif font-bold text-amber mt-1">{activeCount} Coupons</p>
          <p className="text-[11px] text-white/50 mt-1">Ready for storefront & checkout redemption</p>
        </div>

        <div className="bg-[#05080f] border border-white/10 p-5 rounded-2xl shadow-md">
          <p className="text-xs font-mono uppercase tracking-wider text-white/40">Secret Voucher Hunts</p>
          <p className="text-2xl font-serif font-bold text-forest mt-1">{huntCount} Active Drops</p>
          <p className="text-[11px] text-white/50 mt-1">Interactive clues for FB/IG/TikTok followers</p>
        </div>

        <div className="bg-[#05080f] border border-white/10 p-5 rounded-2xl shadow-md">
          <p className="text-xs font-mono uppercase tracking-wider text-white/40">Total Redemptions</p>
          <p className="text-2xl font-serif font-bold text-blue mt-1">{totalRedemptions} Used</p>
          <p className="text-[11px] text-white/50 mt-1">Successful customer checkouts applied</p>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-[#05080f] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-serif font-bold text-lg text-white">All Promotional Vouchers & Hunts</h2>
          <span className="text-xs font-mono text-white/40">{coupons.length} Total Coupons</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/5 text-white/40 uppercase tracking-wider text-[10px] border-b border-white/10">
              <tr>
                <th className="p-4">Code / Campaign</th>
                <th className="p-4">Type & Value</th>
                <th className="p-4">Min Spend</th>
                <th className="p-4">Usage & Limit</th>
                <th className="p-4">Mode</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber text-sm font-sans tracking-wide">{c.code}</span>
                      {c.isHunt && (
                        <span className="text-[9px] bg-forest/20 text-forest border border-forest/40 px-1.5 py-0.5 rounded font-bold">
                          🔍 SECRET HUNT
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/60 font-sans mt-0.5">{c.description}</p>
                    {c.isHunt && c.clue && (
                      <p className="text-[10px] text-amber/80 italic mt-1 font-sans">"{c.clue}"</p>
                    )}
                  </td>

                  <td className="p-4">
                    <span className="font-bold text-white font-sans text-sm">
                      {c.type === 'percentage' ? `${c.value}% OFF` : `₱${c.value} OFF`}
                    </span>
                  </td>

                  <td className="p-4 text-white/80">
                    {c.minSpend > 0 ? `₱${c.minSpend.toLocaleString()}` : 'No Min'}
                  </td>

                  <td className="p-4">
                    <span className="text-white font-bold">{c.usedCount || 0}</span> / {c.maxUses} used
                  </td>

                  <td className="p-4">
                    {c.isHunt ? (
                      <span className="text-forest font-bold">Secret Clue Hunt</span>
                    ) : (
                      <span className="text-white/60">Standard Promo</span>
                    )}
                  </td>

                  <td className="p-4">
                    <button
                      onClick={() => toggleCouponStatus(c.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                        c.isActive
                          ? 'bg-forest/20 text-forest border-forest/40 hover:bg-forest/30'
                          : 'bg-white/10 text-white/40 border-white/10 hover:bg-white/20'
                      }`}
                    >
                      {c.isActive ? '● ACTIVE' : '○ PAUSED'}
                    </button>
                  </td>

                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setBroadcastCode(c)
                        handleCopyBroadcast(c)
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue/20 hover:bg-blue/30 text-blue border border-blue/30 font-bold transition-all text-[11px]"
                      title="Copy Social Media Broadcast Text"
                    >
                      📢 Broadcast
                    </button>

                    <button
                      onClick={() => deleteCoupon(c.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-crimson/20 hover:bg-crimson/30 text-crimson border border-crimson/30 transition-all text-[11px]"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broadcast Copied Banner */}
      {copiedText && broadcastCode && (
        <div className="fixed bottom-6 right-6 z-50 bg-forest text-white font-mono text-xs p-4 rounded-xl shadow-2xl border border-white/20 animate-in fade-in">
          ✓ Copied Promo Broadcast Text for <strong>{broadcastCode.code}</strong> to clipboard! Paste it directly to FB/IG/TikTok!
        </div>
      )}

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0A101D] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 font-sans">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-serif font-bold text-lg text-white">Create New Coupon / Secret Drop</h3>
                <p className="text-xs text-white/50 font-mono">Configure discount parameters and hunt clues</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/40 hover:text-white text-lg p-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MILAN20 or HUNT500"
                    className="w-full rounded-xl border border-white/15 bg-[#05080f] px-3.5 py-2.5 text-white placeholder:text-white/30 focus:border-amber outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1">Discount Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#05080f] px-3.5 py-2.5 text-white outline-none min-h-[44px]"
                  >
                    <option value="percentage">Percentage OFF (%)</option>
                    <option value="fixed">Fixed Amount OFF (₱)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/40 uppercase font-bold mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 10% OFF authentic Italy chocolates & skincare"
                  className="w-full rounded-xl border border-white/15 bg-[#05080f] px-3.5 py-2.5 text-white placeholder:text-white/30 focus:border-amber outline-none min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1">
                    Value ({type === 'percentage' ? '%' : '₱'})
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#05080f] px-3.5 py-2.5 text-white focus:border-amber outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1">Min Spend (₱)</label>
                  <input
                    type="number"
                    min={0}
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#05080f] px-3.5 py-2.5 text-white focus:border-amber outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1">Max Uses</label>
                  <input
                    type="number"
                    min={1}
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#05080f] px-3.5 py-2.5 text-white focus:border-amber outline-none min-h-[44px]"
                  />
                </div>
              </div>

              {/* Secret Hunt Toggle */}
              <div className="p-3.5 rounded-xl bg-forest/10 border border-forest/30 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHunt}
                    onChange={(e) => setIsHunt(e.target.checked)}
                    className="h-4 w-4 rounded accent-forest"
                  />
                  <span className="font-bold text-forest text-xs">Enable Secret "Voucher Hunt" Mode</span>
                </label>
                <p className="text-[11px] text-white/60 font-sans">
                  Hides the code from standard list until customers solve the clue or type the secret code in the Voucher Hunt Center!
                </p>

                {isHunt && (
                  <div className="pt-2">
                    <label className="block text-[10px] text-white/40 uppercase font-bold mb-1">Secret Clue for Social Media</label>
                    <textarea
                      rows={2}
                      value={clue}
                      onChange={(e) => setClue(e.target.value)}
                      placeholder="e.g. Clue: What Milan airport code equals 500 pesos off? Code = HUNT500"
                      className="w-full rounded-xl border border-white/15 bg-[#05080f] p-2.5 text-white font-sans text-xs focus:border-forest outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-white/15 py-3 font-bold text-white/60 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber hover:bg-amber/90 py-3 font-bold text-navy shadow-lg transition-all"
                >
                  Create & Launch Coupon
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  )
}
