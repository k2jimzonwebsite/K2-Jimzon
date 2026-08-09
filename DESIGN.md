---
name: K2 Jimzon
description: Premium Italian import store
colors:
  cream: "#FAF8F4"
  paper: "#FFF9EF"
  shell: "#F2EEE8"
  navy: "#2B2B2B"
  navy-soft: "#525252"
  crimson: "#B84E3A"
  forest: "#6E7F52"
  amber: "#9A6A45"
  line: "#E5DDD2"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "4.6rem"
  wordmark:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.55rem"
  body:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
  dense:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "0.9375rem"
  compact:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
  metadata:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
  label:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
  title-sm:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "1.0625rem"
  title-md:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "1.1875rem"
  title-lg:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "1.375rem"
  title-xl:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "1.5rem"
  code:
    fontFamily: "Cascadia Code, Consolas, monospace"
rounded:
  xl: "12px"
  '2xl': "16px"
  '3xl': "24px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.crimson}"
    textColor: "{colors.paper}"
    rounded: "{rounded.xl}"
    padding: "12px 20px"
---

# Design System: K2 Jimzon

## 1. Overview

**Creative North Star: "The Editorial Import"**

Warm, organic, and expansive. It feels like a sunlit Mediterranean villa, rejecting the cold, sterile SaaS aesthetic. The design is structured like a high-end magazine showcasing curated goods, letting typography and photography lead instead of cluttered marketplace visuals. The UI is scaled to 125% for a confident, accessible presence.

**Key Characteristics:**
- Warm, organic curves (`rounded-3xl` containers)
- Tactile, accessible sizing (global 125% scale)
- Editorial font contrast (Fraunces vs Source Sans 3)
- Focused accents (Terracotta for action, Olive for trust)

## 2. Colors

A sunlit Tuscan palette grounded by warm whites and punctuated by natural Italian tones.

