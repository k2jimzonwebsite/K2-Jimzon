import React from 'react'
import {createRoot} from 'react-dom/client'
import {AdminStoreProvider} from '../../src/context/AdminStoreContext'
import ConsignmentManager from '../../src/views/admin/ConsignmentManager'
import '../../src/index.css'
createRoot(document.getElementById('root')).render(<AdminStoreProvider><main className="admin-ui min-h-screen bg-adm-bg p-4 text-white font-sans"><ConsignmentManager/></main></AdminStoreProvider>)
