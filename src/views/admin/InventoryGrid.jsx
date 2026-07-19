import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function InventoryGrid() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState(null)

  useEffect(() => {
    fetchProducts()
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('public:products:grid')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
        fetchProducts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setProducts(data)
    }
    setLoading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editingProduct) return

    const { sku, title, description, image_url, retail_price, vip_price, total_stock, status } = editingProduct
    
    // Optimistic UI update
    setProducts((prev) => prev.map(p => p.sku === sku ? editingProduct : p))
    setEditingProduct(null)

    // Push to Supabase
    const { error } = await supabase
      .from('products')
      .update({ title, description, image_url, retail_price, vip_price, total_stock, status })
      .eq('sku', sku)
      
    if (error) {
      console.error('Failed to update product:', error)
      fetchProducts() // Revert on failure
    }
  }

  return (
    <div className="animate-in fade-in duration-500 relative min-h-full">
      <div className="mb-6">
        <p className="text-sm text-white/50">Manage your inventory visually. Click Edit to update product details.</p>
      </div>

      {loading && products.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-white/40">Loading products...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
          {products.map(p => (
            <div key={p.sku} className="group relative rounded-xl border border-white/10 bg-[#05080f] overflow-hidden flex flex-col hover:border-blue/50 transition-colors">
              <div className="aspect-square bg-white/5 flex items-center justify-center p-4">
                <img src={p.image_url || '/placeholder.png'} alt={p.title} className="max-h-full max-w-full object-contain drop-shadow-lg" />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono text-white/40 uppercase">{p.sku}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${p.status === 'Draft' ? 'bg-amber-wash text-amber' : 'bg-forest-wash text-forest'}`}>
                    {p.status}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white/90 line-clamp-2 mb-3">{p.title}</h3>
                
                <div className="mt-auto grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-white/30 uppercase text-[9px] tracking-wider mb-0.5">Stock</p>
                    <p className={`font-semibold ${p.total_stock <= 5 ? 'text-crimson' : 'text-white'}`}>{p.total_stock}</p>
                  </div>
                  <div>
                    <p className="text-white/30 uppercase text-[9px] tracking-wider mb-0.5">Retail</p>
                    <p className="font-semibold text-white tabular-nums">₱{Number(p.retail_price).toLocaleString('en-PH')}</p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setEditingProduct(p)}
                className="absolute top-2 right-2 rounded bg-blue/90 backdrop-blur px-3 py-1 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A101D] shadow-2xl overflow-hidden">
            <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-white/5">
              <h3 className="font-serif text-lg font-semibold text-white">Edit Product</h3>
              <button onClick={() => setEditingProduct(null)} className="text-white/40 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Product Title</label>
                <input 
                  type="text" 
                  value={editingProduct.title || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, title: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-blue outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Description (For Storefront)</label>
                <textarea 
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-blue outline-none resize-none h-20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Primary Photo URL</label>
                <input 
                  type="url" 
                  value={editingProduct.image_url || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, image_url: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-blue outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Retail Price (₱)</label>
                  <input 
                    type="number" 
                    value={editingProduct.retail_price}
                    onChange={(e) => setEditingProduct({...editingProduct, retail_price: Math.max(0, Number(e.target.value))})}
                    className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-blue outline-none tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Wholesale Price (₱)</label>
                  <input 
                    type="number" 
                    value={editingProduct.vip_price}
                    onChange={(e) => setEditingProduct({...editingProduct, vip_price: Math.max(0, Number(e.target.value))})}
                    className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-blue outline-none tabular-nums"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Total Stock</label>
                  <input 
                    type="number" 
                    value={editingProduct.total_stock}
                    onChange={(e) => setEditingProduct({...editingProduct, total_stock: Math.max(0, Number(e.target.value))})}
                    className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-blue outline-none tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Status</label>
                  <select 
                    value={editingProduct.status}
                    onChange={(e) => setEditingProduct({...editingProduct, status: e.target.value})}
                    className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-blue outline-none cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 rounded-lg text-sm font-semibold bg-blue text-white hover:bg-blue/90 transition-colors shadow-lg shadow-blue/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
