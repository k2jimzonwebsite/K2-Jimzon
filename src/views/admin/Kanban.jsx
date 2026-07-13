// Channel-segregated fulfillment board: packing never mixes across channels.

const COLUMNS = [
  {
    id: 'shopee1',
    name: 'Shopee — Pasabuy Europe',
    meta: 'Preferred seller · 4.9★',
    accent: '#ee4d2d',
    orders: [
      { id: '2507-8841', buyer: 'mariel_c***', items: 'Nutella Biscuits ×2, Lavazza Oro', total: 1647, status: 'To pack', hot: true },
      { id: '2507-8836', buyer: 'jdc_manila', items: 'Pistacchiosa ×1', total: 749, status: 'To pack' },
      { id: '2507-8829', buyer: 'ana.reyes88', items: 'Milano № 21, Perlier Honey', total: 948, status: 'Packed' },
    ],
  },
  {
    id: 'lazada',
    name: 'Lazada — K2 Jimzon',
    meta: '172 SKUs mirrored',
    accent: '#f36f21',
    orders: [
      { id: '2507-3310', buyer: 'kath_v***', items: 'Rio Mare tripack ×3', total: 1275, status: 'To pack', hot: true },
      { id: '2507-3304', buyer: 'buboy.sm', items: 'Barilla Pesto ×2, Tortellini', total: 1043, status: 'Packed' },
    ],
  },
  {
    id: 'web',
    name: 'Website — Retail',
    meta: 'QR Ph auto-confirmed',
    accent: '#c8102e',
    orders: [
      { id: 'K2-77012', buyer: 'Camille Diaz', items: 'Pistacchiosa ×2, Lavazza Oro', total: 2147, status: 'Paid · to pack', hot: true },
      { id: 'K2-77008', buyer: 'R. Buenaventura', items: 'Milano № 21 ×1', total: 549, status: 'With courier' },
    ],
  },
  {
    id: 'wholesale',
    name: 'Website — Wholesale',
    meta: 'Tier pricing applied',
    accent: '#0d47a1',
    orders: [
      { id: 'WS-2214', buyer: 'Bella Vita Trading', items: 'Lavazza Oro ×24, Pesto ×36', total: 21504, status: 'To pack', hot: true },
      { id: 'WS-2211', buyer: 'Casa Nina Deli', items: 'Tortellini ×48', total: 14496, status: 'Awaiting pickup' },
    ],
  },
]

const STATUS_TONE = {
  'To pack': 'bg-crimson-wash text-crimson',
  'Paid · to pack': 'bg-crimson-wash text-crimson',
  Packed: 'bg-forest-wash text-forest',
  'With courier': 'bg-navy/8 text-navy-soft',
  'Awaiting pickup': 'bg-amber-wash text-amber',
}

export default function Kanban() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-3">
      {COLUMNS.map((col) => (
        <section key={col.id} className="w-72 shrink-0 md:w-[calc(25%-12px)] md:min-w-64">
          <header className="mb-2.5 flex items-start justify-between px-1">
            <div>
              <h2 className="flex items-center gap-2 text-[13px] font-bold">
                <span className="h-2 w-2 rounded-full" style={{ background: col.accent }} />
                {col.name}
              </h2>
              <p className="ml-4 text-[11px] text-navy-faint">{col.meta}</p>
            </div>
            <span className="rounded bg-navy/8 px-1.5 py-0.5 text-[11px] font-semibold tabular">
              {col.orders.length}
            </span>
          </header>
          <div className="space-y-2.5">
            {col.orders.map((o) => (
              <article
                key={o.id}
                className="cursor-grab rounded-lg border border-line bg-paper p-3 shadow-card transition-shadow hover:shadow-float active:cursor-grabbing"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold tabular">{o.id}</span>
                  <span className={'rounded px-1.5 py-0.5 text-[10px] font-semibold ' + (STATUS_TONE[o.status] ?? '')}>
                    {o.status}
                  </span>
                </div>
                <p className="mt-1.5 text-[12.5px] font-medium">{o.buyer}</p>
                <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-navy-soft">{o.items}</p>
                <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                  <span className="text-[13px] font-bold tabular">
                    ₱{o.total.toLocaleString('en-PH')}
                  </span>
                  {o.hot && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-crimson">
                      Before 3pm
                    </span>
                  )}
                </div>
              </article>
            ))}
            <button className="w-full rounded-lg border border-dashed border-navy/20 py-2 text-[11.5px] font-medium text-navy-soft hover:border-navy/40 hover:text-navy">
              Print pull list
            </button>
          </div>
        </section>
      ))}
    </div>
  )
}
