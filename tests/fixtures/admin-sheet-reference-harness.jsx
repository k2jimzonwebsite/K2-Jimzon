import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AdminStoreProvider } from '../../src/context/AdminStoreContext'
import Sheet from '../../src/views/admin/Sheet'
import { useReferenceOptions } from '../../src/views/admin/useReferenceOptions'
import '../../src/index.css'

function Probe() {
  const { createOption, reloadReference } = useReferenceOptions()
  const [result, setResult] = useState('')
  return <><button onClick={async () => {
    const results = []
    for (const field of ['brand_id', 'category_id']) {
      await reloadReference(field)
      results.push(await createOption(field, 'Synthetic protected reference'))
    }
    setResult(JSON.stringify(results))
  }}>Probe protected taxonomy callers</button><output>{result}</output></>
}
createRoot(document.getElementById('root')).render(<main className="admin-ui min-h-screen bg-adm-bg p-4 text-white font-sans">
  {location.search.includes('probe') ? <Probe /> : <AdminStoreProvider><Sheet canManageProducts /></AdminStoreProvider>}
</main>)
