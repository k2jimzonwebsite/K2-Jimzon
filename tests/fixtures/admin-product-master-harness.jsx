import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import InventoryGrid from '../../src/views/admin/InventoryGrid'
import DeliveryRateControl from '../../src/views/admin/DeliveryRateControl'
import ExpressDeliveryQuote from '../../src/views/admin/ExpressDeliveryQuote'
import OrderCancellation, { PendingOrderCancellations } from '../../src/views/admin/OrderCancellation'
import '../../src/index.css'

function Harness() {
  const [actorId, setActorId] = useState('11111111-1111-4111-8111-111111111111')
  const rates = new URLSearchParams(location.search).get('surface') === 'customer-rates'
  const express = new URLSearchParams(location.search).get('surface') === 'express-quote'
  const cancellation = new URLSearchParams(location.search).get('surface') === 'cancellation'
  const [cancelOrder, setCancelOrder] = useState(null)
  return (
  <main className="admin-ui min-h-screen bg-adm-bg p-4 text-white/80 font-sans">
    {(rates || express || cancellation) && <button type="button" onClick={() => { setCancelOrder(null); setActorId(current => current.startsWith('1111') ? '22222222-2222-4222-8222-222222222222' : '11111111-1111-4111-8111-111111111111') }}>Switch synthetic staff</button>}
    {cancellation ? <><button type="button" onClick={() => setCancelOrder({ id: '33333333-3333-4333-8333-333333333333', publicReference: 'WEB-DUMMYCANCEL01' })}>Review dummy cancellation</button>
      <PendingOrderCancellations key={actorId} actorId={actorId} onSelect={setCancelOrder} />
      {cancelOrder && <OrderCancellation key={`${actorId}:${cancelOrder.id}`} actorId={actorId} order={cancelOrder} onClose={() => setCancelOrder(null)} />}</>
      : express ? <ExpressDeliveryQuote key={actorId} actorId={actorId} order={{ id: '33333333-3333-4333-8333-333333333333', publicReference: 'WEB-DUMMYEXPRESS01' }} onClose={() => {}} /> : rates
      ? <DeliveryRateControl key={actorId} actorId={actorId} canManagePilot={new URLSearchParams(location.search).get('role') === 'Admin'} />
      : <InventoryGrid canManageProducts />}
  </main>
)
}
createRoot(document.getElementById('root')).render(<Harness />)
