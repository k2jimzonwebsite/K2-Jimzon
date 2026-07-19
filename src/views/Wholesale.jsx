import { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { LIFESTYLE } from '../data/site'
import { BizBadge, RedButton, Wordmark } from '../components/ui/bits'
import { CheckIcon, PlaneIcon } from '../components/ui/icons'

// Wholesale / B2B — the one zone where Philippine blue leads.
export default function Wholesale() {
  const { setIsWholesale, go, isWholesale } = useStore()
  const [email, setEmail] = useState('orders@bellavitatrading.ph')
  const [password, setPassword] = useState('••••••••••')

  const signIn = (e) => {
    e.preventDefault()
    setIsWholesale(true)
    go('home')
  }

  return (
    <main className="grid min-h-[calc(100vh-40px)] pb-20 md:grid-cols-2 md:pb-0">
      {/* Business panel */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-forest-wash p-6 text-navy md:p-12">
        <img
          src={LIFESTYLE.venice}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-multiply"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-forest-wash via-forest-wash/80 to-transparent" />
        <p className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-forest">
          <PlaneIcon size={14} /> Wholesale · direct consignment
        </p>
        <div className="relative py-8 md:py-0">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold leading-[1.08] tracking-tight md:text-5xl text-navy">
            Stop waiting for a
            <br />
            reply on Viber.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-soft">
            The wholesale portal shows the same live warehouse counts we see — your
            tier prices, case quantities, and instant self-serve ordering. If it's
            in stock here, it's yours.
          </p>
          <ul className="mt-6 hidden space-y-2.5 text-sm text-navy-soft md:block">
            {[
              'Live stock, straight from the Manila warehouse count',
              'Your negotiated wholesale tier, applied automatically',
              'Order at 11pm — it packs at 7am',
              'Recurring supply for cafés, restos, and resellers',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <CheckIcon size={15} className="mt-0.5 shrink-0 text-forest" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-xs text-navy-faint md:block">
          Supplying coffee shops, restaurants & resellers · since 2021
        </p>
      </section>

      {/* Login form on white */}
      <section className="flex items-center justify-center bg-transparent px-4 py-12 md:px-12">
        <div className="w-full max-w-sm">
          <Wordmark />
          <div className="mt-8 flex items-center gap-2.5">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Wholesale sign in</h2>
            <BizBadge>B2B</BizBadge>
          </div>
          <p className="mt-1.5 text-sm text-navy-soft">
            For accredited coffee shops, restaurants, and resellers.
          </p>

          {isWholesale ? (
            <div className="mt-8 rounded-3xl border border-line bg-cream/90 backdrop-blur-md p-6 shadow-card">
              <BizBadge>Signed in · Bella Vita Trading</BizBadge>
              <p className="mt-3 text-sm leading-relaxed text-navy-soft">
                Wholesale pricing is active across the store. Browse the catalog to
                see your tier prices next to retail.
              </p>
              <RedButton className="mt-4 w-full" onClick={() => go('home')}>
                Browse wholesale catalog
              </RedButton>
            </div>
          ) : (
            <form onSubmit={signIn} className="mt-8 space-y-4">
              <Field label="Business email" type="email" value={email} onChange={setEmail} />
              <Field label="Password" type="password" value={password} onChange={setPassword} />
              <button
                type="submit"
                className="w-full rounded-xl bg-forest px-5 py-4 text-base font-semibold text-white shadow-card transition-all hover:-translate-y-px hover:bg-forest/90 hover:shadow-float active:scale-95"
              >
                Sign in to wholesale
              </button>
              <p className="text-center text-xs text-navy-soft">
                Not accredited yet?{' '}
                <button type="button" className="px-2 py-1 -mx-2 font-medium text-forest underline underline-offset-2">
                  Apply for a wholesale account
                </button>
              </p>
            </form>
          )}

          <p className="mt-10 border-t border-line pt-4 text-xs leading-relaxed text-navy-faint">
            Demo note: any credentials work. Signing in switches the whole store
            into wholesale tier pricing.
          </p>
        </div>
      </section>
    </main>
  )
}

function Field({ label, type, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-cream/50 backdrop-blur-sm px-4 py-3 text-sm shadow-card placeholder:text-navy-faint focus:border-forest/60 focus:outline-none"
      />
    </label>
  )
}
