import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import AutomaticIntakePanel from '../../src/views/admin/AutomaticIntakePanel'
import ProductIntakeSessionModal from '../../src/views/admin/ProductIntakeSessionModal'
import '../../src/index.css'
function Harness() {
  const [open, setOpen] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const session = { id: 'e74a4161-72ca-4d72-8f59-37aa690e1869', product_id: 'fixture-draft', field_decisions: { name: 'accepted' }, draft_payload: { product: { name: 'Fixture package' } } }
  return <main className="admin-bos bg-[#161922] p-4 text-white min-h-screen"><button className="min-h-[44px]" onClick={() => setOpen(!open)}>Close / reopen intake fixture</button>{open && <AutomaticIntakePanel session={session} isOnline={true} onBusy={() => {}} onContent={() => setLoaded(true)} />}<p>Manual ChatGPT Projects</p>{loaded && <p>Field review loaded</p>}</main>
}
createRoot(document.getElementById('root')).render(location.search === '?modal'
  ? <ProductIntakeSessionModal isOpen={true} onClose={() => {}} onProductCreated={() => {}} onExistingProduct={() => {}} />
  : <Harness />)
