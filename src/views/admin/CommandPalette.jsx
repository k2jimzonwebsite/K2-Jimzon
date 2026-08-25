import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAdminStore as useStore } from '../../context/AdminStoreContext'
import { searchGuide } from './adminGuide'

export default function CommandPalette({ isOpen, setIsOpen, setSection, onOpenScan, onOpenGuide, onOpenShortcuts }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  const { go, products = [] } = useStore()

  // Base static commands
  const COMMANDS = [
    { id: 'nav-overview', type: 'Navigation', label: 'Go to Home Dashboard', action: () => setSection('overview') },
    { id: 'nav-kanban', type: 'Navigation', label: 'Open Global Logistics & Consignments', action: () => setSection('kanban') },
    { id: 'nav-omni-hub', type: 'Navigation', label: 'Open Staff Operations & Fulfillment Hub', action: () => setSection('omni_hub') },
    { id: 'nav-inventory', type: 'Navigation', label: 'Open All Products', action: () => setSection('inventory') },
    { id: 'nav-inbox', type: 'Navigation', label: 'Check Messages', action: () => setSection('inbox') },
    { id: 'nav-crm', type: 'Navigation', label: 'Open Registered Customer Profiles', action: () => setSection('wholesale') },
    { id: 'nav-pasabuy-mgr', type: 'Navigation', label: 'Manage Pasabuy Requests & Quotations', action: () => setSection('pasabuy_manager') },
    { id: 'nav-integrations', type: 'Navigation', label: 'Review Website, Pasabuy, Shopee, TikTok Shop, and Lazada readiness', action: () => setSection('integrations') },
    { id: 'nav-suppliers', type: 'Navigation', label: 'Manage Our Suppliers', action: () => setSection('suppliers') },
    { id: 'nav-pos', type: 'Navigation', label: 'View Incoming Deliveries', action: () => setSection('kanban') },
    { id: 'nav-storefront', type: 'Navigation', label: 'View Live Storefront', action: () => go('home') },
    { id: 'action-scan', type: 'Action', label: 'Open Scan Center', sub: 'Alt S', action: onOpenScan },
    { id: 'action-guide', type: 'Action', label: 'Ask the K2 Operations Guide', sub: 'Alt G', action: () => onOpenGuide?.('') },
    { id: 'action-shortcuts', type: 'Action', label: 'Show Keyboard Shortcuts', sub: '?', action: onOpenShortcuts },
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

      const procedureMatches = searchGuide(q, { limit: 3 }).map(topic => ({
        id: `procedure-${topic.id}`,
        type: 'Procedure',
        label: topic.title,
        sub: topic.source,
        action: () => onOpenGuide?.(topic.title),
      }))

      // Search the already-authorized bounded product projection. The palette
      // never opens a second browser database path or treats staff profiles as customers.
      const prodMatches = products.filter(product => [product.name, product.sku, product.barcode]
        .some(value => String(value || '').toLowerCase().includes(q))).slice(0, 3).map(p => ({
        id: p.sku,
        type: 'Product',
        label: p.name || p.sku,
        sub: [p.sku, p.barcode].filter(Boolean).join(' · '),
        action: () => {
          setSection('inventory')
          // Future: Focus specific row
        }
      }))

      setResults([...staticMatches, ...procedureMatches, ...prodMatches])
      setSelectedIndex(0)
    }

    search()
  }, [query, products])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % results.length)
    }
    if (e.key === 'ArrowUp' && results.length) {
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
            role="dialog"
            aria-modal="true"
            aria-label="Command search"
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
            className="relative w-full max-w-2xl overflow-hidden rounded-adm-sm border border-adm-line bg-adm-surface shadow-2xl"
          >
            <div className="flex items-center border-b border-adm-line px-4 py-3">
              <svg className="mr-3 h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search products or commands..."
                className="w-full bg-transparent text-xl text-white placeholder-white/30 outline-none"
              />
              <span className="ml-2 flex shrink-0 items-center gap-1 rounded bg-white/5 px-2 py-1 text-sm text-white/60 border border-adm-line">
                ESC
              </span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="py-14 text-center text-base text-white/60">
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
                        'flex w-full items-center justify-between rounded-adm-sm px-4 py-3 text-left transition-colors ' +
                        (isSelected ? 'bg-blue/20 text-white' : 'text-neutral-300 hover:bg-white/5')
                      }
                    >
                      <div>
                        <div className="text-base font-medium">{item.label}</div>
                        {item.sub && <div className="text-sm text-white/60 mt-0.5">{item.sub}</div>}
                      </div>
                      <span className={'text-xs uppercase tracking-wider ' + (isSelected ? 'text-blue' : 'text-white/55')}>
                        {item.type}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
            <div className="border-t border-adm-line bg-white/5 px-4 py-2 text-sm text-white/60 flex items-center justify-between">
              <div className="flex gap-4">
                <span><kbd className="font-sans font-semibold text-neutral-300">↑↓</kbd> to navigate</span>
                <span><kbd className="font-sans font-semibold text-neutral-300">Enter</kbd> to select</span>
              </div>
              <div>K2 Jimzon BOS</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
