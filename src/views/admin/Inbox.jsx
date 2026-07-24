import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useStore } from '../../context/StoreContext'
import { channelMeta } from '../../lib/channelMeta'

// Mobile-first inbox. On phones you see ONE thing at a time: the list, then
// (after a tap) the conversation with a Back button. On desktop the list, chat,
// and AI helper sit side by side. Calm, readable type — nothing oversized.

export default function Inbox() {
  const { conversations, sendMessage } = useStore()
  const [activeId, setActiveId] = useState(conversations[0]?.id)
  const [mobileView, setMobileView] = useState('list') // 'list' | 'chat' (mobile only)

  useEffect(() => {
    if (!conversations.find(c => c.id === activeId) && conversations.length > 0) {
      setActiveId(conversations[0].id)
    }
  }, [conversations, activeId])

  const chat = conversations.find(c => c.id === activeId)

  const [replyText, setReplyText] = useState('')
  const [aiDrafting, setAiDrafting] = useState(false)
  const [dbResults, setDbResults] = useState(null)

  const openChat = (id) => { setActiveId(id); setMobileView('chat'); setDbResults(null) }

  const handleDraftAI = () => {
    setAiDrafting(true)
    setTimeout(() => {
      setAiDrafting(false)
      if (chat?.intent === 'stock_check') {
        setReplyText("Hi! Yes, we currently have 4 units of the KIKO Milano 3D Hydra Lipgloss (Shade 05) in stock in Manila. It's ₱750. Would you like me to reserve one for you?")
        setDbResults({ query: "SELECT stock, srp FROM products WHERE name ILIKE '%KIKO%Hydra%05%'", result: "[ { stock: 4, srp: 750 } ]" })
      } else {
        setReplyText("Absolutely. We have a consignment leaving Milan soon. Let me know exactly which brand you need and I'll quote you the landed price.")
        setDbResults({ query: "SELECT expected_delivery FROM purchase_orders WHERE status = 'Sent'", result: "[ { expected_delivery: '2026-07-22' } ]" })
      }
    }, 1000)
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
      <div className="flex h-[60vh] rounded-2xl border border-white/10 bg-[#0B0E14] items-center justify-center text-white/50 text-sm">
        No conversations yet.
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-150px)] min-h-[440px] rounded-2xl border border-white/10 bg-[#0B0E14] overflow-hidden">

      {/* ── Conversation list ─────────────────────────────────────────── */}
      <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} lg:flex w-full lg:w-72 xl:w-80 shrink-0 flex-col border-r border-white/10 bg-[#0B0E14]`}>
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold text-white text-[15px]">Messages</h2>
          {unreadCount > 0 && (
            <span className="bg-crimson text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{unreadCount} new</span>
          )}
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {conversations.map(c => {
            const meta = channelMeta(c.channel)
            return (
              <button key={c.id} onClick={() => openChat(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                  activeId === c.id ? 'border-blue/40 bg-blue/10' : 'border-transparent hover:bg-white/5'
                }`}>
                <div className="flex justify-between items-baseline gap-2">
                  <span className={`font-semibold text-sm truncate ${c.unread ? 'text-white' : 'text-white/70'}`}>{c.customer}</span>
                  <span className="text-[11px] text-white/45 shrink-0">{c.time}</span>
                </div>
                <div className="flex justify-between items-center gap-2 mt-1">
                  <span className={`text-[13px] line-clamp-1 flex-1 ${c.unread ? 'text-white/70' : 'text-white/45'}`}>
                    {c.messages[c.messages.length - 1].text}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
                    style={{ color: meta.color, backgroundColor: meta.color + '22' }}>
                    {meta.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Chat pane ─────────────────────────────────────────────────── */}
      <div className={`${mobileView === 'list' ? 'hidden' : 'flex'} lg:flex flex-1 min-w-0 flex-col bg-[#0A101D]`}>
        {/* Header */}
        <div className="px-3 sm:px-4 py-2.5 border-b border-white/10 flex items-center gap-2 bg-white/5 shrink-0">
          <button onClick={() => setMobileView('list')}
            className="lg:hidden -ml-1 p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white shrink-0" aria-label="Back">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-[15px] truncate">{chat.customer}</h3>
              <span className="text-[11px] font-medium text-forest bg-forest/15 px-1.5 py-0.5 rounded shrink-0">via {chat.channel}</span>
            </div>
            <p className="text-[11px] text-white/40 hidden sm:block">Unified customer messaging</p>
          </div>
          <button className="text-[13px] font-semibold text-blue hover:text-blue/80 shrink-0 hidden sm:block">CRM profile</button>
        </div>

        {/* Pasabuy request note */}
        {chat.intent === 'pasabuy_request' && chat.metadata && (
          <div className="p-3 shrink-0 border-b border-white/10 bg-black/20">
            <div className="rounded-xl bg-[#fef9c3] text-black p-4 border border-[#fde047]">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-black/60 bg-black/5 px-2 py-0.5 rounded border border-black/10">Pasabuy request</span>
              </div>
              <p className="text-black/40 text-[11px] uppercase font-bold tracking-widest">Requested item</p>
              <p className="font-serif font-semibold text-lg text-black/90 leading-tight mb-3">{chat.metadata.item}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-black/40 text-[11px] uppercase font-bold tracking-widest">Budget</p>
                  <p className="font-semibold text-black/80">{chat.metadata.budget ? `₱${chat.metadata.budget}` : 'Open'}</p>
                </div>
                <div>
                  <p className="text-black/40 text-[11px] uppercase font-bold tracking-widest">Qty &amp; shipping</p>
                  <p className="font-semibold text-black/80">{chat.metadata.qty} · {chat.metadata.shipping === 'air' ? 'Air' : 'Sea'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {chat.messages.map((m, i) => (
            <div key={i} className={`flex ${m.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] px-3.5 py-2 text-[14px] leading-relaxed ${
                m.sender === 'agent'
                  ? 'bg-blue text-white rounded-2xl rounded-tr-sm'
                  : 'bg-white/10 text-neutral-200 rounded-2xl rounded-tl-sm'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="p-3 bg-white/5 border-t border-white/10 shrink-0 space-y-2">
          {/* AI helper — inline on phones/tablets where the side panel is hidden */}
          <button onClick={handleDraftAI} disabled={aiDrafting}
            className="xl:hidden w-full flex justify-center items-center gap-2 py-2 border border-blue/40 bg-blue/10 text-blue font-semibold text-[13px] rounded-lg hover:bg-blue/20 disabled:opacity-50">
            {aiDrafting ? 'Drafting…' : '✨ Draft a reply with AI'}
          </button>
          <div className="flex gap-2 items-end">
            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a reply…" rows={1}
              className="flex-1 resize-none max-h-32 min-h-[44px] rounded-xl border border-white/10 bg-[#09090b] px-3 py-2.5 text-[14px] text-white placeholder:text-white/40 focus:border-blue outline-none" />
            <button onClick={handleSend} disabled={!replyText.trim()}
              className="bg-blue text-white px-5 min-h-[44px] font-semibold text-sm rounded-xl hover:bg-blue/90 disabled:opacity-50 shrink-0">
              Send
            </button>
          </div>
        </div>
      </div>

      {/* ── AI helper (desktop XL only) ───────────────────────────────── */}
      <div className="hidden xl:flex w-72 shrink-0 border-l border-white/10 bg-[#0B0E14] flex-col">
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue" />
          <h3 className="font-semibold text-[15px] text-white">AI assistant</h3>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-[13px] text-white/50 mb-4 leading-relaxed">
            Drafts a reply based on the conversation. Review it before sending.
          </p>
          <button onClick={handleDraftAI} disabled={aiDrafting}
            className="w-full flex justify-center items-center gap-2 py-2.5 border border-blue/40 bg-blue/10 text-blue font-semibold text-sm rounded-lg hover:bg-blue/20 active:scale-[.99] disabled:opacity-50 mb-5">
            {aiDrafting ? 'Drafting…' : 'Draft a reply'}
          </button>
          {dbResults && (
            <div>
              <p className="text-[11px] uppercase tracking-widest text-white/45 font-bold mb-2">Data used</p>
              <div className="bg-black/40 border border-white/10 p-3 rounded-lg text-[11px] font-mono leading-relaxed text-neutral-300 mb-3 overflow-x-auto">
                <span className="text-blue-300">{dbResults.query}</span><br /><br />
                <span className="text-forest">{dbResults.result}</span>
              </div>
              <p className="text-[13px] text-white/55">The draft is in your reply box — review and Send.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
