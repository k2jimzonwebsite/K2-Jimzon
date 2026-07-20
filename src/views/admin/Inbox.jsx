import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

// Mock incoming conversations if DB isn't populated
const MOCK_CONVERSATIONS = [
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
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS)
  const [activeId, setActiveId] = useState(MOCK_CONVERSATIONS[0].id)
  
  const chat = conversations.find(c => c.id === activeId)
  
  const [replyText, setReplyText] = useState('')
  const [aiDrafting, setAiDrafting] = useState(false)
  const [dbResults, setDbResults] = useState(null)

  // In a real app, we'd fetch from supabase conversations & messages table here

  const handleDraftAI = () => {
    setAiDrafting(true)
    setTimeout(() => {
      setAiDrafting(false)
      if (chat.intent === 'stock_check') {
        setReplyText("Hi Maria! Yes, we currently have 4 units of the KIKO Milano 3D Hydra Lipgloss (Shade 05) in stock in Manila. It's ₱750. Would you like me to reserve one for you?")
        setDbResults({
          query: "SELECT stock, retail_price FROM products WHERE title ILIKE '%KIKO%Hydra%05%'",
          result: "[ { stock: 4, srp: 750 } ]"
        })
      } else {
        setReplyText("Absolutely. We have a consignment leaving Milan on the 22nd. Let me know exactly which brand of truffle oil you need and I'll quote you the landed price.")
        setDbResults({
          query: "SELECT expected_delivery FROM purchase_orders WHERE status = 'Sent'",
          result: "[ { expected_delivery: '2026-07-22' } ]"
        })
      }
    }, 1200)
  }

  const handleSend = () => {
    if (!replyText.trim()) return
    
    // Optimistic update
    const updated = conversations.map(c => {
      if (c.id === activeId) {
        return {
          ...c,
          unread: false,
          messages: [...c.messages, { sender: 'agent', text: replyText }]
        }
      }
      return c
    })
    
    setConversations(updated)
    setReplyText('')
    setDbResults(null)
  }

  return (
    <div className="flex h-[calc(100vh-140px)] rounded-xl border border-white/10 bg-[#05080f] shadow-2xl overflow-hidden animate-in fade-in duration-500">
      
      {/* Channels List (Left Pane) */}
      <div className="w-1/3 max-w-[320px] border-r border-white/10 flex flex-col bg-[#020408]">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-serif font-semibold text-white">Customer Messages</h2>
          <span className="bg-crimson text-white text-[10px] font-bold px-2 py-0.5 rounded-full pulse-dot">1 NEW</span>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {conversations.map(c => (
            <button 
              key={c.id} 
              onClick={() => setActiveId(c.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                activeId === c.id 
                  ? 'border-blue/50 bg-blue/10' 
                  : 'border-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex justify-between items-baseline mb-1">
                <span className={`font-semibold text-sm ${c.unread ? 'text-white' : 'text-white/60'}`}>{c.customer}</span>
                <span className="text-xs text-white/30">{c.time}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className={`text-xs line-clamp-1 flex-1 pr-2 ${c.unread ? 'text-white/80' : 'text-white/40'}`}>
                  {c.messages[c.messages.length - 1].text}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  c.channel === 'WhatsApp' ? 'bg-forest/20 text-forest' : 'bg-purple-900/40 text-purple-400'
                }`}>
                  {c.channel}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Pane (Middle) */}
      <div className="flex-1 flex flex-col bg-[#0A101D] relative">
        <div className="p-4 border-b border-white/10 flex justify-between items-center shadow-sm z-10 bg-white/5 backdrop-blur-md">
          <div>
            <h3 className="font-bold text-white">{chat.customer}</h3>
            <p className="text-xs text-white/50">via {chat.channel} Webhook</p>
          </div>
          <button className="text-xs font-semibold text-blue hover:text-blue/80 transition-colors">View CRM Profile</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chat.messages.map((m, i) => (
            <div key={i} className={`flex ${m.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3 text-sm shadow-md ${
                m.sender === 'agent' 
                  ? 'bg-blue text-white rounded-2xl rounded-tr-sm' 
                  : 'bg-white/10 text-white/90 border border-white/5 rounded-2xl rounded-tl-sm'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-white/5 border-t border-white/10">
          <div className="flex gap-2">
            <textarea 
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a reply or use AI Copilot..."
              className="flex-1 resize-none h-[60px] rounded-lg border border-white/10 bg-[#05080f] p-3 text-sm text-white placeholder:text-white/30 focus:border-blue focus:ring-1 focus:ring-blue outline-none transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={!replyText.trim()}
              className="bg-blue text-white px-6 font-semibold text-sm rounded-lg hover:bg-blue/90 disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* AI Copilot Pane (Right) */}
      <div className="w-1/4 min-w-[300px] border-l border-white/10 bg-[#020408] flex flex-col relative overflow-hidden">
        
        <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-white/5">
          <div className="h-2 w-2 rounded-full bg-blue pulse-dot" />
          <h3 className="font-serif font-semibold text-sm text-white">AI Chat Assistant</h3>
        </div>
        
        <div className="p-5 flex-1 flex flex-col items-start overflow-y-auto">
          <p className="text-xs text-white/50 mb-6">
            The AI automatically reads incoming messages and queries the database to draft accurate replies for you.
          </p>

          <button 
            onClick={handleDraftAI}
            disabled={aiDrafting}
            className="w-full flex justify-center items-center gap-2 py-2.5 border border-blue bg-blue/10 text-blue font-semibold text-sm rounded-lg transition-all hover:bg-blue/20 active:scale-95 disabled:opacity-50 mb-8"
          >
            {aiDrafting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Querying Database...
              </span>
            ) : 'Ask AI to help reply'}
          </button>
          
          {dbResults && (
            <div className="w-full animate-in slide-in-from-bottom-4 duration-300">
               <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Live Database Context</p>
               <div className="bg-black/50 border border-white/5 p-3 rounded-lg text-[11px] font-mono leading-relaxed text-white/70 mb-4 overflow-x-auto">
                 <span className="text-purple-400">Query Executed:</span><br/>
                 <span className="text-blue-300">{dbResults.query}</span><br/><br/>
                 <span className="text-forest">Result:</span><br/>
                 <span className="text-white/90">{dbResults.result}</span>
               </div>
               
               <div className="bg-blue/5 border border-blue/20 p-3 rounded-lg">
                 <p className="text-xs text-blue mb-1 font-semibold">Suggested Action</p>
                 <p className="text-xs text-white/70">The drafted reply has been placed in your text box. Review it and click Send to confirm.</p>
               </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
