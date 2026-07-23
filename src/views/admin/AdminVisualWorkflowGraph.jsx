import { useState } from 'react'

export default function AdminVisualWorkflowGraph({ onNavigate }) {
  const [selectedNode, setSelectedNode] = useState('pack_verification')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [activeTabFilter, setActiveTabFilter] = useState('ALL') // 'ALL' | 'FULFILLMENT' | 'SOURCING' | 'SECURITY'

  const WORKFLOW_NODES = [
    // --- STAGE 1: INGESTION & DEMAND ---
    {
      id: 'demand_storefront',
      stage: '1. Ingestion',
      title: 'Storefront Direct Order',
      icon: '🛒',
      color: '#2563EB', // Blue
      pathType: 'Standard In-Stock Flow',
      desc: 'Customer completes checkout for in-stock items on website or wholesale portal.',
      branchOptions: ['Option A: Direct Checkout (Auto-reserve stock)', 'Option B: Applied Coupon Drop (MILAN10/HUNT500)'],
      inputs: ['Web Catalog', 'Cart Items', 'Customer Shipping Addr'],
      outputs: ['Pending Order Record', 'Postgres Lock (decrement_stock)'],
      nextNodes: ['stock_verif'],
      targetSection: 'inventory'
    },
    {
      id: 'demand_pasabuy',
      stage: '1. Ingestion',
      title: 'Pasabuy Sourcing Request',
      icon: '✈️',
      color: '#D4AF37', // Gold
      pathType: 'Custom Italy Sourcing Flow',
      desc: 'Customer submits hard-to-find luxury item, quote request, or photo link.',
      branchOptions: ['Option A: Quoted Landed Cost (Air Freight 14d)', 'Option B: Quoted Sea Cargo (45d)'],
      inputs: ['Luxury Image Upload', 'Target Budget', 'Item Specs'],
      outputs: ['Pasabuy Quote ID (PB-1043)', 'WhatsApp / Viber Alert'],
      nextNodes: ['milan_sourcing'],
      targetSection: 'pasabuy'
    },

    // --- STAGE 2: PROCESSING & AUTH ---
    {
      id: 'auth_gate',
      stage: '2. Security Auth',
      title: 'Staff Security Gate',
      icon: '🔒',
      color: '#EF4444', // Red Security
      pathType: 'Multi-Factor Auth Gate',
      desc: 'Staff and admins authenticate to access fulfillment, pricing, and COGS data.',
      branchOptions: ['Option A: 4-Digit Station PIN (1111/2222/3333)', 'Option B: 1-Click Google OAuth', 'Option C: Master Passcode (202688)'],
      inputs: ['Station PIN', 'Google OAuth JWT', '2FA Authenticator'],
      outputs: ['Salted SHA-256 Hash ($sha256$v1$)', 'Signed Staff Session Token'],
      nextNodes: ['sheet_editing', 'pack_verification'],
      targetSection: 'staff_permissions'
    },
    {
      id: 'stock_verif',
      stage: '2. Inventory Logic',
      title: 'Atomic Stock Lock (RPC)',
      icon: '⚡',
      color: '#2563EB',
      pathType: 'Concurrency Protection',
      desc: 'Executes PostgreSQL decrement_stock atomic function to prevent overselling.',
      branchOptions: ['Path A: Stock > 0 (Proceed to Packing Queue)', 'Path B: Stock = 0 (Trigger Reorder / Pasabuy Sourcing)'],
      inputs: ['SKU Stock Count', 'Mutex Lock'],
      outputs: ['Reserved Order Line', 'Updated Stock Available'],
      nextNodes: ['pack_verification'],
      targetSection: 'inventory'
    },

    // --- STAGE 3: SOURCING & SHEET EDITING ---
    {
      id: 'milan_sourcing',
      stage: '3. Italy Supply Chain',
      title: 'Milan Boutique Purchase',
      icon: '🇮🇹',
      color: '#10B981', // Green
      pathType: 'Cross-Border Supply',
      desc: 'Marco Rossi purchases authentic items in Milan boutiques & packs air consignment boxes.',
      branchOptions: ['Path A: Air Freight Cargo (MXP -> NAIA)', 'Path B: Direct Boutique Handover'],
      inputs: ['Boutique Receipts (€ FX)', 'Consignment Manifest'],
      outputs: ['Landed COGS Calculation', 'Flight Waybill Box ID'],
      nextNodes: ['naia_customs'],
      targetSection: 'consignments'
    },
    {
      id: 'sheet_editing',
      stage: '3. Data Operations',
      title: 'Sheet Mode & AI Smart Paste',
      icon: '📊',
      color: '#D4AF37',
      pathType: 'Spreadsheet & AI Ingestion',
      desc: 'Super Admin updates catalog prices, landed costs, or ingests supplier invoices via AI Vision.',
      branchOptions: ['Option A: Manual Cell Keyboard Edit in Sheet Mode', 'Option B: AI Vision Receipt Smart Paste Scan'],
      inputs: ['Spreadsheet Cell Input', 'Invoice Image / PDF'],
      outputs: ['Supabase Table Update', '2-Way Channel Sync Push'],
      nextNodes: ['channel_sync'],
      targetSection: 'inventory'
    },

    // --- STAGE 4: LOGISTICS & CUSTOMS ---
    {
      id: 'naia_customs',
      stage: '4. Local Logistics',
      title: 'NAIA Customs & Hub Claim',
      icon: '📦',
      color: '#10B981',
      pathType: 'Hub Allocation',
      desc: 'Air cargo arrives at NAIA customs; fulfillment leads claim box custody via station PIN.',
      branchOptions: ['Hub A: Makati Fulfillment Hub (Elena PIN 1111)', 'Hub B: QC Distribution Center (Juan PIN 2222)'],
      inputs: ['Customs Clearance', 'Station 4-Digit PIN'],
      outputs: ['Hub Allocated Inventory', 'Reconciled Physical Count'],
      nextNodes: ['pack_verification'],
      targetSection: 'omni_hub'
    },

    // --- STAGE 5: FULFILLMENT & API SYNC ---
    {
      id: 'pack_verification',
      stage: '5. Packing & Dispatch',
      title: 'Order Packing & Verification',
      icon: '🖨️',
      color: '#8B5CF6', // Purple
      pathType: 'Fulfillment Operations',
      desc: 'Staff verifies order items, prints Shopee/Lazada waybill slips, and hands over to courier.',
      branchOptions: ['Option A: Camera / Hardware Barcode Scan', 'Option B: Manual SKU / Title Keyboard Input (No scanner needed!)'],
      inputs: ['Packing Order Slip', 'Barcode Scan OR Manual SKU Input'],
      outputs: ['Shopee / Lazada Waybill PDF', 'Dispatched Tracking Number'],
      nextNodes: [],
      targetSection: 'omni_hub'
    },
    {
      id: 'channel_sync',
      stage: '5. Omni Integrations',
      title: 'Shopee & Lazada 2-Way Sync',
      icon: '🔄',
      color: '#EC4899', // Pink
      pathType: 'Bi-Directional Integration',
      desc: 'Real-time WebSocket connection pushes inventory changes & pulls marketplace orders.',
      branchOptions: ['Outgoing Loop: Local Stock Update -> Push to Shopee & Lazada APIs', 'Incoming Loop: Shopee/Lazada Order -> Pull into Omni Inbox'],
      inputs: ['Shopee Partner Key', 'Lazada App Secret', 'WebSockets'],
      outputs: ['Live Marketplace Inventory', 'Centralized Omni Inbox Message'],
      nextNodes: [],
      targetSection: 'channels'
    }
  ]

  const activeNode = WORKFLOW_NODES.find(n => n.id === selectedNode) || WORKFLOW_NODES[0]

  const content = (
    <div className={`bg-[#0E121E] text-white font-sans space-y-6 ${isFullScreen ? 'p-8 min-h-screen overflow-y-auto' : 'p-6 border border-white/20 rounded-2xl shadow-2xl'}`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/15 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 rounded-xl bg-blue/20 text-blue border border-blue/40">🔀</span>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Master Operational Workflow & Architecture Pipeline
                <span className="text-xs font-mono font-black bg-gold text-navy px-2.5 py-0.5 rounded-full uppercase">
                  Comprehensive DAG Graph
                </span>
              </h2>
              <p className="text-xs text-white/80 font-medium mt-1">
                Visualizing all bi-directional paths, decision branches, manual SKU overrides, and security gates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="bg-white/10 hover:bg-gold hover:text-navy text-white font-black text-xs px-4 py-2.5 rounded-xl border border-white/20 transition-all flex items-center gap-2 shadow"
            title={isFullScreen ? 'Exit Full Screen Mode' : 'View Full Screen Diagram'}
          >
            <span>{isFullScreen ? '↙️ Exit Full Screen' : '🔍 Full Screen Mode'}</span>
          </button>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap items-center gap-2 bg-[#161B29] p-2 rounded-xl border border-white/15 text-xs font-mono">
        <span className="text-white/60 font-bold px-2">Filter View:</span>
        {[
          { id: 'ALL', label: '🌐 All Pipelines (5 Stages)' },
          { id: 'FULFILLMENT', label: '📦 Fulfillment & Barcode Scanning' },
          { id: 'SOURCING', label: '✈️ Italy Pasabuy & Cargo' },
          { id: 'SECURITY', label: '🔒 Security Auth & RLS' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTabFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-black transition-all ${
              activeTabFilter === tab.id
                ? 'bg-blue text-white shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* COMPREHENSIVE VISUAL DIAGRAM CANVAS */}
      <div className="relative bg-[#05080f] border border-white/15 rounded-2xl p-6 overflow-x-auto shadow-inner">
        
        {/* Stage Column Legend Bar */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 border-b border-white/10 pb-3 text-center font-mono text-xs">
          <div className="text-blue font-black uppercase">Stage 1: Ingestion</div>
          <div className="text-gold font-black uppercase">Stage 2: Auth & Logic</div>
          <div className="text-forest font-black uppercase">Stage 3: Supply Chain</div>
          <div className="text-purple-400 font-black uppercase">Stage 4: Hub Claim</div>
          <div className="text-pink-400 font-black uppercase">Stage 5: Ship & Sync</div>
        </div>

        {/* WORKFLOW NODES STAGE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10 min-w-[900px]">
          
          {/* STAGE 1: INGESTION */}
          <div className="space-y-4">
            {WORKFLOW_NODES.filter(n => n.stage.startsWith('1')).map(node => (
              <NodeCard key={node.id} node={node} isSelected={selectedNode === node.id} onClick={() => setSelectedNode(node.id)} />
            ))}
          </div>

          {/* STAGE 2: AUTH & LOGIC */}
          <div className="space-y-4">
            {WORKFLOW_NODES.filter(n => n.stage.startsWith('2')).map(node => (
              <NodeCard key={node.id} node={node} isSelected={selectedNode === node.id} onClick={() => setSelectedNode(node.id)} />
            ))}
          </div>

          {/* STAGE 3: ITALY SUPPLY CHAIN */}
          <div className="space-y-4">
            {WORKFLOW_NODES.filter(n => n.stage.startsWith('3')).map(node => (
              <NodeCard key={node.id} node={node} isSelected={selectedNode === node.id} onClick={() => setSelectedNode(node.id)} />
            ))}
          </div>

          {/* STAGE 4: LOCAL LOGISTICS */}
          <div className="space-y-4">
            {WORKFLOW_NODES.filter(n => n.stage.startsWith('4')).map(node => (
              <NodeCard key={node.id} node={node} isSelected={selectedNode === node.id} onClick={() => setSelectedNode(node.id)} />
            ))}
          </div>

          {/* STAGE 5: FULFILLMENT & SYNC */}
          <div className="space-y-4">
            {WORKFLOW_NODES.filter(n => n.stage.startsWith('5')).map(node => (
              <NodeCard key={node.id} node={node} isSelected={selectedNode === node.id} onClick={() => setSelectedNode(node.id)} />
            ))}
          </div>

        </div>

      </div>

      {/* EXPANDED DETAILED OPERATIONAL PANEL FOR SELECTED NODE */}
      {activeNode && (
        <div className="bg-[#161B29] border border-white/20 rounded-2xl p-6 space-y-5 animate-in fade-in duration-200 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/15 pb-4 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-3 rounded-2xl bg-black/60 border border-white/20 shadow-md">{activeNode.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gold font-bold">{activeNode.stage}</span>
                  <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded bg-blue text-white">
                    {activeNode.pathType}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mt-0.5">{activeNode.title}</h3>
              </div>
            </div>

            <button
              onClick={() => {
                if (isFullScreen) setIsFullScreen(false)
                if (onNavigate) onNavigate(activeNode.targetSection)
              }}
              className="bg-gold hover:bg-gold-deep text-navy font-black text-xs px-6 py-3.5 rounded-xl transition-all shadow-xl flex items-center justify-center gap-2 min-h-[44px] shrink-0"
            >
              <span>Go to {activeNode.title} Module</span>
              <span>➔</span>
            </button>
          </div>

          <p className="text-sm text-white/90 font-medium leading-relaxed font-sans">
            {activeNode.desc}
          </p>

          {/* Decision Branches & Multi-Path Execution */}
          <div className="bg-black/50 p-4 rounded-xl border border-white/15 space-y-2">
            <p className="text-gold font-extrabold uppercase text-xs tracking-wider flex items-center gap-2">
              <span>🔀 Decision Branches & Multi-Path Options:</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
              {activeNode.branchOptions.map((opt, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-medium flex items-center gap-2">
                  <span className="text-gold font-bold">↳</span>
                  <span>{opt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Telemetry Inputs & Outputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-2">
              <p className="text-gold font-bold uppercase text-[11px]">System Inputs & Triggers:</p>
              <ul className="space-y-1 text-white/80 font-sans">
                {activeNode.inputs.map((inp, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-blue font-bold">✓</span>
                    <span>{inp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-2">
              <p className="text-gold font-bold uppercase text-[11px]">System Output & State Mutation:</p>
              <ul className="space-y-1 text-white/80 font-sans">
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
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="w-full max-w-7xl mx-auto my-4">
          {content}
        </div>
      </div>
    )
  }

  return content
}

function NodeCard({ node, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between relative shadow-lg group ${
        isSelected
          ? 'bg-[#161B29] border-gold ring-2 ring-gold/60 shadow-2xl scale-[1.03] z-20'
          : 'bg-[#0E121E] border-white/20 hover:border-white/40 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center justify-between w-full mb-2">
        <span className="text-2xl">{node.icon}</span>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-gold border border-white/15">
          {node.pathType.split(' ')[0]}
        </span>
      </div>

      <h4 className="text-xs font-black text-white leading-tight">{node.title}</h4>
      <p className="text-[11px] text-white/70 font-medium mt-1.5 leading-snug line-clamp-2">
        {node.desc}
      </p>

      {/* Decision Option Badge */}
      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-gold font-bold">
        <span>{node.branchOptions.length} Branch Paths</span>
        <span>➔</span>
      </div>
    </button>
  )
}
