import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PaymentStatusModal, PackingLotProof, HandoverDialog, DeliveryDetailsModal, FulfillmentActionDialog } from '../../src/views/admin/OmniOperationsHub.jsx'
import '../../src/index.css'
import { SupplierDialog } from '../../src/views/admin/Suppliers.jsx'
import CouponManager from '../../src/views/admin/CouponManager.jsx'
import Customers from '../../src/views/admin/Customers.jsx'
import PhotoManagerModal from '../../src/views/admin/PhotoManagerModal.jsx'
function Harness() {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState('')
  const [lot, setLot] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [actor, setActor] = useState('first-staff')
  const params = new URLSearchParams(location.search)
  window.switchActor = () => setActor('next-staff')
  if (params.has('media')) return <main className="admin-bos bg-adm-bg min-h-screen p-3">
    <button onClick={() => setOpen(true)}>Review product photos</button><p role="status">{saved}</p>
    {open && <PhotoManagerModal key={actor} product={{ sku: 'TEST-PANTRY', status: 'Draft', primary_image_url: 'https://images.example.test/pantry.png' }} onClose={() => setOpen(false)} onSave={() => setSaved('Assignment refreshed')} />}
  </main>
  if (params.has('wholesale')) return <main className="admin-bos bg-adm-bg min-h-screen p-3"><Customers key={actor} /></main>
  if (params.has('coupons')) return <main className="admin-bos"><CouponManager key={actor} secureMode /></main>
  if (params.has('fulfillment')) {
    const kind = params.get('fulfillment')
    const Dialog = kind === 'handover' ? HandoverDialog : kind === 'delivery' ? DeliveryDetailsModal : kind === 'supplier' ? SupplierDialog : FulfillmentActionDialog
    window.switchActor = () => setActor('next-staff')
    return <main className="admin-bos"><button onClick={() => setOpen(true)}>Review local command</button><p role="status">{saved}</p>
      {open && <Dialog key={actor} retrySafe={!params.has('legacy')} order={{ id: 'local-order', publicReference: 'LOCAL-ORDER' }}
        action={{ title: 'Transfer exact lot custody', reference: 'BOX-123 · LOT-ABC', details: '3 × SKU-123 to Receiving staff',
          impact: 'Reserved units cannot move.', payload: { batchId: 'local-lot', quantity: 3, toCustodian: 'Receiving staff' } }} onClose={() => setOpen(false)} onCancel={() => setOpen(false)}
        onSave={async (payload, key) => {
          window.commands ||= []
          window.commands.push({ payload, key })
          const result = await new Promise(resolve => { window.finishCommand = resolve })
          if (result.ok) setSaved('Recorded once')
          return result
        }} />}
    </main>
  }
  if (params.has('packing')) return <main className="admin-bos"><PackingLotProof
    allocations={['A', 'B', 'UNKNOWN'].map(id => ({ id, sku: 'SAME-SKU', quantity: 2, packed_quantity: 0,
      lot: id === 'UNKNOWN' ? {} : { batch_code: `BATCH-${id}`, expiry_date: '2027-06-01', box_code: `BOX-${id}`, hub: 'Manila', custodian: 'Packing staff' } }))}
    value={lot} confirmed={confirmed} disabled={false} onSelect={value => { setLot(value); setConfirmed(false) }} onConfirm={setConfirmed} /></main>
  return <main className="admin-bos"><button onClick={() => setOpen(true)}>Review local payment</button><p role="status">{saved}</p>
    {open && <PaymentStatusModal secure={params.get('legacy') !== '1'}
      order={{ id: 'local-order', publicReference: 'LOCAL-PAYMENT', paymentStatus: params.get('state') || 'failed', updatedAt: '2026-09-06T00:00:00Z' }}
      onClose={() => setOpen(false)} onSave={async (target, note) => {
        await new Promise(resolve => { window.finishPayment = resolve })
        if (params.get('uncertain') === '1') return { ok: false, uncertain: true, error: 'The payment command did not confirm. Reconcile before retrying.' }
        setSaved(`${target}: ${note}`); setOpen(false); return { ok: true }
      }} />}
  </main>
}
createRoot(document.getElementById('root')).render(<Harness />)
