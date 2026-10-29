import React from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from '../../src/context/StoreContext'
import CatalogGrid from '../../src/components/CatalogGrid'
import CategoryTiles from '../../src/components/home/CategoryTiles'
import Footer from '../../src/components/Footer'
import InventoryGrid from '../../src/views/admin/InventoryGrid'
import Sheet from '../../src/views/admin/Sheet'
import { AdminStoreProvider } from '../../src/context/AdminStoreContext'
import '../../src/index.css'

const params = new URLSearchParams(location.search)
createRoot(document.getElementById('root')).render(params.get('surface') === 'sheet'
  ? <AdminStoreProvider><main className="admin-ui min-h-screen bg-adm-bg p-4 text-white"><Sheet actorId="11111111-1111-4111-8111-111111111111" canManageProducts={params.get('readOnly') !== '1'} /></main></AdminStoreProvider>
  : params.get('surface') === 'admin'
  ? <main className="admin-ui min-h-screen bg-adm-bg p-4 text-white"><InventoryGrid actorId="11111111-1111-4111-8111-111111111111" canManageProducts={params.get('readOnly') !== '1'} /></main>
  : <StoreProvider><main><CategoryTiles /><CatalogGrid /></main><Footer /></StoreProvider>)
