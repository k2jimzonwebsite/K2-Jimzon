import { useState, useRef, useEffect } from 'react'
import { answerQuestion } from './adminGuide'

// Dashboard Guide — answers "what is this / what does this metric mean / where do
// I do X" from the dashboard's own knowledge base. Honest and instant: no live
// database, no external AI, no invented data.

const EXAMPLES = [
  'What is this dashboard for?',
  'Where do I start packing my box?',
  "What does 'Low-stock' mean?",
  'Where do cargo boxes arrive?',
  'How do I add a staff PIN?',
]

export default function AdminAiCopilotModal({ isOpen, onClose, onNavigate }) {
  const [messages, setMessages] = useState([
    { sender: 'ai', intro: true, text: "Hi! 👋 I'm your dashboard guide. Ask me what any screen or metric is for, or where to do something — like “where do I pack orders?”" },
  ])
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState({})
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  if (!isOpen) return null

  const ask = (text) => {
    const q = (text ?? input).trim()
    if (!q) return
    const res = answerQuestion(q)
    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: q },
      res.ok
        ? { sender: 'ai', topic: res.topic }
        : { sender: 'ai', text: "I'm not sure about that one yet — I can explain any screen or metric. Try one of the examples above, or open “Start here” for the full walkthrough." },
    ])
    setInput('')
  }

  const jump = (section) => { if (section && onNavigate) onNavigate(section); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0A101D] text-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#09090b] p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue/40 bg-blue/20 text-lg text-blue">🧭</div>
            <div>
              <h2 className="text-base font-semibold text-white">Dashboard Guide</h2>
              <p className="text-xs text-white/50">Ask what anything is for, or where to do it</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white">✕</button>
        </div>

        {/* Example questions */}
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 bg-[#09090b]/50 p-3 scrollbar-none">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => ask(ex)} className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white">
              {ex}
            </button>
          ))}
        </div>

        {/* Conversation */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}>
              <span className="px-1 text-xs text-white/40">{m.sender === 'user' ? 'You' : 'Guide'}</span>
              <div className={`max-w-[92%] rounded-2xl p-3.5 ${m.sender === 'user' ? 'rounded-tr-none bg-blue text-white' : 'rounded-tl-none border border-white/10 bg-[#161922]'}`}>
                {m.topic ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{m.topic.icon}</span>
                      <h3 className="text-sm font-semibold text-white">{m.topic.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-white/85">{m.topic.what}</p>
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">How to use it</p>
                      <ol className="space-y-1">
                        {m.topic.how.map((step, si) => (
                          <li key={si} className="flex gap-2 text-sm text-white/75">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/60">{si + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <p className="text-xs text-white/50"><span className="font-semibold text-white/60">Where:</span> {m.topic.where}</p>
                    {m.topic.more && (
                      <div>
                        <button onClick={() => setExpanded((e) => ({ ...e, [i]: !e[i] }))} className="text-xs font-medium text-blue hover:underline">
                          {expanded[i] ? 'Less ▴' : 'More info ▸'}
                        </button>
                        {expanded[i] && <p className="mt-1 text-xs leading-relaxed text-white/55">{m.topic.more}</p>}
                      </div>
                    )}
                    {m.topic.section && (
                      <button onClick={() => jump(m.topic.section)} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue py-2 text-sm font-medium text-white transition-colors hover:bg-blue-deep">
                        Open {m.topic.title} <span aria-hidden>→</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-white/85">{m.text}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); ask() }} className="flex shrink-0 gap-2 border-t border-white/10 bg-[#09090b] p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any screen or metric…"
            className="min-h-[44px] flex-1 rounded-xl border border-white/10 bg-[#0A101D] px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue"
          />
          <button type="submit" disabled={!input.trim()} className="min-h-[44px] shrink-0 rounded-xl bg-blue px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-deep disabled:opacity-50">
            Ask
          </button>
        </form>
      </div>
    </div>
  )
}
