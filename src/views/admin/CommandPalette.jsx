import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../../context/StoreContext'
import { supabase } from '../../lib/supabaseClient'

export default function CommandPalette({ isOpen, setIsOpen, setSection }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  const { go } = useStore()

  // Base static commands
  const COMMANDS = [
    { id: 'nav-overview', type: 'Navigation', label: 'Go to Home Dashboard', action: () => setSection('overview') },
    { id: 'nav-kanban', type: 'Navigation', label: 'Open Global Logistics & Consignments', action: () => setSection('kanban') },
    { id: 'nav-omni-hub', type: 'Navigation', label: 'Open Staff Operations & Fulfillment Hub', action: () => setSection('omni_hub') },
    { id: 'nav-inventory', type: 'Navigation', label: 'Open All Products', action: () => setSection('inventory') },
    { id: 'nav-inbox', type: 'Navigation', label: 'Check Messages', action: () => setSection('inbox') },
    { id: 'nav-sourcing', type: 'Navigation', label: 'Review AI Suggestions', action: () => setSection('sourcing') },
    { id: 'nav-crm', type: 'Navigation', label: 'Open Customer CRM & Mass Campaign Broadcasts', action: () => setSection('wholesale') },
    { id: 'nav-pasabuy-mgr', type: 'Navigation', label: 'Manage Pasabuy Requests & Quotations', action: () => setSection('pasabuy_manager') },
    { id: 'nav-integrations', type: 'Navigation', label: 'Manage Channel & API Keys (Shopee, Lazada, TikTok, Meta)', action: () => setSection('integrations') },
    { id: 'nav-suppliers', type: 'Navigation', label: 'Manage Our Suppliers', action: () => setSection('suppliers') },
    { id: 'nav-pos', type: 'Navigation', label: 'View Incoming Deliveries', action: () => setSection('pos') },
    { id: 'nav-storefront', type: 'Navigation', label: 'View Live Storefront', action: () => go('home') },
  ]

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setIsOpen])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Perform search (debounced theoretically, but fast enough for local/small DB)
  useEffect(() => {
    const search = async () => {
      const q = query.toLowerCase()
      if (!q) {
        setResults(COMMANDS)
        return
      }

      // Filter static commands
      const staticMatches = COMMANDS.filter(c => c.label.toLowerCase().includes(q) || c.type.toLowerCase().includes(q))
      
      // If query is short, don't spam DB
      if (q.length < 2) {
        setResults(staticMatches)
        return
      }

      // Search Supabase Products
      const { data: prodData } = await supabase
        .from('products')
        .select('sku, title')
        .ilike('name', `%${q}%`)
        .limit(3)
      
      const prodMatches = (prodData || []).map(p => ({
        id: p.sku,
        type: 'Product',
        label: p.name,
        sub: p.sku,
        action: () => {
          setSection('inventory')
          // Future: Focus specific row
        }
      }))

      // Search Supabase Users
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('id, email, role')
        .ilike('email', `%${q}%`)
        .limit(3)
      
      const userMatches = (userData || []).map(u => ({
        id: u.id,
        type: 'Customer',
        label: u.email,
        sub: u.role,
        action: () => setSection('wholesale')
      }))

      setResults([...staticMatches, ...prodMatches, ...userMatches])
      setSelectedIndex(0)
    }

    search()
  }, [query])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % results.length)
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
    }
    if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      const selected = results[selectedIndex]
      selected.action()
      setIsOpen(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-navy/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Palette */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-[#0A101D] shadow-2xl"
          >
            <div className="flex items-center border-b border-white/10 px-4 py-3">
              <svg className="mr-3 h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search products, customers, or commands..."
                className="w-full bg-transparent text-xl text-white placeholder-white/30 outline-none"
              />
              <span className="ml-2 flex shrink-0 items-center gap-1 rounded bg-white/5 px-2 py-1 text-sm text-white/40 border border-white/10">
                ESC
              </span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="py-14 text-center text-base text-white/40">
                  No results found for "{query}"
                </div>
              ) : (
                results.map((item, idx) => {
                  const isSelected = idx === selectedIndex
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.action()
                        setIsOpen(false)
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={
                        'flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors ' +
                        (isSelected ? 'bg-blue/20 text-white' : 'text-white/70 hover:bg-white/5')
                      }
                    >
                      <div>
                        <div className="text-base font-medium">{item.label}</div>
                        {item.sub && <div className="text-sm text-white/40 mt-0.5">{item.sub}</div>}
                      </div>
                      <span className={'text-[10px] uppercase tracking-wider ' + (isSelected ? 'text-blue' : 'text-white/30')}>
                        {item.type}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
            <div className="border-t border-white/10 bg-white/5 px-4 py-2 text-sm text-white/40 flex items-center justify-between">
              <div className="flex gap-4">
                <span><kbd className="font-sans font-semibold text-white/70">↑↓</kbd> to navigate</span>
                <span><kbd className="font-sans font-semibold text-white/70">Enter</kbd> to select</span>
              </div>
              <div>K2 Jimzon BOS</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
