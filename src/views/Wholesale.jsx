import React, { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { LIFESTYLE } from '../data/site'
import { GhostButton, Kicker, RedButton } from '../components/ui/bits'
import { ArrowIcon, BriefcaseIcon, CheckIcon, ShieldIcon } from '../components/ui/icons'

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
  ['Authorized business credentials', 'Share business name, tax identification (TIN/SEC/DTI), and designated purchasing contact.'],
]

export default function Wholesale() {
  const { go } = useStore()

  // Form State
  const [formData, setFormData] = useState({
    organizationName: '',
    businessType: 'cafe_restaurant',
    registrationNumber: '', // TIN or DTI/SEC
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

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const handleSubmit = (e) => {
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
    if (!formData.registrationNumber.trim()) {
      setFormError('Please enter your TIN, DTI, or SEC registration number for business verification.')
      return
    }
    if (!formData.deliveryAddress.trim()) {
      setFormError('Please indicate your primary business delivery address.')
      return
    }
    if (!formData.agreedToTerms) {
      setFormError('Please confirm that you agree to K2 Jimzon business supply terms.')
      return
    }

    setSubmitting(true)

    // Generate durable receipt ID and persist application state
    const applicationRef = `WA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    const receipt = {
      reference: applicationRef,
      organization: formData.organizationName.trim(),
      contact: formData.contactName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      businessType: BUSINESS_TYPES.find((b) => b.id === formData.businessType)?.label || formData.businessType,
      volumeTier: VOLUME_TIERS.find((v) => v.id === formData.volumeTier)?.label || formData.volumeTier,
      submittedAt: new Date().toISOString(),
    }

    // Store in local storage for session continuity
    try {
      const existing = JSON.parse(localStorage.getItem('k2_wholesale_applications') || '[]')
      existing.push(receipt)
      localStorage.setItem('k2_wholesale_applications', JSON.stringify(existing))
    } catch {
      // Non-blocking storage fallback
    }

    setTimeout(() => {
      setSubmitting(false)
      setSubmittedReceipt(receipt)
    }, 400)
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
              Direct air-freighted supply for cafés, restaurants, specialty delis, and corporate buyers.
              K2 verifies fresh batches, Manila hub allocation, and custom volume pricing before confirming terms.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#application-form"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-crimson px-6 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-crimson-deep active:scale-[0.97]"
              >
                Apply for Wholesale Terms <ArrowIcon size={15} />
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
              className="aspect-[4/3] h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--store-surface-bg)] via-[var(--store-surface-bg)]/80 to-transparent p-6 pt-20">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-crimson">
                <ShieldIcon size={14} />
                <span>Verified Commercial Operations</span>
              </div>
              <p className="mt-2 max-w-sm text-sm leading-6 text-navy-soft">
                Wholesale pricing is staff-assigned and tied to verified business volume. Every batch carries an immutable landed cost and expiry date.
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
              Apply for an Attributable Wholesale Account.
            </h2>
            <p className="mt-4 text-sm leading-7 text-navy-soft">
              Submit your business profile and expected volume. Our team reviews all applications within 1–2 business days to set up your dedicated price list and logistics terms.
            </p>

            <div className="mt-8 rounded-xl border border-line bg-paper p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-crimson">
                What Happens Next:
              </h3>
              <ol className="mt-3 space-y-2.5 text-xs leading-relaxed text-navy-soft">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-navy">1.</span>
                  <span>Staff reviews your TIN/SEC/DTI registration and volume tier.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-navy">2.</span>
                  <span>We confirm Manila warehouse stock availability and Italy flight schedule.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-navy">3.</span>
                  <span>A personalized commercial proposal is sent to your purchasing email.</span>
                </li>
              </ol>
            </div>
          </div>

          <div>
            {submittedReceipt ? (
              <div className="rounded-2xl border border-forest/30 bg-forest/5 p-6 text-navy shadow-sm sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-white">
                    <CheckIcon size={20} />
                  </span>
                  <div>
                    <h3 className="font-serif text-2xl font-semibold text-navy">
                      Application Submitted Successfully
                    </h3>
                    <p className="text-xs font-mono font-bold text-forest">
                      Ref: {submittedReceipt.reference}
                    </p>
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
                  A copy of this reference has been recorded. Our wholesale coordinator will reach out directly at <strong className="text-navy">{submittedReceipt.email}</strong>.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <GhostButton
                    onClick={() => {
                      setSubmittedReceipt(null)
                      setFormData({
                        organizationName: '',
                        businessType: 'cafe_restaurant',
                        registrationNumber: '',
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
                    Submit Another Inquiry
                  </GhostButton>
                  <RedButton onClick={() => go('catalog')}>
                    Explore Wholesale Eligible Products <ArrowIcon size={14} />
                  </RedButton>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-line bg-paper p-6 shadow-sm sm:p-8">
                <h3 className="font-serif text-2xl font-semibold text-navy">
                  Wholesale Application Form
                </h3>
                <p className="text-xs text-navy-soft">
                  All fields marked with an asterisk (*) are required for business account verification.
                </p>

                {formError && (
                  <div className="rounded-lg border border-crimson/30 bg-crimson/10 p-3 text-xs text-crimson">
                    <strong>Please review:</strong> {formError}
                  </div>
                )}

                {/* Company & TIN */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-navy">
                      Registered Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.organizationName}
                      onChange={handleChange('organizationName')}
                      placeholder="e.g. Milano Café & Gourmet Inc."
                      className="min-h-11 w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson focus:ring-1 focus:ring-crimson"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-navy">
                      TIN / DTI / SEC Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.registrationNumber}
                      onChange={handleChange('registrationNumber')}
                      placeholder="e.g. 000-123-456-000"
                      className="min-h-11 w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson focus:ring-1 focus:ring-crimson"
                    />
                  </div>
                </div>

                {/* Business Type & Volume Tier */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-navy">
                      Business Type *
                    </label>
                    <select
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
                    <label className="mb-1 block text-xs font-semibold text-navy">
                      Expected Order Volume *
                    </label>
                    <select
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
                    <label className="mb-1 block text-xs font-semibold text-navy">
                      Contact Person Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contactName}
                      onChange={handleChange('contactName')}
                      placeholder="e.g. Maria Santos"
                      className="min-h-11 w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-navy">
                      Designation / Role
                    </label>
                    <input
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
                    <label className="mb-1 block text-xs font-semibold text-navy">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange('email')}
                      placeholder="purchasing@company.com"
                      className="min-h-11 w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-navy">
                      Mobile / WhatsApp / Viber *
                    </label>
                    <input
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
                  <label className="mb-1 block text-xs font-semibold text-navy">
                    Primary Business Delivery Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.deliveryAddress}
                    onChange={handleChange('deliveryAddress')}
                    placeholder="Unit, Building, Street, City, Province / Metro Manila"
                    className="min-h-11 w-full rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-2 text-sm text-navy outline-none focus:border-crimson"
                  />
                </div>

                {/* Target Products & Notes */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy">
                    Target Italian Items or Specific Requirements
                  </label>
                  <textarea
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
                      I declare that I am an authorized representative of this business. I understand that wholesale pricing and delivery schedules are subject to staff approval and verification.
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-crimson px-6 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-crimson-deep active:scale-[0.98] disabled:opacity-50"
                  >
                    {submitting ? 'Submitting Application…' : 'Submit Wholesale Application'}
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
            How K2 Jimzon ensures product integrity, cold-chain safety, and accurate batch records for business buyers.
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
            Looking for a rare or custom Italian brand not listed in our standard wholesale catalog? Submit a Pasabuy request and our Milan sourcing team will quote landed bulk pricing.
          </p>
          <RedButton onClick={() => go('pasabuy')}>
            Request Custom Sourcing <ArrowIcon size={15} />
          </RedButton>
        </div>
      </section>
    </main>
  )
}
