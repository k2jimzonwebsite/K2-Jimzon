# MAP-020 Admin product-intake rollback validation — 12 August 2026

## Scope

This evidence covers the prepared, inactive, phone-first Product Intake Admin
BFF. It does not claim that the intake schema, private evidence bucket, cookie
BFF, supplier-receipt workflow, domain, or marketplace publication is live.

## Production truth inspected

- `public.product_intake_sessions` and the three MAP-018 intake RPCs are absent
  from production.
- The MAP-018 migration compiled inside a rollback-only production transaction.
- The Admin product-intake wrapper compiled separately in a rollback-only
  signature harness using transaction-local stubs whose names, columns, and
  function signatures match MAP-018. This split was necessary because the SQL
  execution transport truncates a combined payload at about 40 KB.
- The two-pass result proves each migration's syntax and dependency contract; it
  does not prove permanent combined activation.
- A post-rollback query confirmed the intake table, wrapper command function,
  and private receipt table remained absent.

## Prepared boundary

- Fixed reads cover duplicate detection, one resumable intake session, and at
  most 50 open Italy consignments.
- Named, signed commands cover session creation, ordered checklist steps,
  evidence registration, Draft creation, first inventory source, and storefront
  publication state.
- Commands enforce the expected deployment target and origin, current staff
  session, AAL2, CSRF, exact bounded payloads, idempotency, HMAC, nonce replay
  denial, command receipts, and database-backed rate limits.
- A generic checklist patch cannot write `packaging_images`; evidence can change
  only through the protected upload route.
- The evidence route accepts only JPEG, PNG, and WebP up to 10 MB, verifies the
  decoder-selected format against the declared MIME, permits one image page,
  enforces dimensions and pixel limits, fully decodes and re-encodes the image,
  strips metadata/polyglot content, hashes the output, and stores it under a
  private deterministic staff/session path.
- Publication requires an audit reason. `Live` means storefront publication
  only and does not imply a Shopee, TikTok Shop, Lazada, or other listing.

## Verification completed

1. MAP-018 rollback-only production compile passed.
2. Product-intake wrapper signature-harness compile passed.
3. Post-rollback absence query passed.
4. Twenty-seven local contract tests passed, including successful image
   re-encoding and rejection of SVG/script and MIME mismatch cases.
5. The isolated Admin production build passed.
6. The isolated Storefront production build passed and does not ship the image
   decoder.
7. The secret scan passed across 672 files.
8. The production dependency audit reported zero findings after compatible
   `nanoid` and `postcss` patch updates.

## Remaining activation gates

- Contain and rotate the exposed elevated Supabase credential and complete the
  MAP-017 public-write boundary.
- Apply MAP-018, the Admin foundation/private secret, and this wrapper in the
  recorded order.
- Select canonical identities for any free-text opening hub and custodian data.
- Add orphan-upload cleanup, deployed binary-upload tests, and negative tests
  for bypass, non-staff, AAL1, wrong origin, CSRF, replay, and rate limits.
- Complete phone acceptance with real products and real evidence photos.
- Keep supplier-receipt intake unavailable until a canonical receipt workflow
  exists.
- Keep `VITE_ADMIN_BFF_ENABLED=false` until all named Admin capabilities and the
  coordinated cutover gates pass.
