import React, { useRef, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { LIFESTYLE } from '../data/site'
import { GhostButton, Kicker, RedButton } from '../components/ui/bits'
import { ArrowIcon, BriefcaseIcon, CheckIcon, InboxIcon, ShieldIcon } from '../components/ui/icons'
import TurnstileChallenge from '../components/security/TurnstileChallenge'
import { guestBffEnabled, postGuestCommerce } from '../services/guestCommerceService'
import { applyImageFallback } from '../lib/imageFallback'

const WHOLESALE_EMAIL = 'k2jimzonwebsite@gmail.com'

const BUSINESS_TYPES = [
  { id: 'cafe_restaurant', label: 'Café / Restaurant / Bakery' },
  { id: 'retail_deli', label: 'Specialty Retail / Italian Deli' },
  { id: 'hospitality', label: 'Hotel / Hospitality / Resort' },
  { id: 'corporate', label: 'Corporate Gifting / Events' },
  { id: 'distributor', label: 'Regional Reseller / Distributor' },
]

const VOLUME_TIERS = [
  { id: 'starter', label: 'Trial Orders (10–30 units per order)' },
  { id: 'case_regular', label: 'Regular Case Packs (30–100 units / month)' },
  { id: 'high_volume', label: 'High Volume / Pallet Cargo (>100 units / month)' },
  { id: 'recurring_weekly', label: 'Scheduled Weekly Supply' },
]

const REQUIREMENTS = [
  ['Products and expected quantities', 'Specify target Italian items, preferred packaging sizes, and monthly case volume.'],
  ['Delivery destination & frequency', 'Include your hub area, logistics preferences, and required first delivery timeframe.'],
  ['Later verification, if needed', 'Start with a business name and purchasing contact. Share registration evidence only after K2 requests it through a confirmed channel.'],
]

export default function Wholesale() {
  const { go } = useStore()

  // Form State
  const [formData, setFormData] = useState({
    organizationName: '',
    businessType: 'cafe_restaurant',
    contactName: '',
    contactRole: '',
    email: '',
    phone: '',
    deliveryAddress: '',
    volumeTier: 'case_regular',
    targetItems: '',
    notes: '',
    agreedToTerms: false,
  })

  const [submitting, setSubmitting] = useState(false)
  const [submittedReceipt, setSubmittedReceipt] = useState(null)
  const [formError, setFormError] = useState('')
  const [botToken, setBotToken] = useState('')
  const requestKey = useRef('')
  const secureInquiry = guestBffEnabled()

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!formData.organizationName.trim()) {
      setFormError('Please provide your company or registered business name.')
      return
    }
    if (!formData.contactName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setFormError('Contact name, work email, and phone number are required.')
      return
    }
    if (!formData.deliveryAddress.trim()) {
      setFormError('Please indicate your primary business delivery address.')
      return
    }
    if (!formData.agreedToTerms) {
      setFormError('Please confirm that you are authorized to make this inquiry and understand that K2 has not approved commercial terms.')
      return
    }
    if (secureInquiry && !botToken) {
      setFormError('Complete the security check before recording this inquiry.')
      return
    }

    setSubmitting(true)

    const businessType = BUSINESS_TYPES.find((b) => b.id === formData.businessType)?.label || formData.businessType
    const volumeTier = VOLUME_TIERS.find((v) => v.id === formData.volumeTier)?.label || formData.volumeTier
    const receipt = {
      organization: formData.organizationName.trim(),
      contact: formData.contactName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      businessType,
      volumeTier,
    }
    if (secureInquiry) {
      if (!requestKey.current) requestKey.current=crypto.randomUUID()
      const result=await postGuestCommerce('wholesale',{
        organizationName:formData.organizationName.trim(), businessType:formData.businessType,
        customerName:formData.contactName.trim(), contactRole:formData.contactRole.trim(),
        email:formData.email.trim(), phone:formData.phone.trim(), deliveryArea:formData.deliveryAddress.trim(),
        volumeBand:formData.volumeTier, targetItems:formData.targetItems.trim() || 'Business supply details to confirm',
        notes:formData.notes.trim(), idempotencyKey:requestKey.current, botToken,
      })
      setSubmitting(false)
      if(!result.ok) { setFormError(result.error || 'The inquiry could not be recorded. Keep this page open and try again.'); return }
      requestKey.current=''
      setSubmittedReceipt({...receipt,recorded:true,reference:result.data?.public_reference,conversationReference:result.data?.conversation_reference})
      return
    }
    const body = [
      `Organization: ${receipt.organization}`,
      `Business type: ${businessType}`,
      `Contact: ${receipt.contact}${formData.contactRole.trim() ? ` (${formData.contactRole.trim()})` : ''}`,
      `Email: ${receipt.email}`,
      `Phone: ${receipt.phone}`,
      `Delivery city / area: ${formData.deliveryAddress.trim()}`,
      `Expected volume: ${volumeTier}`,
      '',
      `Target items: ${formData.targetItems.trim() || 'Not specified'}`,
      `Notes: ${formData.notes.trim() || 'None'}`,
    ].join('\n')
    window.location.href = `mailto:${WHOLESALE_EMAIL}?subject=${encodeURIComponent(`Wholesale inquiry — ${receipt.organization}`)}&body=${encodeURIComponent(body)}`
    setSubmitting(false)
    setSubmittedReceipt({...receipt,recorded:false})
  }

  return (
    <main className="pb-24 md:pb-20">
      {/* Hero Section */}
      <section className="border-b border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] overflow-hidden text-navy">
        <div className="store-section grid min-h-[32rem] gap-10 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-16 lg:gap-16">
          <div>
            <Kicker className="flex items-center gap-2 text-crimson">
              <BriefcaseIcon size={14} /> Business & Wholesale Supply
            </Kicker>
            <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-navy sm:text-5xl lg:text-6xl">
              Authentic Italian supply,<br />
              <em className="font-normal text-crimson">reviewed by our sourcing team.</em>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-navy-soft">
              Italy-sourced business supply for cafés, restaurants, specialty delis, and corporate buyers.
              K2 staff reviews the applicable batch, Manila availability, and versioned commercial terms before an order is accepted.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#application-form"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-crimson px-6 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-crimson-deep active:scale-[0.97]"
              >
                Prepare a Wholesale Inquiry <ArrowIcon size={15} />
              </a>
              <GhostButton onClick={() => go('catalog')} className="px-6">
                Browse Retail Catalog
              </GhostButton>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[var(--store-surface-border)] shadow-sm">
            <img
              src={LIFESTYLE.venice}
              alt="Italy sourcing and consolidation"
              onError={applyImageFallback}
              className="aspect-[4/3] h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--store-surface-bg)] via-[var(--store-surface-bg)]/80 to-transparent p-6 pt-20">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-crimson">
                <ShieldIcon size={14} />
                <span>Manual Commercial Review</span>
              </div>
              <p className="mt-2 max-w-sm text-sm leading-6 text-navy-soft">
                Wholesale pricing is staff-assigned and tied to a reviewed business need. The browser cannot approve pricing, stock, credit, or delivery terms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Application & Form Section */}
      <section id="application-form" className="store-section py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <Kicker>Business Onboarding</Kicker>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              Start a traceable business-supply inquiry.
            </h2>
            <p className="mt-4 text-sm leading-7 text-navy-soft">
              Prepare a business-supply inquiry with your expected volume. K2 reviews it manually; eligibility, pricing, delivery, and any commercial terms are confirmed only in a later staff response.
            </p>

            <div className="mt-8 rounded-xl border border-line bg-paper p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-crimson">
                What Happens Next:
              </h3>
              <ol className="mt-3 space-y-2.5 text-xs leading-relaxed text-navy-soft">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-navy">1.</span>
                  <span>K2 reviews the business need and expected volume after the email is actually sent.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-navy">2.</span>
                  <span>Staff may request business evidence through a confirmed channel; the first inquiry should not contain sensitive documents.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-navy">3.</span>
                  <span>Any eligibility, stock, pricing, delivery, or commercial proposal is confirmed separately and remains version-specific.</span>
                </li>
              </ol>
            </div>
          </div>

          <div>
            {submittedReceipt ? (
              <div className="rounded-2xl border border-blue/30 bg-blue/5 p-6 text-navy shadow-sm sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue text-white">
                    <InboxIcon size={20} />
                  </span>
                  <div>
                    <h3 className="font-serif text-2xl font-semibold text-navy">
                      {submittedReceipt.recorded ? 'Inquiry recorded' : 'Email draft prepared — not submitted'}
                    </h3>
                    <p className="text-xs font-semibold text-blue">{submittedReceipt.recorded ? `Ref: ${submittedReceipt.reference} · Conversation: ${submittedReceipt.conversationReference}` : 'Review it in your email app, then press Send.'}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3 rounded-xl border border-line bg-paper p-4 text-xs text-navy-soft">
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="font-semibold text-navy">Company:</span>
                    <span>{submittedReceipt.organization}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="font-semibold text-navy">Contact Person:</span>
                    <span>{submittedReceipt.contact}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="font-semibold text-navy">Work Email:</span>
                    <span>{submittedReceipt.email}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="font-semibold text-navy">Business Category:</span>
                    <span>{submittedReceipt.businessType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-navy">Volume Tier:</span>
                    <span>{submittedReceipt.volumeTier}</span>
                  </div>
                </div>

                <p className="mt-6 text-xs leading-relaxed text-navy-soft">
                  {submittedReceipt.recorded ? 'K2 recorded this inquiry and its Website conversation. This does not approve a business account, wholesale pricing, stock, credit, delivery timing, or response time.' : 'K2 has not received or recorded this inquiry yet. Sending the email does not approve a business account, wholesale pricing, stock, credit, delivery timing, or response time.'}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <GhostButton
                    onClick={() => {
                      setSubmittedReceipt(null)
                      setFormData({
                        organizationName: '',
                        businessType: 'cafe_restaurant',
                        contactName: '',
                        contactRole: '',
                        email: '',
                        phone: '',
                        deliveryAddress: '',
                        volumeTier: 'case_regular',
                        targetItems: '',
                        notes: '',
                        agreedToTerms: false,
                      })
                    }}
                    className="text-xs"
                  >
                    Prepare Another Inquiry
                  </GhostButton>
                  <RedButton onClick={() => go('catalog')}>
                    Browse the Retail Catalog <ArrowIcon size={14} />
                  </RedButton>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-line bg-paper p-6 shadow-sm sm:p-8">
                <h3 className="font-serif text-2xl font-semibold text-navy">
                  Wholesale Inquiry Draft
                </h3>
                <p className="text-xs text-navy-soft">
                  This prepares an email draft only. It does not create or verify a business account.
                </p>

                {formError && (
                  <div className="rounded-lg border border-crimson/30 bg-crimson/10 p-3 text-xs text-crimson">
                    <strong>Please review:</strong> {formError}
                  </div>
                )}

                {/* Company */}
                <div>
                  <div>
                    <label htmlFor="wholesale-organization" className="mb-1 block text-xs font-semibold text-navy">
                      Registered Company Name *
                    </label>
                    <input
                      id="wholesale-organization"
                      type="text"
                      required
                      value={formData.organizationName}
                      onChange={handleChange('organizationName')}
                      placeholder="e.g. Milano Café & Gourmet Inc."
                      className="min-h-11 w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson focus:ring-1 focus:ring-crimson"
                    />
                  </div>
                </div>
                <p className="text-xs leading-5 text-navy-soft">Do not send registration documents, tax numbers, payment details, passwords, or one-time codes in this first inquiry. Staff will request only the evidence needed for a later review.</p>

                {/* Business Type & Volume Tier */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="wholesale-business-type" className="mb-1 block text-xs font-semibold text-navy">
                      Business Type *
                    </label>
                    <select
                      id="wholesale-business-type"
                      value={formData.businessType}
                      onChange={handleChange('businessType')}
                      className="min-h-11 w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson"
                    >
                      {BUSINESS_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="wholesale-volume" className="mb-1 block text-xs font-semibold text-navy">
                      Expected Order Volume *
                    </label>
                    <select
                      id="wholesale-volume"
                      value={formData.volumeTier}
                      onChange={handleChange('volumeTier')}
                      className="min-h-11 w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson"
                    >
                      {VOLUME_TIERS.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Contact Person & Role */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="wholesale-contact-name" className="mb-1 block text-xs font-semibold text-navy">
                      Contact Person Full Name *
                    </label>
                    <input
                      id="wholesale-contact-name"
                      type="text"
                      required
                      value={formData.contactName}
                      onChange={handleChange('contactName')}
                      placeholder="e.g. Maria Santos"
                      className="min-h-11 w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson"
                    />
                  </div>
                  <div>
                    <label htmlFor="wholesale-contact-role" className="mb-1 block text-xs font-semibold text-navy">
                      Designation / Role
                    </label>
                    <input
                      id="wholesale-contact-role"
                      type="text"
                      value={formData.contactRole}
                      onChange={handleChange('contactRole')}
                      placeholder="e.g. Purchasing Manager / Owner"
                      className="min-h-11 w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson"
                    />
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="wholesale-email" className="mb-1 block text-xs font-semibold text-navy">
                      Work Email *
                    </label>
                    <input
                      id="wholesale-email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange('email')}
                      placeholder="purchasing@company.com"
                      className="min-h-11 w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson"
                    />
                  </div>
                  <div>
                    <label htmlFor="wholesale-phone" className="mb-1 block text-xs font-semibold text-navy">
                      Mobile / WhatsApp / Viber *
                    </label>
                    <input
                      id="wholesale-phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleChange('phone')}
                      placeholder="0917 123 4567"
                      className="min-h-11 w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson"
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div>
                  <label htmlFor="wholesale-delivery-area" className="mb-1 block text-xs font-semibold text-navy">
                    Delivery City / Area *
                  </label>
                  <input
                    id="wholesale-delivery-area"
                    type="text"
                    required
                    value={formData.deliveryAddress}
                    onChange={handleChange('deliveryAddress')}
                    placeholder="City, Province / Metro Manila area"
                    className="min-h-11 w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson"
                  />
                </div>

                {/* Target Products & Notes */}
                <div>
                  <label htmlFor="wholesale-target-items" className="mb-1 block text-xs font-semibold text-navy">
                    Target Italian Items or Specific Requirements
                  </label>
                  <textarea
                    id="wholesale-target-items"
                    rows={3}
                    value={formData.targetItems}
                    onChange={handleChange('targetItems')}
                    placeholder="e.g. Italian Coffee Beans, Olive Oil 5L tins, Truffle sauces, Balsamic Vinegar of Modena..."
                    className="w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson"
                  />
                </div>

                {/* Terms Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-relaxed text-navy-soft">
                    <input
                      type="checkbox"
                      checked={formData.agreedToTerms}
                      onChange={handleChange('agreedToTerms')}
                      className="mt-0.5 h-4 w-4 rounded accent-crimson"
                    />
                    <span>
                      I am authorized to make this inquiry. I understand that it is not an application receipt or approval, and that pricing, stock, delivery, credit, and other commercial terms require separate staff confirmation.
                    </span>
                  </label>
                </div>

                {secureInquiry && <TurnstileChallenge onTokenChange={setBotToken} />}

                {/* Submit Button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-crimson px-6 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-crimson-deep active:scale-[0.98] disabled:opacity-50"
                  >
                    {submitting ? (secureInquiry ? 'Recording Inquiry…' : 'Preparing Email Draft…') : (secureInquiry ? 'Record Wholesale Inquiry' : 'Prepare Wholesale Email')}
                    <ArrowIcon size={15} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Requirements Grid */}
        <div className="mt-16 border-t border-line pt-12">
          <h3 className="font-serif text-2xl font-semibold text-navy">
            Commercial Supply Guidelines
          </h3>
          <p className="mt-1 text-sm text-navy-soft">
            Information K2 staff reviews before confirming product handling, stock, batch, expiry, and delivery requirements for a business buyer.
          </p>

          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {REQUIREMENTS.map(([title, body], index) => (
              <li key={title} className="rounded-xl border border-line bg-paper p-5">
                <span className="font-serif text-2xl font-bold text-crimson">0{index + 1}</span>
                <h4 className="mt-2 font-serif text-lg font-semibold text-navy">{title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-navy-soft">{body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-paper p-6 sm:flex-row sm:items-center sm:px-8">
          <p className="flex max-w-xl items-start gap-3 text-sm leading-6 text-navy-soft">
            <CheckIcon size={18} className="mt-0.5 shrink-0 text-forest" />
            Looking for a rare or custom Italian brand not listed in the retail catalog? Submit a Pasabuy request so K2 staff can review the item, quantity, sourcing, and an appropriate next step.
          </p>
          <RedButton onClick={() => go('pasabuy')}>
            Request Custom Sourcing <ArrowIcon size={15} />
          </RedButton>
        </div>
      </section>
    </main>
  )
}
