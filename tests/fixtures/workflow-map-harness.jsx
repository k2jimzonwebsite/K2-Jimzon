import React from 'react'
import { createRoot } from 'react-dom/client'
import MasterWorkflowGraph from '../../src/components/admin/master-workflow-graph/MasterWorkflowGraph'
import '../../src/index.css'

createRoot(document.getElementById('root')).render(
  <main className="admin-bos" style={{ padding: 16 }}>
    <MasterWorkflowGraph />
    {new URLSearchParams(window.location.search).has('dual') && <div aria-label="Second workflow guide"><MasterWorkflowGraph /></div>}
  </main>,
)
