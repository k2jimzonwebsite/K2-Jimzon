import { useState } from 'react'

export default function AdminVisualWorkflowGraph({ onNavigate }) {
  const [selectedNode, setSelectedNode] = useState('storefront')

  const NODES = {
    storefront: {
      id: 'storefront',
      label: 'Storefront & Web Checkout',
      icon: '🛒',
      category: 'Demand',
      x: 10, y: 15,
      status: 'Active · 24 req/min',
      desc: 'Customer places order on website catalog or wholesale bulk cart.',
      connectedTo: ['inventory_check', 'inbox'],
      targetSection: 'inventory',
      inputs: ['Web Catalog', 'Wholesale Cart', 'Checkout Form'],
      output: 'Pending Order Stream'
    },
    pasabuy: {
      id: 'pasabuy',
      label: 'Pasabuy Sourcing Request',
      icon: '✈️',
      category: 'Demand',
      x: 10, y: 55,
      status: 'Active · 2 Quoted',
      desc: 'Customer submits custom Italian product request or luxury photo quote.',
      connectedTo: ['milan_sourcing'],
      targetSection: 'pasabuy',
      inputs: ['Custom Item Form', 'Luxury Image Upload', 'Target Budget'],
      output: 'Pasabuy Quote ID (PB-1043)'
    },
    inventory_check: {
      id: 'inventory_check',
      label: 'Stock & Price Auto-Check',
      icon: '⚡',
      category: 'Logic',
      x: 35, y: 15,
      status: 'Realtime Sync',
      desc: 'System verifies PostgreSQL stock_available & applies active coupon drops.',
      connectedTo: ['pack_ship', 'sheet_mode'],
      targetSection: 'inventory',
      inputs: ['Products Table', 'Coupon Drops', 'Wholesale Tier'],
      output: 'Atomic Stock Reservation'
    },
    milan_sourcing: {
      id: 'milan_sourcing',
      label: 'Milan Sourcing & Cargo Box',
      icon: '🇮🇹',
      category: 'Supply',
      x: 35, y: 55,
      status: 'In Flight · MXP -> NAIA',
      desc: 'Marco Rossi purchases in Milan boutiques & packs air cargo consignment boxes.',
      connectedTo: ['customs_hub'],
      targetSection: 'consignments',
      inputs: ['Boutique Receipts', 'Air Freight Waybill', 'COGS Price'],
      output: 'Consignment Flight Manifest'
    },
    sheet_mode: {
      id: 'sheet_mode',
      label: 'Sheet Mode & Master Grid',
      icon: '📊',
      category: 'Control',
      x: 60, y: 15,
      status: '18 Live SKUs',
      desc: 'Super Admin edits prices & inventory via spreadsheet grid or AI Smart Paste.',
      connectedTo: ['channels_sync', 'security_guard'],
      targetSection: 'inventory',
      inputs: ['Spreadsheet Cell Edits', 'AI Vision Paste', 'Bulk CSV'],
      output: 'Multi-Channel Stock Push'
    },
    customs_hub: {
      id: 'customs_hub',
      label: 'NAIA Air Cargo & Hub Handover',
      icon: '📦',
      category: 'Logistics',
      x: 60, y: 55,
      status: 'Ready for Claim',
      desc: 'Fulfillment leads claim cargo custody using 4-digit station PINs.',
      connectedTo: ['pack_ship'],
      targetSection: 'omni_hub',
      inputs: ['NAIA Flight Landing', 'Station 4-Digit PIN', 'Hub Location'],
      output: 'Hub Allocated Stock'
    },
    pack_ship: {
      id: 'pack_ship',
      label: 'Barcode Scanning & Packing',
      icon: '🖨️',
      category: 'Fulfillment',
      x: 85, y: 15,
      status: 'Queue Ready',
      desc: 'Staff scans camera barcode, prints Shopee/Lazada waybill slips & ships.',
      connectedTo: [],
      targetSection: 'omni_hub',
      inputs: ['Packing Slip', 'Camera Barcode Scan', 'Courier Pickup'],
      output: 'Dispatched Order & Tracking'
    },
    channels_sync: {
      id: 'channels_sync',
      label: 'Shopee / Lazada API Sync',
      icon: '🔄',
      category: 'Integrations',
      x: 85, y: 55,
      status: 'WebSockets Active',
      desc: 'Real-time WebSocket API sync pushes stock updates to Shopee & Lazada.',
      connectedTo: [],
      targetSection: 'channels',
      inputs: ['Shopee API v2.0', 'Lazada Open API', 'AES-256 Keys'],
      output: 'Live Marketplace Catalog'
    }
  }

  const active = NODES[selectedNode] || NODES.storefront

  return (
    <div className="bg-[#0E121E] border border-white/20 rounded-2xl p-6 shadow-2xl font-sans text-white space-y-6">
      
      {/* Visual Workflow Graph Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/15 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔀</span>
            <h2 className="text-xl font-black text-white">Visual Operational Workflow DAG Graph</h2>
            <span className="text-[10px] font-mono font-black bg-blue text-white px-2.5 py-0.5 rounded-full uppercase">
              Interactive Node DAG Graph
            </span>
          </div>
          <p className="text-xs text-white/80 font-medium mt-1">
            Click any workflow node in the visual diagram below to highlight its execution path and trigger 1-click navigation.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue" /> Demand</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold" /> Logic & Control</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-forest" /> Supply & Logistics</span>
        </div>
      </div>

      {/* VISUAL WORKFLOW GRAPH CANVAS / DIAGRAM CONTAINER */}
      <div className="relative bg-[#05080f] border border-white/15 rounded-2xl p-6 min-h-[360px] overflow-x-auto shadow-inner flex flex-col justify-between">
        
        {/* SVG Directed Arrows Connecting Nodes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#D4AF37" />
            </marker>
          </defs>

          {/* Connected Flow Paths */}
          {/* Node 1 -> Node 3 */}
          <line x1="22%" y1="28%" x2="33%" y2="28%" stroke="#2563EB" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow)" />
          {/* Node 2 -> Node 4 */}
          <line x1="22%" y1="68%" x2="33%" y2="68%" stroke="#2563EB" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow)" />
          {/* Node 3 -> Node 5 */}
          <line x1="47%" y1="28%" x2="58%" y2="28%" stroke="#D4AF37" strokeWidth="2" markerEnd="url(#arrow)" />
          {/* Node 4 -> Node 6 */}
          <line x1="47%" y1="68%" x2="58%" y2="68%" stroke="#10B981" strokeWidth="2" markerEnd="url(#arrow)" />
          {/* Node 5 -> Node 7 */}
          <line x1="72%" y1="28%" x2="83%" y2="28%" stroke="#D4AF37" strokeWidth="2" markerEnd="url(#arrow)" />
          {/* Node 5 -> Node 8 */}
          <line x1="72%" y1="28%" x2="83%" y2="68%" stroke="#D4AF37" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow)" />
          {/* Node 6 -> Node 7 */}
          <line x1="72%" y1="68%" x2="83%" y2="28%" stroke="#10B981" strokeWidth="2" markerEnd="url(#arrow)" />
        </svg>

        {/* WORKFLOW GRAPH NODES GRID */}
        <div className="grid grid-cols-4 gap-6 relative z-10 my-auto">
          
          {/* COLUMN 1: DEMAND ENTRY */}
          <div className="space-y-6">
            <GraphNodeCard node={NODES.storefront} isSelected={selectedNode === 'storefront'} onClick={() => setSelectedNode('storefront')} />
            <GraphNodeCard node={NODES.pasabuy} isSelected={selectedNode === 'pasabuy'} onClick={() => setSelectedNode('pasabuy')} />
          </div>

          {/* COLUMN 2: VERIFICATION & ITALY SOURCING */}
          <div className="space-y-6">
            <GraphNodeCard node={NODES.inventory_check} isSelected={selectedNode === 'inventory_check'} onClick={() => setSelectedNode('inventory_check')} />
            <GraphNodeCard node={NODES.milan_sourcing} isSelected={selectedNode === 'milan_sourcing'} onClick={() => setSelectedNode('milan_sourcing')} />
          </div>

          {/* COLUMN 3: MASTER CONTROL & CUSTOMS */}
          <div className="space-y-6">
            <GraphNodeCard node={NODES.sheet_mode} isSelected={selectedNode === 'sheet_mode'} onClick={() => setSelectedNode('sheet_mode')} />
            <GraphNodeCard node={NODES.customs_hub} isSelected={selectedNode === 'customs_hub'} onClick={() => setSelectedNode('customs_hub')} />
          </div>

          {/* COLUMN 4: FULFILLMENT & API INTEGRATIONS */}
          <div className="space-y-6">
            <GraphNodeCard node={NODES.pack_ship} isSelected={selectedNode === 'pack_ship'} onClick={() => setSelectedNode('pack_ship')} />
            <GraphNodeCard node={NODES.channels_sync} isSelected={selectedNode === 'channels_sync'} onClick={() => setSelectedNode('channels_sync')} />
          </div>

        </div>

      </div>

      {/* SELECTED NODE TELEMETRY & JUMP PANEL */}
      {active && (
        <div className="bg-[#161B29] border border-white/20 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/15 pb-3 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2 rounded-xl bg-black/50 border border-white/15">{active.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gold font-bold">{active.category} Node</span>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-blue text-white">
                    {active.status}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">{active.label}</h3>
              </div>
            </div>

            <button
              onClick={() => onNavigate && onNavigate(active.targetSection)}
              className="bg-gold hover:bg-gold-deep text-navy font-black text-xs px-6 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 min-h-[44px] shrink-0"
            >
              <span>Jump to Module</span>
              <span>➔</span>
            </button>
          </div>

          <p className="text-xs text-white/90 font-medium leading-relaxed font-sans">
            {active.desc}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-1">
              <p className="text-gold font-bold uppercase text-[10px]">Data Inputs:</p>
              <p className="text-white font-sans">{active.inputs.join(' · ')}</p>
            </div>

            <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-1">
              <p className="text-gold font-bold uppercase text-[10px]">Expected Output Stream:</p>
              <p className="text-white font-sans">{active.output}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function GraphNodeCard({ node, isSelected, onClick }) {
  const getBadgeColor = (cat) => {
    if (cat === 'Demand') return 'border-blue bg-blue/20 text-white'
    if (cat === 'Logic' || cat === 'Control') return 'border-gold bg-gold/20 text-gold'
    return 'border-forest bg-forest/20 text-white'
  }

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between relative shadow-md group ${
        isSelected
          ? 'bg-[#161B29] border-gold ring-2 ring-gold/50 shadow-2xl scale-[1.03] z-20'
          : 'bg-[#0E121E] border-white/20 hover:border-white/40 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center justify-between w-full mb-1.5">
        <span className="text-xl">{node.icon}</span>
        <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded border ${getBadgeColor(node.category)}`}>
          {node.category}
        </span>
      </div>

      <h4 className="text-xs font-black text-white leading-snug">{node.label}</h4>
      <p className="text-[10px] text-gold font-mono font-bold mt-1.5 truncate">{node.status}</p>
    </button>
  )
}
