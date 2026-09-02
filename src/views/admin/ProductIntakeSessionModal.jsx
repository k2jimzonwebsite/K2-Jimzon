import React, { useState, useEffect, useRef } from 'react'
import {
  AlertIcon,
  ArrowIcon,
  BarcodeIcon,
  BoxIcon,
  CameraIcon,
  CheckIcon,
  CopyIcon,
  ShieldIcon,
  SparkleIcon,
  SyncIcon,
  XIcon,
} from '../../components/ui/icons'
import {
  searchIdentityDuplicates,
  createOrResumeIntakeSession,
  saveIntakeSessionStep,
  uploadProductEvidence,
  retryProductEvidenceCleanup,
  listPackingConsignments,
  createProductDraftServer,
  createFirstInventoryServer,
  updateProductPublicationServer,
} from '../../services/productIntakeService'
import { PRODUCT_EVIDENCE_MAX_BYTES, PRODUCT_EVIDENCE_MIMES } from '../../lib/uploadValidation'
import { PRODUCT_RESEARCH_SCHEMA_VERSION, parseProductResearchPaste } from './productResearchContract'
import { buildProductJsonPrompt } from './productResearchPrompt'
import { buildResumedIntakeState, buildReviewedDraftState } from './productIntakeResume'
import { safeUiError } from '../../lib/safeUiError'
import { applyImageFallback } from '../../lib/imageFallback'
import { AdminDialog } from '../../components/ui/AdminDialog'
import { CANONICAL_CUSTODIANS, CANONICAL_HUBS } from '../../data/canonicalIdentities'

