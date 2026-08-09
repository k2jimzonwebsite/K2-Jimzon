import { useState } from 'react'
import { GlobeIcon, PlaneIcon } from '../../components/ui/icons'
import PurchaseOrders from './PurchaseOrders'
import ConsignmentManager from './ConsignmentManager'

export default function Kanban() {
  const [activeTab, setActiveTab] = useState('consignment')
  return <div className="flex h-full flex-col space-y-5">
    <div className="flex flex-col gap-4 border-b border-adm-line pb-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-forest">Supply chain records</p><h1 className="mt-1 font-serif text-2xl font-bold text-white">Italy purchasing and consignments</h1><p className="mt-1 text-sm text-white/50">Use Fulfillment Hub for customer order requests and packing. This area covers supplier commitments and Italy-to-Manila custody.</p></div>
      <div className="flex gap-2 overflow-x-auto rounded-adm-sm border border-adm-line bg-adm-surface p-1.5"><button onClick={() => setActiveTab('consignment')} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-adm-sm px-4 text-sm font-semibold ${activeTab === 'consignment' ? 'bg-blue text-white' : 'text-white/55 hover:text-white'}`}><PlaneIcon size={16} /> Consignments</button><button onClick={() => setActiveTab('purchase_orders')} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-adm-sm px-4 text-sm font-semibold ${activeTab === 'purchase_orders' ? 'bg-blue text-white' : 'text-white/55 hover:text-white'}`}><GlobeIcon size={16} /> Purchase orders</button></div>
    </div>
    <div className="flex-1">{activeTab === 'consignment' ? <ConsignmentManager /> : <PurchaseOrders />}</div>
  </div>
}
