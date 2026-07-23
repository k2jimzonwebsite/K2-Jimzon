import { useState } from 'react'

export default function PackingSlipModal({ isOpen, onClose, order }) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !order) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white text-slate-900 rounded-2xl p-6 space-y-6 shadow-2xl">
        
        {/* Header Action Bar (Non-Printable) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300 uppercase">
              Shopee / Lazada Official Air Waybill & Packing Slip
            </span>
            <span className="text-sm text-slate-500 font-mono">Order #{order.id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-4 py-2 rounded-lg transition-all min-h-[40px] flex items-center gap-1.5"
            >
              <span>🖨️</span> Print Label & Slip
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-all min-h-[40px] min-w-[40px]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 📦 OFFICIAL SHOPEE / LAZADA / TIKTOK STYLE AIR WAYBILL STICKER */}
        <div className="border-2 border-slate-900 rounded-xl p-5 space-y-4 font-mono text-sm bg-white">
          
          {/* Top Carrier Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
            <div className="flex items-center gap-3">
              <span className="font-serif text-xl font-bold tracking-tight text-slate-900">J&T <span className="text-red-600">EXPRESS</span></span>
              <span className="text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded uppercase">STANDARD DELIVERY</span>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500">WAYBILL NO.</p>
              <p className="font-bold text-base text-slate-900">JT-PH-88941092</p>
            </div>
          </div>

          {/* Barcode Simulation */}
          <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded">
            <div className="font-mono text-2xl tracking-[0.3em] font-bold text-slate-900">||||| ||||||| |||| |||||||| |||||</div>
            <p className="text-xs font-bold text-slate-500 mt-1">TRACKING BARCODE: *JT88941092PH*</p>
          </div>

          {/* Sender & Recipient Grid */}
          <div className="grid grid-cols-2 gap-4 border-t-2 border-b-2 border-slate-900 py-3">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase">SENDER / SHIP FROM:</p>
              <p className="font-bold text-slate-900">K2 Jimzon BOS (Makati Hub)</p>
              <p className="text-slate-600 text-xs">Staff Custodian: {order.staff_assignee || 'Elena Guerrero'}</p>
              <p className="text-slate-500 text-xs">Contact: +63 917 555 0192</p>
            </div>

            <div className="space-y-1 border-l border-slate-200 pl-4">
              <p className="text-xs font-bold text-slate-400 uppercase">SHIP TO / RECIPIENT:</p>
              <p className="font-bold text-slate-900">{order.customer || 'Maria Santos'}</p>
              <p className="text-slate-600 text-xs">Address: 142 Amorsolo St, Legazpi Village, Makati City</p>
              <p className="text-slate-500 text-xs">Contact: +63 920 111 4455</p>
            </div>
          </div>

          {/* Itemized Order Breakdown */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase">ITEMIZED PARCEL BREAKDOWN (PACK-VERIFIED):</p>
            <table className="w-full text-left text-sm border border-slate-200 rounded overflow-hidden">
              <thead className="bg-slate-100 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2">SKU</th>
                  <th className="p-2">Product Item Description</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items ? (
                  order.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-bold">{it.sku}</td>
                      <td className="p-2">{it.title}</td>
                      <td className="p-2 text-center font-bold">{it.qty}</td>
                      <td className="p-2 text-right text-emerald-600 font-bold">Verified ✓</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-2 font-bold">{order.sku || 'KIKO-3D-05'}</td>
                    <td className="p-2">{order.title || 'KIKO Milano 3D Hydra Lipgloss (Shade 05)'}</td>
                    <td className="p-2 text-center font-bold">{order.quantity || 1}</td>
                    <td className="p-2 text-right text-emerald-600 font-bold">Verified ✓</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* COD & Courier Instruction Footer */}
          <div className="flex items-center justify-between border-t-2 border-slate-900 pt-3 text-xs">
            <div>
              <p className="font-bold text-slate-900">PAYMENT METHOD: COD (Cash on Delivery)</p>
              <p className="text-slate-500 text-xs">Collect ₱{order.total || 750} from recipient upon delivery.</p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-1 rounded border border-emerald-300">
                SCAN VERIFIED BY STAFF ✓
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