export default function ProductIntakeSessionModal({ isOpen, onClose, onProductCreated, onExistingProduct }) {
  const closeButtonRef = useRef(null)
  const errorRef = useRef(null)
  const copiedPromptTimerRef = useRef(null)
  const previewUrlsRef = useRef(new Map())
  const [step, setStep] = useState(1)
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [resumeNotice, setResumeNotice] = useState('')
  const [operationError, setOperationError] = useState('')
  const [evidenceCleanup, setEvidenceCleanup] = useState(null)
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)

  // Step 1 states
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [duplicateResult, setDuplicateResult] = useState(null)
  const [distinctVariantConfirmed, setDistinctVariantConfirmed] = useState(false)
  const [distinctVariantReason, setDistinctVariantReason] = useState('')

  // Step 2 states
  const [packagingImages, setPackagingImages] = useState({
    PRIMARY: null,
    BACK: null,
    BARCODE: null
  })
  const [evidenceUploading, setEvidenceUploading] = useState({})
  const [categoryType, setCategoryType] = useState('food') // food | beauty | household
  const [evidenceChecked, setEvidenceChecked] = useState({
    ingredients: false,
    allergens: false,
    storage: false,
    expiry: false
  })

  // Step 3 states
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  // Step 4 states
  const [jsonInput, setJsonInput] = useState('')
  const [parsedPayload, setParsedPayload] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [acceptedFields, setAcceptedFields] = useState({})

  // Step 5 states
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [createdProduct, setCreatedProduct] = useState(null)

  // Step 6 states (First Inventory)
  const [inventorySource, setInventorySource] = useState('flight') // flight | receipt | reconciliation
  const [consignmentId, setConsignmentId] = useState('')
  const [boxCode, setBoxCode] = useState('')
  const [inventoryReason, setInventoryReason] = useState('')
  const [ownerCode, setOwnerCode] = useState('K2')
  const [packingConsignments, setPackingConsignments] = useState([])
  const [batchCode, setBatchCode] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [isNonExpiry, setIsNonExpiry] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [hubLocation, setHubLocation] = useState(CANONICAL_HUBS[0].id)
  const [custodian, setCustodian] = useState(CANONICAL_CUSTODIANS[0].id)
  const [unitCost, setUnitCost] = useState(0)
  const [inventorySaved, setInventorySaved] = useState(false)
  const [savingInventory, setSavingInventory] = useState(false)

  // Step 7 states (Publication Readiness)
  const [publicationStatus, setPublicationStatus] = useState('draft')
  const [publicationReason, setPublicationReason] = useState('')
  const [publishing, setPublishing] = useState(false)
  const availableCustodians = CANONICAL_CUSTODIANS.filter(
    (custodian) => custodian.hub_id === hubLocation,
  )

  // Initialize session on mount
  useEffect(() => {
    if (isOpen && isOnline) {
      initSession()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    const updateConnectionState = () => {
      const online = navigator.onLine
      setIsOnline((wasOnline) => {
        if (!wasOnline && online && !session) initSession()
        return online
      })
      if (online) {
        setOperationError((current) => current.startsWith('You are offline.') ? '' : current)
      }
    }
    updateConnectionState()
    window.addEventListener('online', updateConnectionState)
    window.addEventListener('offline', updateConnectionState)
    return () => {
      window.removeEventListener('online', updateConnectionState)
      window.removeEventListener('offline', updateConnectionState)
    }
  }, [isOpen, session])

  useEffect(() => {
    if (isOpen) return
    if (copiedPromptTimerRef.current) clearTimeout(copiedPromptTimerRef.current)
    setCopiedPrompt(false)
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrlsRef.current.clear()
    setPackagingImages((current) => Object.fromEntries(
      Object.entries(current).map(([slot, image]) => [slot, image ? { ...image, previewUrl: undefined } : image])
    ))
  }, [isOpen])

  useEffect(() => {
    if (operationError) errorRef.current?.focus()
  }, [operationError])

  useEffect(() => () => {
    if (copiedPromptTimerRef.current) clearTimeout(copiedPromptTimerRef.current)
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrlsRef.current.clear()
  }, [])

  useEffect(() => {
    if (!isOpen || !isOnline || step !== 6) return
    let active = true
    listPackingConsignments()
      .then((rows) => { if (active) setPackingConsignments(rows) })
      .catch((error) => { if (active) setOperationError(error.userMessage || 'Open Italy flights could not be loaded.') })
    return () => { active = false }
  }, [isOpen, isOnline, step])

  const initSession = async () => {
    setSessionLoading(true)
    setOperationError('')
    try {
      const active = await createOrResumeIntakeSession()
      const resumed = buildResumedIntakeState(active)
      setSession(active)
      setStep(resumed.step)
      setQuery(resumed.query)
      setPackagingImages({ PRIMARY: null, BACK: null, BARCODE: null, ...resumed.packagingImages })
      setEvidenceChecked({ ingredients: false, allergens: false, storage: false, expiry: false, ...resumed.evidenceChecked })
      setCategoryType(resumed.categoryType)
      setParsedPayload(resumed.parsedPayload)
      setJsonInput(resumed.jsonInput)
      setAcceptedFields(resumed.acceptedFields)
      setCreatedProduct(resumed.createdProduct)
      setInventorySaved(resumed.inventorySaved)
      setResumeNotice(resumed.resumeNotice)
      setDuplicateResult(null)
      setDistinctVariantConfirmed(false)
      setDistinctVariantReason('')
    } catch (error) {
      setOperationError(error.userMessage || 'Product intake could not be started. Nothing was changed.')
    } finally {
      setSessionLoading(false)
    }
  }

  if (!isOpen) return null

  // Handlers
  const handleSearchDuplicate = async () => {
    if (!query.trim()) return
    if (!isOnline) {
      setOperationError('You are offline. Reconnect before checking for duplicate products.')
      return
    }
    setSearching(true)
    setDuplicateResult(null)
    setOperationError('')
    try {
      const res = await searchIdentityDuplicates(query.trim())
      setDuplicateResult(res)
    } catch (error) {
      setOperationError(error.userMessage || 'The duplicate check could not be completed.')
    } finally {
      setSearching(false)
    }
  }

  const handleCopyPrompt = async () => {
    const prompt = buildProductJsonPrompt({
      barcode: query || 'N/A',
      productName: query || '',
      researchMode: 'complete',
    })
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedPrompt(true)
      if (copiedPromptTimerRef.current) clearTimeout(copiedPromptTimerRef.current)
      copiedPromptTimerRef.current = setTimeout(() => setCopiedPrompt(false), 3000)
    } catch {
      setOperationError('The prompt could not be copied. Check browser clipboard permission and try again.')
    }
  }

  const handleEvidenceFile = async (slot, file) => {
    setOperationError('')
    if (!file || sessionLoading) return
    if (evidenceCleanup) {
      setOperationError('Retry the queued private-file cleanup before selecting another photo.')
      return
    }
    if (!isOnline) {
      setOperationError('You are offline. The photo was not uploaded; reconnect and select it again.')
      return
    }
    if (!PRODUCT_EVIDENCE_MIMES.includes(file.type) || file.size > PRODUCT_EVIDENCE_MAX_BYTES) {
      setOperationError('Use a JPEG, PNG, or WebP image no larger than 4 MB.')
      return
    }
    const previewUrl = URL.createObjectURL(file)
    setEvidenceUploading((current) => ({ ...current, [slot]: true }))
    try {
      const result = await uploadProductEvidence(session, slot, file)
      setSession(result.session)
      const previousPreviewUrl = previewUrlsRef.current.get(slot)
      if (previousPreviewUrl) URL.revokeObjectURL(previousPreviewUrl)
      previewUrlsRef.current.set(slot, previewUrl)
      setPackagingImages((previous) => ({
        ...previous,
        [slot]: { ...result.evidence, previewUrl },
      }))
    } catch (error) {
      URL.revokeObjectURL(previewUrl)
      if (error.cleanupId) {
        setEvidenceCleanup({ cleanupId: error.cleanupId, retrying: false })
      }
      setOperationError(error.userMessage || 'The evidence photo was not uploaded.')
    } finally {
      setEvidenceUploading((current) => ({ ...current, [slot]: false }))
    }
  }

  const handleRetryEvidenceCleanup = async () => {
    if (!evidenceCleanup?.cleanupId || evidenceCleanup.retrying) return
    if (!isOnline) {
      setOperationError('You are offline. Reconnect before retrying private-file cleanup.')
      return
    }
    setOperationError('')
    setEvidenceCleanup((current) => ({ ...current, retrying: true }))
    try {
      const result = await retryProductEvidenceCleanup(evidenceCleanup.cleanupId)
      if (result.cleanupPending) {
        setEvidenceCleanup((current) => ({ ...current, retrying: false }))
        setOperationError('Private-file cleanup is still pending. Keep this intake open and try again.')
        return
      }
      setEvidenceCleanup(null)
    } catch (error) {
      setEvidenceCleanup((current) => ({ ...current, retrying: false }))
      setOperationError(error.userMessage || 'Private-file cleanup could not be completed. Try again.')
    }
  }

  const canAdvance = (() => {
    if (sessionLoading || !session?.id || evidenceCleanup) return false
    if (step === 1) {
      return duplicateResult?.matchType === 'none'
        || (duplicateResult?.matchType === 'ambiguous'
          && distinctVariantConfirmed
          && distinctVariantReason.trim().length >= 10)
    }
    if (step === 2) {
      return Object.values(packagingImages).every((image) => image?.upload_status === 'uploaded')
        && Object.values(evidenceChecked).every(Boolean)
    }
    if (step === 3) return true
    if (step === 4) return Boolean(parsedPayload) && Object.values(acceptedFields).some(Boolean)
    return false
  })()

  const handleNextStep = async () => {
    if (!canAdvance) return
    if (!isOnline) {
      setOperationError('You are offline. Reconnect before saving this intake step.')
      return
    }
    setOperationError('')
    try {
      if (step === 1) {
        const updated = await saveIntakeSessionStep(session, 'packaging_evidence', {
          barcode: query || null,
          scanned_identity: query,
          field_provenance: duplicateResult?.matchType === 'ambiguous'
            ? {
                duplicate_resolution: {
                  decision: 'confirmed_distinct_variant',
                  reason: distinctVariantReason.trim(),
                  candidate_ids: duplicateResult.candidates.map((candidate) => candidate.id),
                  decided_at: new Date().toISOString(),
                },
              }
            : {},
        })
        setSession(updated)
      } else if (step === 2) {
        const updated = await saveIntakeSessionStep(session, 'research_handoff', {
          evidence_checklist: evidenceChecked,
          category_type: categoryType,
        })
        setSession(updated)
      } else if (step === 3) {
        const updated = await saveIntakeSessionStep(session, 'field_review')
        setSession(updated)
      } else if (step === 4) {
        const review = buildReviewedDraftState(parsedPayload, acceptedFields)
        const updated = await saveIntakeSessionStep(session, 'draft_saved', review)
        setSession(updated)
        setParsedPayload(review.draft_payload)
        setJsonInput(JSON.stringify(review.draft_payload, null, 2))
      }
      setStep((current) => current + 1)
    } catch (error) {
      setOperationError(error.userMessage || 'This step was not saved. Your previous state is unchanged.')
    }
  }

  const handleParseJson = () => {
    setParseError(null)
    setParsedPayload(null)
    try {
      const res = parseProductResearchPaste(jsonInput)
      if (res.meta.schemaVersion !== PRODUCT_RESEARCH_SCHEMA_VERSION) {
        throw new Error(`This intake requires ${PRODUCT_RESEARCH_SCHEMA_VERSION}. Regenerate the product JSON with the current K2 Product Content instructions.`)
      }
      setParsedPayload(res)
      // Initialize accepted fields to all true
      const initialAccepted = {}
      if (res.product) {
        Object.keys(res.product).forEach(k => { initialAccepted[k] = true })
      }
      setAcceptedFields(initialAccepted)
    } catch {
      setParseError(safeUiError('PRODUCT_JSON_INVALID'))
    }
  }

  const handleSaveDraft = async () => {
    if (sessionLoading) return
    if (!session?.id || !parsedPayload) {
      setOperationError('Validate the PRODUCT_JSON in Step 4 before creating a Draft.')
      return
    }
    if (!isOnline) {
      setOperationError('You are offline. Reconnect before creating the server Product Draft.')
      return
    }
    setCreatingDraft(true)
    setOperationError('')
    try {
      const res = await createProductDraftServer(session)

      if (res.success) {
        setCreatedProduct(res.product)
        setSession(res.session)
        setStep(6)
      }
    } catch (error) {
      setOperationError(error.userMessage || 'The Product Draft was not created. Nothing was changed.')
    } finally {
      setCreatingDraft(false)
    }
  }

  const handleSaveFirstInventory = async () => {
    if (savingInventory || sessionLoading) return
    setOperationError('')
    if (!createdProduct && !session?.assigned_sku) {
      setOperationError('Product Draft must exist before creating inventory.')
      return
    }
    if (!isOnline) {
      setOperationError('You are offline. No inventory was recorded; reconnect and try again.')
      return
    }

    if (!quantity || quantity < 1) {
      setOperationError('Quantity must be at least 1.')
      return
    }

    if (!isNonExpiry && !expiryDate) {
      setOperationError('Specify an expiry date or confirm that the item is documented as non-expiry.')
      return
    }
    if (inventorySource === 'flight' && (!consignmentId.trim() || !boxCode.trim() || !batchCode.trim() || !expiryDate)) {
      setOperationError('Choose a flight, box, batch, and best-before date before adding the manifest line.')
      return
    }
    if (inventorySource === 'reconciliation' && (!boxCode.trim() || !batchCode.trim() || !inventoryReason.trim())) {
      setOperationError('Opening balance requires a box, batch, and written reconciliation reason.')
      return
    }
    setSavingInventory(true)
    try {
      const result = await createFirstInventoryServer(session, {
        source: inventorySource,
        consignmentId: consignmentId || null,
        boxCode: boxCode || null,
        batchCode: batchCode || null,
        quantity: Number(quantity),
        expiryDate: isNonExpiry ? null : expiryDate,
        isNonExpiry,
        hubLocation,
        custodian,
        unitCost: Number(unitCost),
        reason: inventoryReason || null,
        ownerCode: ownerCode || null,
      })
      setInventorySaved(true)
      setSession(result.session)
      setStep(7)
    } catch (error) {
      setOperationError(error.userMessage || 'Inventory was not recorded. No quantity was added.')
    } finally {
      setSavingInventory(false)
    }
  }

  const handleUpdatePublicationStatus = async (newStatus) => {
    if (sessionLoading) return
    if (publicationReason.trim().length < 10) {
      setOperationError('Add a specific publication reason of at least 10 characters before changing status.')
      return
    }
    if (!isOnline) {
      setOperationError('You are offline. Publication status was not changed.')
      return
    }
    setPublishing(true)
    setOperationError('')
    try {
      const result = await updateProductPublicationServer(session, newStatus, publicationReason.trim())
      setSession(result.session)
      setPublicationStatus(newStatus)
      if (onProductCreated) onProductCreated()
    } catch (error) {
      setOperationError(error.userMessage || 'Publication was not changed.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <AdminDialog onClose={onClose} closeDisabled={creatingDraft || savingInventory || publishing} initialFocusRef={closeButtonRef} labelledBy="product-intake-title" describedBy="product-intake-summary">
      <div
        className="relative w-full max-w-2xl bg-[#161922] border border-white/10 rounded-xl shadow-2xl text-white overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <BoxIcon className="w-5 h-5 text-amber-400" />
            <div>
              <h3 id="product-intake-title" className="text-sm font-semibold tracking-wide">Phone-First Product Intake</h3>
              <p id="product-intake-summary" className="text-xs text-white/50">Resumable session · server-controlled SKU</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close product intake"
            className="min-h-11 min-w-11 p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/20 text-xs overflow-x-auto">
          {[
            { num: 1, label: 'Identify' },
            { num: 2, label: 'Packaging' },
            { num: 3, label: 'ChatGPT' },
            { num: 4, label: 'Smart Paste' },
            { num: 5, label: 'Draft SKU' },
            { num: 6, label: 'Inventory' },
            { num: 7, label: 'Publish' }
          ].map(s => (
            <button
              type="button"
              key={s.num}
              onClick={() => s.num < step && setStep(s.num)}
              disabled={s.num >= step}
              aria-current={s.num === step ? 'step' : undefined}
              aria-label={`Step ${s.num}: ${s.label}`}
              className={`min-h-11 flex items-center gap-1 transition-colors shrink-0 disabled:cursor-default ${
                s.num === step
                  ? 'text-amber-400 font-semibold'
                  : s.num < step
                  ? 'text-emerald-400'
                  : 'text-white/30'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                s.num === step
                  ? 'bg-amber-400 text-black font-bold'
                  : s.num < step
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-white/5 text-white/40'
              }`}>
                {s.num < step ? <CheckIcon className="w-3 h-3" /> : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {sessionLoading && (
            <div role="status" aria-live="polite" className="rounded-lg border border-white/10 bg-white/5 p-3.5 text-sm text-white/70">
              Restoring saved server progress…
            </div>
          )}

          {!sessionLoading && resumeNotice && (
            <div role="status" aria-live="polite" className="rounded-lg border border-blue-400/25 bg-blue-400/10 p-3.5 text-sm text-blue-100">
              <strong className="text-blue-200">Intake resumed.</strong> {resumeNotice}
            </div>
          )}

          {operationError && (
            <div ref={errorRef} tabIndex={-1} role="alert" className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-200 rounded-lg text-sm focus:outline-none">
              <strong className="text-rose-300">Action not completed.</strong> {operationError}
            </div>
          )}

          {evidenceCleanup && (
            <section role="status" aria-live="polite" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3.5 text-sm text-amber-100">
              <div className="flex items-start gap-3">
                <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div>
                    <strong className="text-amber-200">Private-file cleanup required.</strong>
                    <p className="mt-1 text-amber-100/80">The unregistered private file is queued for cleanup.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetryEvidenceCleanup}
                    disabled={!isOnline || evidenceCleanup.retrying}
                    className="min-h-11 rounded-lg border border-amber-300/40 bg-amber-300 px-4 py-2 font-semibold text-black hover:bg-amber-200 disabled:cursor-wait disabled:opacity-50"
                  >
                    {evidenceCleanup.retrying ? 'Retrying cleanup…' : 'Retry file cleanup'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {!isOnline && (
            <div role="status" className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-100 rounded-lg text-sm">
              <strong>Offline.</strong> Review remains available, but uploads and server changes are paused until this device reconnects.
            </div>
          )}

          {/* STEP 1: IDENTIFY & DUPLICATE CHECK */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-medium">Step 1: Scan or Type Product Identity</h4>
                <p className="text-xs text-white/60">
                  Search barcode, SKU, or name candidate before creating a new SKU to prevent duplicates.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="product-intake-identity"
                    aria-label="Product barcode, SKU, or name"
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setDuplicateResult(null)
                      setDistinctVariantConfirmed(false)
                      setDistinctVariantReason('')
                    }}
                    placeholder="Scan barcode (e.g. 800123456789) or type name..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 text-white placeholder-white/30"
                  />
                  <BarcodeIcon className="absolute right-3 top-3 w-4 h-4 text-white/40" />
                </div>
                <button
                  type="button"
                  onClick={handleSearchDuplicate}
                  disabled={searching || sessionLoading || !session?.id || !query.trim()}
                  className="min-h-11 px-4 py-2.5 bg-amber-500 text-black font-medium text-sm rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {searching ? <SyncIcon className="w-4 h-4 animate-spin" /> : 'Check Duplicate'}
                </button>
              </div>

              {/* Duplicate Results */}
              {duplicateResult && (
                <div className="space-y-3">
                  {duplicateResult.matchType === 'exact' && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-amber-400">
                        <AlertIcon className="w-4 h-4" />
                        Exact Product Match Found: {duplicateResult.product.name} ({duplicateResult.product.sku})
                      </div>
                      <p>An exact match already exists in the Product Master. Do not create a duplicate SKU.</p>
                      <button
                        onClick={() => onExistingProduct?.(duplicateResult.product)}
                        className="min-h-11 px-3 py-2 bg-amber-400 text-black font-medium rounded-lg text-sm hover:bg-amber-300"
                      >
                        Open Existing Product & Add Inventory / Flight Box
                      </button>
                    </div>
                  )}

                  {duplicateResult.matchType === 'ambiguous' && (
                    <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-blue-400">
                        <AlertIcon className="w-4 h-4" />
                        Possible Variant Candidates Found:
                      </div>
                      <div className="space-y-1">
                        {duplicateResult.candidates.map(c => (
                          <div key={c.id} className="p-2 bg-black/40 rounded flex items-center justify-between">
                            <span>{c.name} ({c.sku}) — {c.brand}</span>
                            <span className="text-xs text-white/50">{c.category}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-white/60">Continue only when the physical package proves a distinct size, concentration, flavor, shade, formulation, or pack count.</p>
                      <textarea
                        aria-label="Distinct variant reason"
                        rows={2}
                        value={distinctVariantReason}
                        onChange={(event) => setDistinctVariantReason(event.target.value)}
                        placeholder="State the exact physical difference from the candidates."
                        className="w-full bg-black/30 border border-blue-400/25 rounded-lg p-2.5 text-white placeholder-white/35"
                      />
                      <label className="min-h-11 flex items-center gap-2 text-white/80">
                        <input
                          type="checkbox"
                          checked={distinctVariantConfirmed}
                          onChange={(event) => setDistinctVariantConfirmed(event.target.checked)}
                          className="accent-blue-400"
                        />
                        I checked the package and confirm this is a distinct sellable variant.
                      </label>
                    </div>
                  )}

                  {duplicateResult.matchType === 'none' && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                      <ShieldIcon className="w-4 h-4" />
                      Verified New Product Candidate. Safe to proceed with server SKU intake.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CAPTURE PACKAGING EVIDENCE */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-medium">Step 2: Capture Packaging Evidence</h4>
                <p className="text-xs text-white/60">
                  Upload or photograph front, back label, and barcode. Packaging photos are primary truth evidence.
                </p>
              </div>

              {/* Category Selector */}
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                {['food', 'beauty', 'household'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryType(cat)}
                    className={`min-h-11 px-3 py-2 rounded-lg border capitalize transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] ${
                      categoryType === cat
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-medium'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {cat} Category
                  </button>
                ))}
              </div>

              {/* Upload Slots */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { slot: 'PRIMARY', label: 'Front Package' },
                  { slot: 'BACK', label: 'Back / Ingredients' },
                  { slot: 'BARCODE', label: 'Barcode Label' }
                ].map(s => (
                  <div key={s.slot} className="p-3 bg-white/5 border border-white/10 rounded-lg text-center space-y-2">
                    <CameraIcon className="w-5 h-5 mx-auto text-amber-400/60" />
                    <div className="text-xs font-medium text-white/80">{s.label}</div>
                    {packagingImages[s.slot]?.previewUrl && (
                      <img
                        src={packagingImages[s.slot].previewUrl}
                        alt={`${s.label} preview`}
                        onError={applyImageFallback}
                        className="mx-auto h-20 w-16 rounded object-cover border border-white/10"
                      />
                    )}
                    <label className={`min-h-11 px-3 py-2 bg-white/10 text-xs rounded-lg hover:bg-white/20 text-amber-300 inline-flex items-center justify-center cursor-pointer ${evidenceUploading[s.slot] ? 'opacity-60 pointer-events-none' : ''}`}>
                      {evidenceUploading[s.slot]
                        ? 'Checking & uploading…'
                        : packagingImages[s.slot]?.upload_status === 'uploaded'
                          ? 'Verified · Replace'
                          : 'Capture / Select'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        aria-label={`${s.label} evidence photo`}
                        disabled={sessionLoading || Boolean(evidenceUploading[s.slot])}
                        onChange={(event) => handleEvidenceFile(s.slot, event.target.files?.[0])}
                        className="sr-only"
                      />
                    </label>
                  </div>
                ))}
              </div>

              {/* Evidence Checklist */}
              <div className="p-3 bg-black/30 border border-white/5 rounded-lg text-xs space-y-1.5">
                <div className="font-semibold text-white/80">Category Verification Requirements ({categoryType.toUpperCase()}):</div>
                <label className="flex items-center gap-2 text-white/70">
                  <input
                    type="checkbox"
                    checked={evidenceChecked.ingredients}
                    onChange={(e) => setEvidenceChecked(prev => ({ ...prev, ingredients: e.target.checked }))}
                    className="accent-amber-400"
                  />
                  Ingredients / Composition captured in back photo
                </label>
                <label className="flex items-center gap-2 text-white/70">
                  <input
                    type="checkbox"
                    checked={evidenceChecked.allergens}
                    onChange={(e) => setEvidenceChecked(prev => ({ ...prev, allergens: e.target.checked }))}
                    className="accent-amber-400"
                  />
                  Allergens / Warnings verified
                </label>
                <label className="flex items-center gap-2 text-white/70">
                  <input
                    type="checkbox"
                    checked={evidenceChecked.storage}
                    onChange={(e) => setEvidenceChecked(prev => ({ ...prev, storage: e.target.checked }))}
                    className="accent-amber-400"
                  />
                  Storage & Directions captured
                </label>
                <label className="flex items-center gap-2 text-white/70">
                  <input
                    type="checkbox"
                    checked={evidenceChecked.expiry}
                    onChange={(e) => setEvidenceChecked(prev => ({ ...prev, expiry: e.target.checked }))}
                    className="accent-amber-400"
                  />
                  Batch and expiry / non-expiry evidence checked
                </label>
                <p className="pt-1 text-white/50">
                  Each accepted photo is stored in the private intake-evidence bucket. It remains evidence only and is never published automatically.
                </p>
                <p className="text-white/50">If camera access is unavailable or denied, choose an existing package photo from this device.</p>
              </div>
            </div>
          )}

          {/* STEP 3: CHATGPT RESEARCH HANDOFF */}
          {step === 3 && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-base font-medium text-white">Step 3: ChatGPT Handoff Contract</h4>
                <p className="text-white/60">
                  Copy the versioned adaptive prompt for the private ChatGPT Project <strong className="text-amber-300">K2 Product Content</strong>.
                </p>
              </div>

              <div className="p-3 bg-black/40 border border-white/10 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-amber-400 text-xs">Contract: k2.product-content.v3</span>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="min-h-11 px-3 py-2 bg-amber-400 text-black font-semibold rounded text-xs flex items-center gap-1 hover:bg-amber-300"
                  >
                    <CopyIcon className="w-3.5 h-3.5" />
                    {copiedPrompt ? 'Copied to Clipboard!' : 'Copy Prompt'}
                  </button>
                </div>
                <p className="text-white/50 text-xs">
                  Paste this prompt into ChatGPT along with the packaging photos. Neither ChatGPT nor browser staff can set SKU, price, stock, expiry, or publication state.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: SMART PASTE & FIELD REVIEW */}
          {step === 4 && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-base font-medium text-white">Step 4: Smart Paste & Field Review</h4>
                <p className="text-white/60">
                  Paste the JSON output returned by ChatGPT. The system validates schema, highlights evidence, and displays a field diff.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="product-research-json" className="block text-white/70">Product research JSON</label>
                <textarea
                  id="product-research-json"
                  rows={5}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Paste PRODUCT_JSON object here..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 font-mono text-xs text-amber-200 focus:outline-none focus:border-amber-400 placeholder-white/30"
                />
                <button
                  type="button"
                  onClick={handleParseJson}
                  className="min-h-11 px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors"
                >
                  Validate & Review Fields
                </button>
              </div>

              {parseError && (
                <div role="alert" className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg">
                  <strong>Validation Error:</strong> {parseError}
                </div>
              )}

              {parsedPayload && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-emerald-300 font-semibold">
                    <span className="flex items-center gap-1.5"><CheckIcon className="h-4 w-4" /> Schema validated: {parsedPayload.meta.schemaVersion}</span>
                    <span className="text-xs text-white/50">Evidence Items: {parsedPayload.meta.evidenceCount}</span>
                  </div>
                  <div className="space-y-1 bg-black/40 p-2 rounded max-h-40 overflow-y-auto">
                    {Object.entries(parsedPayload.product).map(([key, val]) => (
                      <label key={key} className="flex items-center justify-between gap-3 text-xs min-h-8 cursor-pointer">
                        <span className="flex items-center gap-2 text-white/60 font-mono">
                          <input
                            type="checkbox"
                            checked={Boolean(acceptedFields[key])}
                            onChange={(event) => setAcceptedFields((current) => ({ ...current, [key]: event.target.checked }))}
                            className="accent-amber-400"
                          />
                          {key}:
                        </span>
                        <span className="text-amber-200 font-medium truncate max-w-[200px]">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val || 'null')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: SAVE SERVER DRAFT */}
          {step === 5 && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-base font-medium text-white">Step 5: Server-Assigned SKU Draft</h4>
                <p className="text-white/60">
                  The system will assign a stable internal SKU (e.g. <strong className="text-amber-300">K2-SKU-XXXXXX</strong>) and save the product as Draft.
                </p>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <SparkleIcon className="w-5 h-5" />
                  Ready to Create Server Product Draft
                </div>
                <p className="text-white/70">
                  Product Name: <strong className="text-white">{parsedPayload?.product?.name || query || 'New Product'}</strong>
                </p>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={sessionLoading || creatingDraft}
                  className="w-full min-h-11 py-3 bg-amber-400 text-black font-bold rounded-lg hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-60"
                >
                  {creatingDraft ? <SyncIcon className="w-4 h-4 animate-spin" /> : 'Assign SKU & Save Product Draft'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: CONTROLLED FIRST INVENTORY */}
          {step === 6 && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-base font-medium text-white">Step 6: Controlled First Inventory</h4>
                <p className="text-white/60">
                  Select the truthful source for the initial stock. Stock and expiry are NEVER written directly into product rows.
                </p>
              </div>

              {/* Source Selection */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { id: 'flight', label: 'Italy Flight / Box' },
                  { id: 'receipt', label: 'Supplier Receipt', disabled: true },
                  { id: 'reconciliation', label: 'Opening Balance' }
                ].map(src => (
                  <button
                    type="button"
                    key={src.id}
                    onClick={() => {
                      if (src.disabled) return
                      setInventorySource(src.id)
                      if (src.id === 'flight') setIsNonExpiry(false)
                    }}
                    disabled={src.disabled}
                    aria-describedby={src.disabled ? 'supplier-receipt-pending' : undefined}
                    className={`min-h-11 p-2.5 rounded-lg border text-center transition-colors ${
                      inventorySource === src.id
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-semibold'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    {src.label}{src.disabled ? ' · Pending' : ''}
                  </button>
                ))}
              </div>
              <p id="supplier-receipt-pending" className="text-white/50">
                Supplier receipt remains pending until the canonical purchasing and receiving workflow is activated.
              </p>

              {inventorySource === 'flight' && (
                <div className="space-y-1.5">
                  <label htmlFor="intake-consignment" className="text-white/70">Open Italy flight</label>
                  <select
                    id="intake-consignment"
                    value={consignmentId}
                    onChange={(event) => setConsignmentId(event.target.value)}
                    className="w-full min-h-11 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="" className="bg-black">Select a Packing Italy manifest</option>
                    {packingConsignments.map((consignment) => (
                      <option key={consignment.id} value={consignment.id} className="bg-black">
                        {consignment.manifest_code}{consignment.flight_number ? ` · ${consignment.flight_number}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-white/50">This adds an expected manifest line. On-hand stock is created only after independent Manila scanning and final receipt.</p>
                </div>
              )}

              {inventorySource === 'reconciliation' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-100">
                  Opening balance is an administrator-only correction for verified legacy stock. It requires MFA, owner, physical location, count, and a written reason.
                </div>
              )}

              {/* Inventory Fields */}
              <div className="grid grid-cols-1 gap-3 bg-black/30 p-3 rounded-lg border border-white/5 sm:grid-cols-2">
                <div>
                  <label htmlFor="intake-box-code" className="text-white/60">Box / Container Code</label>
                  <input
                    id="intake-box-code"
                    type="text"
                    value={boxCode}
                    onChange={(e) => setBoxCode(e.target.value)}
                    placeholder="e.g. BOX-MIL-004"
                    className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="intake-batch-code" className="text-white/60">Batch / Lot Code</label>
                  <input
                    id="intake-batch-code"
                    type="text"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    placeholder="e.g. BATCH-2026-08A"
                    className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                  />
                </div>

                <div>
                  <label htmlFor="intake-quantity" className="text-white/60">
                    {inventorySource === 'flight' ? 'Expected manifest quantity' : 'Verified physical quantity'}
                  </label>
                  <input
                    id="intake-quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                  />
                </div>

                <div>
                  <label htmlFor="intake-expiry" className="text-white/60">Best-before / expiry date</label>
                  <input
                    id="intake-expiry"
                    type="date"
                    disabled={isNonExpiry}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1 disabled:opacity-30"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-white/70">
                    <input
                      type="checkbox"
                      checked={isNonExpiry}
                      onChange={(e) => setIsNonExpiry(e.target.checked)}
                      className="accent-amber-400"
                    />
                    Documented Non-Expiry Item
                  </label>
                </div>

                {inventorySource === 'reconciliation' && (
                  <>
                    <div>
                      <label htmlFor="intake-owner" className="text-white/60">Inventory Owner</label>
                      <input
                        id="intake-owner"
                        type="text"
                        value={ownerCode}
                        onChange={(event) => setOwnerCode(event.target.value)}
                        className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="intake-unit-cost" className="text-white/60">Unit Cost (PHP)</label>
                      <input
                        id="intake-unit-cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={unitCost}
                        onChange={(event) => setUnitCost(Number(event.target.value))}
                        className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="intake-hub" className="text-white/60">Hub / Location</label>
                      <select
                        id="intake-hub"
                        value={hubLocation}
                        onChange={(event) => {
                          const nextHub = event.target.value
                          setHubLocation(nextHub)
                          const nextCustodian = CANONICAL_CUSTODIANS.find((item) => item.hub_id === nextHub)
                          setCustodian(nextCustodian?.id || '')
                        }}
                        className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                      >
                        {CANONICAL_HUBS.map((hub) => (
                          <option key={hub.id} value={hub.id} className="bg-black text-white">
                            {hub.name} · {hub.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="intake-custodian" className="text-white/60">Custodian</label>
                      <select
                        id="intake-custodian"
                        value={custodian}
                        onChange={(event) => setCustodian(event.target.value)}
                        className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                      >
                        {availableCustodians.map((item) => (
                          <option key={item.id} value={item.id} className="bg-black text-white">
                            {item.name} · {item.role}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="intake-reconciliation-reason" className="text-white/60">Reconciliation reason</label>
                      <textarea
                        id="intake-reconciliation-reason"
                        rows={3}
                        value={inventoryReason}
                        onChange={(event) => setInventoryReason(event.target.value)}
                        placeholder="Describe where the physical count came from and why this opening balance is authorized."
                        className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveFirstInventory}
                disabled={sessionLoading || savingInventory || !isOnline}
                className="w-full min-h-11 py-2.5 bg-emerald-500 text-black font-bold rounded-lg hover:bg-emerald-400 transition-colors disabled:cursor-wait disabled:opacity-60"
              >
                {savingInventory
                  ? <span className="flex items-center justify-center gap-2"><SyncIcon className="h-4 w-4 animate-spin" /> Recording…</span>
                  : inventorySource === 'flight' ? 'Add Expected Line to Italy Flight Manifest' : 'Record Authorized Opening Balance'}
              </button>
            </div>
          )}

          {/* STEP 7: PUBLICATION READINESS REVIEW */}
          {step === 7 && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-base font-medium text-white">Step 7: Publication Readiness Review</h4>
                <p className="text-white/60">
                  Review readiness checklist. Single publication status governs visibility.
                </p>
              </div>

              <div className="p-3 bg-black/40 border border-white/10 rounded-lg space-y-2">
                <div className="font-semibold text-white/80">Single Publication Status Truth:</div>
                <label className="block space-y-1.5 text-white/70">
                  <span>Publication reason</span>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={publicationReason}
                    onChange={(event) => setPublicationReason(event.target.value)}
                    placeholder="Describe the review evidence and why this status is correct."
                    className="w-full min-h-24 resize-y rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/45 focus:border-amber-400 focus:outline-none"
                  />
                  <span className="block text-xs text-white/50">Required audit note, minimum 10 characters.</span>
                </label>
                <label htmlFor="product-publication-status" className="block text-white/70">Publication status</label>
                <select
                  id="product-publication-status"
                  value={publicationStatus}
                  onChange={(e) => handleUpdatePublicationStatus(e.target.value)}
                  disabled={sessionLoading || publishing}
                  className="w-full min-h-11 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-amber-300 font-semibold disabled:cursor-wait disabled:opacity-60"
                >
                  <option value="draft" className="bg-black text-white">Draft (Internal Only)</option>
                  <option value="under_review" className="bg-black text-white">Under Review</option>
                  <option value="live" className="bg-black text-white">Live on Storefront (channels require separate readiness)</option>
                  <option value="unlisted" className="bg-black text-white">Unlisted</option>
                  <option value="discontinued" className="bg-black text-white">Discontinued</option>
                </select>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {inventorySaved
                      ? 'Product Draft and its first source record are saved.'
                      : 'Product Draft is saved; this session does not show a completed first-source record.'}
                    {' '}Server-assigned SKU: <strong>{createdProduct?.sku || session?.assigned_sku}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/5">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep(prev => Math.max(1, prev - 1))}
            className="min-h-11 px-3 py-2 bg-white/5 border border-white/10 text-white/70 rounded-lg text-xs hover:bg-white/10 disabled:opacity-30 transition-colors flex items-center gap-1"
          >
            <ArrowIcon className="w-3.5 h-3.5 rotate-180" /> Back
          </button>

          {step < 5 && (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={!canAdvance}
              className="min-h-11 px-4 py-2 bg-amber-400 text-black font-semibold rounded-lg text-sm hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              Next <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 7 && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 px-4 py-2 bg-emerald-400 text-black font-bold rounded-lg text-xs hover:bg-emerald-300 transition-colors"
            >
              Finish & Close
            </button>
          )}
        </div>

      </div>
      </AdminDialog>
    </div>
  )
}
