import { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { Kicker, TuscanCard } from '../components/ui/bits'
import { ArrowIcon, ChatIcon, InboxIcon } from '../components/ui/icons'
import { guestBffEnabled } from '../services/guestCommerceService'
import { StartConversationForm } from './GuestMessages'

const SUPPORT_EMAIL = 'k2jimzonwebsite@gmail.com'

function EmailDraftForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [error, setError] = useState('')

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setError('')
  }

  const submit = (event) => {
    event.preventDefault()
    if (!form.email.trim() && !form.phone.trim()) {
      setError('Please enter an email address or mobile number so we can reply.')
      return
    }
    const subject = `Website message from ${form.name.trim()}`
    const body = [
      `Name: ${form.name.trim()}`,
      `Email: ${form.email.trim() || 'Not provided'}`,
      `Mobile: ${form.phone.trim() || 'Not provided'}`,
      '',
      form.message.trim(),
    ].join('\n')
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <TuscanCard className="overflow-hidden">
      <div className="border-b border-line p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-crimson/10 text-crimson"><InboxIcon size={20} /></span>
          <div>
            <h2 className="font-serif text-xl font-semibold text-navy">Leave us a message</h2>
            <p className="mt-1 text-sm leading-relaxed text-navy-soft">You can send us a message anytime. We will get back to you by email or phone.</p>
          </div>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        <label htmlFor="contact-name" className="block text-sm font-semibold text-navy">Full name
          <input id="contact-name" className="store-field mt-1.5 w-full px-4 py-3" value={form.name} onChange={update('name')} autoComplete="name" required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="contact-email" className="block text-sm font-semibold text-navy">Email address
            <input id="contact-email" className="store-field mt-1.5 w-full px-4 py-3" type="email" value={form.email} onChange={update('email')} autoComplete="email" />
          </label>
          <label htmlFor="contact-phone" className="block text-sm font-semibold text-navy">Mobile number
            <input id="contact-phone" className="store-field mt-1.5 w-full px-4 py-3" type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" />
          </label>
        </div>
        <p className="text-xs leading-relaxed text-navy-soft">Enter at least one contact method so we can reach you.</p>
        <label htmlFor="contact-message" className="block text-sm font-semibold text-navy">How can we help?
          <textarea id="contact-message" className="store-field mt-1.5 min-h-36 w-full resize-y px-4 py-3" value={form.message} onChange={update('message')} maxLength={2000} required placeholder="Ask about product availability, Pasabuy sourcing, or wholesale supply..." />
        </label>
        {error && <p role="alert" className="rounded-xl border border-crimson/25 bg-crimson/5 p-3 text-sm text-crimson">{error}</p>}
        <button type="submit" disabled={!form.name.trim() || !form.message.trim()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-crimson px-5 text-sm font-bold text-white transition-transform duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer">
          Open email draft <ArrowIcon size={16} />
        </button>
        <p className="text-xs leading-relaxed text-navy-faint">This creates a drafted email in your email app. Review your message and press Send.</p>
      </form>
    </TuscanCard>
  )
}

function ContactRow({ label, children }) {
  return (
    <div className="grid gap-1 border-t border-line py-4 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-navy-soft">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-semibold text-navy">{children}</dd>
    </div>
  )
}

export default function Contact() {
  const { go } = useStore()
  const secureMessaging = guestBffEnabled()

  return (
    <main className="store-section pb-24 pt-10 md:pb-20 md:pt-14">
      <div className="max-w-3xl">
        <Kicker className="flex items-center gap-2"><ChatIcon size={15} /> Contact K2</Kicker>
        <h1 className="mt-3 max-w-2xl font-serif text-4xl font-semibold tracking-tight text-navy sm:text-5xl">Ask us directly.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-navy-soft">Questions about products, Pasabuy sourcing from Italy, or business supply are welcome. No account required.</p>
      </div>

      <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-12">
        {secureMessaging ? (
          <div>
            <StartConversationForm onCreated={() => go('messages')} />
            <button type="button" onClick={() => go('messages')} className="mt-3 min-h-11 text-sm font-bold text-crimson underline decoration-crimson/35 underline-offset-4 cursor-pointer">Open your existing K2 messages</button>
          </div>
        ) : <EmailDraftForm />}

        <aside aria-label="K2 contact channels" className="lg:pt-2">
          <h2 className="font-serif text-2xl font-semibold text-navy">Contact channels</h2>
          <p className="mt-2 text-sm leading-6 text-navy-soft">Official contact details for K2 Jimzon.</p>
          <dl className="mt-5 border-b border-line">
            <ContactRow label="Email"><a className="text-crimson underline decoration-crimson/30 underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></ContactRow>
            <ContactRow label="Messenger">@k2jimzon</ContactRow>
            <ContactRow label="Shopee">k2jimzononlineshop</ContactRow>
            <ContactRow label="Location">Manila, Philippines</ContactRow>
          </dl>

          <div className="mt-8 rounded-2xl bg-forest-wash p-5 text-forest">
            <h2 className="text-base font-bold">Staff response time</h2>
            <p className="mt-2 text-sm leading-6">Our team checks messages daily during Manila business hours. Send us a message and we will respond promptly.</p>
          </div>
          <p className="mt-5 text-xs leading-5 text-navy-faint">Never share passwords or sensitive credentials through chat or email.</p>
        </aside>
      </div>
    </main>
  )
}
