import { useState, useRef, useEffect } from 'react'
import { useStore } from '../context/StoreContext'
import { RedButton, TrustBadge, TuscanCard, Kicker } from '../components/ui/bits'
import { CheckIcon, PlaneIcon } from '../components/ui/icons'

const STATUS_TONE = {
  'Request received': 'bg-shell text-navy-soft',
  'Quoted — ₱1,850': 'bg-blue-wash text-blue',
  'Buying in Italy': 'bg-crimson/10 text-crimson',
  'In Manila warehouse': 'bg-forest-wash text-forest',
}

export default function Pasabuy() {
  const { requests, addRequest, conversations, sendMessage } = useStore()
  const [activeChatId, setActiveChatId] = useState(null)
  const [sent, setSent] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (activeChatId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeChatId, conversations])
  
  const [formData, setFormData] = useState({
    item: '',
    url: '',
    budget: '',
    qty: 1,
    shipping: 'sea',
    alternatives: false,
    image: null
  })
  
  const fileInputRef = useRef(null)

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, image: e.target.files[0] })
    }
  }

  const submit = (e) => {
    e.preventDefault()
    if (!formData.item.trim()) return
    addRequest(formData)
    setFormData({
      item: '',
      url: '',
      budget: '',
      qty: 1,
      shipping: 'sea',
      alternatives: false,
      image: null
    })
    setSent(true)
    setTimeout(() => setSent(false), 4000)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 md:pb-16">
      <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:gap-14">
        {/* Left: pitch + form */}
        <div>
          <Kicker className="rise flex items-center gap-2">
            <PlaneIcon size={14} /> Customer-requested imports
          </Kicker>
          <h1 className="rise mt-3 font-serif text-3xl sm:text-4xl md:text-5xl font-semibold leading-[1.06] tracking-tight text-navy dark:text-cream" style={{ animationDelay: '80ms' }}>
            Pasabuy,
            <br />
            <em className="font-normal text-crimson dark:text-rose-400">without the group chat.</em>
          </h1>
          <p className="rise mt-5 text-base leading-relaxed text-navy-soft dark:text-navy-faint" style={{ animationDelay: '160ms' }}>
            Tell us what you need from Italy. We quote it within 24 hours, buy it
            ourselves, consolidate it with our monthly shipment, and deliver it to
            your door. Fill out the sourcing request below.
          </p>

          <form onSubmit={submit} className="rise mt-8 bg-cream/50 dark:bg-shell/30 backdrop-blur-sm p-6 rounded-2xl border border-line dark:border-line/30 shadow-sm" style={{ animationDelay: '240ms' }}>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy dark:text-cream">What exactly are you looking for?</label>
                <textarea
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  rows={2}
                  required
                  placeholder={'e.g. "Pan di Stelle biscuits", brand names, specific flavors...'}
                  className="w-full resize-none rounded-xl border border-line dark:border-line/50 bg-white dark:bg-shell-deep px-4 py-3 text-sm text-navy dark:text-cream placeholder:text-navy-faint dark:placeholder:text-navy-soft focus:border-crimson/60 dark:focus:border-rose-400 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy dark:text-cream">Reference Link <span className="text-navy-faint dark:text-navy-soft font-normal">(Optional)</span></label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="Link to Amazon IT, official store, etc."
                  className="w-full rounded-xl border border-line dark:border-line/50 bg-white dark:bg-shell-deep px-4 py-2.5 text-sm text-navy dark:text-cream placeholder:text-navy-faint dark:placeholder:text-navy-soft focus:border-crimson/60 dark:focus:border-rose-400 focus:outline-none transition-colors"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-navy dark:text-cream">Target Budget</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-soft dark:text-navy-faint">₱</span>
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="Max price"
                      className="w-full rounded-xl border border-line dark:border-line/50 bg-white dark:bg-shell-deep pl-8 pr-4 py-2.5 text-sm text-navy dark:text-cream placeholder:text-navy-faint dark:placeholder:text-navy-soft focus:border-crimson/60 dark:focus:border-rose-400 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-navy dark:text-cream">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-xl border border-line dark:border-line/50 bg-white dark:bg-shell-deep px-4 py-2.5 text-sm text-navy dark:text-cream focus:border-crimson/60 dark:focus:border-rose-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy dark:text-cream">Shipping Preference</label>
                <div className="flex bg-shell dark:bg-shell-deep rounded-lg p-1 border border-line dark:border-line/50">
                  <button type="button" onClick={() => setFormData({ ...formData, shipping: 'sea' })} className={`flex-1 text-xs py-2 rounded-md font-medium transition-colors ${formData.shipping === 'sea' ? 'bg-white dark:bg-shell shadow-sm text-navy dark:text-cream' : 'text-navy-soft dark:text-navy-faint hover:text-navy dark:hover:text-cream'}`}>
                    Sea Cargo (~45d)
                  </button>
                  <button type="button" onClick={() => setFormData({ ...formData, shipping: 'air' })} className={`flex-1 text-xs py-2 rounded-md font-medium transition-colors ${formData.shipping === 'air' ? 'bg-white dark:bg-shell shadow-sm text-navy dark:text-cream' : 'text-navy-soft dark:text-navy-faint hover:text-navy dark:hover:text-cream'}`}>
                    Air Freight (~14d)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border border-line dark:border-line/50 rounded-xl px-4 py-3 bg-white dark:bg-shell-deep">
                <div>
                  <p className="text-sm font-semibold text-navy dark:text-cream">Reference Photo</p>
                  <p className="text-[11px] text-navy-faint dark:text-navy-soft">{formData.image ? formData.image.name : 'Upload screenshot or photo'}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold bg-shell dark:bg-shell/50 hover:bg-line/50 dark:hover:bg-line/20 transition-colors rounded-lg text-navy dark:text-cream"
                >
                  {formData.image ? 'Change' : 'Upload'}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              </div>

              <label className="flex items-start gap-3 mt-4 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={formData.alternatives}
                    onChange={(e) => setFormData({ ...formData, alternatives: e.target.checked })}
                    className="w-4 h-4 appearance-none border border-line dark:border-line/50 rounded bg-white dark:bg-shell-deep checked:bg-crimson dark:checked:bg-rose-500 checked:border-crimson dark:checked:border-rose-500 transition-colors peer cursor-pointer"
                  />
                  <svg className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <span className="text-sm text-navy-soft dark:text-navy-faint group-hover:text-navy dark:group-hover:text-cream transition-colors">
                  If this exact item is sold out, our buyers can source a similar premium alternative.
                </span>
              </label>

            </div>

            <RedButton type="submit" className="mt-6 w-full py-4 text-base" disabled={!formData.item.trim()}>
              Submit Sourcing Request
            </RedButton>
            {sent && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-forest-wash dark:bg-forest/10 rounded-lg text-sm font-semibold text-forest dark:text-green-400 animate-in fade-in slide-in-from-bottom-2">
                <CheckIcon size={16} /> Request sent! Ticket created in our inbox.
              </div>
            )}
          </form>

          <div className="mt-8 flex flex-wrap gap-2">
            <TrustBadge>Quoted upfront</TrustBadge>
            <TrustBadge>Bought by us in Italy</TrustBadge>
            <TrustBadge>Tracked delivery</TrustBadge>
          </div>
        </div>

        {/* Right: how it works + live request tracker */}
        <div className="space-y-6">
          <TuscanCard tricolor className="rise" style={{ animationDelay: '200ms' }}>
            <div className="p-6">
              <h2 className="font-serif text-lg font-semibold text-navy dark:text-cream">How it works</h2>
              <ol className="mt-4 space-y-4">
                {[
                  ['You request', 'Name the product, paste a link, or describe it from memory.'],
                  ['We quote in 24h', 'Landed price to your door — item, freight share, nothing hidden.'],
                  ['We buy it in Italy', 'Our own buyers pick it up. It flies with the monthly consignment.'],
                  ['Delivered & tracked', 'Same courier and tracking as any K2 order.'],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest/10 dark:bg-forest/20 font-serif text-sm font-semibold text-forest dark:text-green-400">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-base font-semibold text-navy dark:text-cream">{title}</p>
                      <p className="text-sm leading-relaxed text-navy-soft dark:text-navy-faint">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </TuscanCard>

          <TuscanCard className="rise p-6" style={{ animationDelay: '280ms' }}>
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-lg font-semibold text-navy dark:text-cream">Your open requests</h2>
              <span className="text-xs text-navy-faint dark:text-navy-soft">Next flight: 22 Jul, Milan</span>
            </div>
            <ul className="mt-4 divide-y divide-line dark:divide-line/30">
              {requests.map((r) => {
                const chat = conversations.find(c => c.id === r.id)
                // A new message indicator if the last message is from the agent and it's unread
                // (In a real app, unread logic would be two-way. For our mock, we check if agent sent last)
                const hasNewMessage = chat && chat.messages.length > 1 && chat.messages[chat.messages.length - 1].sender === 'agent'
                
                return (
                <li key={r.id} className="flex flex-col py-3">
                  <div 
                    onClick={() => setActiveChatId(activeChatId === r.id ? null : r.id)}
                    className={`flex items-center gap-3 cursor-pointer p-2 -mx-2 rounded-xl hover:bg-shell/50 dark:hover:bg-shell-deep/50 transition-colors ${activeChatId === r.id ? 'bg-shell dark:bg-shell-deep' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy dark:text-cream flex items-center gap-2">
                        {r.item}
                        {hasNewMessage && activeChatId !== r.id && (
                          <span className="w-2 h-2 rounded-full bg-crimson dark:bg-rose-500 pulse-dot"></span>
                        )}
                      </p>
                      <p className="text-xs text-navy-faint dark:text-navy-soft tabular">{r.id} · {r.eta}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={'shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold ' + (STATUS_TONE[r.status] ?? 'bg-shell text-navy-soft dark:bg-shell-deep dark:text-cream')}>
                        {r.status}
                      </span>
                      {chat && (
                        <button className="text-xs font-semibold text-crimson dark:text-rose-400 hover:underline shrink-0 w-8 text-right">
                          {activeChatId === r.id ? 'Close' : 'Chat'}
                        </button>
                      )}
                    </div>
                  </div>

                  {activeChatId === r.id && chat && (
                    <div className="mt-3 bg-white dark:bg-[#0A101D] border border-line dark:border-white/10 rounded-xl overflow-hidden flex flex-col shadow-inner animate-in fade-in slide-in-from-top-2" style={{ height: '300px' }}>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chat.messages.map((m, i) => (
                           <div key={i} className={`flex ${m.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] p-3 text-sm shadow-sm ${
                                m.sender === 'customer' 
                                  ? 'bg-navy text-white rounded-2xl rounded-tr-sm' 
                                  : 'bg-shell dark:bg-white/10 text-navy dark:text-white border border-line dark:border-white/5 rounded-2xl rounded-tl-sm'
                              }`}>
                                {m.text}
                              </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                      <div className="p-3 bg-shell dark:bg-white/5 border-t border-line dark:border-white/10 flex gap-2">
                         <input 
                            type="text"
                            onKeyDown={e => {
                              if (e.key === 'Enter' && e.target.value.trim()) {
                                sendMessage(r.id, e.target.value, 'customer')
                                e.target.value = ''
                              }
                            }}
                            placeholder="Send a message..."
                            className="flex-1 rounded-xl border border-line dark:border-white/10 bg-white dark:bg-[#05080f] px-4 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-crimson dark:focus:border-rose-400 transition-colors"
                          />
                      </div>
                    </div>
                  )}
                </li>
              )})}
            </ul>
          </TuscanCard>
        </div>
      </div>
    </main>
  )
}
