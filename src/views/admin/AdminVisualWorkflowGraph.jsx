import { useState } from 'react'

export default function AdminVisualWorkflowGraph({ onNavigate }) {
  const [selectedNode, setSelectedNode] = useState('pack_station')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [activeFilter, setActiveFilter] = useState('ALL')

  const NODES = [
    // --- DEMAND LAYER ---
    {
      id: 'storefront',
      label: 'Storefront Web Order',
      sub: 'Direct Customer Checkout',
      icon: '🛒',
      category: 'Demand',
      x: 10, y: 18,
      color: '#2563EB',
      inputs: ['Website Catalog', 'Wholesale Cart', 'Checkout Form'],
      outputs: ['Pending Order Line', 'Postgres Stock Reservation'],
      desc: 'Customer completes checkout on website or wholesale cart for in-stock items.',
      targetSection: 'inventory'
    },
    {
      id: 'pasabuy_req',
      label: 'Pasabuy Sourcing Request',
      icon: '✈️',
      category: 'Demand',
      sub: 'Custom Italy Quote Request',
      x: 10, y: 72,
      color: '#D4AF37',
      inputs: ['Luxury Photo Link', 'Target Budget', 'Custom Specs'],
      outputs: ['Pasabuy Quote ID (PB-1043)', 'WhatsApp / Viber Alert'],
      desc: 'Customer requests a hard-to-find luxury item from Milan or custom Italian quote.',
      targetSection: 'pasabuy'
    },

    // --- DECISION GATE 1 ---
    {
      id: 'dec_instock',
      label: 'In Stock Check?',
      icon: '💎',
      category: 'Decision',
      sub: 'Stock > 0 Logic Splitter',
      x: 32, y: 18,
      color: '#D4AF37',
      inputs: ['Products Table', 'decrement_stock RPC'],
      outputs: ['YES: Packing Queue', 'NO: Pasabuy Sourcing Trigger'],
      desc: 'System checks if item is in stock in Makati/QC hub. If out of stock, routes to Pasabuy sourcing.',
      targetSection: 'inventory'
    },

    // --- ITALY SUPPLY CHAIN ---
    {
      id: 'milan_buy',
      label: 'Milan Boutique Purchase',
      icon: '🇮🇹',
      category: 'Supply Chain',
      sub: 'Marco Rossi Sourcing',
      x: 32, y: 72,
      color: '#10B981',
      inputs: ['Milan Boutique Receipts (€)', 'Custom Quote Specs'],
      outputs: ['Purchased Luxury Item', 'MXP Air Cargo Manifest'],
      desc: 'Marco Rossi buys authentic luxury items in Milan boutiques and packs air consignment boxes.',
      targetSection: 'consignments'
    },
    {
      id: 'naia_customs',
      label: 'NAIA Air Cargo & Hub Claim',
      icon: '📦',
      category: 'Supply Chain',
      sub: '4-Digit PIN Custody Claim',
      x: 54, y: 72,
      color: '#10B981',
      inputs: ['MXP -> NAIA Flight Cargo', 'Station PIN (1111/2222)'],
      outputs: ['Hub Allocated Inventory', 'Reconciled SKU Count'],
      desc: 'Air cargo lands at NAIA customs; fulfillment leads claim custody with 4-digit station PINs.',
      targetSection: 'omni_hub'
    },

    // --- SECURITY & SHEET ENGINE ---
    {
      id: 'auth_gate',
      label: 'Staff Security Auth Gate',
      icon: '🔒',
      category: 'Security',
      sub: 'PIN / Google OAuth / Master',
      x: 54, y: 18,
      color: '#EF4444',
      inputs: ['4-Digit PIN', 'Google OAuth JWT', 'Master Passcode (202688)'],
      outputs: ['SHA-256 Salted Hash', 'Signed JWT Session Token'],
      desc: 'Staff authenticates via 4-digit PIN, Google OAuth, or Master passcode to access admin controls.',
      targetSection: 'staff_permissions'
    },
    {
      id: 'sheet_mode',
      label: 'Sheet Mode & AI Smart Paste',
      icon: '📊',
      category: 'Data Control',
      sub: 'Cell Keyboard / AI Vision Scan',
      x: 76, y: 18,
      color: '#D4AF37',
      inputs: ['Spreadsheet Cell Edit', 'AI Vision Receipt Scan'],
      outputs: ['Supabase Table Update', '2-Way Channel Push'],
      desc: 'Super Admin edits prices/stock directly in Sheet Mode or scans invoices with AI Vision.',
      targetSection: 'inventory'
    },

    // --- FULFILLMENT & API SYNC ---
    {
      id: 'pack_station',
      label: 'Barcode Packing Station',
      icon: '🖨️',
      category: 'Fulfillment',
      sub: 'Camera Scan OR Manual SKU Entry',
      x: 76, y: 72,
      color: '#8B5CF6',
      inputs: ['Packing Order Slip', 'Option A: Camera Scan', 'Option B: Manual SKU Entry'],
      outputs: ['Shopee / Lazada Waybill PDF', 'Dispatched Courier Tracking'],
      desc: 'Staff verifies order items by camera barcode scan OR manual SKU keyboard entry, then prints waybill.',
      targetSection: 'omni_hub'
    },
    {
      id: 'channel_sync',
      label: 'Shopee & Lazada 2-Way Sync',
      icon: '🔄',
      category: 'Integrations',
      sub: 'Realtime WebSockets Push & Pull',
      x: 94, y: 45,
      color: '#EC4899',
      inputs: ['Shopee Partner Key', 'Lazada App Secret', 'WebSockets'],
      outputs: ['Live Marketplace Stock', 'Omni Inbox Order Pull'],
      desc: 'Real-time WebSockets push local stock updates to Shopee/Lazada and pull marketplace orders.',
      targetSection: 'channels'
    }
  ]

  const activeNode = NODES.find(n => n.id === selectedNode) || NODES[7]

  const diagramMarkup = (
    <div className={`bg-[#18181b] text-white font-sans space-y-6 ${isFullScreen ? 'p-8 min-h-screen overflow-y-auto' : 'p-6 border border-white/20 rounded-2xl shadow-2xl'}`}>
      
      {/* Flowchart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue flex items-center justify-center text-white text-xl font-black shadow">
            🔀
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              System Architecture & Interactive Process Flowchart
              <span className="text-xs font-mono font-black bg-gold text-navy px-2.5 py-0.5 rounded-full uppercase">
                Visual Flowchart Canvas
              </span>
            </h2>
            <p className="text-sm text-neutral-300 font-medium mt-1">
              Visualizing bi-directional connections, decision diamonds, manual SKU bypasses, and security auth gates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="bg-gold hover:bg-gold-deep text-navy font-black text-sm px-5 py-2.5 rounded-xl border border-gold transition-all shadow-lg flex items-center gap-2"
          >
            <span>{isFullScreen ? '↙️ Exit Full Screen' : '🔍 Open Full Screen Canvas'}</span>
          </button>
        </div>
      </div>

      {/* FILTER & LEGEND ROW */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#27272a] p-3 rounded-xl border border-white/10 text-sm font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-white/60 font-bold">Filter View:</span>
          {[
            { id: 'ALL', label: '🌐 All Pipelines' },
            { id: 'FULFILLMENT', label: '📦 Packing & Barcode Scan' },
            { id: 'SOURCING', label: '✈️ Italy Pasabuy & Air Cargo' },
            { id: 'SECURITY', label: '🔒 Auth Gate & Sheet Mode' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg font-black transition-all ${
                activeFilter === f.id ? 'bg-blue text-white shadow' : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue" /> Demand</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold" /> Logic / Decision</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Supply Chain</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Fulfillment</span>
        </div>
      </div>

      {/* STUNNING VISUAL SVG FLOWCHART DIAGRAM CANVAS */}
      <div className="relative bg-[#09090b] border border-white/20 rounded-2xl p-8 min-h-[460px] overflow-x-auto shadow-2xl custom-scrollbar flex flex-col justify-between">
        
        {/* SVG Directed Curves & Arrowheads Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 min-w-[1000px]">
          <defs>
            <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563EB" />
            </marker>
            <marker id="arrow-gold" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#D4AF37" />
            </marker>
            <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10B981" />
            </marker>
            <marker id="arrow-purple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#8B5CF6" />
            </marker>
          </defs>

          {/* Connected Curved Paths */}
          {/* Storefront -> InStock Check */}
          <path d="M 180 90 L 310 90" stroke="#2563EB" strokeWidth="2.5" markerEnd="url(#arrow-blue)" />
          
          {/* InStock Check (YES) -> Auth Gate / Packing Station */}
          <path d="M 410 90 L 530 90" stroke="#D4AF37" strokeWidth="2.5" markerEnd="url(#arrow-gold)" />
          
          {/* InStock Check (NO: Out of Stock) -> Pasabuy Sourcing Request */}
          <path d="M 360 130 C 360 250 180 250 180 320" stroke="#EF4444" strokeWidth="2" strokeDasharray="5 5" markerEnd="url(#arrow-gold)" />
          
          {/* Pasabuy Sourcing Request -> Milan Boutique Purchase */}
          <path d="M 180 350 L 310 350" stroke="#D4AF37" strokeWidth="2.5" markerEnd="url(#arrow-gold)" />

          {/* Milan Purchase -> NAIA Customs Air Cargo */}
          <path d="M 410 350 L 530 350" stroke="#10B981" strokeWidth="2.5" markerEnd="url(#arrow-green)" />

          {/* NAIA Customs Air Cargo -> Barcode Packing Station */}
          <path d="M 630 350 L 740 350" stroke="#10B981" strokeWidth="2.5" markerEnd="url(#arrow-green)" />

          {/* Auth Gate -> Sheet Mode & AI Vision */}
          <path d="M 630 90 L 740 90" stroke="#EF4444" strokeWidth="2.5" markerEnd="url(#arrow-gold)" />

          {/* Sheet Mode <-> Shopee & Lazada 2-Way Sync (Bidirectional Loop) */}
          <path d="M 840 90 C 920 90 920 200 930 220" stroke="#EC4899" strokeWidth="2.5" strokeDasharray="4 4" markerEnd="url(#arrow-purple)" />

          {/* Packing Station -> Shopee & Lazada 2-Way Sync */}
          <path d="M 840 350 C 920 350 920 240 930 220" stroke="#8B5CF6" strokeWidth="2.5" markerEnd="url(#arrow-purple)" />
        </svg>

        {/* WORKFLOW CANVAS NODES (ABSOLUTE / GRID POSITIONS) */}
        <div className="relative z-10 grid grid-cols-5 gap-6 min-w-[980px] my-auto">
          
          {/* COLUMN 1: INGESTION */}
          <div className="space-y-24">
            <Flowcard node={NODES[0]} isSelected={selectedNode === 'storefront'} onClick={() => setSelectedNode('storefront')} />
            <Flowcard node={NODES[1]} isSelected={selectedNode === 'pasabuy_req'} onClick={() => setSelectedNode('pasabuy_req')} />
          </div>

          {/* COLUMN 2: DECISION & SOURCING */}
          <div className="space-y-24">
            <Flowcard node={NODES[2]} isSelected={selectedNode === 'dec_instock'} onClick={() => setSelectedNode('dec_instock')} isDecision />
            <Flowcard node={NODES[3]} isSelected={selectedNode === 'milan_buy'} onClick={() => setSelectedNode('milan_buy')} />
          </div>

          {/* COLUMN 3: AUTH & CUSTOMS */}
          <div className="space-y-24">
            <Flowcard node={NODES[5]} isSelected={selectedNode === 'auth_gate'} onClick={() => setSelectedNode('auth_gate')} />
            <Flowcard node={NODES[4]} isSelected={selectedNode === 'naia_customs'} onClick={() => setSelectedNode('naia_customs')} />
          </div>

          {/* COLUMN 4: SHEET & PACKING */}
          <div className="space-y-24">
            <Flowcard node={NODES[6]} isSelected={selectedNode === 'sheet_mode'} onClick={() => setSelectedNode('sheet_mode')} />
            <Flowcard node={NODES[7]} isSelected={selectedNode === 'pack_station'} onClick={() => setSelectedNode('pack_station')} />
          </div>

          {/* COLUMN 5: 2-WAY SYNC */}
          <div className="flex items-center justify-center my-auto">
            <Flowcard node={NODES[8]} isSelected={selectedNode === 'channel_sync'} onClick={() => setSelectedNode('channel_sync')} />
          </div>

        </div>

      </div>

      {/* SELECTED NODE OPERATIONAL BREAKDOWN & JUMP BUTTON */}
      {activeNode && (
        <div className="bg-[#27272a] border border-white/20 rounded-2xl p-6 space-y-5 animate-in fade-in duration-200 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-3 rounded-2xl bg-black/60 border border-white/20 shadow-md">{activeNode.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gold font-bold">{activeNode.category} Node</span>
                  <span className="text-sm font-mono font-black px-2.5 py-0.5 rounded bg-blue text-white">
                    {activeNode.sub}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mt-0.5">{activeNode.label}</h3>
              </div>
            </div>

            <button
              onClick={() => {
                if (isFullScreen) setIsFullScreen(false)
                if (onNavigate) onNavigate(activeNode.targetSection)
              }}
              className="bg-gold hover:bg-gold-deep text-navy font-black text-sm px-6 py-3.5 rounded-xl transition-all shadow-xl flex items-center justify-center gap-2 min-h-[44px] shrink-0"
            >
              <span>Jump to {activeNode.label} Module</span>
              <span>➔</span>
            </button>
          </div>

          <p className="text-base text-neutral-200 font-medium leading-relaxed font-sans">
            {activeNode.desc}
          </p>

          {/* Telemetry Inputs & Outputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-mono">
            <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-2">
              <p className="text-gold font-bold uppercase text-xs">System Data Inputs:</p>
              <ul className="space-y-1 text-neutral-300 font-sans">
                {activeNode.inputs.map((inp, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-blue font-bold">✓</span>
                    <span>{inp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-2">
              <p className="text-gold font-bold uppercase text-xs">System Data Output Stream:</p>
              <ul className="space-y-1 text-neutral-300 font-sans">
                {activeNode.outputs.map((out, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-gold font-bold">⚡</span>
                    <span>{out}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      )}

    </div>
  )

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl p-6 overflow-y-auto animate-in fade-in duration-200">
        <div className="w-full max-w-7xl mx-auto my-2">
          {diagramMarkup}
        </div>
      </div>
    )
  }

  return diagramMarkup
}

function Flowcard({ node, isSelected, onClick, isDecision = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between relative shadow-xl group ${
        isDecision
          ? 'bg-[#1A180E] border-gold ring-2 ring-gold/40'
          : isSelected
          ? 'bg-[#27272a] border-gold ring-2 ring-gold/60 scale-[1.04] z-20'
          : 'bg-[#18181b] border-white/20 hover:border-white/40 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center justify-between w-full mb-2">
        <span className="text-2xl">{node.icon}</span>
        {isDecision ? (
          <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-gold text-navy font-bold uppercase">
            DECISION
          </span>
        ) : (
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-neutral-300">
            {node.category}
          </span>
        )}
      </div>

      <h4 className="text-sm font-black text-white leading-snug">{node.label}</h4>
      <p className="text-xs text-gold font-mono font-bold mt-1.5 leading-tight truncate">
        {node.sub}
      </p>

      {/* Selection Glow Indicator */}
      {isSelected && (
        <div className="mt-3 pt-2 border-t border-gold/30 flex items-center justify-between text-xs font-mono text-gold font-bold">
          <span>ACTIVE PATH</span>
          <span>➔</span>
        </div>
      )}
    </button>
  )
}
