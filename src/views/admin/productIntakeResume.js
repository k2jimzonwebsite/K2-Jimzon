const STEP_BY_CHECKLIST = Object.freeze({
  identify: 1,
  packaging_evidence: 2,
  research_handoff: 3,
  field_review: 4,
  draft_saved: 5,
  first_inventory: 6,
  publication_review: 7,
  completed: 7,
})

export function buildReviewedDraftState(parsedPayload, acceptedFields) {
  const product = parsedPayload?.product || {}
  const fieldDecisions = Object.fromEntries(
    Object.keys(product).map((field) => [field, acceptedFields?.[field] ? 'accepted' : 'rejected'])
  )
  return {
    draft_payload: {
      ...parsedPayload,
      product: Object.fromEntries(
        Object.entries(product).filter(([field]) => acceptedFields?.[field])
      ),
    },
    field_decisions: fieldDecisions,
  }
}

export function buildResumedIntakeState(session) {
  const step = STEP_BY_CHECKLIST[session?.checklist_step] || 1
  const draftPayload = session?.draft_payload
  const hasDraftPayload = draftPayload
    && typeof draftPayload === 'object'
    && !Array.isArray(draftPayload)
    && Object.keys(draftPayload).length > 0
  const acceptedFields = Object.fromEntries(
    Object.entries(session?.field_decisions || {})
      .filter(([, decision]) => decision === 'accepted' || decision === true)
      .map(([field]) => [field, true])
  )
  return {
    step,
    query: String(session?.scanned_identity || session?.barcode || ''),
    packagingImages: Object.fromEntries(
      (Array.isArray(session?.packaging_images) ? session.packaging_images : [])
        .filter((image) => image?.slot)
        .map((image) => [image.slot, image])
    ),
    evidenceChecked: session?.evidence_checklist || {},
    categoryType: session?.category_type || 'food',
    parsedPayload: hasDraftPayload ? draftPayload : null,
    jsonInput: hasDraftPayload ? JSON.stringify(draftPayload, null, 2) : '',
    acceptedFields,
    createdProduct: session?.product_id && session?.assigned_sku
      ? { id: session.product_id, sku: session.assigned_sku, status: 'draft' }
      : null,
    inventorySaved: Boolean(session?.inventory_result),
    resumeNotice: step > 1 ? `Saved server progress restored at Step ${step}.` : '',
  }
}
