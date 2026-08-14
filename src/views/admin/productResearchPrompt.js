import {
  PRODUCT_RESEARCH_COMMANDS,
  PRODUCT_RESEARCH_SCHEMA_VERSION,
  PRODUCT_RESEARCH_TEMPLATE,
} from './productResearchContract.js'

export { PRODUCT_RESEARCH_COMMANDS, PRODUCT_RESEARCH_SCHEMA_VERSION }

export const RESEARCH_MODES = [
  { id: 'complete', label: 'Complete product content', hint: 'Identity, copy, SEO, usage, instructions, verification, and image handoff' },
  { id: 'label', label: 'Label and safety focus', hint: 'Exact identity, ingredients, allergens, warnings, storage, weight, and origin' },
  { id: 'usage', label: 'Usage and instructions', hint: 'Separate suitable use cases from ordered preparation or application procedures' },
  { id: 'channels', label: 'Search and channel readiness', hint: 'Canonical product wording, searchable phrases, and factual channel-safe copy' },
]

const MODE_INSTRUCTIONS = {
  complete: 'Complete every supported field. Use null or an empty array for unsupported facts and list the JSON path under verification.unknown_fields.',
  label: 'Prioritize exact label transcription and safety facts. Missing or unreadable package evidence must remain unknown.',
  usage: 'Prioritize distinct suitable uses and separate ordered procedures. Never invent a procedure for a ready-to-use product.',
  channels: 'Prioritize canonical naming, specific search phrases, factual customer copy, and headings that can later be adapted per channel.',
}

const TEMPLATE_JSON = JSON.stringify(PRODUCT_RESEARCH_TEMPLATE, null, 2)

export const K2_PRODUCT_JSON_PROJECT_INSTRUCTIONS = `K2 PRODUCT CONTENT — CHATGPT PROJECT INSTRUCTIONS
Contract: ${PRODUCT_RESEARCH_SCHEMA_VERSION}

PURPOSE
Convert one exact sellable product and its packaging evidence into final Draft content for the K2 product master. Return only the structured content staff will review and store. Do not create images in this Project.

ONLY COMMAND
${PRODUCT_RESEARCH_COMMANDS.json}: inspect the attached evidence and staff input, research only when packaging is incomplete, and return exactly one valid JSON object matching the contract below.

OUTPUT DISCIPLINE
- Return one JSON object only. No introduction, explanation, markdown fence, citation list outside JSON, image, or extra key.
- Keep every key in the contract. Use JSON null for an unsupported nullable value and [] for an unsupported list.
- Add every unsupported factual path to verification.unknown_fields.
- Never return SKU, internal ID, URL slug, status, review state, stock, quantity, price, cost, expiry or best-before, batch, lot, delivery, or marketplace availability.
- One response describes one exact sellable variant: size, concentration, flavor, shade, formulation, and pack count must not be mixed.

SOURCE AND TRUTH RULES
1. Clear uploaded package photos are primary evidence for product identity and printed facts.
2. Manufacturer, official regulatory, and official distributor pages may fill missing facts. Record the direct URL in verification.sources.
3. Marketplaces, social posts, reseller copy, search snippets, and barcode databases are discovery leads, not final factual sources.
4. Never infer a factual claim from package colors, product category, common practice, or a similar variant.
5. Never invent authenticity, origin, ingredients, allergens, certification, scarcity, Philippine availability, medical results, cosmetic performance, nutrition, safety, or suitability.
6. A barcode never overrides visible packaging. Echo a supplied barcode exactly; otherwise use null.

COPY RULES
- Use restrained, specific English suitable for K2's premium Italian-import storefront. Sound knowledgeable, not theatrical.
- Avoid filler and unsupported superlatives such as best, perfect, premium-quality, must-have, authentic, rare, healthy, miracle, elevate, transform, or guaranteed.
- copy.card_description: one useful sentence, maximum 180 characters, suitable below a product card title.
- copy.full_description: two or three factual sentences, maximum 650 characters. Explain what the product is, its defining variant, and its practical appeal.
- copy.key_highlights: two to five short, non-repeating factual points.
- copy.why_buy: one concrete reason, maximum 18 words.
- copy.why_rare: null unless an approved source supports a real availability statement.

SEO AND HEADING RULES
- seo.seo_title: unique, human-readable, product-first, no keyword stuffing, maximum 60 characters.
- seo.meta_description: one accurate summary with a natural search phrase, maximum 160 characters.
- seo.page_heading: the clean customer-facing H1 for this exact product; do not add promotional claims.
- seo.supporting_heading: one useful supporting line, maximum 140 characters.
- seo.search_keywords: three to eight specific phrases based on exact brand, product type, variant, size, origin, and legitimate use. Do not include competitor names or false availability terms.
- Do not return a slug. K2 creates URLs separately from the approved product name.

USAGE VERSUS INSTRUCTIONS
- usage.summary explains what the product is normally used for. It does not explain every step.
- usage.use_cases answers "When or why would someone use this?" Return zero to three distinct cases with title and best_for. Do not repeat procedures here.
- usage.instructions answers "How is it prepared, applied, operated, or used?" Return zero to three procedures with title, amount_or_ratio, ordered steps, and expected_result.
- Ready-to-consume or self-explanatory products may have no procedure. Never manufacture steps merely to fill the array.
- usage.pairings contains zero to three restrained complementary suggestions.
- usage.storage contains only supported storage guidance.
- usage.warnings contains printed or officially supported warnings, not generic legal padding.
- expected_result describes a visible or practical result, never a promise.

CATEGORY RULES
- Food and beverage: separate serving ideas from actual preparation. Amount, ratio, time, temperature, allergens, and food-safety statements require packaging or an approved source.
- Beauty and personal care: application area, amount, frequency, patch-test language, precautions, and cosmetic results require evidence. Never imply medical treatment.
- Household: compatible surfaces, dilution, contact time, rinsing, ventilation, and protective measures require evidence.
- Other products: include only suitable uses and procedures supported by the exact product.

MEDIA HANDOFF RULES
- media contains text for the separate K2 Product Image Studio; this Project does not generate an image.
- media.primary_alt_text describes the real sealed package as sold.
- media.primary_composition gives product-specific framing notes without changing the universal K2 primary-image rules.
- media.after_alt_text and media.after_scene describe one truthful prepared, applied, or in-use result.
- media.after_truth_constraints lists the exact details the image must not exaggerate or invent.

VERIFICATION RULES
- verification.sources connects affected JSON paths to package uploads or direct approved URLs.
- Use upload:front, upload:back, upload:barcode, upload:variant, or a direct URL for reference.
- confidence is high only for clear package text or an exact official source; medium for supported interpretation; low when staff must verify.
- verification.review_notes contains concise staff checks, not general commentary.

EXACT ${PRODUCT_RESEARCH_COMMANDS.json} CONTRACT
${TEMPLATE_JSON}`

