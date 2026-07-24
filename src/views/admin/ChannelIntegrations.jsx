import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

// ── Derive the user's real Supabase dashboard links from the configured URL ──
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || ''
const REF = (SUPA_URL.match(/https?:\/\/([a-z0-9-]+)\.supabase\./i) || [])[1] || ''
const supaBase      = REF ? `https://supabase.com/dashboard/project/${REF}` : 'https://supabase.com/dashboard'
const SUPA_SECRETS  = REF ? `${supaBase}/settings/functions` : supaBase   // Edge Function secrets
const SUPA_FUNCTIONS= REF ? `${supaBase}/functions`          : supaBase   // Edge Functions

// ── Channel catalogue (static reference — NOT secrets) ───────────────────────
const CHANNELS = [
  {
    key: 'shopee', name: 'Shopee Seller Center', color: '#ee4d2d',
    blurb: 'Auto-pull orders into Fulfilment and keep Shopee stock in sync.',
    devPortal: 'https://open.shopee.com',
    secrets: ['SHOPEE_PARTNER_ID', 'SHOPEE_PARTNER_KEY', 'SHOPEE_SHOP_ID'],
  },
  {
    key: 'lazada', name: 'Lazada Open Platform', color: '#0f146d',
    blurb: 'Fetch Lazada orders and push inventory updates back.',
    devPortal: 'https://open.lazada.com',
    secrets: ['LAZADA_APP_KEY', 'LAZADA_APP_SECRET', 'LAZADA_SELLER_ID'],
  },
  {
    key: 'tiktok', name: 'TikTok Shop', color: '#25f4ee',
    blurb: 'Bring TikTok Shop orders into the same fulfilment queue.',
    devPortal: 'https://partner.tiktokshop.com',
    secrets: ['TIKTOK_APP_KEY', 'TIKTOK_APP_SECRET', 'TIKTOK_SHOP_ID'],
  },
  {
    key: 'meta', name: 'Meta (Facebook & Instagram)', color: '#1877F2',
    blurb: 'Pull Messenger & Instagram DMs into the unified Inbox.',
    devPortal: 'https://developers.facebook.com',
    secrets: ['META_APP_ID', 'META_APP_SECRET', 'META_PAGE_ACCESS_TOKEN'],
  },
  {
    key: 'whatsapp', name: 'WhatsApp Business & Viber', color: '#25D366',
    blurb: 'Receive WhatsApp & Viber customer chats in the Inbox.',
    devPortal: 'https://developers.facebook.com/docs/whatsapp',
    secrets: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID', 'WHATSAPP_VERIFY_TOKEN'],
  },
]

function timeAgo(iso) {
  if (!iso) return null
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function ChannelIntegrations() {
  const [conns, setConns] = useState({})     // channel -> row
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [howto, setHowto] = useState(null)   // channel object for the guide modal

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    fetchStatus()
    const ch = supabase.channel('public:channel_connections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_connections' }, fetchStatus)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const fetchStatus = async () => {
    const { data, error } = await supabase.from('channel_connections').select('*')
    if (error) { setTableMissing(true); setLoading(false); return }
    const map = {}
    for (const r of data || []) map[r.channel] = r
    setConns(map); setTableMissing(false); setLoading(false)
  }

  const isLive = (key) => conns[key]?.status === 'live'
  const liveCount = CHANNELS.filter(c => isLive(c.key)).length

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">

      {/* Header */}
      <div className="bg-[#161922] border border-white/10 p-4 sm:p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-sm font-mono font-bold uppercase tracking-wider bg-gold text-navy px-3 py-1 rounded-full">
              Channel Connections
            </span>
            <h1 className="font-serif text-2xl font-bold text-white mt-2">Marketplace & chat channels</h1>
            <p className="text-sm text-neutral-300 font-medium mt-1 max-w-2xl">
              Each channel goes live the moment its connector starts sending real data. Status here is live — it flips to
              🟢 automatically. API keys are never entered here; they live safely in Supabase on the backend.
            </p>
          </div>
          <div className="shrink-0 text-center bg-[#0A101D] border border-white/10 rounded-xl px-5 py-3">
            <p className="text-3xl font-extrabold text-white tabular-nums">{liveCount}<span className="text-white/40 text-xl">/{CHANNELS.length}</span></p>
            <p className="text-xs uppercase tracking-wider text-white/50 font-bold mt-0.5">Channels live</p>
          </div>
        </div>

        {/* Where the keys go */}
        <div className="mt-4 border-t border-white/10 pt-4">
          <span className="block text-sm text-white/60 font-semibold mb-2.5">🔑 API keys &amp; connectors go here:</span>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5">
            <a href={SUPA_SECRETS} target="_blank" rel="noreferrer"
              className="bg-forest hover:bg-forest/90 text-white font-bold text-sm px-4 min-h-11 rounded-lg transition-all flex items-center justify-center gap-2">
              Open Supabase → secrets ↗
            </a>
            <a href={SUPA_FUNCTIONS} target="_blank" rel="noreferrer"
              className="bg-white/10 hover:bg-white/15 text-white font-bold text-sm px-4 min-h-11 rounded-lg border border-white/10 transition-all flex items-center justify-center">
              Edge Functions ↗
            </a>
          </div>
        </div>
      </div>

      {tableMissing && (
        <div className="bg-amber/10 border border-amber/30 text-amber rounded-xl p-4 text-sm">
          <p className="font-bold">One-time setup needed</p>
          <p className="text-neutral-300 mt-1">Run <span className="font-mono">RUN_THIS_channel_connections.sql</span> in the Supabase SQL editor so this board can read channel status. Until then every channel shows as not connected.</p>
        </div>
      )}

      {/* Channel cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHANNELS.map(ch => {
          const live = isLive(ch.key)
          const row = conns[ch.key]
          return (
            <div key={ch.key} className={`rounded-2xl border p-4 sm:p-5 shadow-lg transition-all ${
              live ? 'bg-forest/5 border-forest/40' : 'bg-[#161922] border-white/10'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-md shrink-0"
                    style={{ backgroundColor: ch.color }}>
                    {ch.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white truncate">{ch.name}</h3>
                    <p className="text-sm text-white/55 truncate">{ch.blurb}</p>
                  </div>
                </div>
                <span className={`shrink-0 text-sm font-mono font-bold px-2.5 py-1 rounded-lg border ${
                  live ? 'bg-forest/20 text-forest border-forest/40' : 'bg-white/5 text-white/50 border-white/15'
                }`}>
                  {live ? '🟢 Live' : '⚪ Not connected'}
                </span>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <p className="text-xs font-mono text-white/45">
                  {live
                    ? `Receiving data${row?.last_event_at ? ` · last event ${timeAgo(row.last_event_at)}` : ''}`
                    : (row?.note || 'No data received yet')}
                </p>
                {!live ? (
                  <button
                    onClick={() => setHowto(ch)}
                    className="w-full sm:w-auto shrink-0 bg-blue hover:bg-blue/90 text-white font-bold text-sm px-4 min-h-11 rounded-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    📘 How to connect
                  </button>
                ) : (
                  <button
                    onClick={() => setHowto(ch)}
                    className="w-full sm:w-auto shrink-0 text-sm font-semibold text-white/50 hover:text-white transition-colors min-h-11"
                  >
                    View setup
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* How-to guide modal */}
      {howto && (
        <ConnectGuide channel={howto} onClose={() => setHowto(null)} />
      )}
    </div>
  )
}

