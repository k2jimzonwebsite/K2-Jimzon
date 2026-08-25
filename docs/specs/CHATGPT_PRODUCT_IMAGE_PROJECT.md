# K2 Product Image Studio

## Purpose

This private ChatGPT Project creates the two standardized Draft product images
after the product-content JSON has been reviewed. It does not research, rewrite,
or approve product facts.

## One-time Project setup

1. Create a private ChatGPT Project named **K2 Product Image Studio**.
2. In Admin BOS, open **Scan center → New product research** or the Smart Paste
   image handoff.
3. Copy **Image Studio instructions** and use the complete copied text as the
   Project instructions. The canonical text lives in
   `src/views/admin/productResearchPrompt.js`.
4. Keep this Project separate from K2 Product Content.

## PRIMARY workflow

1. Attach the real front-package photo for the exact variant.
2. Paste the product-specific `PRIMARY` request copied from Smart Paste.
3. Expect one portrait 4:5 image containing only the sealed package.
4. Prefer transparency. If transparency is unavailable, use K2 warm ivory
   `#F3EDE0`.
5. Do not put the storefront wood texture, props, flags, badges, promotional
   text, hands, ingredients, or scenery inside the product image.

The output must preserve the exact logo, spelling, language, label layout,
barcode, variant, quantity, colors, package shape, cap, seal, material, visible
damage, and printed claims. If that fidelity cannot be maintained, the Project
must return only `PRIMARY_REJECTED: use the original front photo.` Staff then use
the original photograph.

## AFTER workflow

1. Paste the product-specific `AFTER` request copied from Smart Paste.
2. Expect one portrait 4:5 prepared, applied, or in-use image based on the
   approved scene.
3. Keep the result physically achievable for the exact product.
4. Do not exaggerate amount, texture, color, concentration, coverage,
   performance, health, or cosmetic outcomes.
5. Do not return a collage, before-and-after split, caption, alternate options,
   or unrelated product.

## Revisions

Use `REVISE PRIMARY` or `REVISE AFTER` and state only the problem to correct.
Revisions may not relax package fidelity, K2 composition, truth, or 4:5 rules.

## Staff acceptance checklist

Before uploading an image, staff must confirm:

- PRIMARY is the exact real variant and every visible package detail matches;
- the full package is legible, comfortably framed, and not cropped;
- no unsupported prop, text, claim, badge, or marketplace treatment was added;
- AFTER matches one approved use and does not promise an unsupported result;
- PRIMARY and AFTER are separate files in their correct slots;
- both images are still Draft and image rights are acceptable.
