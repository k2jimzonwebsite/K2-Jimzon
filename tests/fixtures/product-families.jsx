import React from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider, useStore } from '../../src/context/StoreContext'
import MasterProduct from '../../src/views/MasterProduct'
import CatalogGrid from '../../src/components/CatalogGrid'
import CartDrawer from '../../src/components/CartDrawer'
import Checkout from '../../src/views/Checkout'
import InventoryGrid from '../../src/views/admin/InventoryGrid'
import '../../src/index.css'

function Store() {
  const { view, go, refreshCatalog } = useStore()
  return <><nav className="flex gap-4 p-4"><button onClick={() => go('catalog')}>Catalog</button><button onClick={refreshCatalog}>Refresh test catalog</button></nav>
    {view === 'master_product' ? <MasterProduct /> : view === 'checkout' ? <Checkout /> : <CatalogGrid />}<CartDrawer /></>
}
const admin = new URLSearchParams(location.search).get('surface') === 'admin'
createRoot(document.getElementById('root')).render(admin
  ? <main className="admin-ui min-h-screen bg-adm-bg p-4 text-white"><InventoryGrid actorId="11111111-1111-4111-8111-111111111111" canManageProducts /></main>
  : <StoreProvider><Store /></StoreProvider>)
