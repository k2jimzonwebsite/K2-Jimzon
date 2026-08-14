import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAdminAuthRuntime } from './useAdminAuthRuntime'
import { useAdminInboxRuntime } from './useAdminInboxRuntime'
import { adminBffEnabled, getAdminProducts } from '../services/adminBffService'

const AdminStoreContext = createContext(null)

function storefrontUrl() {
  const configured = String(import.meta.env.VITE_STOREFRONT_URL || '').trim()
  if (configured) return configured.replace(/\/$/, '')
  return import.meta.env.DEV ? 'http://127.0.0.1:5173' : ''
}

export function AdminStoreProvider({ children }) {
  const auth = useAdminAuthRuntime()
  const inbox = useAdminInboxRuntime({ enabled: auth.isAdmin })
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const loadProducts = async () => {
    if (!supabase || !auth.isAdmin) {
      setProducts([])
      setLoading(false)
      return
    }
    setLoading(true)
    if (adminBffEnabled()) {
      const result = await getAdminProducts()
      if (!result.ok) {
        setProducts([])
        setLoading(false)
        return
      }
      setProducts((result.products || []).map((product) => ({
        ...product,
        id: product.sku,
        retail: Number(product.srp || 0),
        wholesale: Number(product.wholesale_price || 0),
        stock: product.stock_available == null ? null : Number(product.stock_available),
      })))
      setLoading(false)
      return
    }
    const [productResult, stockResult] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('v_product_stock_from_batches').select('sku,stock_from_batches'),
    ])
    if (!productResult.error) {
      const stockBySku = Object.fromEntries((stockResult.data || []).map((row) => [row.sku, row.stock_from_batches]))
      setProducts((productResult.data || []).map((product) => ({
        ...product,
        id: product.sku,
        retail: Number(product.srp || 0),
        wholesale: Number(product.wholesale_price || 0),
        stock_available: stockBySku[product.sku] ?? product.stock_available ?? 0,
        stock: stockBySku[product.sku] ?? product.stock_available ?? 0,
      })))
    } else {
      setProducts([])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
    if (!supabase || !auth.isAdmin) return undefined
    const channel = supabase.channel('admin:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadProducts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_batches' }, loadProducts)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [auth.isAdmin])

  const openStorefront = () => {
    const url = storefrontUrl()
    if (!url) return false
    window.open(url, '_blank', 'noopener,noreferrer')
    return true
  }

  const value = useMemo(() => ({
    ...auth,
    ...inbox,
    products,
    loading,
    isDark: true,
    go: openStorefront,
    openProduct: openStorefront,
    refreshProducts: loadProducts,
  }), [auth, inbox, products, loading])

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>
}

export function useAdminStore() {
  const value = useContext(AdminStoreContext)
  if (!value) throw new Error('AdminStoreProvider is required.')
  return value
}
