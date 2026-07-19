import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckIcon, PlusIcon, StarIcon } from '../../components/ui/icons'

// Mock incoming conversations from Webhooks (WhatsApp, FB, Viber)
const CONVERSATIONS = [
  {
    id: 'c1',
    customer: 'Maria Santos',
    channel: 'WhatsApp',
    time: '10:42 AM',
    unread: true,
    messages: [
      { sender: 'customer', text: 'Hi! Do you have the KIKO Milano 3D Hydra Lipgloss in shade 05?' },
    ],
    intent: 'stock_check'
  },
  {
    id: 'c2',
    customer: 'Cafe Roma (Wholesale)',
    channel: 'Viber',
    time: '9:15 AM',
    unread: false,
    messages: [
      { sender: 'customer', text: 'Buongiorno, need 10 cases of Lavazza Oro beans by Friday.' },
      { sender: 'agent', text: 'Hi Marco, yes we have 14 cases in the Manila warehouse. Sending the invoice now.' },
      { sender: 'customer', text: 'Grazie! Can I also pasabuy some truffle oil next month?' }
    ],
    intent: 'pasabuy_request'
  }
]

export default function Inbox() {
  const [active, setActive] = useState(CONVERSATIONS[0].id)
  const chat = CONVERSATIONS.find(c => c.id === active)
  const [replyText, setReplyText] = useState('')
  const [aiDrafting, setAiDrafting] = useState(false)

  const handleDraftAI = () => {
    setAiDrafting(true)
    setTimeout(() => {
      setAiDrafting(false)
      if (chat.intent === 'stock_check') {
        setReplyText("Hi Maria! Yes, we currently have 4 units of the KIKO Milano 3D Hydra Lipgloss (Shade 05) in stock in Manila. It's ₱750. Would you like me to reserve one for you?")
      } else {
        setReplyText("Absolutely. We have a consignment leaving Milan on the 22nd. Let me know exactly which brand of truffle oil you need and I'll quote you the landed price.")
      }
    }, 1500)
  }

  return (
    <div className="flex h-[calc(100vh-140px)] rounded-xl border border-line bg-white shadow-sm overflow-hidden">
      
      {/* Channels List */}
      <div className="w-1/3 max-w-[320px] border-r border-line bg-shell flex flex-col">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <h2 className="font-serif font-semibold text-navy">Unified Inbox</h2>
          <span className="bg-crimson text-white text-[10px] font-bold px-2 py-0.5 rounded-full">1 NEW</span>
        </div>
        <div className="overflow-y-auto flex-1">
          {CONVERSATIONS.map(c => (
            <button 
              key={c.id} 
              onClick={() => setActive(c.id)}
              className={`w-full text-left p-4 border-b border-line/50 transition-colors ${active === c.id ? 'bg-white' : 'hover:bg-white/50'}`}
            >
              <div className="flex justify-between items-baseline mb-1">
                <span className={`font-semibold text-sm ${c.unread ? 'text-navy' : 'text-navy-soft'}`}>{c.customer}</span>
                <span className="text-xs text-navy-faint">{c.time}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-navy-faint line-clamp-1 flex-1 pr-2">{c.messages[c.messages.length - 1].text}</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${c.channel === 'WhatsApp' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                  {c.channel}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Pane */}
      <div className="flex-1 flex flex-col bg-cream/30">
        <div className="p-4 border-b border-line bg-white flex justify-between items-center shadow-sm z-10">
          <div>
            <h3 className="font-bold text-navy">{chat.customer}</h3>
            <p className="text-xs text-navy-faint">via {chat.channel} Webhook</p>
          </div>
          <button className="text-xs font-semibold text-blue hover:underline">View CRM Profile</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chat.messages.map((m, i) => (
            <div key={i} className={`flex ${m.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${m.sender === 'agent' ? 'bg-navy text-white rounded-br-sm' : 'bg-white border border-line rounded-bl-sm shadow-sm'}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-white border-t border-line">
          <div className="flex gap-2">
            <textarea 
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a reply..."
              className="flex-1 resize-none h-12 rounded-lg border border-line bg-shell p-3 text-sm focus:bg-white focus:border-navy outline-none"
            />
            <button className="bg-crimson text-white px-6 font-semibold text-sm rounded-lg hover:bg-crimson-deep transition-colors">
              Send
            </button>
          </div>
        </div>
      </div>

      {/* AI Copilot Pane */}
      <div className="w-1/4 min-w-[280px] border-l border-line bg-navy text-white flex flex-col relative overflow-hidden">
        {/* Subtle AI styling */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-forest mix-blend-screen opacity-10 filter blur-3xl pointer-events-none"></div>
        
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <StarIcon size={16} className="text-gold" />
          <h3 className="font-serif font-semibold text-sm">Staff AI Copilot</h3>
        </div>
        
        <div className="p-5 flex-1 flex flex-col justify-center items-center text-center">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4">
            <CheckIcon size={20} className="text-gold" />
          </div>
          <p className="text-sm font-light leading-relaxed text-white/80 mb-6">
            I have analyzed this conversation and cross-referenced it with our live Supabase inventory and Milan shipment schedules.
          </p>
          <button 
            onClick={handleDraftAI}
            disabled={aiDrafting}
            className="w-full flex justify-center items-center gap-2 py-3 bg-white text-navy font-semibold text-sm rounded-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {aiDrafting ? 'Querying Database...' : 'Draft Reply with AI'}
          </button>
          
          <div className="mt-8 pt-6 border-t border-white/10 w-full text-left">
             <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">Database Context Used</p>
             {chat.intent === 'stock_check' ? (
                <div className="bg-black/30 p-3 rounded text-[11px] font-mono leading-relaxed text-white/70">
                  <span className="text-green-400">SELECT</span> stock, retail_price <br/>
                  <span className="text-green-400">FROM</span> products <br/>
                  <span className="text-green-400">WHERE</span> name <span className="text-blue-300">ILIKE</span> '%KIKO%Hydra%05%'
                </div>
             ) : (
                <div className="bg-black/30 p-3 rounded text-[11px] font-mono leading-relaxed text-white/70">
                  <span className="text-green-400">SELECT</span> arrival_date <br/>
                  <span className="text-green-400">FROM</span> shipments <br/>
                  <span className="text-green-400">WHERE</span> status = 'in_transit'
                </div>
             )}
          </div>
        </div>
      </div>

    </div>
  )
}
