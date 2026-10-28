import React from 'react'
import { createRoot } from 'react-dom/client'
import Customers from '../../src/views/admin/Customers'
import '../../src/index.css'
createRoot(document.getElementById('root')).render(<main className="admin-ui min-h-screen bg-adm-bg p-4 font-sans"><Customers /></main>)
