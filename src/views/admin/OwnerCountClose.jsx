import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertIcon, CheckIcon, SyncIcon, UploadIcon } from '../../components/ui/icons'
import {
  adminBffEnabled,
  completeOwnerCloseBookkeepingHandoffBff,
  decideMarketplaceSnapshotRowBff,
  getMarketplaceOrderStatusBff,
  getMarketplaceSnapshotStatusBff,
  getOwnerCloseFeesBff,
  getOwnerCloseStockBff,
  getOwnerCloseCoverageBff,
  getOwnerCloseBookkeepingHandoffBff,
  getOwnerClosePasabuyBff,
  getOwnerCloseWorkspaceBff,
  saveOwnerCloseFeeEstimateBff,
  saveOwnerCloseStockReviewBff,
  saveOwnerCloseCoverageOverrideBff,
  saveOwnerClosePasabuyReviewBff,
  reconcileLotsBff,
  saveOwnerCloseSessionBff,
  stageMarketplaceOrdersBff,
  stageMarketplaceSnapshotBff,
} from '../../services/adminBffService'
import {
  OWNER_CLOSE_STEPS,
  buildOwnerCloseSessionDraft,
  nextPendingMarketplaceRow,
  summarizeMarketplaceRows,
} from './ownerCountCloseModel'
import { calculateMarketplaceFeeEstimate } from '../../lib/marketplaceFeeEstimate'
import { buildLotReconciliationPayload, buildOwnerCloseStockReview } from '../../lib/ownerCloseStockReview'
import { buildOwnerCloseBookkeepingCsv } from '../../lib/ownerCloseBookkeepingHandoff'
import {
  EmptyState,
  MetricRail,
  SectionHeading,
  StateBanner,
  StatusPill,
  WorkspaceIntro,
  primaryButton,
  secondaryButton,
} from './AdminWorkspaceUi'

const fieldClass = 'min-h-[44px] w-full rounded-adm-sm border border-adm-line bg-adm-sunken px-3 text-sm text-white outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-white/40 focus:border-blue/70 focus:ring-2 focus:ring-blue/20 disabled:cursor-not-allowed disabled:opacity-50'
const textareaClass = `${fieldClass} min-h-24 py-2.5 leading-relaxed`
const MAX_FILE_BYTES = 512 * 1024

function manilaDateParts() {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map((part) => [part.type, part.value]))
  return { today: `${values.year}-${values.month}-${values.day}`, monthStart: `${values.year}-${values.month}-01` }
}

function Field({ label, hint, error, children }) {
  return (
    <label className="block min-w-0 text-sm font-semibold text-white/80">
      <span>{label}</span>
      {hint && <span className="ml-1 font-normal text-white/45">{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
      {error && <span className="mt-1 block text-xs font-normal text-crimson" role="alert">{error}</span>}
    </label>
  )
}

function StepRail({ currentStep }) {
  const currentIndex = Math.max(0, OWNER_CLOSE_STEPS.findIndex((step) => step.id === currentStep))
  return (
    <ol aria-label="Owner Count and Close progress" className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {OWNER_CLOSE_STEPS.map((step, index) => {
        const current = index === currentIndex
        const passed = index < currentIndex
        return (
          <li key={step.id} className={`flex min-h-[44px] min-w-[108px] items-center gap-2 rounded-adm-sm border px-2.5 text-xs font-semibold ${
            current ? 'border-blue/50 bg-blue/10 text-blue'
              : passed ? 'border-forest/30 bg-forest/10 text-forest'
                : 'border-adm-line bg-white/[0.025] text-white/45'
          }`} aria-current={current ? 'step' : undefined}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/30 font-mono tabular-nums">
              {passed ? <CheckIcon size={13} /> : index + 1}
            </span>
            <span>{step.shortLabel}</span>
          </li>
        )
      })}
    </ol>
  )
}

function SourceSetup({ shops, session, selectedShopIds, setSelectedShopIds, periodStart, setPeriodStart, periodEnd, setPeriodEnd, reason, setReason, busy, offline, onSave }) {
  const toggleShop = (id) => setSelectedShopIds((current) => (
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
  ))
  return (
    <section className="space-y-4" aria-labelledby="close-sources-heading">
      <SectionHeading
        title="1. Choose the close period and exact shops"
        description="Each seller account stays separate. Selecting Shopee does not silently select every Shopee shop."
        count={selectedShopIds.length}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]">
        <fieldset className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
          <legend id="close-sources-heading" className="sr-only">Exact source shops</legend>
          {shops.map((shop) => {
            const selected = selectedShopIds.includes(shop.id)
            return (
              <label key={shop.id} className="flex min-h-[60px] cursor-pointer items-center gap-3 border-b border-adm-line px-3 py-2.5 last:border-b-0 focus-within:bg-blue/5">
                <input type="checkbox" className="h-5 w-5 accent-blue" checked={selected} onChange={() => toggleShop(shop.id)} disabled={busy || Boolean(session)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{shop.displayName}</span>
                  <span className="mt-0.5 block text-xs text-white/45">{shop.channelCode} · {shop.shopCode}</span>
                </span>
                <StatusPill tone={shop.status === 'operational' ? 'success' : 'warning'}>{shop.status?.replaceAll('_', ' ') || 'not connected'}</StatusPill>
              </label>
            )
          })}
        </fieldset>
        <form className="space-y-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); onSave() }}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Field label="Period start"><input className={fieldClass} type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} disabled={busy || Boolean(session)} /></Field>
            <Field label="Period end"><input className={fieldClass} type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} disabled={busy || Boolean(session)} /></Field>
          </div>
          <Field label="Save reason" hint="10–500 characters"><textarea className={textareaClass} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} placeholder="Why are these shops and dates being closed together?" /></Field>
          <button className={`${primaryButton} w-full`} type="submit" disabled={busy || offline || selectedShopIds.length === 0 || reason.trim().length < 10}>
            {busy ? 'Saving close session…' : session ? 'Save current progress' : 'Save sources & continue'}
          </button>
          {session && <p className="break-all text-xs text-white/45">Recovery ID: <code>{session.sessionId}</code></p>}
        </form>
      </div>
    </section>
  )
}

function SnapshotImport({ shops, session, importStatus, onStage, onResumeImport, busy, offline }) {
  const selectedShops = shops.filter((shop) => session?.shopIds?.includes(shop.id))
  const [shopId, setShopId] = useState(selectedShops[0]?.id || '')
  const [file, setFile] = useState(null)
  const [sourceIdentity, setSourceIdentity] = useState('')
  const [reason, setReason] = useState('')
  const [resumeImportId, setResumeImportId] = useState('')
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    if (!selectedShops.some((shop) => shop.id === shopId)) setShopId(selectedShops[0]?.id || '')
  }, [selectedShops, shopId])

  const chooseFile = (event) => {
    const next = event.target.files?.[0] || null
    if (next && (next.size > MAX_FILE_BYTES || !next.name.toLowerCase().endsWith('.csv'))) {
      setFile(null); setFileError('Use one CSV no larger than 512 KB.'); return
    }
    setFile(next); setFileError('')
    const shop = selectedShops.find((item) => item.id === shopId)
    if (next && shop && !sourceIdentity) setSourceIdentity(`${shop.shopCode}:${next.name}`)
  }

  return (
    <section className="space-y-4">
      <SectionHeading title="2. Import one shop export" description="CSV is transport only. The original rows, duplicates, conflicts, and source hash remain review evidence." />
      <StateBanner tone="info">Reported quantity is observation evidence. This import does not change physical inventory, lots, custody, reservations, or marketplace availability.</StateBanner>
      {!importStatus ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <form className="grid gap-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:grid-cols-2 sm:p-4" onSubmit={(event) => { event.preventDefault(); onStage({ shopId, file, sourceIdentity, reason }) }}>
            <Field label="Exact shop"><select className={fieldClass} value={shopId} onChange={(event) => setShopId(event.target.value)} disabled={busy}>{selectedShops.map((shop) => <option key={shop.id} value={shop.id}>{shop.displayName} · {shop.shopCode}</option>)}</select></Field>
            <Field label="Marketplace CSV" hint="512 KB maximum" error={fileError}><input className={`${fieldClass} file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-blue`} type="file" accept=".csv,text/csv" onChange={chooseFile} disabled={busy} /></Field>
            <Field label="Source identity" hint="stable across retries"><input className={fieldClass} value={sourceIdentity} onChange={(event) => setSourceIdentity(event.target.value)} maxLength={200} disabled={busy} /></Field>
            <Field label="Import reason" hint="10–500 characters"><input className={fieldClass} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} disabled={busy} placeholder="Stage this exact shop export for month close." /></Field>
            <button className={`${primaryButton} sm:col-span-2`} type="submit" disabled={busy || offline || !file || !shopId || !sourceIdentity.trim() || reason.trim().length < 10}>
              <UploadIcon size={16} /> {busy ? 'Validating and staging…' : 'Validate & stage snapshot'}
            </button>
          </form>
          <form className="rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); onResumeImport(resumeImportId) }}>
            <p className="text-sm font-semibold text-white">Resume a staged import</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">Use its recovery ID after a refresh or ambiguous timeout. The server returns the durable result.</p>
            <Field label="Import recovery ID"><input className={fieldClass} value={resumeImportId} onChange={(event) => setResumeImportId(event.target.value)} placeholder="00000000-0000-4000-8000-000000000000" /></Field>
            <button type="submit" className={`${secondaryButton} mt-3 w-full`} disabled={busy || offline || resumeImportId.length !== 36}><SyncIcon size={15} /> Resume import</button>
            <p className="mt-3 text-xs text-white/40">No staged import yet? Keep the original CSV and stage it above. Do not recreate rows by hand.</p>
          </form>
        </div>
      ) : <SnapshotSummary status={importStatus} />}
    </section>
  )
}

