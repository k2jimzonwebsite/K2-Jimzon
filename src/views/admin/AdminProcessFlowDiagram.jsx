import { useState } from 'react'

export default function AdminProcessFlowDiagram({ onNavigate }) {
  const [activeStep, setActiveStep] = useState('inventory')

  const STEPS = [
    {
      id: 'storefront',
      stepNum: '01',
      title: 'Storefront & Pasabuy Demand',
      icon: '🛒',
      color: '#2563EB', // Sapphire Blue
      badge: 'Demand Capture',
      targetSection: 'inbox',
      shortDesc: 'Customer orders, wholesale quotes, & Pasabuy custom Italy requests.',
      details: {
        inputs: ['Website Catalog Checkout', 'Pasabuy Custom Italy Sourcing', 'WhatsApp & Viber Direct Chat'],
        action: 'Captured into Central Omni Inbox & Pending Orders Queue',
        staffLead: 'Customer Service Lead',
        buttonText: '📥 Go to Omni Inbox & Chats'
      }
    },
    {
      id: 'inventory',
      stepNum: '02',
      title: 'Sheet Mode & Inventory Hub',
      icon: '📊',
      color: '#D4AF37', // Champagne Gold
      badge: 'Master Control',
      targetSection: 'inventory',
      shortDesc: 'Master SKUs, real-time stock counts, landed pricing & Sheet Mode editing.',
      details: {
        inputs: ['Supabase PostgreSQL Live Table', 'Inline Spreadsheet Cell Edits', 'AI Vision Smart Paste'],
        action: 'Automatically syncs stock & SRP across Website, Shopee, and Lazada',
        staffLead: 'Master Inventory Manager',
        buttonText: '📊 Go to Inventory Grid & Sheet'
      }
    },
    {
      id: 'consignments',
      stepNum: '03',
      title: 'Milan Flight & Cargo Handover',
      icon: '✈️',
      color: '#10B981', // Forest Emerald
      badge: 'Italy Logistics',
      targetSection: 'consignments',
      shortDesc: 'Milan boutique sourcing, flight box packing, NAIA air cargo custody claims.',
      details: {
        inputs: ['Milan Boutique Receipts', 'Air Cargo Waybills (MXP -> NAIA)', '4-Digit Staff PIN Handover'],
        action: 'Receives landed cargo boxes and allocates stock to Makati & QC hubs',
        staffLead: 'Marco Rossi (Milan Lead)',
        buttonText: '✈️ Go to Flight Consignments'
      }
    },
    {
      id: 'fulfillment',
      stepNum: '04',
      title: 'Station Pack & Barcode Ship',
      icon: '📦',
      color: '#8B5CF6', // Purple
      badge: 'Order Packing',
      targetSection: 'omni_hub',
      shortDesc: 'Station packing queue, barcode scanner verification, waybill printing.',
      details: {
        inputs: ['Pending Order Slips', 'Camera Barcode Scanner', 'Shopee/Lazada Packing Labels'],
        action: 'Verifies packed item SKUs and dispatches courier pickup',
        staffLead: 'Elena Rostova (Fulfillment Lead)',
        buttonText: '⚡ Go to Staff Operations Hub'
      }
    },
    {
      id: 'devops',
      stepNum: '05',
      title: 'DevOps & Security Vault',
      icon: '🛡️',
      color: '#EF4444', // Crimson Guard
      badge: 'Security Engine',
      targetSection: 'staff_permissions',
      shortDesc: 'AES-256 key encryption, PostgreSQL RLS locks, live QPS observability.',
      details: {
        inputs: ['Salted SHA-256 Password/PIN Hashes', 'PostgreSQL RLS Policies', 'Signed Staff JWT Tokens'],
        action: 'Protects financial COGS, marketplace credentials, and station access',
        staffLead: 'Super Admin',
        buttonText: '🔒 Go to Staff Permissions'
      }
    }
  ]

  const selectedNode = STEPS.find(s => s.id === activeStep) || STEPS[1]

  return (
    <div className="bg-[#0E121E] border border-white/20 rounded-2xl p-6 shadow-2xl font-sans text-white space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/15 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🗺️</span>
            <h2 className="text-xl font-black text-white">System Architecture & Operational Pipeline</h2>
            <span className="text-[10px] font-mono font-black bg-gold text-navy px-2.5 py-0.5 rounded-full uppercase">
              Interactive Flowchart
            </span>
          </div>
          <p className="text-xs text-white/80 font-medium mt-1">
            Click any step below to inspect how data flows through K2 Jimzon Admin Mission Control.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue pulse-dot" />
          <span className="text-xs font-mono font-bold text-gold">Live System Pipeline Active</span>
        </div>
      </div>

      {/* Interactive Process Flowchart Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {STEPS.map((step, idx) => {
          const isSelected = step.id === activeStep
          return (
            <div key={step.id} className="flex flex-col items-center">
              
              {/* Flowchart Node Card */}
              <button
                onClick={() => setActiveStep(step.id)}
                className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between h-full relative group ${
                  isSelected
                    ? 'bg-[#161B29] border-gold ring-2 ring-gold/40 shadow-xl scale-[1.02]'
                    : 'bg-white/5 border-white/15 hover:bg-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="text-xs font-mono font-black text-white/40 group-hover:text-gold">{step.stepNum}</span>
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-sm"
                    style={{ backgroundColor: step.color + '30', color: step.color, border: `1px solid ${step.color}60` }}
                  >
                    {step.badge}
                  </span>
                </div>

                <div className="my-2">
                  <span className="text-2xl block mb-1">{step.icon}</span>
                  <h3 className="text-xs font-black text-white leading-tight">{step.title}</h3>
                </div>

                <p className="text-[11px] text-white/70 font-medium mt-1 leading-snug line-clamp-2">
                  {step.shortDesc}
                </p>

                {/* Connection Arrow Indicator */}
                {idx < STEPS.length - 1 && (
                  <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 text-gold font-mono font-black text-sm">
                    ➔
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Expanded Node Operational Detail Panel */}
      {selectedNode && (
        <div className="bg-[#161B29] border border-white/20 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/15 pb-3 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2.5 rounded-xl bg-black/40 border border-white/15">{selectedNode.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gold font-bold">Step {selectedNode.stepNum} Pipeline Node</span>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-blue text-white">
                    {selectedNode.badge}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">{selectedNode.title}</h3>
              </div>
            </div>

            <button
              onClick={() => onNavigate && onNavigate(selectedNode.targetSection)}
              className="bg-blue hover:bg-blue-deep text-white font-black text-xs px-5 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 min-h-[44px] shrink-0"
            >
              <span>{selectedNode.details.buttonText}</span>
              <span>➔</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-black/40 p-3.5 rounded-xl border border-white/10 space-y-1.5">
              <p className="text-gold font-bold uppercase text-[10px]">Data Inputs & Channels:</p>
              <ul className="space-y-1 text-white/90 font-sans font-medium">
                {selectedNode.details.inputs.map((inp, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="text-gold">•</span>
                    <span>{inp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-black/40 p-3.5 rounded-xl border border-white/10 space-y-1.5">
              <p className="text-gold font-bold uppercase text-[10px]">System Execution Engine:</p>
              <p className="text-white/90 font-sans font-medium leading-relaxed">
                {selectedNode.details.action}
              </p>
            </div>

            <div className="bg-black/40 p-3.5 rounded-xl border border-white/10 space-y-1.5">
              <p className="text-gold font-bold uppercase text-[10px]">Assigned Lead & Role:</p>
              <p className="text-white font-bold text-sm font-sans">{selectedNode.details.staffLead}</p>
              <p className="text-[11px] text-white/60 font-sans">Full administrative execution & audit logging active.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
