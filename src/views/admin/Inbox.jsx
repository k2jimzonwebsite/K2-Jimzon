import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useStore } from '../../context/StoreContext'

export default function Inbox() {
  const { conversations, sendMessage } = useStore()
  const [activeId, setActiveId] = useState(conversations[0]?.id)
  
  // If activeId was deleted or missing, default to the first
  useEffect(() => {
    if (!conversations.find(c => c.id === activeId) && conversations.length > 0) {
      setActiveId(conversations[0].id)
    }
  }, [conversations, activeId])

  const chat = conversations.find(c => c.id === activeId)
  
  const [replyText, setReplyText] = useState('')
  const [aiDrafting, setAiDrafting] = useState(false)
  const [dbResults, setDbResults] = useState(null)
  const [autoWebhookBot, setAutoWebhookBot] = useState(true)

  const handleDraftAI = () => {
    setAiDrafting(true)
    setTimeout(() => {
      setAiDrafting(false)
      if (chat.intent === 'stock_check') {
        setReplyText("Hi Maria! Yes, we currently have 4 units of the KIKO Milano 3D Hydra Lipgloss (Shade 05) in stock in Manila. It's ₱750. Would you like me to reserve one for you?")
        setDbResults({
          query: "SELECT stock, srp FROM products WHERE title ILIKE '%KIKO%Hydra%05%'",
          result: "[ { stock: 4, srp: 750 } ]"
        })
      } else {
        setReplyText("Absolutely. We have a consignment leaving Milan on the 22nd. Let me know exactly which brand you need and I'll quote you the landed price.")
        setDbResults({
          query: "SELECT expected_delivery FROM purchase_orders WHERE status = 'Sent'",
          result: "[ { expected_delivery: '2026-07-22' } ]"
        })
      }
    }, 1200)
  }

  const handleSend = () => {
    if (!replyText.trim() || !chat) return
    sendMessage(chat.id, replyText, 'agent')
    setReplyText('')
    setDbResults(null)
  }

  const unreadCount = conversations.filter(c => c.unread).length

  if (!chat) {
    return (
      <div className="flex h-[calc(100vh-140px)] rounded-xl border border-white/10 bg-[#05080f] shadow-2xl overflow-hidden items-center justify-center text-white/50">
        No active conversations.
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-140px)] rounded-xl border border-white/10 bg-[#05080f] shadow-2xl overflow-hidden animate-in fade-in duration-500">
      
      {/* Channels List (Left Pane) */}
      <div className="w-1/3 max-w-[320px] border-r border-white/10 flex flex-col bg-[#020408]">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-serif font-semibold text-white">Customer Messages</h2>
          {unreadCount > 0 && (
            <span className="bg-crimson text-white text-[10px] font-bold px-2 py-0.5 rounded-full pulse-dot">
              {unreadCount} NEW
            </span>
          )}
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
                <span className={`font-semibold text-base ${c.unread ? 'text-white' : 'text-white/60'}`}>{c.customer}</span>
                <span className="text-sm text-white/30">{c.time}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className={`text-sm line-clamp-1 flex-1 pr-2 ${c.unread ? 'text-white/80' : 'text-white/40'}`}>
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
        <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-sm z-10 bg-white/5 backdrop-blur-md shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white">{chat.customer}</h3>
              <span className="text-[10px] font-mono font-bold text-forest bg-forest/20 px-2 py-0.5 rounded border border-forest/30">
                via {chat.channel} Webhook
              </span>
            </div>
            <p className="text-sm text-white/50">Unified Customer Messaging Channel</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoWebhookBot(prev => !prev)}
              className={`text-[11px] font-mono font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                autoWebhookBot ? 'bg-forest/20 text-forest border-forest/40' : 'bg-white/5 text-white/40 border-white/10'
              }`}
            >
              <span>⚡</span> Bot Auto-Reply: {autoWebhookBot ? 'ACTIVE (100% Automated)' : 'PAUSED'}
            </button>
            <button className="text-sm font-semibold text-blue hover:text-blue/80 transition-colors">View CRM Profile</button>
          </div>
        </div>

        {chat.intent === 'pasabuy_request' && chat.metadata && (
          <div className="p-4 shrink-0 border-b border-white/10 bg-black/20 flex justify-center">
            {/* Sticky Note */}
            <div className="relative w-full max-w-lg bg-[#fef9c3] text-black p-5 shadow-lg transform rotate-[-1deg] rounded-sm rounded-br-3xl border border-[#fde047]">
              {/* Tape effect */}
              <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-24 h-5 bg-white/40 backdrop-blur-md border border-white/20 rotate-[2deg] shadow-sm z-10" />
              
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/60 bg-black/5 px-2 py-0.5 rounded border border-black/10">Pasabuy Request</span>
                <span className="text-[10px] font-mono text-black/30">{chat.id}</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-black/40 text-[10px] uppercase font-bold tracking-widest">Requested Item</p>
                  <p className="font-serif font-semibold text-xl text-black/90 leading-tight">{chat.metadata.item}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-black/40 text-[10px] uppercase font-bold tracking-widest">Target Budget</p>
                    <p className="font-semibold text-black/80">{chat.metadata.budget ? `₱${chat.metadata.budget}` : 'Open'}</p>
                  </div>
                  <div>
                    <p className="text-black/40 text-[10px] uppercase font-bold tracking-widest">Quantity & Shipping</p>
                    <p className="font-semibold text-black/80">{chat.metadata.qty} · {chat.metadata.shipping === 'air' ? 'Air Freight' : 'Sea Cargo'}</p>
                  </div>
                </div>
                
                {chat.metadata.url && (
                  <div>
                    <p className="text-black/40 text-[10px] uppercase font-bold tracking-widest">Reference URL</p>
                    <a href={chat.metadata.url} target="_blank" rel="noreferrer" className="text-blue-700 font-semibold hover:underline text-base truncate block w-full max-w-sm">
                      {chat.metadata.url}
                    </a>
                  </div>
                )}
              </div>
              
              {/* Folded corner curl effect */}
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-black/5 to-transparent rounded-tl-xl border-l border-t border-black/5" />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chat.messages.map((m, i) => (
            <div key={i} className={`flex ${m.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3 text-base shadow-md ${
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
              className="flex-1 resize-none h-[60px] rounded-lg border border-white/10 bg-[#05080f] p-3 text-base text-white placeholder:text-white/30 focus:border-blue focus:ring-1 focus:ring-blue outline-none transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={!replyText.trim()}
              className="bg-blue text-white px-6 font-semibold text-base rounded-lg hover:bg-blue/90 disabled:opacity-50 transition-colors"
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
          <h3 className="font-serif font-semibold text-base text-white">AI Chat Assistant</h3>
        </div>
        
        <div className="p-5 flex-1 flex flex-col items-start overflow-y-auto">
          <p className="text-sm text-white/50 mb-6">
            The AI automatically reads incoming messages and queries the database to draft accurate replies for you.
          </p>

          <button 
            onClick={handleDraftAI}
            disabled={aiDrafting}
            className="w-full flex justify-center items-center gap-2 py-2.5 border border-blue bg-blue/10 text-blue font-semibold text-base rounded-lg transition-all hover:bg-blue/20 active:scale-95 disabled:opacity-50 mb-8"
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
                 <p className="text-sm text-blue mb-1 font-semibold">Suggested Action</p>
                 <p className="text-sm text-white/70">The drafted reply has been placed in your text box. Review it and click Send to confirm.</p>
               </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
