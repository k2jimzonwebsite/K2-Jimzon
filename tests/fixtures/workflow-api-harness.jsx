import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import WorkflowDetailDrawer from '../../src/components/admin/master-workflow-graph/WorkflowDetailDrawer'
import { WORKFLOWS } from '../../src/components/admin/master-workflow-graph/workflowData'
import '../../src/index.css'
function Harness() {
  const workflow = WORKFLOWS.cross_border_lifecycle
  const [node, setNode] = useState(workflow.nodes.find(item => item.adminJump === 'inventory'))
  return <main className="admin-bos"><button onClick={() => setNode(workflow.nodes.find(item => item.adminJump === 'consignment'))}>Choose consignment step</button><WorkflowDetailDrawer node={node} workflow={workflow} /></main>
}
createRoot(document.getElementById('root')).render(<Harness />)