### Primary
- **Terracotta (Crimson)** (#B84E3A): The action color. Used strictly for CTAs, prices, and key interactions.
- **Olive (Forest)** (#6E7F52): The trust color. Used for stock indicators, freshness badges, and authenticity claims.

### Secondary
- **Amber Wood** (#9A6A45): Ambient backgrounds and structural shadows, adding materiality.

### Atmosphere
- **Wood Texture:** A subtle, warm abstract wood grain background (`wood-bg.jpg`) is applied to the complete light-mode storefront canvas with a multiply blend. Page-level bands remain translucent so the material stays visible without competing with text or product photos. Dark mode and the admin workspace do not inherit it.

### Neutral & The "Drenched" Strategy
- **Warm White (Cream)** (#FAF8F4): The expansive body canvas and structural base.
- **Glassmorphism / Ambient Bleed:** We employ a "Drenched" color strategy. "Pure White" (`bg-white` / `#FFFFFF`) is formally deprecated across the storefront to avoid breaking the atmospheric immersion. Structural bands use `.store-atmosphere`, `.store-atmosphere-soft`, or `.store-nav-surface`; contained cards may use warm Paper or Shell for legibility. These layers let the underlying Tuscan wood and terracotta shadows bleed through, ensuring every surface feels like a physical object in a warm room rather than a digital container.

### Non-negotiable: The Luxury Wood Canvas Rule

The light-mode storefront must retain `public/wood-bg.jpg` as its continuous page canvas. Do not replace it with pure white, remove it during redesigns, or cover every full-width section with opaque Cream/Paper. If the atmosphere needs to be quieter, adjust the translucent overlay—not the existence of the texture. This rule is protected by a storefront smoke test that checks both light and dark modes.
- **Ink (Navy)** (#2B2B2B): High-contrast text for ultimate legibility.

### Theme Logic

- Resolve a saved visitor choice first; otherwise follow the operating-system color preference.
- Apply the resolved mode before React renders so the storefront never flashes the opposite theme.
- Components use semantic tokens (`navy`, `navy-soft`, `paper`, `shell`, and the storefront surface variables). Those tokens already reverse between themes; do not add a second `dark:` text or surface swap unless the element has a documented exceptional need.
- Light mode keeps the wood canvas. Dark mode removes the texture and uses the obsidian surface system.
- Terracotta remains action, Olive remains trust/stock, and Blue remains wholesale in both modes. Theme changes never change a color's job.

### Named Rules
**The One-Job Rule.** Every signal color has exactly one meaning: red = action, green = trust/stock, blue = wholesale. A color never crosses into another's territory.
**The Quiet Tricolor Rule.** Italy is present as one 2px red hairline (`.tricolor`), in typography, and in photography — never as flag stripes, tricolore bars, or Tuscan-villa clichés.

## 3. Typography

**Display Font:** Fraunces (with Georgia, "Times New Roman", serif)
**Body/UI Font:** Source Sans 3 (with "Segoe UI", system-ui, sans-serif)

**Character:** Fraunces keeps the warm, curated Italian storytelling voice; Source Sans 3 uses open forms and a generous x-height to keep descriptions, prices, stock, forms, and dense operational data readable.

### Hierarchy
- **Display** (Fraunces 600): Hero headlines and major section titles. `text-wrap: balance` for even lines.
- **Headline** (Fraunces 600, ~1.5rem): Section titles ("Word of mouth", "How it gets to you").
- **Title** (Source Sans 3 650–700, 1–1.25rem): Compact card titles, product names, steps, and operational headings.
- **Body** (Source Sans 3 400, 16px): Paragraph copy in Navy Soft. Cap measure at 65–75ch.
- **Metadata** (Source Sans 3 500–600, 13px): Secondary facts and helper text.
- **Label** (Source Sans 3 650–700, 12px minimum): Short kickers, badges, and dense table labels. Uppercase tracking stays near 0.08–0.12em.

### Named Rules
**The Serif-Says-Story Rule.** Fraunces carries voice only when it has room: hero headlines, major storefront section titles, and editorial moments at 24px or larger. Source Sans 3 carries every fact: compact product names, descriptions, prices, stock, buttons, forms, and the entire admin UI.

**Compact Commerce Exception.** Product names use Fraunces only when they are large editorial features, but use Source Sans 3 at card and mobile sizes. Stock, price, category, filters, and navigation always use Source Sans 3. Operational labels must not drop below 12px; descriptions remain 15–16px; card titles remain at least 17px with a readable line height.

**The Admin One-Family Rule.** The operations dashboard uses Source Sans 3 for headings, descriptions, controls, metrics, and tables. Monospace is reserved for editable code, secrets, raw prompts, and machine identifiers; ordinary numbers use tabular Source Sans 3.

**Universal Stock Slot.** Every catalog card reserves the same stock row immediately above its price and action footer. The wording and color may reflect healthy, low, or sold-out inventory, but the placement never moves with title or description length.

## 4. Elevation

Structural lift. Shadows are used strictly to define interactive elements against a flat background. Shadows carry a warm amber tint rather than harsh black, evoking organic materiality.

### Shadow Vocabulary
- **Card** (`0 2px 4px rgba(154, 106, 69, 0.04), 0 12px 28px -12px rgba(154, 106, 69, 0.15)`): Resting elevation for cards and primary buttons.
- **Float** (`0 12px 24px rgba(154, 106, 69, 0.08), 0 32px 54px -16px rgba(154, 106, 69, 0.22)`): Hover/active lift and genuinely floating surfaces (drawer, dialogs).

### Named Rules
**The Lift-on-Intent Rule.** The jump from Card to Float is reserved for interaction (hover, active) and true overlays. A static element never wears the Float shadow.

## 4.1 Motion and Interaction

Motion should make the storefront feel handled, not decorated. The continuous Milano-to-Manila route and review globe are the two ambient signatures. Everywhere else, movement belongs to an entrance, a state change, or direct customer input.

- **Micro feedback:** 120–220ms with the shared Quart/Quint ease-out curves. Buttons compress slightly; icons may rotate or translate only when their meaning supports it.
- **Composed transitions:** 240–400ms. Catalog entries may stagger by 25–45ms, capped after the first six items so browsing never waits for choreography.
- **Performance:** Prefer transform and opacity. Hover-only movement must be inside a fine-pointer media query.
- **Reduced motion:** Content remains visible and usable; ambient animation and spatial travel collapse to near-instant state changes.
- **Mobile:** Interactions must not capture vertical scrolling. Hover affordances need an equivalent tap, focus, or persistent cue.

**The One-Signature Rule.** A view may have one ambient or scroll-led motion sequence. Supporting sections use tactile state feedback, not repeated fade-up reveals.

**The Motion-Earns-Its-Place Rule.** If movement does not explain hierarchy, location, progress, or response, remove it.

## 5. Components

Tactile, expansive, and generously rounded. Containers embrace 3xl geometries and elements feel touch-friendly.

### Buttons
- **Shape:** Tactile rounded corners (12px, `rounded-xl`).
- **Primary:** Solid Terracotta (#B84E3A) fill, white text, 14px semibold, `12px 20px` padding, Card shadow at rest.
- **Hover / Focus:** Lifts `-1px`, shadow deepens to Float.
- **Secondary (Ghost):** White fill, 1px `navy/20` border, Navy text; hover darkens border and adds a light navy wash.

### Cards / Containers
- **Corner Style:** Expansive curves (`rounded-3xl` for main sections, `rounded-xl` for inner blocks).
- **Background:** Warm Paper (#FFF9EF) or Shell (#F2EEE8) for contained cards; page-level sections use the translucent atmosphere classes so the wood canvas remains visible.
- **Shadow Strategy:** Card shadow at rest, Float on hover.
- **Border:** Optional 1px Line (#E5DDD2) hairline where separation is needed without shadow.

### Navigation
- **Store Header:** Sticky warm translucent Cream with backdrop blur and a Line bottom border. Serif Crimson wordmark with a tracked uppercase subtitle.

## 6. Do's and Don'ts

### Do:
- **Do** use expansive geometries like `rounded-3xl` for structural containers.
- **Do** keep Terracotta (#B84E3A) to ~10% of any screen — it means action and nothing else.
- **Do** pair Fraunces storytelling headlines with Source Sans 3 body/UI.
- **Do** use a global 125% scale for a confident, accessible presence.
- **Do** preserve the light-mode wood canvas and use translucent structural bands over it.

### Don't:
- **Don't** use generic Shopee/Lazada seller pages: badge spam, neon discount stickers, cluttered listing grids, and screenshot-based trust.
- **Don't** use loud dropship / deal sites: countdown timers, "ONLY 2 LEFT!!" fake scarcity, gradient buttons, and manufactured urgency.
- **Don't** use cold SaaS / dashboard templates: Inter-for-everything, purple gradients, card-in-card nesting, and the soulless-startup look.
- **Don't** replace the storefront canvas or full-width light-mode sections with pure white.
- **Don't** use literal Italian-flag clichés (tricolore stripes everywhere, Tuscan-villa stock, pizza-parlor kitsch).
