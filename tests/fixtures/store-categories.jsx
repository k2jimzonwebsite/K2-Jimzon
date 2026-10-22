import React from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from '../../src/context/StoreContext'
import CatalogGrid from '../../src/components/CatalogGrid'
import CategoryTiles from '../../src/components/home/CategoryTiles'
import Footer from '../../src/components/Footer'
import InventoryGrid from '../../src/views/admin/InventoryGrid'
import '../../src/index.css'

createRoot(document.getElementById('root')).render(new URLSearchParams(location.search).get('surface') === 'admin'
  ? <main className="admin-ui min-h-screen bg-adm-bg p-4 text-white"><InventoryGrid actorId="11111111-1111-4111-8111-111111111111" canManageProducts /></main>
  : <StoreProvider><main><CategoryTiles /><CatalogGrid /></main><Footer /></StoreProvider>)
