import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  PRODUCT_RESEARCH_TEMPLATE,
  PRODUCT_RESEARCH_SCHEMA_VERSION,
  parseProductResearchPaste,
} from '../src/views/admin/productResearchContract.js'

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('product intake cannot fabricate browser-side product, lot, or publication success', async () => {
  const [service, modal] = await Promise.all([
    source('src/services/productIntakeService.js'),
    source('src/views/admin/ProductIntakeSessionModal.jsx'),
  ])
  expect(service).not.toMatch(/Mock Product Draft|K2-SKU-\$\{Math/)
  expect(service).not.toMatch(/\.from\(['"]products['"]\)\s*\.insert/s)
  expect(service).not.toMatch(/\.from\(['"]product_batches['"]\)\s*\.insert/s)
  expect(modal).not.toContain('placeholder.co')
  expect(service).toContain('SESSION_PATCH_FIELDS')
  expect(service).toContain('uploadProductEvidence')
  expect(service).toContain('create_product_draft_server')
  expect(service).toContain('create_product_first_inventory_server')
  expect(service).toContain('transition_product_publication_server')
  expect(modal).not.toContain('Product Intake & First Inventory Complete')
  expect(modal).not.toContain('Quantity Received')
  expect(modal).toContain('Expected manifest quantity')
  expect(modal).toContain('inventorySaved')
  expect(modal).toContain('savingInventory')
  expect(modal).toContain('if (savingInventory || sessionLoading) return')
  expect(modal).toContain('You are offline')
  expect(modal).toContain("import { AdminDialog } from '../../components/ui/AdminDialog'")
  expect(modal).toContain('labelledBy="product-intake-title"')
  expect(modal).toContain('grid-cols-1 gap-3')
  expect(modal).toContain('accept="image/jpeg,image/png,image/webp"')
  expect(modal).not.toContain('image/avif')
  expect(modal).toContain('URL.revokeObjectURL')
  expect(modal).toContain('Supplier receipt remains pending until the canonical purchasing and receiving workflow is activated.')
  expect(modal).toContain("import { CANONICAL_CUSTODIANS, CANONICAL_HUBS } from '../../data/canonicalIdentities'")
  expect(modal).toContain('<select')
  expect(modal).toContain('custodian.hub_id === hubLocation')
  expect(modal).not.toMatch(/id="intake-hub"[\s\S]{0,120}type="text"/)
  expect(modal).not.toMatch(/id="intake-custodian"[\s\S]{0,120}type="text"/)
})

test('database contract is staff-owned, MFA-gated, idempotent, and private', async () => {
  const [migration, postflight, cleanupMigration] = await Promise.all([
    source('supabase/migrations/20260811_product_intake_and_sku_gate.sql'),
    source('supabase/map018_product_intake_postflight.sql'),
    source('supabase/migrations/20260824_map018_intake_evidence_cleanup_boundary.sql'),
  ])
  expect(migration).toContain('force row level security')
  expect(migration).toContain('K2_AAL2_REQUIRED')
  expect(migration).toContain('K2_REQUEST_ID_MISMATCH')
  expect(migration).toContain('K2_FIRST_INVENTORY_ALREADY_RECORDED')
  expect(migration).toContain("'product-intake-evidence'")
  expect(migration).toContain('public = false')
  expect(migration).toContain('K2_SUPPLIER_RECEIPT_WORKFLOW_UNAVAILABLE')
  expect(migration).not.toMatch(/for all to authenticated\s+using\s*\(true\)/i)
  expect(postflight).toContain('anon retains intake-table privileges')
  expect(postflight).toContain('internal SKU generator is externally executable')
  expect(cleanupMigration).toContain('product_intake_evidence_cleanup_events')
  expect(cleanupMigration).toContain('force row level security')
  expect(cleanupMigration).toContain('record_admin_product_intake_evidence_cleanup_v1')
  expect(cleanupMigration).toContain('claim_admin_product_intake_evidence_cleanup_v1')
  expect(cleanupMigration).toContain('complete_admin_product_intake_evidence_cleanup_v1')
  expect(cleanupMigration).toContain('K2_INTAKE_CLEANUP_ATTEMPTS_EXHAUSTED')
  expect(cleanupMigration).toMatch(/revoke all on table k2_private\.product_intake_evidence_cleanup_events[\s\S]*from public, anon, authenticated/i)
})

test('phone intake exposes one persistent retry state when orphan cleanup is pending', async () => {
  const [modal, service, bff] = await Promise.all([
    source('src/views/admin/ProductIntakeSessionModal.jsx'),
    source('src/services/productIntakeService.js'),
    source('src/services/adminBffService.js'),
  ])
  expect(service).toContain('retryProductEvidenceCleanup')
  expect(bff).toContain("'/api/admin/product-intake/evidence-cleanup'")
  expect(bff).toContain('EVIDENCE_CLEANUP_PENDING')
  expect(modal).toContain('Retry file cleanup')
  expect(modal).toContain('The unregistered private file is queued for cleanup.')
  expect(modal).toContain('min-h-11')
  expect(modal).not.toMatch(/alert\(|console\.error/)
})

test('interrupted intake resumes from the server-saved field review without fabricating progress', async () => {
  const module = await import('../src/views/admin/productIntakeResume.js')
  expect(typeof module.buildReviewedDraftState).toBe('function')
  expect(typeof module.buildResumedIntakeState).toBe('function')

  const payload = {
    meta: { schemaVersion: PRODUCT_RESEARCH_SCHEMA_VERSION, evidenceCount: 3 },
    product: { name: 'Rigatoni 500g', variant: '500g', origin: 'Italy' },
  }
  const reviewed = module.buildReviewedDraftState(payload, {
    name: true,
    variant: false,
    origin: true,
  })
  expect(reviewed).toEqual({
    draft_payload: {
      ...payload,
      product: { name: 'Rigatoni 500g', origin: 'Italy' },
    },
    field_decisions: {
      name: 'accepted',
      variant: 'rejected',
      origin: 'accepted',
    },
  })

  const resumed = module.buildResumedIntakeState({
    id: '6a88b5f9-8be6-4f4d-a504-173c96f40df1',
    checklist_step: 'draft_saved',
    scanned_identity: '8001234567890',
    draft_payload: reviewed.draft_payload,
    field_decisions: reviewed.field_decisions,
    packaging_images: [],
    evidence_checklist: {},
  })
  expect(resumed).toMatchObject({
    step: 5,
    query: '8001234567890',
    parsedPayload: reviewed.draft_payload,
    acceptedFields: { name: true, origin: true },
    resumeNotice: 'Saved server progress restored at Step 5.',
  })
  expect(resumed.acceptedFields).not.toHaveProperty('variant')
  expect(JSON.parse(resumed.jsonInput)).toEqual(reviewed.draft_payload)
})

test('current product JSON accepts content and rejects operational authority', () => {
  const payload = structuredClone(PRODUCT_RESEARCH_TEMPLATE)
  Object.assign(payload.product, {
    name: 'Test Pasta 500g', short_name: 'Test Pasta', brand_name: 'Test Brand',
    variant: '500g', category: 'Pasta', subcategory: 'Dry Pasta',
  })
  Object.assign(payload.copy, {
    card_description: 'A concise evidence-based test description.',
    full_description: 'A complete evidence-based description for contract verification.',
    key_highlights: ['Exact package identity', 'Documented preparation'],
    why_buy: 'Useful contract fixture.',
  })
  Object.assign(payload.seo, {
    seo_title: 'Test Pasta 500g',
    meta_description: 'Contract fixture for the K2 product-intake verifier.',
    page_heading: 'Test Pasta 500g',
    supporting_heading: 'Verified product-intake fixture',
    search_keywords: ['test pasta', '500g pasta', 'Italian pasta'],
  })
  payload.usage.use_cases = []
  payload.usage.instructions = []
  Object.assign(payload.media, {
    primary_alt_text: 'Front of Test Pasta package',
    primary_composition: 'Preserve the exact physical package.',
    after_alt_text: 'Prepared Test Pasta serving',
    after_scene: 'A truthful prepared serving based on the approved use case.',
  })
  payload.verification.sources = [{
    fields: ['product.name'], source_type: 'package_image',
    reference: 'upload:front', confidence: 'high',
  }]

  const normalized = parseProductResearchPaste(JSON.stringify(payload))
  expect(normalized.meta.schemaVersion).toBe(PRODUCT_RESEARCH_SCHEMA_VERSION)

  payload.product.price = 100
  expect(() => parseProductResearchPaste(JSON.stringify(payload))).toThrow(/not allowed|Unexpected field/)
})

test('upload validation strictly rejects unauthorized MIMEs, scripts, and oversized files', async () => {
  const { validateUploadFile, sanitizeFileName, MAX_UPLOAD_BYTES } = await import('../src/lib/uploadValidation.js')

  // Normal valid image
  const validFile = { name: 'front_label.jpg', size: 1024 * 500, type: 'image/jpeg' }
  const validRes = validateUploadFile(validFile)
  expect(validRes.ok).toBe(true)
  expect(validRes.sanitizedName).toBe('front_label.jpg')

  // Oversized file (above the shared generic upload cap)
  const oversizedFile = { name: 'huge_scan.png', size: MAX_UPLOAD_BYTES + 1024, type: 'image/png' }
  const overRes = validateUploadFile(oversizedFile)
  expect(overRes.ok).toBe(false)
  expect(overRes.error).toContain('exceeds maximum permitted limit')

  // Executable or script disguised as image
  const scriptFile = { name: 'malicious.php', size: 1024, type: 'application/x-php' }
  const scriptRes = validateUploadFile(scriptFile)
  expect(scriptRes.ok).toBe(false)
  expect(scriptRes.error).toContain('is not supported')

  // Path traversal in filename
  expect(sanitizeFileName('../../etc/passwd.jpg')).toBe('passwd.jpg')
  expect(sanitizeFileName('..\\..\\secret.png')).toBe('secret.png')
})

test('wholesale inquiry is an explicit unsent handoff and cannot fabricate commercial state', async () => {
  const wholesaleSource = await source('src/views/Wholesale.jsx')
  expect(wholesaleSource).toContain('organizationName')
  expect(wholesaleSource).toContain('contactName')
  expect(wholesaleSource).toContain('agreedToTerms')
  expect(wholesaleSource).toContain('mailto:')
  expect(wholesaleSource).toContain('Email draft prepared — not submitted')
  expect(wholesaleSource).toContain('K2 has not received or recorded this inquiry yet.')
  expect(wholesaleSource).not.toContain("localStorage.getItem('k2_wholesale_applications')")
  expect(wholesaleSource).not.toContain('WA-')
  expect(wholesaleSource).not.toMatch(/within 1[–-]2 business days/i)
  expect(wholesaleSource).not.toMatch(/grant_wholesale_pricing_client_side/i)
})
