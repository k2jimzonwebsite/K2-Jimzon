import { useState } from 'react'
import { useStore } from '../context/StoreContext'

export default function VoucherHuntCenterModal({ isOpen, onClose }) {
  const { coupons, claimedVouchers, claimCoupon, applyCoupon, appliedCoupon, go } = useStore()

  const [huntInput, setHuntInput] = useState('')
  const [feedback, setFeedback] = useState(null)

  if (!isOpen) return null

  const handleClaimSecret = (e) => {
    e.preventDefault()
    if (!huntInput.trim()) return

    const res = claimCoupon(huntInput)
    if (res.success) {
      setFeedback({ type: 'success', message: res.message })
      setHuntInput('')
    } else {
      setFeedback({ type: 'error', message: res.message })
    }
  }

  const handleClaimPublic = (code) => {
    const res = claimCoupon(code)
    if (res.success) {
      setFeedback({ type: 'success', message: res.message })
    } else {
      setFeedback({ type: 'error', message: res.message })
    }
  }

  const handleApplyToCart = (code) => {
    const res = applyCoupon(code)
    if (res.success) {
      setFeedback({ type: 'success', message: `✓ ${code} applied to your cart!` })
      setTimeout(() => {
        onClose()
        go('checkout')
      }, 800)
    } else {
      setFeedback({ type: 'error', message: res.message })
    }
  }

  // Active public vouchers (non-hunt or already claimed)
  const publicVouchers = coupons.filter(c => c.isActive && !c.isHunt)
  const huntVouchers = coupons.filter(c => c.isActive && c.isHunt)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 font-sans text-navy">
      <div className="w-full max-w-lg bg-cream border border-line rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">🎁</span>
            <div>
              <h2 className="font-serif font-bold text-xl text-navy">Voucher Hunt & Promo Center</h2>
              <p className="text-xs text-navy-soft font-mono">Discover secret promo drops & claim discounts</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-line/40 text-navy hover:bg-line transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl text-xs font-mono font-bold flex items-center justify-between animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-forest/15 text-forest border border-forest/30'
                : 'bg-crimson/15 text-crimson border border-crimson/30'
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* 🕵️ Secret Voucher Hunt Input Box */}
        <div className="bg-navy text-white p-4.5 rounded-2xl shadow-xl space-y-3 font-mono">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <span className="text-base">🔍</span>
            <div>
              <h3 className="font-bold text-sm text-amber font-sans">Have a Secret Clue or Promo Code?</h3>
              <p className="text-white/60 text-[11px]">Enter codes from our IG/FB Live, Viber, or TikTok drops!</p>
            </div>
          </div>

          <form onSubmit={handleClaimSecret} className="flex gap-2">
            <input
              type="text"
              value={huntInput}
              onChange={(e) => setHuntInput(e.target.value)}
              placeholder="e.g. HUNT500 or PASABUY200"
              className="flex-1 rounded-xl border border-white/20 bg-black/40 px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-amber outline-none min-h-[44px] tracking-wider uppercase font-bold"
            />
            <button
              type="submit"
              className="bg-amber hover:bg-amber/90 text-navy font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shrink-0 min-h-[44px]"
            >
              Claim Code
            </button>
          </form>

          {/* Active Secret Clues Hint Carousel */}
          {huntVouchers.length > 0 && (
            <div className="pt-1 border-t border-white/10 space-y-1.5">
              <p className="text-[10px] text-amber font-bold uppercase tracking-wider">💡 Active Secret Clues:</p>
              {huntVouchers.map((hv) => (
                <div key={hv.id} className="text-[11px] text-white/80 bg-white/5 p-2 rounded-lg border border-white/10 italic">
                  {hv.clue || `Hunt Code: "${hv.code}" (${hv.type === 'percentage' ? hv.value + '%' : '₱' + hv.value} OFF)`}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🎟️ Available Public Vouchers */}
        <div className="space-y-3">
          <h3 className="font-serif font-bold text-sm text-navy uppercase tracking-wider text-[11px]">
            Available Public Vouchers
          </h3>

          <div className="space-y-2">
            {publicVouchers.map((v) => {
              const isClaimed = claimedVouchers.includes(v.code)
              const isApplied = appliedCoupon?.code === v.code

              return (
                <div
                  key={v.id}
                  className="bg-white border border-line p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-amber/60 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber text-sm">{v.code}</span>
                      <span className="text-[10px] font-mono font-bold bg-navy/5 text-navy px-1.5 py-0.5 rounded border border-navy/10">
                        {v.type === 'percentage' ? `${v.value}% OFF` : `₱${v.value} OFF`}
                      </span>
                    </div>
                    <p className="text-xs text-navy-soft mt-0.5">{v.description}</p>
                    <p className="text-[10px] text-navy-soft/70 font-mono mt-1">
                      Min Spend: ₱{v.minSpend.toLocaleString()} · Valid till {v.expiryDate}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {isApplied ? (
                      <span className="px-3 py-1.5 bg-forest/20 text-forest text-xs font-mono font-bold rounded-lg border border-forest/40">
                        ✓ APPLIED
                      </span>
                    ) : isClaimed ? (
                      <button
                        onClick={() => handleApplyToCart(v.code)}
                        className="px-3 py-2 bg-navy hover:bg-navy/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm min-h-[38px]"
                      >
                        Use Now ➔
                      </button>
                    ) : (
                      <button
                        onClick={() => handleClaimPublic(v.code)}
                        className="px-3 py-2 bg-amber hover:bg-amber/90 text-navy font-bold text-xs rounded-xl transition-all shadow-sm min-h-[38px]"
                      >
                        Claim Voucher
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-line flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-line/30 hover:bg-line text-navy font-bold text-xs transition-all min-h-[44px]"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  )
}
