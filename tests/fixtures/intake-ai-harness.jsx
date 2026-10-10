import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import AutomaticIntakePanel from '../../src/views/admin/AutomaticIntakePanel'
import ProductIntakeSessionModal from '../../src/views/admin/ProductIntakeSessionModal'
import BulkCsvImportModal from '../../src/views/admin/BulkCsvImportModal'
import '../../src/index.css'
function Harness() {
  const [open, setOpen] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const session = { id: 'e74a4161-72ca-4d72-8f59-37aa690e1869', product_id: 'fixture-draft', field_decisions: { name: 'accepted' }, draft_payload: { product: { name: 'Fixture package' } } }
  return <main className="admin-bos bg-[#161922] p-4 text-white min-h-screen"><button className="min-h-[44px]" onClick={() => setOpen(!open)}>Close / reopen intake fixture</button>{open && <AutomaticIntakePanel session={session} isOnline={true} onBusy={() => {}} onContent={() => setLoaded(true)} />}<p>Manual ChatGPT Projects</p>{loaded && <p>Field review loaded</p>}</main>
}
function ModalHarness() {
  const [actor, setActor] = useState(0)
  const [open,setOpen] = useState(true)
  const [selection,setSelection] = useState(null)
  window.toggleImportedFixture=()=>{setSelection({id:'20000000-0000-4000-8000-000000000002',recordVersion:'8'});setOpen(value=>!value)}
  return <main className="admin-bos"><button onClick={() => setActor(value => value + 1)}>Replace fixture actor</button>
    <button onClick={()=>{setSelection({id:'20000000-0000-4000-8000-000000000002',recordVersion:'8'});setOpen(!open)}}>Close / select different imported fixture</button>
    <ProductIntakeSessionModal key={actor} isOpen={open} existingProduct={selection} onClose={() => {}} onProductCreated={() => {}} onExistingProduct={() => {}} />
  </main>
}
function CsvHarness() {
  const [selection,setSelection] = useState(null)
  return <main className="admin-bos">{selection
    ? <ProductIntakeSessionModal isOpen={true} existingProduct={selection} onClose={() => {}} onProductCreated={() => {}} />
    : <BulkCsvImportModal onClose={() => {}} onImportComplete={() => {}} onReviewImported={setSelection} />}</main>
}
createRoot(document.getElementById('root')).render(location.search === '?modal'
  ? <ModalHarness />
  : location.search === '?csv' ? <CsvHarness /> : <Harness />)