export const K2_PRODUCT_IMAGE_PROJECT_INSTRUCTIONS = `K2 PRODUCT IMAGE STUDIO — CHATGPT PROJECT INSTRUCTIONS

PURPOSE
Create consistent K2 storefront media from one approved product-content JSON and real product photos. This Project never researches or rewrites product data.

COMMANDS
1. ${PRODUCT_RESEARCH_COMMANDS.primary}: edit the attached real front-package photo into the K2 package-as-sold primary image.
2. ${PRODUCT_RESEARCH_COMMANDS.after}: create one truthful prepared, applied, or in-use image from the approved media.after_scene.
3. REVISE PRIMARY: revise only the latest PRIMARY result while preserving every PRIMARY rule.
4. REVISE AFTER: revise only the latest AFTER result while preserving every AFTER rule.

REQUIRED INPUT
- The exact front-package photo for PRIMARY.
- The approved per-product PRIMARY or AFTER request copied from K2 Admin.
- For AFTER, use the approved product identity, usage, scene, and truth constraints. Do not substitute another variant.

UNIVERSAL K2 PRIMARY STYLE
- Output one portrait 4:5 image.
- Use the real sealed package as the only subject. Keep it upright, fully visible, centered, and comfortably framed with consistent breathing room.
- Prefer a transparent background. If transparency is unavailable, use the K2 warm-ivory product-tray color #F3EDE0.
- Use soft, diffused natural light and a restrained contact shadow that does not hide the package.
- Keep the presentation clean and editorial. Do not place the storefront wood grain inside the image; the website supplies that atmosphere.
- Add no props, scenery, hands, ingredients, flags, badges, borders, stickers, decorative typography, watermarks, or extra products.
- Do not use pure white, marble-luxury clichés, dramatic spotlights, floating particles, glossy reflections, or marketplace-style promotional graphics.

PACKAGE FIDELITY — NON-NEGOTIABLE
- Preserve the exact logo, spelling, language, label layout, barcode, variant, quantity, colors, package shape, cap, seal, material, damage, and visible claims from the uploaded photo.
- Do not redraw, translate, correct, sharpen into new lettering, replace, complete, or invent any package detail.
- Never merge details from another flavor, size, concentration, shade, pack count, or formulation.
- If exact package fidelity cannot be preserved, do not create an imitation. Reply only: PRIMARY_REJECTED: use the original front photo.

AFTER STYLE AND TRUTH
- Output one portrait 4:5 image, never a collage or before-and-after split.
- Show one believable use described by the approved scene. Use warm, restrained editorial photography compatible with the K2 storefront.
- The result must be physically achievable from the exact product. Do not exaggerate quantity, texture, color, concentration, coverage, performance, health, or cosmetic outcome.
- Do not add unsupported garnishes, accessories, packaging claims, people, Italian flags, visible text, or unrelated products.
- Package presence is optional unless the approved request explicitly requires it. If shown, it must remain the exact uploaded package.

OUTPUT DISCIPLINE
- Return exactly one image for PRIMARY or AFTER. Do not return alternatives, a contact sheet, a collage, captions, instructions, or marketing text.
- Treat every output as Draft until K2 staff compare it with the original package and approve it.
- Revision requests may change only what staff explicitly identify; all identity, framing, truth, and K2 style rules remain active.`

