import { useState } from 'react'
import { GlobeIcon, PlaneIcon } from '../../components/ui/icons'
import PurchaseOrders from './PurchaseOrders'
import ConsignmentManager from './ConsignmentManager'

export default function Kanban() {
  const [activeTab, setActiveTab] = useState('consignment')
  return <div className="flex h-full flex-col space-y-5">
    <div className="flex flex-col gap-4 border-b border-adm-line pb-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-[13px] font-semibold uppercase tracking-wider text-white/60">Supply chain records</p><h2 className="mt-1 font-sans text-2xl font-bold text-white">Italy purchasing and consignments</h2><p className="mt-1 max-w-[65ch] text-[15px] leading-relaxed text-white/75">Purchase orders are supplier commitments: what you agreed to buy, how many, at what cost. Consignments are Italy-to-Manila movement: flight, boxes, Milan scans, Manila scans, and receipt. Use Fulfillment Hub for customer orders and packing.</p></div>
      <div className="flex gap-2 overflow-x-auto rounded-adm-sm border border-adm-line bg-adm-surface p-1.5"><button onClick={() => setActiveTab('consignment')} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-adm-sm px-4 text-sm font-semibold ${activeTab === 'consignment' ? 'bg-blue text-white' : 'text-white/55 hover:text-white'}`}><PlaneIcon size={16} /> Consignments</button><button onClick={() => setActiveTab('purchase_orders')} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-adm-sm px-4 text-sm font-semibold ${activeTab === 'purchase_orders' ? 'bg-blue text-white' : 'text-white/55 hover:text-white'}`}><GlobeIcon size={16} /> Purchase orders</button></div>
    </div>
    <div className="rounded-adm-sm border border-adm-line bg-adm-surface px-4 py-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-2.5">
          <GlobeIcon size={16} className="mt-1 shrink-0 text-blue" />
          <p className="text-sm leading-relaxed text-white/80"><span className="font-semibold text-white">Purchase orders:</span> what you agreed to buy. Supplier, items, quantities, cost.</p>
        </div>
        <div className="flex items-start gap-2.5">
          <PlaneIcon size={16} className="mt-1 shrink-0 text-blue" />
          <p className="text-sm leading-relaxed text-white/80"><span className="font-semibold text-white">Consignments:</span> how it travels. Flight, boxes, Milan scans, Manila scans, receipt.</p>
        </div>
      </div>
      <p className="mt-2 border-t border-adm-line pt-2 text-[13px] leading-relaxed text-white/60">Today everything flies Italy to Manila. These same two steps cover new suppliers later.</p>
    </div>
    <div className="flex-1">{activeTab === 'consignment' ? <ConsignmentManager /> : <PurchaseOrders />}</div>
  </div>
}