function SnapshotSummary({ status }) {
  const summary = summarizeMarketplaceRows(status.rows)
  return (
    <div className="space-y-3">
      <MetricRail columns="lg:grid-cols-7" items={[
        { label: 'Rows', value: summary.total }, { label: 'Pending', value: summary.pending, tone: summary.pending ? 'text-amber' : 'text-white' },
        { label: 'Linked', value: summary.linked, tone: 'text-forest' }, { label: 'New Drafts', value: summary.createdDraft, tone: 'text-blue' },
        { label: 'Unresolved', value: summary.unresolved, tone: summary.unresolved ? 'text-amber' : 'text-white' },
        { label: 'Duplicates', value: summary.duplicates }, { label: 'Conflicts', value: summary.conflicts, tone: summary.conflicts ? 'text-crimson' : 'text-white' },
      ]} />
      <div className="rounded-adm border border-adm-line bg-adm-surface px-3 py-3 text-xs text-white/50 sm:px-4">
        <p className="font-semibold text-white/75">{status.provider} · {status.sourceIdentity}</p>
        <p className="mt-1 break-all">Import recovery ID: <code>{status.importId}</code></p>
      </div>
    </div>
  )
}

function OrderImport({ shops, session, status, onStage, onResume, onAdvance, busy, offline }) {
  const selectedShops = shops.filter((shop) => session?.shopIds?.includes(shop.id))
  const [shopId, setShopId] = useState(selectedShops[0]?.id || '')
  const [file, setFile] = useState(null)
  const [sourceIdentity, setSourceIdentity] = useState('')
  const [reason, setReason] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [checkpointReason, setCheckpointReason] = useState('')
  const [fileError, setFileError] = useState('')
  useEffect(() => {
    if (!selectedShops.some((shop) => shop.id === shopId)) setShopId(selectedShops[0]?.id || '')
  }, [selectedShops, shopId])
  const chooseFile = (event) => {
    const next = event.target.files?.[0] || null
    if (next && (next.size > MAX_FILE_BYTES || !next.name.toLowerCase().endsWith('.csv'))) {
      setFile(null); setFileError('Use one customer-free CSV no larger than 512 KB.'); return
    }
    setFile(next); setFileError('')
    const shop = selectedShops.find((item) => item.id === shopId)
    if (next && shop && !sourceIdentity) setSourceIdentity(`${shop.shopCode}:${next.name}`)
  }
  const unresolved = (status?.facts || []).filter((fact) => fact.outcome === 'accepted' && fact.matchStatus !== 'linked').length
  const blocked = Number(status?.conflicts || 0) > 0 || unresolved > 0
  return (
    <section className="space-y-4">
      <SectionHeading title="4. Deduplicate and reconcile sales/order facts" description="Stage one customer-free order export for one exact shop. Exact duplicates remain evidence; changed payloads and unknown marketplace SKUs block progress." />
      <StateBanner tone="info">Order facts are reconciliation evidence only. Staging them does not reserve, deduct, create, or reconcile canonical inventory.</StateBanner>
      {!status ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <form className="grid gap-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:grid-cols-2 sm:p-4" onSubmit={(event) => { event.preventDefault(); onStage({ shopId, file, sourceIdentity, reason }) }}>
            <Field label="Exact order shop"><select className={fieldClass} value={shopId} onChange={(event) => setShopId(event.target.value)} disabled={busy}>{selectedShops.map((shop) => <option key={shop.id} value={shop.id}>{shop.displayName} · {shop.shopCode}</option>)}</select></Field>
            <Field label="Marketplace order CSV" hint="customer-free · 512 KB maximum" error={fileError}><input className={`${fieldClass} file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-blue`} type="file" accept=".csv,text/csv" onChange={chooseFile} disabled={busy} /></Field>
            <Field label="Order source identity" hint="stable across retries"><input className={fieldClass} value={sourceIdentity} onChange={(event) => setSourceIdentity(event.target.value)} maxLength={200} disabled={busy} /></Field>
            <Field label="Order import reason" hint="10–500 characters"><input className={fieldClass} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} disabled={busy} placeholder="Why is this exact shop order export part of the close?" /></Field>
            <button className={`${primaryButton} sm:col-span-2`} type="submit" disabled={busy || offline || !file || !shopId || !sourceIdentity.trim() || reason.trim().length < 10}><UploadIcon size={16} /> {busy ? 'Validating order facts…' : 'Validate & stage order facts'}</button>
          </form>
          <form className="rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); onResume(resumeId) }}>
            <p className="text-sm font-semibold text-white">Resume order evidence</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">Use the immutable import ID after a refresh or ambiguous timeout.</p>
            <Field label="Order import recovery ID"><input className={fieldClass} value={resumeId} onChange={(event) => setResumeId(event.target.value)} placeholder="00000000-0000-4000-8000-000000000000" /></Field>
            <button type="submit" className={`${secondaryButton} mt-3 w-full`} disabled={busy || offline || resumeId.length !== 36}><SyncIcon size={15} /> Resume order import</button>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          <MetricRail columns="sm:grid-cols-4" items={[
            { label: 'Accepted order lines', value: status.accepted || 0, tone: 'text-forest' },
            { label: 'Duplicates retained', value: status.duplicates || 0 },
            { label: 'Changed conflicts', value: status.conflicts || 0, tone: status.conflicts ? 'text-crimson' : 'text-white' },
            { label: 'Unknown product links', value: unresolved, tone: unresolved ? 'text-amber' : 'text-white' },
          ]} />
          <div className="rounded-adm border border-adm-line bg-adm-surface p-3 text-xs text-white/50 sm:p-4">
            <p className="font-semibold text-white/75">{status.sourceIdentity}</p>
            <p className="mt-1 break-all">Order import recovery ID: <code>{status.importId}</code></p>
            <p className="mt-2 font-semibold text-forest">Canonical inventory changed: No</p>
          </div>
          {blocked ? <StateBanner tone="warning">Resolve {status.conflicts || 0} changed-payload conflict{Number(status.conflicts) === 1 ? '' : 's'} and {unresolved} unknown product link{unresolved === 1 ? '' : 's'} before saving sales progress.</StateBanner> : (
            <form className="space-y-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); onAdvance(checkpointReason) }}>
              <Field label="Sales reconciliation reason" hint="10–500 characters"><textarea className={textareaClass} value={checkpointReason} onChange={(event) => setCheckpointReason(event.target.value)} maxLength={500} placeholder="What duplicate, conflict, product-link, period, and exact-shop evidence was reviewed?" /></Field>
              <button type="submit" className={`${primaryButton} w-full`} disabled={busy || offline || checkpointReason.trim().length < 10}>Save sales progress</button>
            </form>
          )}
        </div>
      )}
    </section>
  )
}

