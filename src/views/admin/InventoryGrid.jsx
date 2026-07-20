import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import ScanToAiModal from './ScanToAiModal'
import SmartPasteModal from './SmartPasteModal'

export default function InventoryGrid() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [showAiScanner, setShowAiScanner] = useState(false)
  const [showSmartPaste, setShowSmartPaste] = useState(false)

  useEffect(() => {
    if (!supabase) return;
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
    if (!supabase) {
      setLoading(false);
      return;
    }
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

    const { sku, title, why_buy, image_url, srp, wholesale_price, stock_available, status } = editingProduct
    
    if (!supabase) return;

    if (isAdding) {
      if (!sku) {
        alert("SKU is required for new products.");
        return;
      }
      // Optimistic UI update
      setProducts(prev => [editingProduct, ...prev]);
      
      const { error } = await supabase
        .from('products')
        .insert([{ sku, title, why_buy, image_url, srp, wholesale_price, stock_available, status }]);
        
      if (error) {
        console.error('Failed to add product:', error);
        fetchProducts(); // Revert on failure
      }
    } else {
      // Optimistic UI update
      setProducts((prev) => prev.map(p => p.sku === sku ? editingProduct : p))
      
      // Push to Supabase
      const { error } = await supabase
        .from('products')
        .update({ title, why_buy, image_url, srp, wholesale_price, stock_available, status })
        .eq('sku', sku)
        
      if (error) {
        console.error('Failed to update product:', error)
        fetchProducts() // Revert on failure
      }
    }
    
    setEditingProduct(null)
    setIsAdding(false)
  }

  return (
    <div className="animate-in fade-in duration-500 relative min-h-full">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-white/50">Manage your inventory visually. Click Edit to update product details.</p>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAiScanner(true)}
            className="flex items-center gap-2 rounded bg-forest/20 text-forest hover:bg-forest hover:text-white transition-colors px-3 py-1.5 text-xs font-semibold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Scan Box
          </button>
          
          <button 
            onClick={() => setShowSmartPaste(true)}
            className="flex items-center gap-2 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white transition-colors px-3 py-1.5 text-xs font-semibold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Smart Paste AI
          </button>
          
          <button 
            onClick={() => {
              setIsAdding(true);
              setEditingProduct({ sku: `MANUAL-${Math.floor(Math.random()*10000)}`, name: '', why_buy: '', image_url: '', srp: 0, wholesale_price: 0, stock_available: 0, status: 'Draft' });
            }}
            className="flex items-center gap-2 rounded bg-blue/20 text-blue hover:bg-blue hover:text-white transition-colors px-3 py-1.5 text-xs font-semibold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Manual Add
          </button>
        </div>
      </div>

      {showAiScanner && (
        <ScanToAiModal 
          onClose={() => setShowAiScanner(false)} 
          onOpenSmartPaste={() => {
            setShowAiScanner(false)
            setShowSmartPaste(true)
          }}
        />
      )}

      {showSmartPaste && (
        <SmartPasteModal 
          onClose={() => setShowSmartPaste(false)} 
          onProductAdded={() => {
            fetchProducts()
            setShowSmartPaste(false)
          }} 
        />
      )}

      {loading && products.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-white/40">Loading products...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
          {products.map(p => (
            <div key={p.sku} className="group relative rounded-xl border border-white/10 bg-[#05080f] overflow-hidden flex flex-col hover:border-blue/50 transition-colors">
              <div className="aspect-square bg-white/5 flex items-center justify-center p-4">
                <img src={p.image_url || '/placeholder.png'} alt={p.name} className="max-h-full max-w-full object-contain drop-shadow-lg" />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono text-white/40 uppercase">{p.sku}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${p.status === 'Draft' ? 'bg-amber-wash text-amber' : 'bg-forest-wash text-forest'}`}>
                    {p.status}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white/90 line-clamp-2 mb-3">{p.name}</h3>
                
                <div className="mt-auto grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-white/30 uppercase text-[9px] tracking-wider mb-0.5">Stock</p>
                    <p className={`font-semibold ${p.stock_available <= 5 ? 'text-crimson' : 'text-white'}`}>{p.stock_available}</p>
                  </div>
                  <div>
                    <p className="text-white/30 uppercase text-[9px] tracking-wider mb-0.5">Retail</p>
                    <p className="font-semibold text-white tabular-nums">₱{Number(p.srp).toLocaleString('en-PH')}</p>
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
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0A101D] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-white/5 shrink-0">
              <div>
                <h3 className="font-serif text-lg font-semibold text-white">{isAdding ? 'Add New Product' : 'Edit Product'}</h3>
                <p className="text-xs text-white/40 mt-0.5">{editingProduct.sku}</p>
              </div>
              <button onClick={() => { setEditingProduct(null); setIsAdding(false); }} className="text-white/40 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">

              {/* Identity */}
              <div>
                <p className="text-[10px] font-bold text-blue uppercase tracking-widest mb-3">Identity</p>
                <div className="space-y-3">
                  {isAdding && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">SKU / ID</label>
                      <input type="text" value={editingProduct.sku || ''} onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})}
                        className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white font-mono focus:border-blue outline-none" required />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Full Product Name</label>
                      <input type="text" value={editingProduct.name || ''} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                        className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-blue outline-none" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Short Name (UI Card)</label>
                      <input type="text" value={editingProduct.short || ''} onChange={(e) => setEditingProduct({...editingProduct, short: e.target.value})}
                        className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-blue outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Origin</label>
                      <input type="text" value={editingProduct.origin || ''} onChange={(e) => setEditingProduct({...editingProduct, origin: e.target.value})}
                        placeholder="e.g. Sicilia, Italy"
                        className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-blue outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Size</label>
                      <input type="text" value={editingProduct.size || ''} onChange={(e) => setEditingProduct({...editingProduct, size: e.target.value})}
                        placeholder="e.g. 400g jar"
                        className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-blue outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Copywriting */}
              <div>
                <p className="text-[10px] font-bold text-amber uppercase tracking-widest mb-3">Copywriting</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Description (3 sentences)</label>
                    <textarea value={editingProduct.description || ''} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                      className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-amber outline-none resize-none h-20" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Why Buy</label>
                      <textarea value={editingProduct.why_buy || ''} onChange={(e) => setEditingProduct({...editingProduct, why_buy: e.target.value})}
                        className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-amber outline-none resize-none h-16" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Why Rare in PH</label>
                      <textarea value={editingProduct.why_rare || ''} onChange={(e) => setEditingProduct({...editingProduct, why_rare: e.target.value})}
                        className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-amber outline-none resize-none h-16" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Pairings (comma-separated)</label>
                    <input type="text" 
                      value={Array.isArray(editingProduct.pairings) ? editingProduct.pairings.join(', ') : (editingProduct.pairings || '')} 
                      onChange={(e) => setEditingProduct({...editingProduct, pairings: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                      placeholder="Spread on warm pandesal, Stir into espresso, …"
                      className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-amber outline-none" />
                  </div>
                </div>
              </div>

              {/* Specs */}
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Specs</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Ingredients</label>
                    <textarea value={editingProduct.ingredients || ''} onChange={(e) => setEditingProduct({...editingProduct, ingredients: e.target.value})}
                      className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-white/30 outline-none resize-none h-16" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Allergens</label>
                      <input type="text" value={editingProduct.allergens || ''} onChange={(e) => setEditingProduct({...editingProduct, allergens: e.target.value})}
                        className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-white/30 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Net Weight</label>
                      <input type="text" value={editingProduct.net_weight || ''} onChange={(e) => setEditingProduct({...editingProduct, net_weight: e.target.value})}
                        className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-white/30 outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing & Stock */}
              <div>
                <p className="text-[10px] font-bold text-forest uppercase tracking-widest mb-3">Pricing & Stock</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Retail ₱</label>
                    <input type="number" value={editingProduct.srp || 0} onChange={(e) => setEditingProduct({...editingProduct, srp: Math.max(0, Number(e.target.value))})}
                      className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-forest outline-none tabular-nums" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Wholesale ₱</label>
                    <input type="number" value={editingProduct.wholesale_price || 0} onChange={(e) => setEditingProduct({...editingProduct, wholesale_price: Math.max(0, Number(e.target.value))})}
                      className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-forest outline-none tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Stock</label>
                    <input type="number" value={editingProduct.stock_available || 0} onChange={(e) => setEditingProduct({...editingProduct, stock_available: Math.max(0, Number(e.target.value))})}
                      className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-forest outline-none tabular-nums" />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Status</label>
                <select value={editingProduct.status || 'Draft'} onChange={(e) => setEditingProduct({...editingProduct, status: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-[#05080f] px-3 py-2 text-sm text-white focus:border-blue outline-none cursor-pointer">
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Discontinued">Discontinued</option>
                </select>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button type="button" onClick={() => { setEditingProduct(null); setIsAdding(false); }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white/70 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="px-6 py-2 rounded-lg text-sm font-semibold bg-blue text-white hover:bg-blue/90 transition-colors shadow-lg shadow-blue/20">
                  {isAdding ? 'Create Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