// ── Step-by-step connect guide (teaches a non-technical helper) ──────────────
function ConnectGuide({ channel, onClose }) {
  const steps = [
    {
      t: `Get developer access on ${channel.name}`,
      d: <>Sign in to the {channel.name} developer portal and create an app so it gives you API keys.
        <a href={channel.devPortal} target="_blank" rel="noreferrer" className="text-blue font-semibold ml-1 underline">{channel.devPortal} ↗</a></>,
    },
    {
      t: 'Copy your keys',
      d: <>You'll be given values like: <span className="font-mono text-white">{channel.secrets.join(', ')}</span>. Keep them private — treat them like passwords.</>,
    },
    {
      t: 'Paste the keys into Supabase (not here)',
      d: <>Open Supabase → Edge Function secrets and add each key by name. This is the ONLY safe place for them — never type an API secret into this dashboard or any web page.
        <a href={SUPA_SECRETS} target="_blank" rel="noreferrer" className="block mt-2 bg-forest hover:bg-forest/90 text-white font-bold text-sm px-4 py-2 rounded-lg w-fit">Open Supabase secrets ↗</a></>,
    },
    {
      t: 'Deploy the connector',
      d: <>Deploy the {channel.name} connector function (the webhook that receives orders/messages) in Supabase → Edge Functions.
        <a href={SUPA_FUNCTIONS} target="_blank" rel="noreferrer" className="block mt-2 bg-white/10 hover:bg-white/15 text-white font-bold text-sm px-4 py-2 rounded-lg border border-white/10 w-fit">Open Edge Functions ↗</a></>,
    },
    {
      t: 'Point the webhook & go live',
      d: <>In {channel.name}'s settings, set the webhook URL to your deployed function. As soon as it processes the first real order or message, this card flips to <span className="text-forest font-bold">🟢 Live</span> automatically — no button to press.</>,
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0A101D] p-5 sm:p-6 text-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md" style={{ backgroundColor: channel.color }}>
              {channel.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold">Connect {channel.name}</h2>
              <p className="text-sm text-white/55">Follow these 5 steps. Keys stay on the backend.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10">✕</button>
        </div>

        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-blue/20 text-blue border border-blue/40 font-bold flex items-center justify-center text-sm">{i + 1}</span>
              <div>
                <p className="font-bold text-white">{s.t}</p>
                <p className="text-sm text-white/70 mt-0.5 leading-relaxed">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 pt-4 border-t border-white/10 bg-amber/5 -mx-5 sm:-mx-6 px-5 sm:px-6 -mb-5 sm:-mb-6 pb-5 rounded-b-2xl">
          <p className="text-xs text-amber font-semibold">🔒 Safety: API keys are like passwords. They go only into Supabase secrets on the backend — never into this dashboard, chat, or email.</p>
        </div>
      </div>
    </div>
  )
}
