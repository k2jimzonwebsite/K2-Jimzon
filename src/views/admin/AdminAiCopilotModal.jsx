import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminAiCopilotModal({ isOpen, onClose, onNavigate }) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Ciao Admin! 👋 I am your K2 Jimzon BOS AI Copilot. Ask me anything about inventory stock, staff custody allocations, landed profits, or incoming Italy flight boxes!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])

  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!isOpen) return null

  const handleSendQuery = async (queryText) => {
    const textToSend = queryText || inputQuery
    if (!textToSend.trim()) return

    const userMsg = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    if (!queryText) setInputQuery('')
    setLoading(true)

    // Simulate AI Processing & Live Supabase Query Execution
    setTimeout(() => {
      let aiResponse = {}
      const q = textToSend.toLowerCase()

      if (q.includes('staff') || q.includes('custody') || q.includes('kiko') || q.includes('who has')) {
        aiResponse = {
          text: "I checked Supabase `staff_allocations` for SKU `KIKO-3D-05`:",
          sql: "SELECT staff_name, location, stock FROM staff_allocations WHERE sku = 'KIKO-3D-05';",
          data: [
            { staff: 'Elena Guerrero', location: 'Makati Hub', stock: '3 units' },
            { staff: 'Juan Dela Cruz', location: 'Quezon City Hub', stock: '4 units' },
            { staff: 'Marco Rossi', location: 'Milan Transit', stock: '2 units' }
          ],
          actionLabel: '⚡ Open Staff Stock Allocations',
          targetSection: 'omni_hub'
        }
      } else if (q.includes('profit') || q.includes('revenue') || q.includes('sales') || q.includes('money')) {
        aiResponse = {
          text: "Here is today's financial summary across all 4 channels:",
          sql: "SELECT gross_sales, cogs_eur, freight_duty, net_profit FROM master_metrics WHERE date = CURRENT_DATE;",
          data: [
            { metric: 'Gross Sales', value: '₱41,260' },
            { metric: 'Sourcing COGS (€)', value: '-₱21,400 (51.8%)' },
            { metric: 'Air Freight & Duties', value: '-₱6,850 (16.6%)' },
            { metric: 'Net Cash Profit', value: '+₱13,010 (31.5% Margin)' }
          ],
          actionLabel: '💰 Open Master P&L Cockpit',
          targetSection: 'overview'
        }
      } else if (q.includes('box') || q.includes('flight') || q.includes('cargo') || q.includes('naia')) {
        aiResponse = {
          text: "Found 1 incoming flight cargo box at NAIA Customs:",
          sql: "SELECT box_code, flight_num, status FROM cargo_boxes WHERE status ILIKE '%Customs%';",
          data: [
            { box: 'MIL-BOX-092', flight: 'AZ-772 (MXP → MNL)', status: 'Arrived NAIA Customs', custodian: 'Elena Guerrero (Makati)' }
          ],
          actionLabel: '⚡ Claim Custody in Handover Station',
          targetSection: 'omni_hub'
        }
      } else {
        aiResponse = {
          text: `Analyzed query "${textToSend}". Found 18 active SKUs in Master Inventory with 4 pending Shopee orders ready for packing.`,
          sql: "SELECT id, title, stock_available FROM products WHERE is_active = true;",
          data: [
            { sku: 'MUL-PAN-500', title: 'Mulino Bianco Pan di Stelle 500g', stock: '6 units' },
            { sku: 'LAV-ORO-250', title: 'Lavazza Qualità Oro 250g', stock: '10 units' }
          ],
          actionLabel: '📦 Open Fulfillment Queue',
          targetSection: 'omni_hub'
        }
      }

      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          ...aiResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0A101D] border-l border-white/10 h-full flex flex-col shadow-2xl text-white font-mono text-sm">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#09090b] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue/20 border border-blue/40 flex items-center justify-center text-blue text-lg">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-base text-white">BOS AI Chat Copilot</h2>
                <span className="text-[9px] font-mono font-bold bg-forest/20 text-forest px-1.5 py-0.5 rounded border border-forest/30 uppercase">
                  Connected to Supabase
                </span>
              </div>
              <p className="text-[10px] text-white/50">Instant Natural Language Database & Action Agent</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Quick Query Pills */}
        <div className="p-3 bg-[#09090b]/50 border-b border-white/10 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => handleSendQuery('Who holds stock for KIKO Lipgloss Shade 05?')}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white shrink-0 text-[11px] transition-all"
          >
            📦 Staff Custody Stock
          </button>
          <button
            onClick={() => handleSendQuery('What is todays net profit across all channels?')}
            className="px-3 py-1.5 rounded-lg bg-forest/10 hover:bg-forest/20 border border-forest/30 text-forest shrink-0 text-[11px] transition-all"
          >
            💰 Today Net Profit
          </button>
          <button
            onClick={() => handleSendQuery('Are there incoming flight boxes at NAIA Customs?')}
            className="px-3 py-1.5 rounded-lg bg-amber/10 hover:bg-amber/20 border border-amber/30 text-amber shrink-0 text-[11px] transition-all"
          >
            🛬 Flight Boxes
          </button>
        </div>

        {/* Chat Conversation Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className="flex items-center gap-2 text-[10px] text-white/40 px-1">
                <span>{msg.sender === 'user' ? 'You (Admin)' : 'AI Copilot'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`p-3.5 rounded-2xl max-w-[90%] space-y-2.5 ${
                  msg.sender === 'user'
                    ? 'bg-blue text-white rounded-tr-none'
                    : 'bg-[#09090b] border border-white/10 text-white rounded-tl-none shadow-md'
                }`}
              >
                <p className="leading-relaxed text-sm">{msg.text}</p>

                {/* SQL Code Block */}
                {msg.sql && (
                  <div className="bg-black/60 p-2.5 rounded-xl border border-white/10 text-[10px] text-amber font-mono overflow-x-auto">
                    <span className="text-white/40 block text-[9px] uppercase mb-1">Generated Supabase Query:</span>
                    <code>{msg.sql}</code>
                  </div>
                )}

                {/* Structured Data Table */}
                {msg.data && (
                  <div className="bg-white/5 rounded-xl border border-white/10 p-2 space-y-1 text-[11px]">
                    {msg.data.map((row, rIdx) => (
                      <div key={rIdx} className="flex items-center justify-between p-1.5 rounded hover:bg-white/5">
                        <span className="font-bold text-neutral-200">{row.staff || row.metric || row.box || row.sku}</span>
                        <span className="text-forest font-bold">{row.stock || row.value || row.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actionable Button */}
                {msg.actionLabel && (
                  <button
                    onClick={() => {
                      if (onNavigate && msg.targetSection) onNavigate(msg.targetSection)
                      onClose()
                    }}
                    className="w-full mt-2 bg-forest hover:bg-forest/90 text-white font-bold text-sm py-2 rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[38px]"
                  >
                    {msg.actionLabel}
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-white/50 text-sm p-2 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-blue animate-ping" />
              AI Copilot is querying Supabase database...
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendQuery()
          }}
          className="p-3 bg-[#09090b] border-t border-white/10 flex gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask AI Copilot (e.g. Who has stock for KIKO?)..."
            className="flex-1 rounded-xl border border-white/10 bg-[#0A101D] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-blue outline-none min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim()}
            className="bg-blue hover:bg-blue/90 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-md shrink-0 min-h-[44px]"
          >
            Ask
          </button>
        </form>

      </div>
    </div>
  )
}
