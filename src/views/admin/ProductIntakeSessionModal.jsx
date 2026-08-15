import React, { useState, useEffect } from 'react'
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
  listPackingConsignments,
  createProductDraftServer,
  createFirstInventoryServer,
  updateProductPublicationServer,
} from '../../services/productIntakeService'
import { PRODUCT_RESEARCH_SCHEMA_VERSION, parseProductResearchPaste } from './productResearchContract'
import { buildProductJsonPrompt } from './productResearchPrompt'

export default function ProductIntakeSessionModal({ isOpen, onClose, onProductCreated, onExistingProduct }) {
  const [step, setStep] = useState(1)
  const [session, setSession] = useState(null)
  const [operationError, setOperationError] = useState('')

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
  const [hubLocation, setHubLocation] = useState('Manila Central Hub')
  const [custodian, setCustodian] = useState('Warehouse Staff')
  const [unitCost, setUnitCost] = useState(0)
  const [inventorySaved, setInventorySaved] = useState(false)

  // Step 7 states (Publication Readiness)
  const [publicationStatus, setPublicationStatus] = useState('draft')
  const [publicationReason, setPublicationReason] = useState('')
  const [publishing, setPublishing] = useState(false)

  // Initialize session on mount
  useEffect(() => {
    if (isOpen && !session) {
      initSession()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || step !== 6) return
    let active = true
    listPackingConsignments()
      .then((rows) => { if (active) setPackingConsignments(rows) })
      .catch((error) => { if (active) setOperationError(error.userMessage || 'Open Italy flights could not be loaded.') })
    return () => { active = false }
  }, [isOpen, step])

  const initSession = async () => {
    setOperationError('')
    try {
      const active = await createOrResumeIntakeSession()
      setSession(active)
      if (active.product_id && active.assigned_sku) {
        setCreatedProduct({ id: active.product_id, sku: active.assigned_sku, status: 'draft' })
      }
      if (Array.isArray(active.packaging_images)) {
        setPackagingImages((current) => ({
          ...current,
          ...Object.fromEntries(active.packaging_images.map((image) => [image.slot, image])),
        }))
      }
      if (active.evidence_checklist) setEvidenceChecked((current) => ({ ...current, ...active.evidence_checklist }))
      if (active.category_type) setCategoryType(active.category_type)
      if (active.checklist_step === 'packaging_evidence') setStep(2)
      else if (active.checklist_step === 'research_handoff') setStep(3)
      else if (active.checklist_step === 'field_review') setStep(4)
      else if (active.checklist_step === 'draft_saved') setStep(5)
      else if (active.checklist_step === 'first_inventory') setStep(6)
      else if (active.checklist_step === 'publication_review') setStep(7)
      else setStep(1)
    } catch (error) {
      setOperationError(error.userMessage || 'Product intake could not be started. Nothing was changed.')
    }
  }

  if (!isOpen) return null

  // Handlers
  const handleSearchDuplicate = async () => {
    if (!query.trim()) return
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

  const handleCopyPrompt = () => {
    const prompt = buildProductJsonPrompt({
      barcode: query || 'N/A',
      productName: query || '',
      researchMode: 'complete',
    })
    navigator.clipboard.writeText(prompt)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 3000)
  }

  const handleEvidenceFile = async (slot, file) => {
    setOperationError('')
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
      setOperationError('Use a JPEG, PNG, or WebP image no larger than 10 MB.')
      return
    }
    const previewUrl = URL.createObjectURL(file)
    setEvidenceUploading((current) => ({ ...current, [slot]: true }))
    try {
      const result = await uploadProductEvidence(session, slot, file)
      setSession(result.session)
      setPackagingImages((previous) => ({
        ...previous,
        [slot]: { ...result.evidence, previewUrl },
      }))
    } catch (error) {
      URL.revokeObjectURL(previewUrl)
      setOperationError(error.userMessage || 'The evidence photo was not uploaded.')
    } finally {
      setEvidenceUploading((current) => ({ ...current, [slot]: false }))
    }
  }

  const canAdvance = (() => {
    if (!session?.id) return false
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
    } catch (err) {
      setParseError(err.message)
    }
  }

  const handleSaveDraft = async () => {
    if (!session?.id || !parsedPayload) {
      setOperationError('Validate the PRODUCT_JSON in Step 4 before creating a Draft.')
      return
    }
    setCreatingDraft(true)
    setOperationError('')
    try {
      const acceptedProduct = Object.fromEntries(
        Object.entries(parsedPayload.product).filter(([field]) => acceptedFields[field])
      )
      const fieldDecisions = Object.fromEntries(
        Object.keys(parsedPayload.product).map((field) => [field, acceptedFields[field] ? 'accepted' : 'rejected'])
      )
      const reviewedSession = await saveIntakeSessionStep(session, 'draft_saved', {
        barcode: query || session.barcode || null,
        draft_payload: { ...parsedPayload, product: acceptedProduct },
        field_decisions: fieldDecisions,
      })
      setSession(reviewedSession)
      const res = await createProductDraftServer(reviewedSession)

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
    setOperationError('')
    if (!createdProduct && !session?.assigned_sku) {
      setOperationError('Product Draft must exist before creating inventory.')
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
    }
  }

  const handleUpdatePublicationStatus = async (newStatus) => {
    if (publicationReason.trim().length < 10) {
      setOperationError('Add a specific publication reason of at least 10 characters before changing status.')
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
      <div className="relative w-full max-w-2xl bg-[#161922] border border-white/10 rounded-xl shadow-2xl text-white overflow-hidden my-auto max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <BoxIcon className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold tracking-wide">Phone-First Product Intake</h3>
              <p className="text-[11px] text-white/50">Resumable Session • Server-Controlled SKU</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
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
            <div
              key={s.num}
              onClick={() => s.num < step && setStep(s.num)}
              className={`flex items-center gap-1 cursor-pointer transition shrink-0 ${
                s.num === step
                  ? 'text-amber-400 font-semibold'
                  : s.num < step
                  ? 'text-emerald-400'
                  : 'text-white/30'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                s.num === step
                  ? 'bg-amber-400 text-black font-bold'
                  : s.num < step
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-white/5 text-white/40'
              }`}>
                {s.num < step ? <CheckIcon className="w-3 h-3" /> : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {operationError && (
            <div role="alert" className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-200 rounded-lg text-sm">
              <strong className="text-rose-300">Action not completed.</strong> {operationError}
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
                  onClick={handleSearchDuplicate}
                  disabled={searching || !query.trim()}
                  className="px-4 py-2.5 bg-amber-500 text-black font-medium text-sm rounded-lg hover:bg-amber-400 disabled:opacity-50 transition flex items-center gap-1.5"
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
                            <span className="text-[10px] text-white/50">{c.category}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-white/60">Continue only when the physical package proves a distinct size, concentration, flavor, shade, formulation, or pack count.</p>
                      <textarea
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
                    <div className="text-[11px] font-medium text-white/80">{s.label}</div>
                    {packagingImages[s.slot]?.previewUrl && (
                      <img
                        src={packagingImages[s.slot].previewUrl}
                        alt={`${s.label} preview`}
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
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        capture="environment"
                        disabled={Boolean(evidenceUploading[s.slot])}
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
                  <span className="font-mono text-amber-400 text-[11px]">Contract: k2.product-content.v3</span>
                  <button
                    onClick={handleCopyPrompt}
                    className="px-3 py-1 bg-amber-400 text-black font-semibold rounded text-xs flex items-center gap-1 hover:bg-amber-300"
                  >
                    <CopyIcon className="w-3.5 h-3.5" />
                    {copiedPrompt ? 'Copied to Clipboard!' : 'Copy Prompt'}
                  </button>
                </div>
                <p className="text-white/50 text-[11px]">
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
                <textarea
                  rows={5}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Paste PRODUCT_JSON object here..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 font-mono text-[11px] text-amber-200 focus:outline-none focus:border-amber-400 placeholder-white/30"
                />
                <button
                  onClick={handleParseJson}
                  className="px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition"
                >
                  Validate & Review Fields
                </button>
              </div>

              {parseError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg">
                  <strong>Validation Error:</strong> {parseError}
                </div>
              )}

              {parsedPayload && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-emerald-300 font-semibold">
                    <span>✓ Schema Validated: {parsedPayload.meta.schemaVersion}</span>
                    <span className="text-[10px] text-white/50">Evidence Items: {parsedPayload.meta.evidenceCount}</span>
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
                  onClick={handleSaveDraft}
                  disabled={creatingDraft}
                  className="w-full py-3 bg-amber-400 text-black font-bold rounded-lg hover:bg-amber-300 transition flex items-center justify-center gap-2"
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
                    key={src.id}
                    onClick={() => {
                      if (src.disabled) return
                      setInventorySource(src.id)
                      if (src.id === 'flight') setIsNonExpiry(false)
                    }}
                    disabled={src.disabled}
                    className={`p-2.5 rounded-lg border text-center transition ${
                      inventorySource === src.id
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-semibold'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    {src.label}{src.disabled ? ' · Pending' : ''}
                  </button>
                ))}
              </div>

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
              <div className="grid grid-cols-2 gap-3 bg-black/30 p-3 rounded-lg border border-white/5">
                <div>
                  <label className="text-white/60">Box / Container Code</label>
                  <input
                    type="text"
                    value={boxCode}
                    onChange={(e) => setBoxCode(e.target.value)}
                    placeholder="e.g. BOX-MIL-004"
                    className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-white/60">Batch / Lot Code</label>
                  <input
                    type="text"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    placeholder="e.g. BATCH-2026-08A"
                    className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-white/60">Quantity Received</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-white/60">Expiry Date</label>
                  <input
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
                      <label className="text-white/60">Inventory Owner</label>
                      <input
                        type="text"
                        value={ownerCode}
                        onChange={(event) => setOwnerCode(event.target.value)}
                        className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-white/60">Unit Cost (PHP)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={unitCost}
                        onChange={(event) => setUnitCost(Number(event.target.value))}
                        className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-white/60">Hub / Location</label>
                      <input
                        type="text"
                        value={hubLocation}
                        onChange={(event) => setHubLocation(event.target.value)}
                        className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-white/60">Custodian</label>
                      <input
                        type="text"
                        value={custodian}
                        onChange={(event) => setCustodian(event.target.value)}
                        className="w-full min-h-11 bg-white/5 border border-white/10 rounded px-2.5 py-2 text-white mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-white/60">Reconciliation reason</label>
                      <textarea
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
                onClick={handleSaveFirstInventory}
                className="w-full min-h-11 py-2.5 bg-emerald-500 text-black font-bold rounded-lg hover:bg-emerald-400 transition"
              >
                {inventorySource === 'flight' ? 'Add to Italy Flight Manifest' : 'Record Authorized Opening Balance'}
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
                <select
                  value={publicationStatus}
                  onChange={(e) => handleUpdatePublicationStatus(e.target.value)}
                  disabled={publishing}
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
                ✓ Product Intake & First Inventory Complete! SKU Assigned: <strong>{createdProduct?.sku || session?.assigned_sku}</strong>
              </div>
            </div>
          )}

        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/5">
          <button
            disabled={step === 1}
            onClick={() => setStep(prev => Math.max(1, prev - 1))}
            className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/70 rounded-lg text-xs hover:bg-white/10 disabled:opacity-30 transition flex items-center gap-1"
          >
            <ArrowIcon className="w-3.5 h-3.5 rotate-180" /> Back
          </button>

          {step < 5 && (
            <button
              onClick={handleNextStep}
              disabled={!canAdvance}
              className="min-h-11 px-4 py-2 bg-amber-400 text-black font-semibold rounded-lg text-sm hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              Next <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 7 && (
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-emerald-400 text-black font-bold rounded-lg text-xs hover:bg-emerald-300 transition"
            >
              Finish & Close
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