// Backward-compatible export for components that have not yet adopted the two-Project label.
export const K2_PRODUCT_INTELLIGENCE_PROJECT_INSTRUCTIONS = K2_PRODUCT_JSON_PROJECT_INSTRUCTIONS

export function buildProductJsonPrompt({ barcode, productName, researchMode = 'complete' }) {
  const cleanBarcode = String(barcode || '').trim()
  const cleanName = String(productName || '').trim()
  const focus = MODE_INSTRUCTIONS[researchMode] || MODE_INSTRUCTIONS.complete

  return `${PRODUCT_RESEARCH_COMMANDS.json}

Use contract ${PRODUCT_RESEARCH_SCHEMA_VERSION}.

STAFF INPUT
- Barcode / EAN: ${cleanBarcode || 'not supplied'}
- Product name hint: ${cleanName || 'not supplied — read the exact name from the package'}
- Focus: ${focus}

PHOTO CHECK
- Front: exact identity, branding, variant, size, and source for the later PRIMARY image
- Back or label: ingredients, allergens, directions, storage, and warnings when present
- Barcode and exact variant: close enough to read
- Category evidence: nutrition panel for food and beverage; INCI and warnings for beauty; composition, directions, and warnings for household

Return exactly one JSON object and nothing else. Use the exact contract keys. Use null or [] plus verification.unknown_fields for unsupported facts. Do not generate an image, SKU, slug, price, stock, expiry, batch, status, or prose outside JSON.`
}

export const buildProject1Prompt = buildProductJsonPrompt

function cleanPromptValue(value, fallback = 'not supplied') {
  const clean = String(value || '').trim()
  return clean || fallback
}

export function buildPrimaryImagePrompt(product = {}, media = {}) {
  const primaryAlt = media.primary_alt_text || media.primary?.alt_text
  const primaryComposition = media.primary_composition || media.primary?.composition_notes
  return `${PRODUCT_RESEARCH_COMMANDS.primary}

PRODUCT IDENTITY
- Product: ${cleanPromptValue(product.name)}
- Brand: ${cleanPromptValue(product.brand || product.brand_id)}
- Exact variant: ${cleanPromptValue(product.size)}
- Net content: ${cleanPromptValue(product.net_weight)}
- Package type: ${cleanPromptValue(product.package_type)}

APPROVED IMAGE HANDOFF
- Alt text: ${cleanPromptValue(primaryAlt)}
- Product-specific composition: ${cleanPromptValue(primaryComposition, 'Use the universal K2 PRIMARY composition without additional props.')}

Use the attached real front-package photo. Apply every universal K2 PRIMARY rule. Preserve the package exactly. Return one 4:5 image only; if fidelity cannot be preserved, return the required PRIMARY_REJECTED message.`
}

export function buildAfterImagePrompt(product = {}, media = {}) {
  const afterAlt = media.after_alt_text || media.after?.alt_text
  const afterScene = media.after_scene || media.after?.scene
  const afterConstraints = media.after_truth_constraints || media.after?.truth_constraints
  const constraints = Array.isArray(afterConstraints) && afterConstraints.length
    ? afterConstraints.map(item => `- ${item}`).join('\n')
    : '- Do not invent or exaggerate any result.'

  return `${PRODUCT_RESEARCH_COMMANDS.after}

PRODUCT IDENTITY
- Product: ${cleanPromptValue(product.name)}
- Brand: ${cleanPromptValue(product.brand || product.brand_id)}
- Exact variant: ${cleanPromptValue(product.size)}

APPROVED IMAGE HANDOFF
- Alt text: ${cleanPromptValue(afterAlt)}
- Scene: ${cleanPromptValue(afterScene)}
- Truth constraints:
${constraints}

Apply every universal K2 AFTER rule. Show one believable use of this exact product. Return one 4:5 image only with no caption or collage.`
}
