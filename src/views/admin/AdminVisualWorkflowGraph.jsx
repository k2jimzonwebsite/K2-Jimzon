import { useState, useRef, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Card + grid geometry (canvas coordinate space, in px)
// ---------------------------------------------------------------------------
const W = 236   // node width
const H = 128   // node height
const cx = (col) => 48 + col * 300
const ry = (row) => 48 + row * 216

// Category → accent color
const CAT = {
  access:      '#EF4444',
  core:        '#3B82F6',
  tool:        '#94A3B8',
  intake:      '#3B82F6',
  decision:    '#D4AF37',
  supply:      '#10B981',
  data:        '#D4AF37',
  fulfillment: '#8B5CF6',
  channels:    '#EC4899',
  crm:         '#3B82F6',
  settings:    '#94A3B8',
}

// ---------------------------------------------------------------------------
// The full dashboard, as a graph. Every node is a real section or tool.
// ---------------------------------------------------------------------------
const NODES = [
  // ----- GLOBAL TOOLS BAND (row 0) -----
  {
    id: 'cmd_palette', title: 'Command Palette', icon: '⌘', cat: 'tool',
    badge: 'Global tool', col: 1, row: 0, section: null,
    where: 'Press Ctrl / Cmd + K on any screen, or the search box top-left.',
    what: 'A keyboard search box that jumps you to any section instantly — no clicking through the sidebar.',
    how: ['Press Ctrl+K (Windows) or ⌘K (Mac).', 'Type the first letters of where you want to go, e.g. "inv" for Inventory.', 'Press Enter to jump.'],
  },
  {
    id: 'daily_tasks', title: 'Daily Tasks Bell', icon: '🔔', cat: 'tool',
    badge: 'Global tool', col: 2, row: 0, section: null,
    where: 'The 🔔 button in the top-right header.',
    what: 'Your to-do list for the day: expiring stock, orders waiting to pack, and reminders.',
    how: ['Click the bell to open the task drawer.', 'Work top to bottom — most urgent first.', 'Tap a task to jump straight to the screen that fixes it.'],
  },
  {
    id: 'ai_copilot', title: 'AI Assistant', icon: '🤖', cat: 'tool',
    badge: 'Global tool', col: 3, row: 0, section: null,
    where: 'The floating 🤖 button, bottom-right of every screen.',
    what: 'Ask questions in plain language ("how many KIKO lipglosses are left?") and get answers or drafted messages.',
    how: ['Click the AI Assistant button.', 'Type your question or request.', 'Use its answer, or send it to the right section.'],
  },
  {
    id: 'devops', title: 'DevOps & System', icon: '🩺', cat: 'tool',
    badge: 'Super admin', col: 4, row: 0, section: null,
    where: 'Bottom of the sidebar — "DevOps & System".',
    what: 'System health cockpit: database status, sync speed, and error logs. For the owner / super admin only.',
    how: ['Open only when something looks broken.', 'Check the status dots are green.', 'Share any red errors with your developer.'],
  },

  // ----- MAIN SPINE (row 1): order in → out the door -----
  {
    id: 'login', title: 'Staff Login & Auth', icon: '🔒', cat: 'access',
    badge: 'Entry', col: 0, row: 1, section: 'staff_permissions',
    where: 'Shown automatically before the dashboard loads.',
    what: 'The security gate. Everyone signs in here so the system knows who did what.',
    how: ['Enter your 4-digit staff PIN, or', 'Sign in with Google, or use the master passcode (owner).', 'Your role decides which sections you can open.'],
  },
  {
    id: 'home', title: 'Home Dashboard', icon: '🏠', cat: 'core',
    badge: 'Sidebar', col: 1, row: 1, section: 'overview',
    where: 'Sidebar → Home (top item).',
    what: "The daily snapshot: today's sales, low-stock alerts, pending orders, and the cargo status — plus this map.",
    how: ['Start your shift here.', 'Scan the four number tiles at the top.', 'Use Quick Jump or this map to reach any task.'],
  },
  {
    id: 'intake', title: 'Incoming Orders', icon: '🛒', cat: 'intake',
    badge: 'Sidebar', col: 2, row: 1, section: 'omni_hub',
    where: 'Sidebar → Fulfillment Hub.',
    what: 'Orders arriving from the website, Shopee, Lazada, TikTok, and VIP wholesale all land here in one queue.',
    how: ['Check the queue for new "Pending" orders.', 'Confirm the customer and items.', 'Send each order to packing.'],
  },
  {
    id: 'decision', title: 'In Stock?', icon: '💎', cat: 'decision',
    badge: 'Decision', col: 3, row: 1, section: 'inventory',
    where: 'Automatic — the system checks stock for you.',
    what: 'The fork in the road. If the item is in a hub, it goes straight to packing. If not, it becomes an Italy sourcing job.',
    how: ['In stock → order moves to Fulfillment.', 'Out of stock → order starts a Pasabuy sourcing request.', 'You only step in when stock is unclear.'],
  },
  {
    id: 'inventory', title: 'Inventory', icon: '📦', cat: 'data',
    badge: 'Sidebar', col: 4, row: 1, section: 'inventory',
    where: 'Sidebar → Inventory (shows a live SKU count).',
    what: 'The master product catalog and stock levels. Switch on Sheet Mode to edit prices and stock like a spreadsheet.',
    how: ['Search or scroll to find a product.', 'Toggle "Sheet mode" to bulk-edit cells.', 'Use "Upload CSV" to add many products at once.'],
  },
  {
    id: 'fulfillment', title: 'Fulfillment Hub', icon: '🖨️', cat: 'fulfillment',
    badge: 'Sidebar', col: 5, row: 1, section: 'omni_hub',
    where: 'Sidebar → Fulfillment Hub.',
    what: 'Where staff pack and ship. Scan the barcode (or type the SKU), verify the order, then print the courier waybill.',
    how: ['Open the order to pack.', 'Scan each item with the camera, or enter the SKU by hand.', 'Print the waybill and hand to J&T / Lalamove / LEX.'],
  },
  {
    id: 'channels', title: 'Channels & Keys', icon: '🔄', cat: 'channels',
    badge: 'Sidebar', col: 6, row: 1, section: 'integrations',
    where: 'Sidebar → Settings → Channels & Keys.',
    what: 'Keeps stock and orders in sync with Shopee, Lazada, TikTok Shop, and Meta. Sell one, it drops everywhere.',
    how: ['Rarely touched day-to-day — mostly setup.', 'Paste marketplace API keys here when connecting a store.', 'If a channel stops syncing, re-check its key.'],
  },
  {
    id: 'customers', title: 'Customers & VIPs', icon: '💬', cat: 'crm',
    badge: 'Sidebar', col: 7, row: 1, section: 'wholesale',
    where: 'Sidebar → Customers.',
    what: 'The customer directory: order history, lifetime spend, VIP wholesale approvals, and mass Viber / email broadcasts.',
    how: ['Look up a customer to see their history.', 'Approve VIP / wholesale requests.', 'Send a targeted broadcast to bring buyers back.'],
  },

  // ----- ITALY SUPPLY CHAIN (row 2): sourcing branch -----
  {
    id: 'pasabuy', title: 'Pasabuy Quotes', icon: '✈️', cat: 'supply',
    badge: 'Sidebar', col: 2, row: 2, section: 'pasabuy_manager',
    where: 'Sidebar → Pasabuy Quotes.',
    what: 'Handles custom "buy-this-for-me-from-Italy" requests and works out the landed price (item + shipping + fees).',
    how: ['Open the customer request and photo.', 'Enter the Italy cost and let it calculate the quote.', 'Send the quote; once paid, it becomes a buy order for Milan.'],
  },
  {
    id: 'ai_sourcing', title: 'AI Sourcing', icon: '🧠', cat: 'supply',
    badge: 'Sidebar', col: 3, row: 2, section: 'sourcing',
    where: 'Sidebar → AI Sourcing.',
    what: 'AI reads receipts, links, or photos and drafts new product entries for you to review before they go live.',
    how: ['Review each AI-drafted product.', 'Fix any wrong price or detail.', 'Approve to publish it into Inventory.'],
  },
  {
    id: 'suppliers', title: 'Suppliers', icon: '🏬', cat: 'supply',
    badge: 'Sidebar', col: 4, row: 2, section: 'suppliers',
    where: 'Sidebar → Suppliers.',
    what: 'Your vendor contacts and purchase orders — who you buy from in Italy and what has been ordered.',
    how: ['Keep supplier contacts up to date.', 'Raise a purchase order for a restock.', 'Mark orders received when cargo lands.'],
  },
  {
    id: 'consignments', title: 'Flight Consignments', icon: '🇮🇹', cat: 'supply',
    badge: 'Sidebar', col: 5, row: 2, section: 'kanban',
    where: 'Sidebar → Flight Consignments.',
    what: "The box's whole journey: packed in Italy (items scanned in), confirmed shipped, then scanned again on arrival in PH to verify nothing was lost.",
    how: ['In Italy: pack the box and scan each product into it.', 'Confirm it shipped once it is on the plane.', 'On arrival, scan the items to verify against the packing list (discrepancy check).'],
  },
  {
    id: 'custody', title: 'Your Custody Stock', icon: '📥', cat: 'supply',
    badge: 'In Fulfillment Hub', col: 6, row: 2, section: 'omni_hub',
    where: 'Fulfilment Hub → Box Handover.',
    what: 'Once a received box is scan-verified, its items become your custody stock in the Fulfilment Hub — what you personally hold and ship orders from.',
    how: ['Open Fulfilment Hub → Box Handover to see stock credited to you.', 'Pack customer orders from your custody stock.', 'Transfer to another staff member if needed.'],
  },

  // ----- SUPPORT / SETTINGS (row 3) -----
  {
    id: 'staff_roles', title: 'Staff & Roles', icon: '👑', cat: 'settings',
    badge: 'Sidebar', col: 1, row: 3, section: 'staff_permissions',
    where: 'Sidebar → Settings → Staff & Roles.',
    what: 'Create staff PINs and decide who can see or change what. This is what powers the login gate.',
    how: ['Add a staff member and give them a PIN.', 'Pick their role / permissions.', 'Remove access the moment someone leaves.'],
  },
  {
    id: 'messages', title: 'Messages', icon: '📨', cat: 'crm',
    badge: 'Sidebar', col: 2, row: 3, section: 'inbox',
    where: 'Sidebar → Messages.',
    what: 'One inbox for WhatsApp, Facebook, and Viber, with the AI Copilot ready to draft replies.',
    how: ['Reply to customer questions here.', 'Let the AI Copilot draft a reply, then edit it.', 'Turn a chat into an order or a Pasabuy request.'],
  },
  {
    id: 'coupons', title: 'Coupons', icon: '🎟️', cat: 'settings',
    badge: 'Sidebar', col: 4, row: 3, section: 'coupons',
    where: 'Sidebar → Coupons.',
    what: 'Create discount codes and voucher hunts to run promotions.',
    how: ['Create a code with its discount and limits.', 'Set the expiry date.', 'Share it with customers / VIPs.'],
  },
  {
    id: 'globe', title: 'Globe Display', icon: '🌐', cat: 'settings',
    badge: 'Sidebar', col: 6, row: 3, section: 'globe',
    where: 'Sidebar → Settings → Globe Display.',
    what: 'Controls which products appear on the public 3D map on your storefront — a marketing showcase.',
    how: ['Pick which products feature on the globe.', 'Reorder or hide items.', 'Save to update the live storefront.'],
  },
]

// Attach absolute coordinates
NODES.forEach(n => { n.x = cx(n.col); n.y = ry(n.row) })
const BY_ID = Object.fromEntries(NODES.map(n => [n.id, n]))

// Edges: [from, to, color-key, dashed?, label?]
const EDGES = [
  // tools drop into the spine (global, dashed)
  ['cmd_palette', 'home', 'tool', true],
  ['daily_tasks', 'intake', 'tool', true],
  ['ai_copilot', 'decision', 'tool', true],
  ['devops', 'inventory', 'tool', true],
  // spine
  ['login', 'home', 'access', false],
  ['home', 'intake', 'core', false],
  ['intake', 'decision', 'intake', false],
  ['decision', 'inventory', 'decision', false, 'in stock'],
  ['decision', 'pasabuy', 'access', true, 'out of stock'],
  ['inventory', 'fulfillment', 'data', false],
  ['fulfillment', 'channels', 'fulfillment', false],
  ['channels', 'customers', 'channels', false],
  // supply chain
  ['pasabuy', 'ai_sourcing', 'supply', false],
  ['ai_sourcing', 'suppliers', 'supply', false],
  ['suppliers', 'consignments', 'supply', false],
  ['consignments', 'custody', 'supply', false],
  ['custody', 'inventory', 'supply', true, 'stock lands'],
  // support
  ['staff_roles', 'login', 'settings', true],
  ['messages', 'intake', 'crm', true],
  ['coupons', 'customers', 'settings', true],
  ['globe', 'customers', 'settings', true],
]

const CANVAS_W = Math.max(...NODES.map(n => n.x + W)) + 48
const CANVAS_H = Math.max(...NODES.map(n => n.y + H)) + 48

// Compute an S-curve between two nodes, exiting the side that faces the target
function edgePath(a, b) {
  const acx = a.x + W / 2, acy = a.y + H / 2
  const bcx = b.x + W / 2, bcy = b.y + H / 2
  const dx = bcx - acx, dy = bcy - acy
  let s, e, c1, c2
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) { s = [a.x + W, acy]; e = [b.x, bcy] }
    else { s = [a.x, acy]; e = [b.x + W, bcy] }
    const mx = (s[0] + e[0]) / 2
    c1 = [mx, s[1]]; c2 = [mx, e[1]]
  } else {
    if (dy >= 0) { s = [acx, a.y + H]; e = [bcx, b.y] }
    else { s = [acx, a.y]; e = [bcx, b.y + H] }
    const my = (s[1] + e[1]) / 2
    c1 = [s[0], my]; c2 = [e[0], my]
  }
  return { d: `M ${s[0]} ${s[1]} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${e[0]} ${e[1]}`, mid: [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2] }
}