function FeeEstimate({ session, fees, onSave, onAdvance, busy, offline }) {
  const exactShops = fees?.shops || []
  const [shopId, setShopId] = useState(exactShops[0]?.id || '')
  const [policyVersion, setPolicyVersion] = useState('manual-reviewed-v1')
  const [commissionPercent, setCommissionPercent] = useState('6.00')
  const [paymentPercent, setPaymentPercent] = useState('2.00')
  const [withholdingPercent, setWithholdingPercent] = useState('1.00')
  const [fixedFeePesos, setFixedFeePesos] = useState('0.00')
  const [reason, setReason] = useState('')
  const [checkpointReason, setCheckpointReason] = useState('')
  useEffect(() => {
    if (!exactShops.some((shop) => shop.id === shopId)) setShopId(exactShops[0]?.id || '')
  }, [exactShops, shopId])
  const shopFacts = (fees?.orderFacts || []).filter((fact) => fact.shopId === shopId)
  const shopImports = (fees?.orderImports || []).filter((item) => item.shopId === shopId)
  const blockedFacts = shopFacts.filter((fact) => fact.outcome === 'conflict' || (fact.outcome === 'accepted' && fact.matchStatus !== 'linked')).length
  const basisPoints = (value) => {
    const text = String(value).trim()
    if (!/^(?:0|[1-9]\d?)(?:\.\d{1,2})?$/.test(text)) throw new Error('MARKETPLACE_FEE_POLICY_INVALID')
    return Math.round(Number(text) * 100)
  }
  const fixedMinor = () => {
    const text = String(fixedFeePesos).trim()
    if (!/^(?:0|[1-9]\d{0,4})(?:\.\d{1,2})?$/.test(text)) throw new Error('MARKETPLACE_FEE_POLICY_INVALID')
    return Math.round(Number(text) * 100)
  }
  const preview = useMemo(() => {
    try {
      return calculateMarketplaceFeeEstimate({
        shopId, currency: 'PHP', policyVersion,
        commissionBasisPoints: basisPoints(commissionPercent),
        paymentBasisPoints: basisPoints(paymentPercent),
        withholdingBasisPoints: basisPoints(withholdingPercent),
        fixedFeeMinorPerOrder: fixedMinor(), orderFacts: shopFacts,
      })
    } catch { return null }
  }, [shopId, policyVersion, commissionPercent, paymentPercent, withholdingPercent, fixedFeePesos, shopFacts])
  const latestByShop = new Map((fees?.latestEstimates || []).map((estimate) => [estimate.shopId, estimate]))
  const allEstimated = (session?.shopIds || []).length > 0 && session.shopIds.every((id) => latestByShop.has(id))
  const selectedLatest = latestByShop.get(shopId)
  const money = (minor) => `₱${(Number(minor || 0) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const submit = () => {
    if (!preview) return
    onSave({
      sessionId: session.sessionId, shopId, policyVersion: policyVersion.trim(), currency: 'PHP',
      commissionBasisPoints: preview.commissionBasisPoints,
      paymentBasisPoints: preview.paymentBasisPoints,
      withholdingBasisPoints: preview.withholdingBasisPoints,
      fixedFeeMinorPerOrder: preview.fixedFeeMinorPerOrder, reason: reason.trim(),
    })
  }
  return (
    <section className="space-y-4">
      <SectionHeading title="5. Calculate versioned marketplace fee estimates" description="Use one named, manually reviewed policy per exact shop. K2 derives the estimate only from accepted, linked, deduplicated order facts." />
      <StateBanner tone="warning">Estimated commission, payment charges, and withholding are planning evidence only. They are not provider settlement, official books, a tax filing, payout, or actual profit.</StateBanner>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form className="grid gap-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:grid-cols-2 sm:p-4" onSubmit={(event) => { event.preventDefault(); submit() }}>
          <Field label="Exact fee shop"><select className={fieldClass} value={shopId} onChange={(event) => setShopId(event.target.value)} disabled={busy}>{exactShops.map((shop) => <option key={shop.id} value={shop.id}>{shop.displayName} · {shop.shopCode}</option>)}</select></Field>
          <Field label="Policy version" hint="provider document or reviewed manual version"><input className={fieldClass} value={policyVersion} onChange={(event) => setPolicyVersion(event.target.value)} maxLength={120} disabled={busy} /></Field>
          <Field label="Commission rate" hint="percent"><input className={fieldClass} inputMode="decimal" value={commissionPercent} onChange={(event) => setCommissionPercent(event.target.value)} disabled={busy} /></Field>
          <Field label="Payment fee rate" hint="percent"><input className={fieldClass} inputMode="decimal" value={paymentPercent} onChange={(event) => setPaymentPercent(event.target.value)} disabled={busy} /></Field>
          <Field label="Withholding estimate" hint="percent"><input className={fieldClass} inputMode="decimal" value={withholdingPercent} onChange={(event) => setWithholdingPercent(event.target.value)} disabled={busy} /></Field>
          <Field label="Fixed fee per order" hint="PHP"><input className={fieldClass} inputMode="decimal" value={fixedFeePesos} onChange={(event) => setFixedFeePesos(event.target.value)} disabled={busy} /></Field>
          <Field label="Estimate reason" hint="10–500 characters"><textarea className={textareaClass} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Name the fee source and review performed." /></Field>
          <button className={`${primaryButton} self-end`} type="submit" disabled={busy || offline || !preview || shopImports.length === 0 || blockedFacts > 0 || reason.trim().length < 10}>{selectedLatest ? 'Save new estimate version' : 'Save estimate version 1'}</button>
        </form>
        <div className="space-y-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4">
          <p className="text-sm font-semibold text-white">Derived preview</p>
          {shopImports.length === 0 ? <StateBanner tone="warning">Stage and review an order export for this exact shop. A header-only export is valid evidence of zero sales.</StateBanner> : blockedFacts > 0 ? <StateBanner tone="warning">Resolve {blockedFacts} conflict or unknown product link before estimating fees.</StateBanner> : preview ? <>
            <MetricRail columns="grid-cols-2" items={[
              { label: 'Accepted lines', value: preview.acceptedLines }, { label: 'Accepted orders', value: preview.acceptedOrders },
              { label: 'Gross facts', value: money(preview.grossMinor) }, { label: 'Estimated fees', value: money(preview.estimatedFeeMinor), tone: 'text-amber' },
              { label: 'Estimated net', value: money(preview.estimatedNetMinor), tone: 'text-blue' }, { label: 'Excluded rows', value: preview.excludedLines },
            ]} />
            <p className="text-xs leading-relaxed text-white/45">Calculated in integer centavos. Duplicate rows are excluded; changed conflicts and unresolved product links block saving.</p>
          </> : <StateBanner tone="warning">Review the policy version and rates. Percentages allow up to two decimal places and must total less than 100%.</StateBanner>}
        </div>
      </div>
      <div className="divide-y divide-adm-line overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
        {exactShops.map((shop) => { const estimate = latestByShop.get(shop.id); return <div key={shop.id} className="flex min-h-[56px] items-center justify-between gap-3 px-3 py-2.5 sm:px-4"><div><p className="text-sm font-semibold text-white/75">{shop.displayName}</p><p className="mt-0.5 text-xs text-white/40">{estimate ? `${estimate.policyVersion} · version ${estimate.estimateVersion} · ${money(estimate.estimatedFeeMinor)}` : 'No saved estimate'}</p></div><StatusPill tone={estimate ? 'success' : 'warning'}>{estimate ? 'Estimated' : 'Required'}</StatusPill></div> })}
      </div>
      {allEstimated && <form className="space-y-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); onAdvance(checkpointReason) }}><Field label="Fee checkpoint reason" hint="10–500 characters"><textarea className={textareaClass} value={checkpointReason} onChange={(event) => setCheckpointReason(event.target.value)} maxLength={500} placeholder="Confirm every exact shop has a reviewed estimate version." /></Field><button className={`${primaryButton} w-full`} type="submit" disabled={busy || offline || checkpointReason.trim().length < 10}>Save fee progress</button></form>}
    </section>
  )
}

function StockCount({ session, stock, onReview, onAdvance, busy, offline }) {
  const items = useMemo(() => buildOwnerCloseStockReview(stock), [stock])
  const [productId, setProductId] = useState(items[0]?.productId || '')
  const [counts, setCounts] = useState({})
  const [reason, setReason] = useState('')
  const [checkpointReason, setCheckpointReason] = useState('')
  useEffect(() => {
    if (!items.some((item) => item.productId === productId)) setProductId(items[0]?.productId || '')
  }, [items, productId])
  const item = items.find((entry) => entry.productId === productId)
  useEffect(() => {
    if (!item) return
    setCounts(Object.fromEntries(item.lots.map((lot) => [lot.id, String(lot.quantity)])))
    setReason('')
  }, [item?.productId, stock?.asOf])
  const physicalCount = item?.lots.reduce((sum, lot) => sum + (Number.isSafeInteger(Number(counts[lot.id])) ? Number(counts[lot.id]) : 0), 0) || 0
  const discrepancy = physicalCount - Number(item?.canonicalPhysical || 0)
  const savedByProduct = new Map((stock?.reviews || []).map((review) => [review.productId, review]))
  const allReviewed = items.length > 0 && items.every((entry) => savedByProduct.has(entry.productId))
  const submitReview = async () => {
    if (!item) return
    try {
      const reviewPayload = {
        sessionId: session.sessionId, productId: item.productId,
        expectedCanonicalBefore: item.canonicalPhysical, physicalCount,
        reason: reason.trim(),
      }
      const reconciliationPayload = discrepancy === 0 ? null : buildLotReconciliationPayload({
        sku: item.sku, lots: item.lots, physicalCounts: counts, reason: reason.trim(),
      })
      await onReview({ reviewPayload, reconciliationPayload })
    } catch (error) {
      await onReview({ localError: error?.message })
    }
  }
  if (!items.length) return <section className="space-y-3"><SectionHeading title="6. Compare expected stock with physical and canonical stock" description="No product aliases are ready for count review." /><StateBanner tone="warning">Resolve and link at least one exact marketplace product before counting. K2 will not invent a zero-stock product set.</StateBanner></section>
  return (
    <section className="space-y-4">
      <SectionHeading title="6. Compare expected stock with physical and canonical stock" description="Count one exact canonical lot at a time. Marketplace observations and accepted sales remain context; neither is silently converted into physical inventory." />
      <StateBanner tone="info">Marketplace-reported availability is observation only. Canonical lot quantity is the system expectation; the physical count is what you actually find.</StateBanner>
      <Field label="Product to count"><select className={fieldClass} value={productId} onChange={(event) => setProductId(event.target.value)} disabled={busy}>{items.map((entry) => <option key={entry.productId} value={entry.productId}>{entry.sku} · {entry.name}</option>)}</select></Field>
      {item && <>
        <MetricRail columns="sm:grid-cols-5" items={[
          { label: 'Canonical physical', value: item.canonicalPhysical },
          { label: 'Reserved', value: item.canonicalReserved },
          { label: 'Canonical sellable', value: item.canonicalSellable },
          { label: 'Shop-reported total', value: item.marketplaceReportedTotal, tone: 'text-blue' },
          { label: 'Accepted sales units', value: item.acceptedSalesUnits },
        ]} />
        <div className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
          <div className="border-b border-adm-line px-3 py-3 sm:px-4"><p className="text-sm font-semibold text-white">7. Record reasoned discrepancies through controlled reconciliation</p><p className="mt-1 text-xs leading-relaxed text-white/45">Every changed quantity is sent as the complete exact-lot set to the existing reservation-safe lot command. New or unidentified lots must use the full Inventory lot editor.</p></div>
          {item.lots.length ? item.lots.map((lot) => <div key={lot.id} className="grid gap-3 border-b border-adm-line px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-end sm:px-4"><div><p className="text-sm font-semibold text-white">{lot.batchCode || 'Unlabelled batch'} · {lot.boxCode || 'Unlabelled box'}</p><p className="mt-1 text-xs text-white/45">{lot.hub || 'No hub'} · {lot.custodian || 'No custodian'} · reserved {lot.reservedQuantity} · {lot.status}</p></div><Field label="Physical lot count"><input className={fieldClass} type="number" inputMode="numeric" min={lot.reservedQuantity} max="1000000" value={counts[lot.id] ?? ''} onChange={(event) => setCounts((current) => ({ ...current, [lot.id]: event.target.value }))} disabled={busy || savedByProduct.has(item.productId)} /></Field></div>) : <div className="px-3 py-4 sm:px-4"><StateBanner tone="warning">No canonical lots exist for this linked product. A zero count can be recorded; found stock needs identity, expiry, custody, and location in the full Inventory lot editor before this close can continue.</StateBanner></div>}
        </div>
        <MetricRail columns="grid-cols-3" items={[
          { label: 'Physical counted', value: physicalCount },
          { label: 'Before reconciliation', value: item.canonicalPhysical },
          { label: 'Discrepancy', value: discrepancy > 0 ? `+${discrepancy}` : discrepancy, tone: discrepancy ? 'text-amber' : 'text-forest' },
        ]} />
        {savedByProduct.has(item.productId) ? <StateBanner tone="success">Count review saved · {savedByProduct.get(item.productId).outcome} · version {savedByProduct.get(item.productId).version}</StateBanner> : <form className="space-y-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); submitReview() }}><Field label="Count and discrepancy reason" hint="10–500 characters"><textarea className={textareaClass} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder={discrepancy ? 'What exact lot evidence explains this change?' : 'How and where was this matching physical count verified?'} /></Field><button className={`${primaryButton} w-full`} type="submit" disabled={busy || offline || reason.trim().length < 10}>{discrepancy ? 'Reconcile exact lots & record review' : 'Record matching physical count'}</button></form>}
      </>}
      <div className="divide-y divide-adm-line overflow-hidden rounded-adm border border-adm-line bg-adm-surface">{items.map((entry) => { const review = savedByProduct.get(entry.productId); return <div key={entry.productId} className="flex min-h-[56px] items-center justify-between gap-3 px-3 py-2.5 sm:px-4"><div><p className="text-sm font-semibold text-white/75">{entry.sku} · {entry.name}</p><p className="mt-0.5 text-xs text-white/40">{review ? `${review.outcome} · discrepancy ${review.discrepancy}` : 'Physical count review required'}</p></div><StatusPill tone={review ? 'success' : 'warning'}>{review ? 'Reviewed' : 'Required'}</StatusPill></div> })}</div>
      {allReviewed && <form className="space-y-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); onAdvance(checkpointReason) }}><Field label="Stock checkpoint reason" hint="10–500 characters"><textarea className={textareaClass} value={checkpointReason} onChange={(event) => setCheckpointReason(event.target.value)} maxLength={500} placeholder="Confirm every linked product has a durable physical count review." /></Field><button className={`${primaryButton} w-full`} type="submit" disabled={busy || offline || checkpointReason.trim().length < 10}>Save count progress</button></form>}
    </section>
  )
}

function CoverageReview({ session, coverage, onOverride, onAdvance, busy, offline }) {
  const rows = coverage?.rows || []
  const [selectedKey, setSelectedKey] = useState(rows[0] ? `${rows[0].productId}:${rows[0].shopId}` : '')
  const [action, setAction] = useState('include')
  const [priority, setPriority] = useState('')
  const [reason, setReason] = useState('')
  const [checkpointReason, setCheckpointReason] = useState('')
  useEffect(() => {
    if (!rows.some((row) => `${row.productId}:${row.shopId}` === selectedKey)) setSelectedKey(rows[0] ? `${rows[0].productId}:${rows[0].shopId}` : '')
  }, [rows, selectedKey])
  const selected = rows.find((row) => `${row.productId}:${row.shopId}` === selectedKey)
  useEffect(() => {
    setAction(selected?.overrideAction || 'include')
    setPriority(selected?.overridePriority ? String(selected.overridePriority) : '')
    setReason(selected?.overrideReason || '')
  }, [selectedKey, selected?.overrideAction, selected?.overridePriority, selected?.overrideReason])
  const tones = { covered: 'success', thin: 'warning', skipped: 'neutral', out: 'danger', needs_review: 'warning' }
  const labels = { covered: 'Covered', thin: 'Thin', skipped: 'Skipped', out: 'Out', needs_review: 'Needs review' }
  const alerts = coverage?.alerts || {}
  const submit = () => onOverride({
    sessionId: session.sessionId, productId: selected.productId, shopId: selected.shopId,
    action, priority: priority ? Number(priority) : null, reason: reason.trim(),
  })
  return (
    <section className="space-y-4">
      <SectionHeading title="8. Review flexible per-shop coverage and low/zero warnings" description={`Target ${coverage?.targetPerShop || 2} eligible units per individual shop. Scarcity ranks verified sales unless the owner sets a reasoned priority, thin, or skip decision.`} />
      <StateBanner tone="info">Proposal only. Provider write: No. Custody transfer: No. Actual movement still requires exact-lot transfer, approval, and receiver acceptance.</StateBanner>
      {Number(alerts.criticalMasterZero || 0) > 0 && <StateBanner tone="danger">Critical: {alerts.criticalMasterZero} product{alerts.criticalMasterZero === 1 ? '' : 's'} have zero canonical eligible Master Inventory.</StateBanner>}
      <MetricRail columns="sm:grid-cols-5" items={[
        { label: 'Shop reported out', value: alerts.zero || 0, tone: alerts.zero ? 'text-crimson' : 'text-white' },
        { label: 'Shop reported thin', value: alerts.low || 0, tone: alerts.low ? 'text-amber' : 'text-white' },
        { label: 'Needs review', value: alerts.needsReview || 0, tone: alerts.needsReview ? 'text-amber' : 'text-white' },
        { label: 'Target shortfalls', value: alerts.allocationShortfall || 0, tone: alerts.allocationShortfall ? 'text-amber' : 'text-white' },
        { label: 'Exact shops affected', value: alerts.exactShopsAffected || 0 },
      ]} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="divide-y divide-adm-line overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
          {rows.map((row) => <button type="button" key={`${row.productId}:${row.shopId}`} onClick={() => setSelectedKey(`${row.productId}:${row.shopId}`)} className={`flex min-h-[68px] w-full items-center justify-between gap-3 px-3 py-3 text-left sm:px-4 ${selectedKey === `${row.productId}:${row.shopId}` ? 'bg-blue/10' : 'hover:bg-white/[0.025]'}`}><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{row.sku} · {row.shopName}</p><p className="mt-1 text-xs text-white/45">Reported {row.reportedQuantity ?? 'unavailable'} · proposed {row.proposedAvailability} · verified sales {row.verifiedRecentSales} · canonical eligible {row.canonicalEligibleQuantity}</p></div><StatusPill tone={tones[row.status]}>{labels[row.status]}</StatusPill></button>)}
        </div>
        {selected && <form className="space-y-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); submit() }}><p className="text-sm font-semibold text-white">Owner override · {selected.shopName}</p><fieldset className="space-y-2"><legend className="text-xs font-semibold text-white/60">Decision</legend>{[['include', 'Include / prioritize'], ['thin', 'Thin to one'], ['skip', 'Skip this shop']].map(([value, label]) => <label key={value} className="flex min-h-[52px] items-center gap-2 rounded-adm-sm border border-adm-line px-2"><input className="h-11 w-11 shrink-0 accent-blue" type="radio" name="coverage-action" value={value} checked={action === value} onChange={() => setAction(value)} /><span className="text-sm text-white/75">{label}</span></label>)}</fieldset><Field label="Priority" hint="optional · 1 first, 50 last"><input className={fieldClass} type="number" inputMode="numeric" min="1" max="50" value={priority} onChange={(event) => setPriority(event.target.value)} /></Field><Field label="Override reason" hint="10–500 characters"><textarea className={textareaClass} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Why should this exact shop be prioritized, thinned, or skipped?" /></Field><button className={`${primaryButton} w-full`} type="submit" disabled={busy || offline || reason.trim().length < 10 || (priority && (Number(priority) < 1 || Number(priority) > 50))}>Save coverage override</button></form>}
      </div>
      <form className="space-y-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); onAdvance(checkpointReason) }}><Field label="Coverage checkpoint reason" hint="10–500 characters"><textarea className={textareaClass} value={checkpointReason} onChange={(event) => setCheckpointReason(event.target.value)} maxLength={500} placeholder="Confirm exact-shop states, target shortfalls, critical zeros, and owner overrides were reviewed." /></Field><button className={`${primaryButton} w-full`} type="submit" disabled={busy || offline || checkpointReason.trim().length < 10}>Save coverage progress</button></form>
    </section>
  )
}

function PasabuyBoxing({ session, pasabuy, onReview, onAdvance, busy, offline }) {
  const requests = pasabuy?.requests || []
  const reviews = new Map((pasabuy?.reviews || []).map((review) => [review.requestId, review]))
  const [requestId, setRequestId] = useState(requests.find((request) => !reviews.has(request.id))?.id || requests[0]?.id || '')
  const [readiness, setReadiness] = useState('ready')
  const [reason, setReason] = useState('')
  const [checkpointReason, setCheckpointReason] = useState('')
  const selected = requests.find((request) => request.id === requestId)
  useEffect(() => {
    if (!requests.some((request) => request.id === requestId)) setRequestId(requests.find((request) => !reviews.has(request.id))?.id || requests[0]?.id || '')
  }, [requestId, requests, reviews])
  useEffect(() => {
    const saved = selected ? reviews.get(selected.id) : null
    setReadiness(saved?.readiness || 'ready')
    setReason(saved?.reason || '')
  }, [selected?.id, pasabuy?.reviews])
  const allReviewed = requests.every((request) => reviews.has(request.id))
  const tones = { ready: 'success', not_ready: 'warning', not_applicable: 'neutral' }
  const labels = { ready: 'Ready', not_ready: 'Not ready', not_applicable: 'Not applicable' }
  return (
    <section className="space-y-4">
      <SectionHeading title="9. Check customer-minimized Pasabuy boxing readiness" description="Review only the public request reference, item, quantity, and operational state needed for boxing. Customer identity stays in the canonical Pasabuy workspace." />
      <StateBanner tone="info">Readiness only. Canonical Pasabuy status changed: No. Continue any quote, payment, or request-state work in the existing Pasabuy Manager.</StateBanner>
      {requests.length === 0 ? <EmptyState title="No open Pasabuy requests in this close period" description="The server returned an explicit customer-minimized zero-result checkpoint; no boxing review rows are required." icon={CheckIcon} /> : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="divide-y divide-adm-line overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
            {requests.map((request) => { const review = reviews.get(request.id); return <button type="button" key={request.id} onClick={() => setRequestId(request.id)} className={`flex min-h-[68px] w-full items-center justify-between gap-3 px-3 py-3 text-left sm:px-4 ${requestId === request.id ? 'bg-blue/10' : 'hover:bg-white/[0.025]'}`}><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{request.publicReference} · {request.itemTitle}</p><p className="mt-1 text-xs text-white/45">Quantity {request.quantity} · canonical state {String(request.status).replaceAll('_', ' ')}</p></div><StatusPill tone={review ? tones[review.readiness] : 'warning'}>{review ? labels[review.readiness] : 'Review'}</StatusPill></button> })}
          </div>
          {selected && <form className="space-y-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); onReview({ sessionId: session.sessionId, requestId: selected.id, readiness, reason: reason.trim() }) }}><p className="text-sm font-semibold text-white">Boxing check · {selected.publicReference}</p><fieldset className="space-y-2"><legend className="text-xs font-semibold text-white/60">Readiness</legend>{[['ready', 'Ready to box'], ['not_ready', 'Not ready'], ['not_applicable', 'Not applicable']].map(([value, label]) => <label key={value} className="flex min-h-[52px] items-center gap-2 rounded-adm-sm border border-adm-line px-2"><input className="h-11 w-11 shrink-0 accent-blue" type="radio" name="pasabuy-readiness" value={value} checked={readiness === value} onChange={() => setReadiness(value)} /><span className="text-sm text-white/75">{label}</span></label>)}</fieldset><Field label="Boxing readiness reason" hint="10–500 characters"><textarea className={textareaClass} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="What physical or workflow evidence supports this readiness?" /></Field><button className={`${primaryButton} w-full`} type="submit" disabled={busy || offline || reason.trim().length < 10}>Save readiness review</button></form>}
        </div>
      )}
      {allReviewed && <form className="space-y-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); onAdvance(checkpointReason) }}><Field label="Pasabuy checkpoint reason" hint="10–500 characters"><textarea className={textareaClass} value={checkpointReason} onChange={(event) => setCheckpointReason(event.target.value)} maxLength={500} placeholder="Confirm every open request was reviewed, or that the server returned none." /></Field><button className={`${primaryButton} w-full`} type="submit" disabled={busy || offline || checkpointReason.trim().length < 10}>Save Pasabuy progress</button></form>}
    </section>
  )
}

function BookkeepingHandoff({ session, handoff, onComplete, busy, offline }) {
  const [reason, setReason] = useState('')
  const summary = handoff?.summary || {}
  const shops = summary.shops || []
  const stock = summary.stock || {}
  const pasabuy = summary.pasabuy || {}
  const blockers = handoff?.blockers || []
  const completed = session?.status === 'completed' || Boolean(handoff?.handoff)
  const totals = shops.reduce((result, shop) => ({
    gross: result.gross + Number(shop.grossMinor || 0),
    fees: result.fees + Number(shop.estimatedFeeMinor || 0),
    net: result.net + Number(shop.estimatedNetMinor || 0),
  }), { gross: 0, fees: 0, net: 0 })
  const peso = (minor) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(minor || 0) / 100)
  const downloadCsv = () => {
    const csv = buildOwnerCloseBookkeepingCsv(handoff)
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = `k2-owner-close-handoff-${handoff.periodEnd}.csv`; link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <section className="space-y-4">
      <SectionHeading title="10. Prepare the customer-free bookkeeping handoff" description="The server derives one fixed-schema operational extract from the latest reviewed exact-shop imports, fee estimates, physical counts, coverage decisions, and Pasabuy readiness." />
      <StateBanner tone="warning">Estimate-only operational handoff. It is not official books, a tax filing, provider payout settlement, or actual profit.</StateBanner>
      {blockers.length > 0 && <div className="rounded-adm border border-crimson/30 bg-crimson/5 p-3 sm:p-4"><p className="text-sm font-semibold text-crimson">Close blockers</p><ul className="mt-2 space-y-1 text-xs text-white/65">{blockers.map((blocker) => <li key={blocker.code}>{String(blocker.code).replaceAll('_', ' ')} · {blocker.count}</li>)}</ul></div>}
      <MetricRail columns="sm:grid-cols-3" items={[
        { label: 'Estimated gross', value: peso(totals.gross) },
        { label: 'Estimated fees', value: peso(totals.fees), tone: 'text-amber' },
        { label: 'Estimated net', value: peso(totals.net), tone: 'text-forest' },
      ]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-adm border border-adm-line bg-adm-surface p-3 text-xs text-white/55 sm:p-4"><p className="text-sm font-semibold text-white">Inventory checkpoint</p><p className="mt-2">Reviewed {stock.reviewedProducts || 0} of {stock.linkedProducts || 0} linked products · physical {stock.totalPhysicalCount || 0} · net discrepancy {stock.netDiscrepancy || 0}.</p></div>
        <div className="rounded-adm border border-adm-line bg-adm-surface p-3 text-xs text-white/55 sm:p-4"><p className="text-sm font-semibold text-white">Pasabuy checkpoint</p><p className="mt-2">Reviewed {pasabuy.reviewedRequests || 0} of {pasabuy.openRequests || 0} open requests · ready {pasabuy.ready || 0} · not ready {pasabuy.notReady || 0} · not applicable {pasabuy.notApplicable || 0}.</p></div>
      </div>
      <div className="divide-y divide-adm-line overflow-hidden rounded-adm border border-adm-line bg-adm-surface">{shops.map((shop) => <div key={shop.shopId} className="px-3 py-3 sm:px-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-white">{shop.displayName}</p><StatusPill tone={shop.conflictLines || shop.unresolvedLines ? 'danger' : 'success'}>{shop.conflictLines || shop.unresolvedLines ? 'Blocked' : 'Reviewed'}</StatusPill></div><p className="mt-1 text-xs text-white/45">Accepted {shop.acceptedLines} · duplicates {shop.duplicateLines} · conflicts {shop.conflictLines} · unresolved {shop.unresolvedLines} · fee policy {shop.feePolicyVersion}</p></div>)}</div>
      <button type="button" className={`${secondaryButton} w-full`} onClick={downloadCsv} disabled={!handoff?.customerMinimized}>Download customer-free CSV</button>
      {completed ? <StateBanner tone="success">Close completed with durable handoff evidence{handoff?.handoff?.artifactId ? ` · artifact ${handoff.handoff.artifactId}` : ''}.</StateBanner> : handoff?.readyToClose ? <form className="space-y-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); onComplete({ sessionId: session.sessionId, expectedSessionVersion: session.version, reason: reason.trim() }) }}><Field label="Completion reason" hint="10–500 characters"><textarea className={textareaClass} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Confirm the customer-free extract and every prerequisite were reviewed." /></Field><button className={`${primaryButton} w-full`} type="submit" disabled={busy || offline || reason.trim().length < 10}>Complete close & seal handoff</button></form> : null}
    </section>
  )
}

function ProductDecision({ row, busy, offline, onDecide }) {
  const [decision, setDecision] = useState('')
  const [productId, setProductId] = useState('')
  const [reason, setReason] = useState('')
  const [draft, setDraft] = useState({ name: '', barcode: '', description: '', size: '', packageType: '', subcategory: '' })
  useEffect(() => {
    setDecision(''); setProductId(''); setReason('')
    setDraft({ name: row?.title || '', barcode: '', description: '', size: row?.source?.size || '', packageType: '', subcategory: '' })
  }, [row?.id])
  if (!row) return null
  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const canSubmit = reason.trim().length >= 10 && (
    (decision === 'link_existing' && productId)
    || (decision === 'create_new_draft' && draft.name.trim())
    || decision === 'leave_unresolved'
  )
  return (
    <section className="space-y-4">
      <SectionHeading title="3. Make one human product decision" description="SKU, barcode, and normalized name produce suggestions only. Variant conflicts cannot be approved." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(360px,1.2fr)]">
        <div className="rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><p className="text-xs text-white/45">Row {row.rowNumber} · {row.externalItemId}</p><h3 className="mt-1 text-base font-semibold text-white">{row.title}</h3></div>
            <StatusPill tone="warning">Decision required</StatusPill>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div><dt className="text-white/40">Marketplace SKU</dt><dd className="mt-0.5 break-all text-white/75">{row.marketplaceSku || 'Unavailable'}</dd></div>
            <div><dt className="text-white/40">Reported quantity</dt><dd className="mt-0.5 font-mono text-white/75">{row.reportedQuantity}</dd></div>
            <div><dt className="text-white/40">Listing state</dt><dd className="mt-0.5 text-white/75">{row.listingStatus}</dd></div>
            <div><dt className="text-white/40">Observed</dt><dd className="mt-0.5 text-white/75">{row.observedAt ? new Date(row.observedAt).toLocaleString() : 'Unavailable'}</dd></div>
          </dl>
          <p className="mt-4 rounded-adm-sm border border-amber/25 bg-amber/10 p-3 text-xs leading-relaxed text-amber">A match changes product identity only after approval. It never turns the reported quantity into physical stock.</p>
        </div>
        <form className="space-y-4 rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); onDecide({ decision, productId, draft, reason }) }}>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-white">Decision</legend>
            {[
              ['link_existing', 'Link existing', 'Use one eligible stored suggestion.'],
              ['create_new_draft', 'Create new Draft', 'K2 assigns the SKU on the server; the product stays unpublished.'],
              ['leave_unresolved', 'Leave unresolved', 'Keep the source evidence without creating an alias.'],
            ].map(([value, label, detail]) => (
              <label key={value} className={`flex min-h-[52px] cursor-pointer items-start gap-3 rounded-adm-sm border p-3 ${decision === value ? 'border-blue/60 bg-blue/10' : 'border-adm-line bg-white/[0.02]'}`}>
                <input type="radio" name="marketplace-decision" className="mt-0.5 h-5 w-5 accent-blue" checked={decision === value} onChange={() => setDecision(value)} />
                <span><span className="block text-sm font-semibold text-white">{label}</span><span className="mt-0.5 block text-xs text-white/45">{detail}</span></span>
              </label>
            ))}
          </fieldset>
          {decision === 'link_existing' && (
            <fieldset className="space-y-2"><legend className="text-sm font-semibold text-white">Eligible product suggestion</legend>
              {(row.suggestions || []).length ? row.suggestions.map((suggestion) => (
                <label key={suggestion.productId} className={`flex min-h-[52px] items-start gap-3 rounded-adm-sm border p-3 ${suggestion.eligible && !suggestion.variantConflict ? 'cursor-pointer border-adm-line' : 'cursor-not-allowed border-crimson/25 bg-crimson/5'}`}>
                  <input type="radio" name="product-suggestion" className="mt-0.5 h-5 w-5 accent-blue" disabled={!suggestion.eligible || suggestion.variantConflict} checked={productId === suggestion.productId} onChange={() => setProductId(suggestion.productId)} />
                  <span className="min-w-0"><span className="block text-sm font-semibold text-white">{suggestion.sku} · {suggestion.name}</span><span className="mt-0.5 block text-xs text-white/45">Evidence: {(suggestion.reasons || []).join(', ') || 'Unavailable'}{suggestion.variantConflict ? ' · Variant conflict — cannot link' : ''}</span></span>
                </label>
              )) : <StateBanner tone="warning">No eligible suggestion exists. Create a reviewed Draft or leave this row unresolved.</StateBanner>}
            </fieldset>
          )}
          {decision === 'create_new_draft' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Reviewed product name"><input className={fieldClass} value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} maxLength={140} /></Field>
              <Field label="Barcode" hint="optional"><input className={fieldClass} value={draft.barcode} onChange={(event) => updateDraft('barcode', event.target.value)} maxLength={64} inputMode="numeric" /></Field>
              <Field label="Size" hint="optional"><input className={fieldClass} value={draft.size} onChange={(event) => updateDraft('size', event.target.value)} maxLength={120} /></Field>
              <Field label="Package type" hint="optional"><input className={fieldClass} value={draft.packageType} onChange={(event) => updateDraft('packageType', event.target.value)} maxLength={120} /></Field>
              <Field label="Subcategory" hint="optional"><input className={fieldClass} value={draft.subcategory} onChange={(event) => updateDraft('subcategory', event.target.value)} maxLength={120} /></Field>
              <Field label="Description" hint="optional"><input className={fieldClass} value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} maxLength={4000} /></Field>
            </div>
          )}
          <Field label="Decision reason" hint="10–500 characters"><textarea className={textareaClass} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="What evidence did you review, and why is this outcome correct?" /></Field>
          <button className={`${primaryButton} w-full`} type="submit" disabled={busy || offline || !canSubmit}>{busy ? 'Recording decision…' : decision === 'link_existing' ? 'Approve link' : decision === 'create_new_draft' ? 'Create reviewed Draft' : 'Keep unresolved'}</button>
        </form>
      </div>
    </section>
  )
}

export default function OwnerCountClose() {
  const secure = adminBffEnabled()
  const dates = useMemo(manilaDateParts, [])
  const [shops, setShops] = useState([])
  const [session, setSession] = useState(null)
  const [selectedShopIds, setSelectedShopIds] = useState([])
  const [periodStart, setPeriodStart] = useState(dates.monthStart)
  const [periodEnd, setPeriodEnd] = useState(dates.today)
  const [sessionReason, setSessionReason] = useState('')
  const [resumeSessionId, setResumeSessionId] = useState('')
  const [importStatus, setImportStatus] = useState(null)
  const [orderStatus, setOrderStatus] = useState(null)
  const [feeStatus, setFeeStatus] = useState(null)
  const [stockStatus, setStockStatus] = useState(null)
  const [coverageStatus, setCoverageStatus] = useState(null)
  const [pasabuyStatus, setPasabuyStatus] = useState(null)
  const [bookkeepingStatus, setBookkeepingStatus] = useState(null)
  const [matchReason, setMatchReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  const [stageRetry, setStageRetry] = useState(null)
  const [decisionRetry, setDecisionRetry] = useState(null)
  const [orderRetry, setOrderRetry] = useState(null)
  const [feeRetry, setFeeRetry] = useState(null)
  const [stockRetry, setStockRetry] = useState(null)
  const [coverageRetry, setCoverageRetry] = useState(null)
  const [pasabuyRetry, setPasabuyRetry] = useState(null)
  const [bookkeepingRetry, setBookkeepingRetry] = useState(null)

  const loadWorkspace = useCallback(async (sessionId, signal) => {
    if (!secure) { setLoading(false); return }
    setLoading(true)
    const response = await getOwnerCloseWorkspaceBff(sessionId, signal)
    if (response.aborted) { setLoading(false); return }
    if (!response.ok) setError(response.error || 'Owner Count & Close could not be loaded. Try again.')
    else {
      setShops(response.shops || [])
      if (response.session) {
        setSession(response.session); setSelectedShopIds(response.session.shopIds || [])
        setPeriodStart(response.session.periodStart); setPeriodEnd(response.session.periodEnd)
      }
      setError('')
    }
    setLoading(false)
  }, [secure])

  const loadOrderImport = useCallback(async (importId, signal) => {
    if (!importId) return
    setBusy(true); setError('')
    const response = await getMarketplaceOrderStatusBff(importId, signal)
    if (response.aborted) { setBusy(false); return }
    if (!response.ok) setError(response.error || 'The staged order import could not be loaded. Try again.')
    else setOrderStatus(response.status)
    setBusy(false)
  }, [])

  const loadFees = useCallback(async (sessionId, signal) => {
    if (!sessionId) return
    setBusy(true); setError('')
    const response = await getOwnerCloseFeesBff(sessionId, signal)
    if (response.aborted) { setBusy(false); return }
    if (!response.ok) setError(response.error || 'Marketplace fee evidence could not be loaded. Try again.')
    else setFeeStatus(response.fees)
    setBusy(false)
  }, [])

  const loadStock = useCallback(async (sessionId, signal) => {
    if (!sessionId) return
    setBusy(true); setError('')
    const response = await getOwnerCloseStockBff(sessionId, signal)
    if (response.aborted) { setBusy(false); return }
    if (!response.ok) setError(response.error || 'Canonical lots and marketplace observations could not be loaded. Try again.')
    else setStockStatus(response.stock)
    setBusy(false)
  }, [])

  const loadCoverage = useCallback(async (sessionId, signal) => {
    if (!sessionId) return
    setBusy(true); setError('')
    const response = await getOwnerCloseCoverageBff(sessionId, signal)
    if (response.aborted) { setBusy(false); return }
    if (!response.ok) setError(response.error || 'The exact-shop coverage proposal could not be loaded. Try again.')
    else setCoverageStatus(response.coverage)
    setBusy(false)
  }, [])

  const loadPasabuy = useCallback(async (sessionId, signal) => {
    if (!sessionId) return
    setBusy(true); setError('')
    const response = await getOwnerClosePasabuyBff(sessionId, signal)
    if (response.aborted) { setBusy(false); return }
    if (!response.ok) setError(response.error || 'Customer-minimized Pasabuy boxing evidence could not be loaded. Try again.')
    else setPasabuyStatus(response.pasabuy)
    setBusy(false)
  }, [])

  const loadBookkeeping = useCallback(async (sessionId, signal) => {
    if (!sessionId) return
    setBusy(true); setError('')
    const response = await getOwnerCloseBookkeepingHandoffBff(sessionId, signal)
    if (response.aborted) { setBusy(false); return }
    if (!response.ok) setError(response.error || 'The customer-free bookkeeping handoff could not be derived. Try again.')
    else setBookkeepingStatus(response.handoff)
    setBusy(false)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadWorkspace('', controller.signal)
    const online = () => setOffline(false)
    const offlineNow = () => setOffline(true)
    window.addEventListener('online', online); window.addEventListener('offline', offlineNow)
    return () => { controller.abort(); window.removeEventListener('online', online); window.removeEventListener('offline', offlineNow) }
  }, [loadWorkspace])

  useEffect(() => {
    if (!session?.latestOrderImportId || orderStatus?.importId === session.latestOrderImportId) return undefined
    const controller = new AbortController()
    loadOrderImport(session.latestOrderImportId, controller.signal)
    return () => controller.abort()
  }, [loadOrderImport, orderStatus?.importId, session?.latestOrderImportId])

  useEffect(() => {
    const feeIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === 'fee_estimates')
    const stepIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === session?.currentStep)
    if (!session?.sessionId || stepIndex < feeIndex) return undefined
    const controller = new AbortController()
    loadFees(session.sessionId, controller.signal)
    return () => controller.abort()
  }, [loadFees, session?.currentStep, session?.sessionId])

  useEffect(() => {
    const stockIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === 'stock_count')
    const stepIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === session?.currentStep)
    if (!session?.sessionId || stepIndex < stockIndex) return undefined
    const controller = new AbortController()
    loadStock(session.sessionId, controller.signal)
    return () => controller.abort()
  }, [loadStock, session?.currentStep, session?.sessionId])

  useEffect(() => {
    const coverageIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === 'coverage_review')
    const stepIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === session?.currentStep)
    if (!session?.sessionId || stepIndex < coverageIndex) return undefined
    const controller = new AbortController()
    loadCoverage(session.sessionId, controller.signal)
    return () => controller.abort()
  }, [loadCoverage, session?.currentStep, session?.sessionId])

  useEffect(() => {
    const pasabuyIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === 'pasabuy_boxing')
    const stepIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === session?.currentStep)
    if (!session?.sessionId || stepIndex < pasabuyIndex) return undefined
    const controller = new AbortController()
    loadPasabuy(session.sessionId, controller.signal)
    return () => controller.abort()
  }, [loadPasabuy, session?.currentStep, session?.sessionId])

  useEffect(() => {
    const handoffIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === 'bookkeeping_handoff')
    const stepIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === session?.currentStep)
    if (!session?.sessionId || stepIndex < handoffIndex) return undefined
    const controller = new AbortController()
    loadBookkeeping(session.sessionId, controller.signal)
    return () => controller.abort()
  }, [loadBookkeeping, session?.currentStep, session?.sessionId])

  const saveAtStep = async (currentStep, reason = sessionReason) => {
    setBusy(true); setError('')
    try {
      const draft = buildOwnerCloseSessionDraft({
        sessionId: session?.sessionId || crypto.randomUUID(), periodStart, periodEnd,
        shopIds: selectedShopIds, currentStep, expectedVersion: session?.version || 1,
      })
      const response = await saveOwnerCloseSessionBff(draft, reason)
      if (!response.ok) setError(response.error || 'The close session could not be saved. Try again.')
      else { setSession(response.session); if (reason === sessionReason) setSessionReason(''); return true }
    } catch {
      setError('Review the period, exact shops, and save reason before continuing.')
    } finally { setBusy(false) }
    return false
  }

  const loadImport = async (importId) => {
    setBusy(true); setError('')
    const response = await getMarketplaceSnapshotStatusBff(importId)
    if (!response.ok) setError(response.error || 'The staged import could not be loaded. Try again.')
    else setImportStatus(response.status)
    setBusy(false)
  }

  const runStage = async (attempt) => {
    setBusy(true); setError(''); setStageRetry(attempt)
    const response = await stageMarketplaceSnapshotBff(attempt.payload, attempt.idempotencyKey)
    if (!response.ok) setError(response.error || 'The snapshot could not be staged. Try again with the same file.')
    else { setStageRetry(null); await loadImport(response.result.importId) }
    setBusy(false)
  }

  const stageSnapshot = async ({ shopId, file, sourceIdentity, reason }) => {
    if (!file) return
    const shop = shops.find((item) => item.id === shopId)
    if (!shop || !session?.shopIds?.includes(shopId)) { setError('Choose one exact shop saved in this close session.'); return }
    const csvText = await file.text()
    if (!csvText.trim() || new TextEncoder().encode(csvText).byteLength > MAX_FILE_BYTES) { setError('Choose one non-empty CSV no larger than 512 KB.'); return }
    await runStage({ idempotencyKey: crypto.randomUUID(), payload: {
      importId: crypto.randomUUID(), provider: shop.channelCode, shopId,
      sourceIdentity: sourceIdentity.trim(), periodStart: session.periodStart,
      periodEnd: session.periodEnd, reason: reason.trim(), csvText,
    } })
  }

  const runDecision = async (attempt) => {
    setBusy(true); setError(''); setDecisionRetry(attempt)
    const response = await decideMarketplaceSnapshotRowBff(attempt.payload, attempt.idempotencyKey)
    if (!response.ok) setError(response.error || 'The product decision could not be recorded. Try again.')
    else { setDecisionRetry(null); await loadImport(importStatus.importId) }
    setBusy(false)
  }

  const decideRow = async ({ decision, productId, draft, reason }) => {
    const row = nextPendingMarketplaceRow(importStatus?.rows)
    if (!row) return
    const payload = { importId: importStatus.importId, rowId: row.id, decision, reason: reason.trim() }
    if (decision === 'link_existing') payload.productId = productId
    if (decision === 'create_new_draft') payload.reviewedProduct = {
      name: draft.name.trim(), barcode: draft.barcode.trim() || null,
      description: draft.description.trim() || null, size: draft.size.trim() || null,
      packageType: draft.packageType.trim() || null, subcategory: draft.subcategory.trim() || null,
    }
    await runDecision({ idempotencyKey: crypto.randomUUID(), payload })
  }

  const runOrderStage = async (attempt) => {
    setBusy(true); setError(''); setOrderRetry(attempt)
    const response = await stageMarketplaceOrdersBff(attempt.payload, attempt.idempotencyKey)
    if (!response.ok) setError(response.error || 'The marketplace order facts could not be staged. Keep the file and try again.')
    else { setOrderRetry(null); await loadOrderImport(response.result.importId) }
    setBusy(false)
  }

  const stageOrders = async ({ shopId, file, sourceIdentity, reason }) => {
    if (!file) return
    if (!session?.shopIds?.includes(shopId)) { setError('Choose one exact shop saved in this close session.'); return }
    const csvText = await file.text()
    if (!csvText.trim() || new TextEncoder().encode(csvText).byteLength > MAX_FILE_BYTES) { setError('Choose one non-empty order CSV no larger than 512 KB.'); return }
    await runOrderStage({ idempotencyKey: crypto.randomUUID(), payload: {
      importId: crypto.randomUUID(), sessionId: session.sessionId, shopId,
      sourceIdentity: sourceIdentity.trim(), reason: reason.trim(), csvText,
    } })
  }

  const runFeeSave = async (attempt) => {
    setBusy(true); setError(''); setFeeRetry(attempt)
    const response = await saveOwnerCloseFeeEstimateBff(attempt.payload, attempt.idempotencyKey)
    if (!response.ok) setError(response.error || 'The marketplace fee estimate could not be saved. Review the exact-shop facts and policy.')
    else { setFeeRetry(null); await loadFees(session.sessionId) }
    setBusy(false)
  }

  const saveFeeEstimate = async (payload) => runFeeSave({ idempotencyKey: crypto.randomUUID(), payload })

  const runStockReview = async (attempt) => {
    if (attempt.localError) {
      setError(attempt.localError === 'OWNER_CLOSE_RESERVED_COUNT_CONFLICT'
        ? 'A physical count cannot be lower than reserved units. Investigate the reservation before reconciling.'
        : 'Review every exact-lot count and enter a specific reason before continuing.')
      return false
    }
    setBusy(true); setError(''); setStockRetry(attempt)
    if (attempt.reconciliationPayload) {
      const reconciled = await reconcileLotsBff(attempt.reconciliationPayload, attempt.lotKey)
      if (!reconciled.ok) {
        setError(reconciled.error || 'The existing canonical lot reconciliation could not be recorded safely.')
        setBusy(false); return false
      }
    }
    const reviewed = await saveOwnerCloseStockReviewBff(attempt.reviewPayload, attempt.reviewKey)
    if (!reviewed.ok) {
      setError(reviewed.error || 'The durable stock count review could not be recorded. Retry the same protected operation.')
      setBusy(false); return false
    }
    setStockRetry(null)
    await loadStock(session.sessionId)
    setBusy(false); return true
  }

  const reviewStock = (value) => runStockReview(value.localError ? value : {
    ...value, lotKey: crypto.randomUUID(), reviewKey: crypto.randomUUID(),
  })

  const runCoverageOverride = async (attempt) => {
    setBusy(true); setError(''); setCoverageRetry(attempt)
    const response = await saveOwnerCloseCoverageOverrideBff(attempt.payload, attempt.idempotencyKey)
    if (!response.ok) setError(response.error || 'The exact-shop coverage override could not be saved. Try again.')
    else { setCoverageRetry(null); await loadCoverage(session.sessionId) }
    setBusy(false)
  }

  const saveCoverageOverride = (payload) => runCoverageOverride({ idempotencyKey: crypto.randomUUID(), payload })

  const runPasabuyReview = async (attempt) => {
    setBusy(true); setError(''); setPasabuyRetry(attempt)
    const response = await saveOwnerClosePasabuyReviewBff(attempt.payload, attempt.idempotencyKey)
    if (!response.ok) setError(response.error || 'The Pasabuy boxing readiness review could not be saved. Try again.')
    else { setPasabuyRetry(null); await loadPasabuy(session.sessionId) }
    setBusy(false)
  }

  const savePasabuyReview = (payload) => runPasabuyReview({ idempotencyKey: crypto.randomUUID(), payload })

  const runBookkeepingCompletion = async (attempt) => {
    setBusy(true); setError(''); setBookkeepingRetry(attempt)
    const response = await completeOwnerCloseBookkeepingHandoffBff(attempt.payload, attempt.idempotencyKey)
    if (!response.ok) setError(response.error || 'The bookkeeping handoff could not be sealed. Review every blocker and try again.')
    else {
      setBookkeepingRetry(null)
      setSession((current) => ({ ...current, status: response.result.status, version: response.result.sessionVersion }))
      await loadBookkeeping(session.sessionId)
    }
    setBusy(false)
  }

  const completeBookkeeping = (payload) => runBookkeepingCompletion({ idempotencyKey: crypto.randomUUID(), payload })

  const currentStep = session?.currentStep || 'source_selection'
  const currentStepIndex = Math.max(0, OWNER_CLOSE_STEPS.findIndex((step) => step.id === currentStep))
  const salesStepIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === 'sales_reconciliation')
  const feeStepIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === 'fee_estimates')
  const stockStepIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === 'stock_count')
  const coverageStepIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === 'coverage_review')
  const pasabuyStepIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === 'pasabuy_boxing')
  const bookkeepingStepIndex = OWNER_CLOSE_STEPS.findIndex((step) => step.id === 'bookkeeping_handoff')
  const pendingRow = nextPendingMarketplaceRow(importStatus?.rows)
  const summary = summarizeMarketplaceRows(importStatus?.rows)

  if (loading) return <div className="mx-auto max-w-[1600px] space-y-4" aria-label="Loading close workspace"><div className="h-24 animate-pulse rounded-adm border border-adm-line bg-adm-surface" /><div className="h-12 animate-pulse rounded-adm border border-adm-line bg-adm-surface" /><div className="h-80 animate-pulse rounded-adm border border-adm-line bg-adm-surface" /></div>

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-12">
      <WorkspaceIntro eyebrow="Owner operations" title="Owner Count & Close" description="Stage exact-shop exports, review product identity, then hand verified facts to the existing canonical sales, inventory, Pasabuy, and bookkeeping workflows." status={session ? `Saved · version ${session.version}` : 'Not started'} statusTone={session ? 'success' : 'neutral'} />
      <StepRail currentStep={currentStep} />
      {!secure && <StateBanner tone="warning">This workflow is prepared only for the secure Admin BFF. No import or close action is available in the legacy browser database path.</StateBanner>}
      {offline && <StateBanner tone="warning" role="alert">Offline. Saved evidence remains on the server, but imports and decisions are blocked until this device reconnects.</StateBanner>}
      {error && <StateBanner tone="danger" role="alert"><span>{error.includes('another session') ? 'This close session changed in another session. Refresh before saving again.' : error}</span><button type="button" className={`${secondaryButton} ml-3`} onClick={() => loadWorkspace(session?.sessionId || '')}>Try again</button></StateBanner>}
      {(stageRetry || decisionRetry || orderRetry || feeRetry || stockRetry || coverageRetry || pasabuyRetry || bookkeepingRetry) && error && <button type="button" className={secondaryButton} disabled={busy || offline} onClick={() => stageRetry ? runStage(stageRetry) : decisionRetry ? runDecision(decisionRetry) : orderRetry ? runOrderStage(orderRetry) : feeRetry ? runFeeSave(feeRetry) : stockRetry ? runStockReview(stockRetry) : coverageRetry ? runCoverageOverride(coverageRetry) : pasabuyRetry ? runPasabuyReview(pasabuyRetry) : runBookkeepingCompletion(bookkeepingRetry)}>Retry the same protected operation</button>}

      {secure && shops.length === 0 ? <EmptyState title="No marketplace shops are available" description="Apply the reviewed channel-shop foundation and add each exact seller account before starting a close." icon={AlertIcon} /> : secure && (
        <>
          {!session && (
            <form className="flex flex-col gap-2 rounded-adm border border-adm-line bg-adm-surface p-3 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); loadWorkspace(resumeSessionId) }}>
              <Field label="Resume close session" hint="optional recovery ID"><input className={fieldClass} value={resumeSessionId} onChange={(event) => setResumeSessionId(event.target.value)} placeholder="00000000-0000-4000-8000-000000000000" /></Field>
              <button type="submit" className={`${secondaryButton} shrink-0`} disabled={busy || offline || resumeSessionId.length !== 36}><SyncIcon size={15} /> Resume</button>
            </form>
          )}
          <SourceSetup shops={shops} session={session} selectedShopIds={selectedShopIds} setSelectedShopIds={setSelectedShopIds} periodStart={periodStart} setPeriodStart={setPeriodStart} periodEnd={periodEnd} setPeriodEnd={setPeriodEnd} reason={sessionReason} setReason={setSessionReason} busy={busy} offline={offline} onSave={() => saveAtStep(session ? currentStep : 'source_import')} />
          {session && <SnapshotImport shops={shops} session={session} importStatus={importStatus} onStage={stageSnapshot} onResumeImport={loadImport} busy={busy} offline={offline} />}
          {importStatus && pendingRow && <ProductDecision row={pendingRow} busy={busy} offline={offline} onDecide={decideRow} />}
          {importStatus && !pendingRow && (
            <section className="space-y-3"><SectionHeading title="Product review checkpoint" description="All accepted rows have an explicit human outcome. Duplicate and conflict evidence remains preserved." />
              <StateBanner tone={summary.conflicts ? 'warning' : 'success'}>{summary.conflicts ? `${summary.conflicts} changed-payload conflict row${summary.conflicts === 1 ? '' : 's'} still require source investigation. Product decisions are saved, but the close is not complete.` : 'Product decisions are saved. Continue only to the next canonical reconciliation boundary.'}</StateBanner>
              {currentStepIndex < salesStepIndex ? <div className="space-y-3 rounded-adm border border-adm-line bg-adm-surface p-3 sm:p-4"><Field label="Match checkpoint reason" hint="10–500 characters"><textarea className={textareaClass} value={matchReason} onChange={(event) => setMatchReason(event.target.value)} maxLength={500} /></Field><button type="button" className={`${primaryButton} w-full`} disabled={busy || offline || summary.conflicts > 0 || matchReason.trim().length < 10} onClick={() => saveAtStep('sales_reconciliation', matchReason.trim())}>Continue to sales reconciliation</button></div> : <StatusPill tone="success">Match checkpoint saved</StatusPill>}
            </section>
          )}
          {session && currentStepIndex >= salesStepIndex && <OrderImport shops={shops} session={session} status={orderStatus} onStage={stageOrders} onResume={loadOrderImport} onAdvance={(reason) => saveAtStep('fee_estimates', reason)} busy={busy} offline={offline} />}
          {session && currentStepIndex >= feeStepIndex && feeStatus && <FeeEstimate session={session} fees={feeStatus} onSave={saveFeeEstimate} onAdvance={(reason) => saveAtStep('stock_count', reason)} busy={busy} offline={offline} />}
          {session && currentStepIndex >= stockStepIndex && stockStatus && <StockCount session={session} stock={stockStatus} onReview={reviewStock} onAdvance={(reason) => saveAtStep('coverage_review', reason)} busy={busy} offline={offline} />}
          {session && currentStepIndex >= coverageStepIndex && coverageStatus && <CoverageReview session={session} coverage={coverageStatus} onOverride={saveCoverageOverride} onAdvance={(reason) => saveAtStep('pasabuy_boxing', reason)} busy={busy} offline={offline} />}
          {session && currentStepIndex >= pasabuyStepIndex && pasabuyStatus && <PasabuyBoxing session={session} pasabuy={pasabuyStatus} onReview={savePasabuyReview} onAdvance={(reason) => saveAtStep('bookkeeping_handoff', reason)} busy={busy} offline={offline} />}
          {session && currentStepIndex >= bookkeepingStepIndex && bookkeepingStatus && <BookkeepingHandoff session={session} handoff={bookkeepingStatus} onComplete={completeBookkeeping} busy={busy} offline={offline} />}
          {!importStatus && session && <EmptyState title="No staged import yet" description="Choose one saved exact shop and stage its bounded CSV. Existing inventory remains unchanged." icon={UploadIcon} />}
          {OWNER_CLOSE_STEPS.some((step) => !step.available) && <section className="space-y-3"><SectionHeading title="Remaining close handoffs" description="These steps stay visible without pretending they are integrated or complete." />
            <div className="divide-y divide-adm-line overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
              {OWNER_CLOSE_STEPS.filter((step) => !step.available).map((step) => <div key={step.id} className="flex min-h-[56px] items-center justify-between gap-3 px-3 py-2.5 sm:px-4"><div><p className="text-sm font-semibold text-white/75">{step.label}</p><p className="mt-0.5 text-xs text-white/40">Pending MAP-023/MAP-026 composition with the existing canonical tool.</p></div><StatusPill tone="warning">Not available</StatusPill></div>)}
            </div>
          </section>}
          <StateBanner tone="warning">Commission and tax remain estimates. This close is not official books, a tax filing, payout settlement, or actual profit.</StateBanner>
        </>
      )}
    </div>
  )
}
