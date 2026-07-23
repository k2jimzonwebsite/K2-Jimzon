import { useState } from 'react'
import { useStore } from '../../context/StoreContext'
import { supabase } from '../../lib/supabaseClient'
import { BagIcon, BoxIcon, GridIcon, PlaneIcon, ShieldIcon, UserIcon } from '../ui/icons'
import { motion, AnimatePresence } from 'motion/react'

const VIEWS = [
  { id: 'home', label: 'Home', icon: GridIcon },
  { id: 'product', label: 'Product', icon: BoxIcon },
  { id: 'pasabuy', label: 'Pasabuy', icon: PlaneIcon },
  { id: 'checkout', label: 'Checkout', icon: BagIcon },
  { id: 'wholesale', label: 'Wholesale', icon: UserIcon },
]

export default function DemoRail() {
  const { view, go, isWholesale, user, lines = [] } = useStore()
  const active = view === 'confirmation' ? 'checkout' : view
  const cartCount = lines.reduce((acc, line) => acc + line.qty, 0)
  
  const [showAuth, setShowAuth] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert("Login failed: " + error.message)
    } else {
      setShowAuth(false)
      setEmail('')
      setPassword('')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <>
      {/* Desktop rail */}
      <div className="sticky top-0 z-50 hidden border-b border-line bg-shell md:block">
        <div className="mx-auto flex h-10 max-w-6xl items-center gap-1 px-4">
          <span className="mr-3 text-xs font-semibold uppercase tracking-[0.24em] text-navy-faint">
            Prototype
          </span>
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => go(v.id)}
              className={
                'relative rounded-md px-3 py-1 text-sm font-medium transition-colors ' +
                (active === v.id
                  ? 'text-navy'
                  : 'text-navy-faint hover:text-navy')
              }
            >
              {v.label}
              {active === v.id && (
                <span className="absolute inset-x-3 -bottom-[5px] h-[2px] rounded-full bg-crimson" />
              )}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-2 text-xs text-navy-faint">
              <span className={'h-1.5 w-1.5 rounded-full pulse-dot ' + (isWholesale ? 'bg-blue' : 'bg-forest')} />
              {isWholesale ? 'Wholesale VIP' : 'Retail customer'}
            </span>
            {user ? (
              <button onClick={handleLogout} className="text-xs font-semibold text-navy hover:underline">
                Sign Out
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)} className="text-xs font-semibold text-blue hover:underline">
                VIP Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Prototype views"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-cream/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="grid grid-cols-6">
          {VIEWS.map((v) => {
            const Ico = v.icon
            const on = active === v.id
            return (
              <button
                key={v.id}
                onClick={() => go(v.id)}
                className={
                  'flex flex-col items-center gap-1 pb-2.5 pt-1.5 text-xs font-medium transition-colors ' +
                  (on ? 'text-crimson' : 'text-navy-faint')
                }
              >
                <span className={'h-[2px] w-7 rounded-full ' + (on ? 'bg-crimson' : 'bg-transparent')} />
                <div className="relative">
                  <Ico size={18} />
                  {v.id === 'checkout' && cartCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-crimson px-1 text-[9px] font-bold text-white ring-2 ring-cream">
                      {cartCount}
                    </span>
                  )}
                </div>
                {v.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuth && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setShowAuth(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm overflow-hidden rounded-xl bg-paper shadow-float"
            >
              <div className="border-b border-line bg-shell px-6 py-4">
                <h3 className="font-serif text-lg font-semibold text-navy">VIP Portal Login</h3>
                <p className="text-sm text-navy-soft">Authenticate to unlock tier pricing.</p>
              </div>
              <form onSubmit={handleLogin} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-navy-soft mb-1">Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-navy focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-soft mb-1">Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-navy focus:outline-none"
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAuth(false)} className="px-4 py-2 text-sm font-semibold text-navy-soft hover:text-navy">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="rounded-md bg-navy px-5 py-2 text-sm font-semibold text-cream hover:bg-navy/90">
                    {loading ? 'Authenticating...' : 'Sign in'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
