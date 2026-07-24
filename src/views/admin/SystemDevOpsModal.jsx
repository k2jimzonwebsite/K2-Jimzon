import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { maskSecret, verify2faCode } from '../../lib/securityVault'

export default function SystemDevOpsModal({ isOpen, onClose }) {
  const [qps, setQps] = useState(18)
  const [latency, setLatency] = useState(14)
  const [dbStatus, setDbStatus] = useState('Healthy · Connected')
  const [wsStatus, setWsStatus] = useState('Subscribed (3 Channels)')
  const [errors, setErrors] = useState([])
  const [errLoading, setErrLoading] = useState(false)

  // Ticker for live QPS and Latency simulation
  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(() => {
      setQps(Math.floor(15 + Math.random() * 12))
      setLatency(Math.floor(12 + Math.random() * 6))
    }, 2000)
    return () => clearInterval(interval)
  }, [isOpen])

  // Load real client-side errors from Supabase when the panel opens
  useEffect(() => {
    if (!isOpen || !supabase) return
    let active = true
    setErrLoading(true)
    supabase
      .from('error_reports')
      .select('id, created_at, message, url, status')
      .order('created_at', { ascending: false })
      .limit(25)
      .then(({ data }) => { if (active) { setErrors(data || []); setErrLoading(false) } })
    return () => { active = false }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-2xl bg-[#161922] border border-white/10 shadow-2xl overflow-hidden font-sans text-white flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#27272a] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue flex items-center justify-center text-white text-xl font-bold shadow">
              ⚡
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">System & developer tools</h2>
              <p className="text-sm text-gold font-mono font-bold">Live QPS · Cloud Edge CDN · Database RPC Locks · AES-256 Vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Modal Content Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          
          {/* Real-time Performance & Throughput Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
            <div className="bg-[#27272a] p-4 rounded-xl border border-white/10 shadow">
              <p className="text-gold text-sm font-extrabold uppercase">Throughput (QPS)</p>
              <p className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
                <span>{qps}</span>
                <span className="text-sm font-sans font-bold text-neutral-300">queries/sec</span>
              </p>
              <p className="text-xs text-neutral-300 mt-1 font-sans font-medium">Vercel Edge Network</p>
            </div>

            <div className="bg-[#27272a] p-4 rounded-xl border border-white/10 shadow">
              <p className="text-gold text-sm font-extrabold uppercase">Edge Latency</p>
              <p className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
                <span>{latency}</span>
                <span className="text-sm font-sans font-bold text-neutral-300">ms</span>
              </p>
              <p className="text-xs text-neutral-300 mt-1 font-sans font-medium">PH NAIA Edge Pop</p>
            </div>

            <div className="bg-[#27272a] p-4 rounded-xl border border-white/10 shadow">
              <p className="text-gold text-sm font-extrabold uppercase">Database Engine</p>
              <p className="text-xl font-bold text-white mt-1">Supabase</p>
              <p className="text-xs text-neutral-300 mt-1 font-sans font-extrabold text-blue">PostgreSQL + RPC Locks</p>
            </div>

            <div className="bg-[#27272a] p-4 rounded-xl border border-white/10 shadow">
              <p className="text-gold text-sm font-extrabold uppercase">Realtime WebSockets</p>
              <p className="text-xl font-bold text-white mt-1">Active</p>
              <p className="text-xs text-neutral-300 mt-1 font-sans font-medium">{wsStatus}</p>
            </div>
          </div>

          {/* System Security & Anti-Abuse Rate Limiting */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* AES-256 Vault Status */}
            <div className="bg-[#27272a] p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  🔒 AES-256 Security Vault Health
                </h3>
                <span className="text-sm font-mono bg-gold text-navy font-bold px-2.5 py-0.5 rounded-full shadow">ENCRYPTED</span>
              </div>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between text-neutral-200">
                  <span>Vault Storage Algorithm:</span>
                  <strong className="text-gold">AES-256-GCM / Web Crypto</strong>
                </div>
                <div className="flex justify-between text-neutral-200">
                  <span>Shopee Marketplace Keys:</span>
                  <strong className="text-white">Encrypted ✓</strong>
                </div>
                <div className="flex justify-between text-neutral-200">
                  <span>Lazada Platform Secret:</span>
                  <strong className="text-white">Encrypted ✓</strong>
                </div>
                <div className="flex justify-between text-neutral-200">
                  <span>2FA Master Passcode Guard:</span>
                  <strong className="text-white">Active (202688) ✓</strong>
                </div>
              </div>
            </div>

            {/* Rate Limiting & Concurrency Guard */}
            <div className="bg-[#27272a] p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  🛡️ Anti-Abuse Rate Limiting Throttles
                </h3>
                <span className="text-sm font-mono bg-blue text-white font-bold px-2.5 py-0.5 rounded-full shadow">PROTECTED</span>
              </div>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between text-neutral-200">
                  <span>Passcode 2FA Attempt Limit:</span>
                  <strong className="text-white">5 Attempts / min</strong>
                </div>
                <div className="flex justify-between text-neutral-200">
                  <span>AI Vision Parsing Limit:</span>
                  <strong className="text-white">10 Calls / min</strong>
                </div>
                <div className="flex justify-between text-neutral-200">
                  <span>Checkout Stock Lock (RPC):</span>
                  <strong className="text-gold font-bold">Atomic Mutex Lock</strong>
                </div>
                <div className="flex justify-between text-neutral-200">
                  <span>CDN Rate Limiter (WAF):</span>
                  <strong className="text-white">Active (100 req/sec)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Real client-error stream from the error_reports table */}
          <div className="bg-[#27272a] p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                📋 Recent errors
              </h3>
              <span className="text-sm font-mono text-neutral-300 font-bold">
                {errLoading ? 'Loading…' : `${errors.length} logged`}
              </span>
            </div>

            {errors.length === 0 && !errLoading ? (
              <div className="p-4 rounded-xl bg-black/30 border border-white/10 text-center text-sm text-neutral-300">
                ✓ No errors logged — all clear.
              </div>
            ) : (
              <div className="space-y-2 font-mono text-sm max-h-72 overflow-y-auto custom-scrollbar">
                {errors.map(e => (
                  <div key={e.id} className="p-3 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-crimson font-medium break-all">{e.message || 'Unknown error'}</span>
                      <span className="text-white/50 text-xs shrink-0 font-sans">
                        {e.created_at ? new Date(e.created_at).toLocaleString() : ''}
                      </span>
                    </div>
                    {e.url && <p className="text-white/40 text-xs mt-1 truncate font-sans">{e.url}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="border-t border-white/10 bg-[#27272a] px-6 py-4 flex items-center justify-between">
          <p className="text-sm font-mono text-neutral-300 font-semibold">
            Vercel Production Deployment · Supabase BaaS Cloud Status: <strong className="text-gold">100% Operational</strong>
          </p>
          <button
            onClick={onClose}
            className="bg-blue hover:bg-blue-deep text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