const STAGES = [
  { label: 'Global tools', y: ry(0) - 26 },
  { label: 'Daily order flow', y: ry(1) - 26 },
  { label: 'Italy supply chain', y: ry(2) - 26 },
  { label: 'Support & settings', y: ry(3) - 26 },
]

const MARKER_COLORS = { access: '#EF4444', core: '#3B82F6', tool: '#94A3B8', intake: '#3B82F6', decision: '#D4AF37', supply: '#10B981', data: '#D4AF37', fulfillment: '#8B5CF6', channels: '#EC4899', crm: '#3B82F6', settings: '#94A3B8' }

export default function AdminVisualWorkflowGraph({ onNavigate }) {
  const [selected, setSelected] = useState('home')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [scalePct, setScalePct] = useState(70)

  const viewportRef = useRef(null)
  const canvasRef = useRef(null)
  const pan = useRef({ x: 24, y: 12, scale: 0.7 })
  const drag = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: false })

  const apply = useCallback(() => {
    if (canvasRef.current) {
      const p = pan.current
      canvasRef.current.style.transform = `translate(${p.x}px, ${p.y}px) scale(${p.scale})`
    }
  }, [])

  const resetView = useCallback((full) => {
    const vp = viewportRef.current
    const scale = full ? 0.82 : 0.62
    let x = 24, y = 12
    if (vp) {
      // center horizontally if the canvas is narrower than the viewport
      const avail = vp.clientWidth
      if (CANVAS_W * scale < avail) x = (avail - CANVAS_W * scale) / 2
    }
    pan.current = { x, y, scale }
    setScalePct(Math.round(scale * 100))
    apply()
  }, [apply])

  useEffect(() => { resetView(isFullScreen) }, [isFullScreen, resetView])

  const onDown = (e) => {
    drag.current = { active: true, sx: e.clientX, sy: e.clientY, ox: pan.current.x, oy: pan.current.y, moved: false }
  }
  const onMove = (e) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.sx, dy = e.clientY - drag.current.sy
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true
    pan.current.x = drag.current.ox + dx
    pan.current.y = drag.current.oy + dy
    apply()
  }
  const onUp = () => { drag.current.active = false }

  const zoom = (dir) => {
    const next = Math.min(1.6, Math.max(0.35, +(pan.current.scale + dir * 0.12).toFixed(2)))
    pan.current.scale = next
    setScalePct(Math.round(next * 100))
    apply()
  }
  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return  // let normal scroll pass unless zoom-intent
    e.preventDefault()
    zoom(e.deltaY < 0 ? 1 : -1)
  }

  const nodeClick = (id) => { if (!drag.current.moved) setSelected(id) }
  const active = BY_ID[selected]

  const canvas = (full) => (
    <div
      ref={viewportRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onWheel={onWheel}
      className={`relative overflow-hidden bg-[#080A10] cursor-grab active:cursor-grabbing select-none touch-none ${full ? 'flex-1' : 'h-[540px] rounded-xl border border-white/10'}`}
      style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '26px 26px' }}
    >
      <div ref={canvasRef} className="absolute top-0 left-0 origin-top-left" style={{ width: CANVAS_W, height: CANVAS_H }}>
        {/* Edges */}
        <svg width={CANVAS_W} height={CANVAS_H} className="absolute inset-0 pointer-events-none">
          <defs>
            {Object.entries(MARKER_COLORS).map(([k, c]) => (
              <marker key={k} id={`ar-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
              </marker>
            ))}
          </defs>
          {EDGES.map(([from, to, color, dashed, label], i) => {
            const a = BY_ID[from], b = BY_ID[to]
            if (!a || !b) return null
            const { d, mid } = edgePath(a, b)
            const lit = selected === from || selected === to
            return (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke={MARKER_COLORS[color]}
                  strokeWidth={lit ? 3 : 1.8}
                  strokeOpacity={lit ? 1 : 0.5}
                  strokeDasharray={dashed ? '6 5' : '0'}
                  markerEnd={`url(#ar-${color})`}
                />
                {label && (
                  <g transform={`translate(${mid[0]}, ${mid[1]})`}>
                    <rect x="-38" y="-11" width="76" height="22" rx="6" fill="#0E121E" stroke="rgba(255,255,255,0.12)" />
                    <text x="0" y="4" textAnchor="middle" fontSize="11" fill="#cbd5e1" fontFamily="monospace">{label}</text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>

        {/* Stage labels */}
        {STAGES.map(s => (
          <div key={s.label} className="absolute text-[11px] font-semibold uppercase tracking-wider text-white/55" style={{ left: 48, top: s.y }}>
            {s.label}
          </div>
        ))}

        {/* Nodes */}
        {NODES.map(n => {
          const on = selected === n.id
          const c = CAT[n.cat]
          return (
            <button
              key={n.id}
              onClick={() => nodeClick(n.id)}
              className="absolute text-left rounded-xl border bg-[#161922] transition-colors"
              style={{
                left: n.x, top: n.y, width: W, height: H,
                borderColor: on ? c : 'rgba(255,255,255,0.12)',
                boxShadow: on ? `0 0 0 2px ${c}55` : 'none',
              }}
            >
              <div className="p-3.5 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xl" style={{ filter: on ? 'none' : 'saturate(0.9)' }}>{n.icon}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: c, background: `${c}1A` }}>{n.badge}</span>
                </div>
                <h4 className="text-[15px] font-semibold text-white mt-2 leading-tight">{n.title}</h4>
                <p className="text-[11px] text-white/60 mt-1 leading-snug line-clamp-2">{n.what}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-white/10 bg-black/70 backdrop-blur px-1 py-1">
        <button onClick={() => zoom(-1)} className="w-7 h-7 rounded text-white/70 hover:bg-white/10 hover:text-white text-lg leading-none">−</button>
        <span className="text-xs text-white/50 w-10 text-center tabular-nums">{scalePct}%</span>
        <button onClick={() => zoom(1)} className="w-7 h-7 rounded text-white/70 hover:bg-white/10 hover:text-white text-lg leading-none">+</button>
        <button onClick={() => resetView(isFullScreen)} className="ml-1 px-2 h-7 rounded text-xs text-white/70 hover:bg-white/10 hover:text-white">Reset</button>
      </div>

      {/* Drag hint */}
      <div className="absolute bottom-3 left-3 text-[11px] text-white/55 pointer-events-none">
        Drag to move · Ctrl + scroll to zoom · click a card to learn it
      </div>
    </div>
  )

  const detail = active && (
    <div>
      <div className="rounded-xl border border-white/10 bg-[#161922] p-5">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl h-11 w-11 flex items-center justify-center rounded-xl bg-black/40 border border-white/10">{active.icon}</span>
            <div>
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ color: CAT[active.cat], background: `${CAT[active.cat]}1A` }}>{active.badge}</span>
              <h3 className="text-lg font-semibold text-white mt-1">{active.title}</h3>
            </div>
          </div>
          {active.section && (
            <button
              onClick={() => { if (isFullScreen) setIsFullScreen(false); onNavigate?.(active.section) }}
              className="shrink-0 rounded-lg bg-blue hover:bg-blue-deep text-white text-sm font-medium px-4 py-2 transition-colors flex items-center gap-1.5"
            >
              Open <span aria-hidden>→</span>
            </button>
          )}
        </div>

        <p className="text-sm text-white/80 leading-relaxed mt-4">{active.what}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60 mb-2">How staff use it</p>
            <ol className="space-y-1.5">
              {active.how.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm text-white/70">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-white/10 text-[10px] flex items-center justify-center text-white/60">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60 mb-2">Where to find it</p>
            <p className="text-sm text-white/70 leading-relaxed">{active.where}</p>
          </div>
        </div>
      </div>
    </div>
  )

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-white">How the dashboard works</h2>
        <p className="text-sm text-white/60 mt-0.5">A live map of every screen and tool — click any card to learn what it does and how to use it.</p>
      </div>
      <div className="flex items-center gap-2">
        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 text-[11px] text-white/50 mr-1">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CAT.core }} /> Order flow</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CAT.supply }} /> Supply</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CAT.tool }} /> Tools</span>
        </div>
        <button
          onClick={() => setIsFullScreen(f => !f)}
          className="rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/10 text-white/80 hover:text-white text-sm px-3 py-2 transition-colors flex items-center gap-1.5"
        >
          {isFullScreen ? 'Exit full screen' : 'Full screen'}
        </button>
      </div>
    </div>
  )

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0E14] flex flex-col p-4 md:p-5 animate-in fade-in duration-200">
        <div className="shrink-0 mb-3">{header}</div>
        {canvas(true)}
        {active && (
          <div className="shrink-0 mt-3 max-h-[42vh] overflow-y-auto custom-scrollbar">{detail}</div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0E121E] p-5 space-y-4">
      {header}
      {canvas(false)}
      {detail}
    </div>
  )
}
