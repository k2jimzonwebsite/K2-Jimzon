import { useEffect, useRef, useState } from 'react'
import { answerQuestion } from './adminGuide'
import { BookIcon, SearchIcon, XIcon } from '../../components/ui/icons'

const EXAMPLES = [
  'How do I scan a new product?',
  'How does Manila receiving work?',
  'How do I print a waybill?',
  'What shortcuts can I use?',
]

export default function AdminAiCopilotModal({ isOpen, onClose, onNavigate, currentSection, initialQuery = '' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const inputRef = useRef(null)
  const lastSeedRef = useRef('')

  const ask = text => {
    const query = (text ?? input).trim()
    if (!query) return
    const result = answerQuestion(query, { section: currentSection, limit: 3 })
    setMessages(previous => [
      ...previous,
      { sender: 'user', text: query },
      result.ok
        ? { sender: 'guide', topics: result.topics }
        : { sender: 'guide', text: 'I could not find an approved K2 procedure for that yet. Treat it as undocumented and do not infer an operational rule. Record it for owner or operations review.' },
    ])
    setInput('')
  }

  useEffect(() => {
    if (!isOpen) return
    setTimeout(() => inputRef.current?.focus(), 50)
    if (initialQuery && initialQuery !== lastSeedRef.current) {
      lastSeedRef.current = initialQuery
      ask(initialQuery)
    }
  }, [isOpen, initialQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  const jump = section => {
    if (section) onNavigate?.(section)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[105] flex justify-end bg-black/70 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="operations-guide-title"
        className="flex h-full w-full max-w-xl flex-col border-l border-adm-line bg-adm-surface text-white shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between border-b border-adm-line bg-adm-sunken p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-adm-sm border border-blue/30 bg-blue/10 text-blue"><BookIcon size={18} /></span>
            <div>
              <h2 id="operations-guide-title" className="text-base font-semibold">K2 operations guide</h2>
              <p className="mt-0.5 text-xs text-white/50">Grounded retrieval from the K2 rulebook—not a live external AI</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close operations guide" className="flex h-10 w-10 items-center justify-center rounded-adm-sm text-white/50 hover:bg-white/5 hover:text-white"><XIcon size={18} /></button>
        </header>

        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-adm-line bg-adm-sunken/50 p-3 scrollbar-none">
          {EXAMPLES.map(example => (
            <button key={example} onClick={() => ask(example)} className="min-h-9 shrink-0 rounded-adm-sm border border-adm-line bg-white/[0.035] px-3 text-xs text-white/65 hover:bg-white/[0.06] hover:text-white">{example}</button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar" aria-live="polite">
          {messages.length === 0 && (
            <div className="rounded-adm-sm border border-adm-line bg-white/[0.025] p-4">
              <p className="text-sm font-semibold text-white">Ask about any K2 operation</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">I retrieve the closest approved procedures and show their source. I do not read live records, contact customers, or change operational state.</p>
            </div>
          )}

          {messages.map((message, messageIndex) => (
            <div key={`${message.sender}-${messageIndex}`} className={message.sender === 'user' ? 'flex justify-end' : ''}>
              {message.sender === 'user' ? (
                <p className="max-w-[88%] rounded-adm-sm bg-blue px-3.5 py-2.5 text-sm text-white">{message.text}</p>
              ) : message.topics ? (
                <div className="w-full space-y-3">
                  <p className="text-xs font-medium text-white/40">Most relevant approved procedures</p>
                  {message.topics.map((topic, topicIndex) => (
                    <article key={topic.id} className="rounded-adm-sm border border-adm-line bg-white/[0.025] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue">{topic.category}</p>
                          <h3 className="mt-1 text-sm font-semibold text-white">{topic.title}</h3>
                        </div>
                        {topicIndex === 0 && <span className="rounded-full border border-blue/25 bg-blue/10 px-2 py-0.5 text-[10px] font-semibold text-blue">Best match</span>}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-white/70">{topic.what}</p>
                      <ol className="mt-3 space-y-1.5">
                        {topic.how.map((step, stepIndex) => (
                          <li key={step} className="flex gap-2 text-sm leading-relaxed text-white/60">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/[0.07] font-mono text-[9px] text-white/50">{stepIndex + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                      {topic.more && <p className="mt-3 border-l-2 border-amber/40 pl-3 text-xs leading-relaxed text-white/50">{topic.more}</p>}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-adm-line pt-3">
                        <span className="text-[11px] text-white/35">Source: {topic.source}</span>
                        {topic.section && <button onClick={() => jump(topic.section)} className="min-h-8 rounded-adm-sm bg-blue px-3 text-xs font-semibold text-white hover:bg-blue-deep">Open workspace →</button>}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-adm-sm border border-amber/25 bg-amber/10 p-3 text-sm leading-relaxed text-amber">{message.text}</p>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={event => { event.preventDefault(); ask() }} className="flex shrink-0 gap-2 border-t border-adm-line bg-adm-sunken p-3">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Ask about a K2 procedure</span>
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-3.5 text-white/35" />
            <input ref={inputRef} value={input} onChange={event => setInput(event.target.value)} placeholder="Ask how an operation works…" className="min-h-11 w-full rounded-adm-sm border border-adm-line bg-adm-surface py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-blue" />
          </label>
          <button type="submit" disabled={!input.trim()} className="min-h-11 shrink-0 rounded-adm-sm bg-blue px-5 text-sm font-semibold text-white hover:bg-blue-deep disabled:opacity-40">Find procedure</button>
        </form>
      </section>
    </div>
  )
}
