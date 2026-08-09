export const RESEARCH_MODES = [
  { id: 'complete', label: 'Complete product draft', hint: 'Identity, label facts, usage, storefront copy, and image plan' },
  { id: 'label', label: 'Label and safety focus', hint: 'Ingredients, allergens, warnings, storage, weight, and origin' },
  { id: 'usage', label: 'Usage and transformation', hint: 'Before/after state, preparation, application, and realistic result' },
  { id: 'channels', label: 'Marketplace readiness', hint: 'Clean title, variant identity, searchable facts, and channel-safe copy' },
]

const MODE_INSTRUCTIONS = {
  complete: 'Prioritize a complete, balanced product draft using only evidence that can be verified.',
  label: 'Prioritize exact label transcription, ingredients, allergens, warnings, storage, net weight, origin, and variant identity. Do not turn absence of visible evidence into a safety claim.',
  usage: 'Prioritize evidence-backed usage or preparation instructions and a truthful before/after transformation concept (for example pasta before cooking and the prepared dish after). Do not promise results the product or evidence cannot support.',
  channels: 'Prioritize a clean canonical title, exact variant differentiators, searchable factual attributes, and copy that can later be adapted to Website, Shopee, TikTok Shop, and Lazada without inventing platform approval.',
}

export function buildProject1Prompt({ barcode, productName, researchMode = 'complete' }) {
  const barcodeInfo = barcode ? `Barcode / EAN: ${barcode}` : 'Barcode: (not scanned)'
  const nameInfo = productName ? `Product name supplied by staff: ${productName}` : 'Product name: unknown — read it from the packaging image'
  const focus = MODE_INSTRUCTIONS[researchMode] || MODE_INSTRUCTIONS.complete

  return `You are preparing a DRAFT product record for K2 Jimzon, an Italian-import commerce operation.

Staff will attach clear product packaging images for you to analyze.

${barcodeInfo}
${nameInfo}
Research focus: ${focus}

NON-NEGOTIABLE EVIDENCE RULES
1. Treat the packaging images as the primary source for identity, variant, ingredients, allergens, warnings, origin, storage, and net quantity.
2. The barcode may help confirm identity, but a third-party barcode result must not override visible packaging.
3. For every external factual source used, include its direct URL in source_urls. Prefer the manufacturer or official regulatory/retailer page.
4. Never invent authenticity, origin, ingredients, allergens, medical/cosmetic outcomes, certifications, expiry, price, stock, delivery, or marketplace availability.
5. When a factual field cannot be verified, write "Unknown — verify manually". Do not conceal uncertainty with persuasive copy.
6. Distinguish variants exactly. A different concentration, size, flavor, shade, formulation, or pack count is a different SKU.
7. Do not assign stock. Do not mark the record Live. This output is always a human-reviewed Draft.

RETURN EXACTLY TWO SECTIONS

SECTION 1 — one valid JSON object only, with these keys:
{
  "id": "suggested-k2-sku",
  "barcode": "${barcode || 'Unknown — verify manually'}",
  "name": "canonical product name",
  "short": "short display name",
  "brand": "brand name or Unknown — verify manually",
  "origin": "specific verified origin or Unknown — verify manually",
  "net_weight": "verified quantity or Unknown — verify manually",
  "package_type": "verified package type or Unknown — verify manually",
  "size": "exact sellable variant",
  "inside": "evidence-backed description",
  "whyBuy": "restrained, factual customer value",
  "whyRare": "verified availability context or Unknown — verify manually",
  "usage_instructions": "evidence-backed preparation or usage",
  "storage_instructions": "evidence-backed storage",
  "ingredients": "exact label transcription or Unknown — verify manually",
  "allergens": "explicit label allergens or Unknown — verify manually",
  "finished_product_details": "truthful after-use/prepared-state description",
  "pairings": ["up to three evidence-safe suggestions"],
  "source_urls": ["direct URLs used for verification"],
  "review_notes": ["every uncertainty or field staff must verify"]
}

SECTION 2 — one unified image-generation prompt for exactly two images:
A. BEFORE: the sealed product/package as sold.
B. AFTER: the realistic prepared, applied, or in-use result.
Keep both images visually consistent with K2 Jimzon's premium Italian design. Do not alter logos, label facts, quantity, color, or product claims.`
}
