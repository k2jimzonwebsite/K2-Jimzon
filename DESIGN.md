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

### Mandatory four-skill design workflow

Every storefront or admin task involving UI, UX, responsive behavior,
typography, color, interaction, motion, navigation, forms, tables, charts, or
interface states uses the complete design combination: `ui-ux-pro-max`,
`impeccable`, `design-taste-frontend`, and `emil-design-eng`.

The skills refine this existing system; they do not replace it. Begin with the
user task, operational truth, `PRODUCT.md`, this document, current components,
and mobile context. Apply accessibility/security first, preserve the storefront
wood/editorial identity, keep admin density readable and fast, and use motion
only when it explains hierarchy, progress, spatial relationship, or feedback.
Frequent and keyboard-driven staff actions remain instant. Reduced motion and
complete loading, empty, error, permission, conflict, and recovery states are
mandatory.

### Admin phone-intake interaction contract

Product intake preserves the compact Admin BOS visual language while presenting
one operational decision at a time. Required actions use at least 44px touch
targets; camera/file controls show checking/uploading versus server-verified state;
Next remains disabled until the server-backed gate is satisfied; and failures
appear in one persistent inline recovery panel rather than browser alerts.
Exact duplicate, possible variant, flight manifest, opening reconciliation, and
publication denial are visually distinct states. Motion is limited to brief
upload/progress feedback and respects reduced-motion behavior. A disabled
supplier-receipt option is labeled Pending rather than appearing functional.
At phone width, inventory fields collapse to one column and every frequent action
retains a 44px target. Expected flight-manifest quantity must never be labelled as
received stock. Offline state stays visible, blocks server mutations, and explains
reconnection; camera and clipboard denial offer explicit fallbacks. Completion
copy is derived from the authoritative session result and cannot claim a first
source merely because the staff member reached the final review screen.
If a private upload cannot be registered or removed, one persistent amber
recovery panel explains that cleanup is queued, exposes a 44px **Retry file
cleanup** action, and blocks forward progress and new file selection. The panel
never displays the private object path. It clears only after the server confirms
the durable cleanup record is complete; a provider or completion-write failure
keeps the same recoverable state without decorative motion.

### Admin product-media upload interaction contract

Product-media upload uses the established dense Admin product register. The
picker names JPEG, PNG, and WebP plus the 4 MB limit before selection; checking,
uploading, partial success, and failure are announced without replacing prior
successful images; Retry reuses the unfinished files; and Remove remains a
44px keyboard/touch action rather than a hover-only control. Unsafe files show
one inline recovery message, raw URL entry is not an upload path, and small
screens retain a two-column preview grid without horizontal overflow. Motion is
limited to operational progress and respects reduced motion.
Assignment is a separate, reasoned save with stable retry identity. Closing with
unsaved changes presents explicit Keep editing and Discard choices. Published or
Live products cannot save without a primary photo. Product cards expose one
labeled 44px Photos action; the broad details editor does not duplicate media
controls or imply that its ordinary save has media authority.

Unused public uploads are an Admin maintenance workflow, not a diagnostic dump.
The Inventory header exposes the action only to Admin users when the protected
BFF is enabled. Its mobile-first dialog explains the one-hour safety window,
shows bounded path/type/size/time evidence, requires explicit selection and a
reason, and keeps provider ambiguity visible as a retryable pending state. It
uses 44px controls, inline status, keyboard dismissal when idle, and disables
motion-heavy loading under reduced-motion preferences.

### Admin authentication interaction contract

Admin authentication uses the compact Admin BOS product register and keeps
security state explicit. Google sign-in from any deployed surface returns to the
single public Admin origin. A valid staff session that requires AAL2 advances
directly to the labeled six-digit authenticator form; it never drops back to the
credential form without explanation. Missing Admin/Staff permission, role-check
failure, invalid credentials, callback failure, and authenticator failure are
distinct inline states. Controls retain 44px minimum targets, visible focus,
disabled/loading feedback, and no decorative transition that delays staff entry.
An invited staff account without a verified factor advances from credentials to
one pending-session setup step. It shows a bounded QR image, a one-attempt manual
key, explicit privacy/recovery copy, and a labeled six-digit field; verification
is the only primary action and cannot enable until all six digits are present.
Restart returns to credentials, provider failure preserves a readable inline
error, and reduced motion removes the brief crossfade without hiding content.
OAuth return never preserves a stale `Opening Google` loading state after a
browser back/forward-cache restoration, and callback credentials are removed
from the visible URL before the staff decision is presented.

Password recovery stays inside the same compact Admin BOS sign-in surface. The
credential step exposes one labeled `Forgot password?` action. Requesting a link
uses a visible staff-email label and always presents the same non-enumerating
check-email state. A verified callback removes its safe `recovery=ready` marker
from the visible URL, then shows labeled new-password and confirmation fields,
the 12-character minimum, and the consequence that prior staff sessions close.
Mismatch, expiry, invalid link, provider failure, loading, and completion are
distinct inline states. The successful state sends staff back to a fresh
password-and-authenticator sign-in. All controls remain at least 44px, the form
fits 375px without horizontal overflow, and frequent auth actions use only
brief state feedback that disappears under reduced motion.

When the secure Admin BFF requires bot defense, credential login and recovery
email request each show one compact, labeled `Security check` block inside the
existing form immediately before the primary action. It uses the Admin surface,
border, Source Sans, and blue-action system rather than Storefront styling;
failure remains inline and every request attempt resets the challenge. MFA,
recovery-link verification, and password completion do not repeat the widget.

### Storefront guest-inbox interaction contract

The guest inbox preserves the storefront wood/editorial system and does not
imitate a marketplace chat product. It is available only when the secure guest
BFF is active. The surface explains that no account is required and that access
belongs to this browser's private expiring grant; the raw grant is never shown.
Conversation controls use 44px or larger targets, message copy is readable at
phone widths, long text wraps safely, and loading, empty, denied/expired, send
failure, retry, and success are distinct. It must never imply that Shopee,
TikTok Shop, Lazada, payment, or courier messaging is connected.
Successful Pasabuy submission places one 44px `Open request chat` action inside
the recorded receipt state when this boundary is active. The inbox refreshes in
the background only while visible, preserves the current conversation if a
refresh fails, and identifies automatic refresh without claiming instant staff
response or provider delivery.
Contact us is always the fifth top-level storefront destination on desktop and
mobile. It contains the message entry and owner-confirmed channel directory even
when the secure guest BFF is inactive. Inactive mode opens a prefilled email
draft and clearly says it has not been sent; active mode uses the secure Website
conversation form. Public phone, Viber, and WhatsApp values are omitted until
confirmed. Staff is never labeled online without a fresh authorized server
presence signal.
Production Storefront navigation never reveals workstation prototype controls
through a URL hash. In particular, it cannot show a direct password form or imply
that signing in unlocks VIP/tier pricing before verified account and commercial-
term boundaries exist. Development-only rails remain visually and structurally
outside the isolated Storefront artifact.
When the browser has no conversation, the same inbox becomes the `Message K2`
start surface instead of instructing the customer to order first. It uses visible
name, contact, and message labels, at least one contact method, bot-check and
inline recovery states, a 48px submit action, and the existing warm storefront
tokens. Contact us links to the existing scoped inbox after a secure conversation
exists; mobile keeps the five-item labeled navigation limit.

### Storefront customer-account interaction contract

Customer account is an optional secondary utility in the Storefront header; it
does not displace or add to the five-item mobile primary navigation. The surface
uses the established wood/editorial brand register, Fraunces/Source Sans pairing,
Terracotta action, Olive trust, 12–16px surfaces, visible labels, 44px minimum
targets, and no decorative motion. It must work at 375px and landscape without
horizontal overflow and remain legible in both themes.

Entry is passwordless email link or phone code with explicit checking, sent,
code, invalid, expired/provider-failure, offline, and recovery states. An account
never implies VIP or wholesale terms and never becomes required for checkout,
Pasabuy, or messaging. After sign-in, unlinked history is a deliberate claim
state—not an empty fabricated account. Claim copy explains verified contact,
conflict review, and browser guest scope. Linked history separates orders,
Pasabuy, and customer-visible Website messages; unavailable is not zero, staff
notes never render, and replies state that external-channel delivery is not
implied. Refresh, sign-out, empty, partial/error, retry, and offline states remain
inside the workflow. The four required design skills refine this existing K2
system; suggestions for liquid glass, gold palettes, perpetual motion, or extra
navigation are rejected where they conflict with identity, performance, truth,
or mobile usability.

### Storefront wholesale-inquiry interaction contract

Blue identifies wholesale/business context; green must not style an unsent
draft as operational success. While the canonical inquiry boundary is inactive,
the form may prepare an email draft only. The resulting state must say that K2
has not received or recorded it until the customer sends it, expose no fabricated
reference, save no application in localStorage, and make no response-time,
eligibility, price, stock, credit, or delivery promise. The first inquiry asks
only for the business need, contact, volume band, target items, and delivery
city/area. Registration documents and tax identifiers wait for an attributable
staff request through a confirmed channel. Every visible label is associated
with its control, actions remain at least 44px, and the 375px surface cannot
overflow horizontally.

### Admin Wholesale inquiry-review interaction contract

Admin presents inquiry need, attributable contact, volume, delivery area, and
status as a compact mobile card and a readable desktop table. Every record says
that it carries no commercial approval. Review opens a focused bottom-sheet on
phone and centered dialog on larger screens; it names the public `WI-*`
reference, states the unavailable approval powers, limits status to triage
states, and requires a reason before its 44px primary action enables. Escape,
backdrop cancel, reduced motion, loading, empty, unavailable, and failed-command
states preserve the staff's context. Blue continues to mean Wholesale context,
not approval or success.

### Admin Globe and review-claim interaction contract

Globe configuration and customer review claims use the Admin BOS product
register, not the storefront's decorative Globe treatment. Product visibility
is a compact, versioned toggle that opens a reason confirmation; it never implies
that a review has been published. Review cards keep moderation status, version,
date, public copy, attribution, and private evidence visually distinct. Creating
or correcting copy uses a single readable form and always saves a draft.
Publishing and withdrawal are separate 44px actions with focused reason dialogs;
withdrawal is never styled as deletion. On phones, cards remain vertical and
confirmations become bottom sheets without horizontal overflow. Loading,
permission, empty, validation, conflict, success, and retry states retain staff
context. Motion is limited to direct state feedback, respects reduced motion,
and never slows repeated moderation.

### Admin supplier and procurement interaction contract

Procurement uses the Admin BOS product register and distinguishes supplier
identity from purchasing authority. The surface states when purchase-order
creation, approval, receiving, FX, or settlement is unavailable. Desktop uses a
compact supplier register; phones use vertical cards without a horizontal-table
dependency. Adding a supplier opens a focused bottom sheet with 44px controls,
explicit identity-only consequence, bounded contact/lead-time fields, and a
required reason/source. Loading, empty, permission, duplicate, validation,
success, and retry states preserve context. No supplier action is styled as price
approval, purchase commitment, receipt, or payment, and reduced motion remains
the default for frequent staff work.

Secure Inventory keeps the same dense product register but treats unavailable
write authority as a complete state. Product reads and barcode checks use fixed
server projections, Add Product opens phone-first intake, and Smart Paste stays
a review/handoff surface. Generic edit or bulk-status controls must preserve the
staff context and explain that no change was saved until a reasoned server
command exists; they never fall back to a browser write. Refresh is bounded to
visible pages and frequent actions retain 44px targets and reduced motion.

### Admin channel-readiness interaction contract

Channel readiness uses the Admin BOS product register and separates internal
request reconciliation from external connector status. Five channel cards show
state, bounded catalog evidence, last verified event, and exactly one next safe
action; external marketplaces always state when they are not connected.
Website/Pasabuy verification opens a focused phone bottom sheet or centered
desktop dialog with a canonical public reference, required reason, 44px actions,
initial close focus, and Escape recovery. Connector checklists disclose no
secret values and never style configuration steps as operational success.
Loading, empty, error, retry, and successful refresh states preserve context;
polling is bounded to visible pages and motion never slows repeated staff work.

### Admin staff-access interaction contract

Staff access uses the Admin BOS product register and treats role changes as
privilege changes, not casual inline edits. The register shows minimal identity,
current role, self state, and one next action per account. Selecting a new role
opens a focused phone bottom sheet or centered desktop dialog with the exact
consequence, required reason, 44px actions, initial close focus, and Escape
recovery; final-Admin denial preserves the current selection and context. Delete
PIN set/rotation requires matching numeric inputs and an attributable reason,
but never renders or stores the value in UI history. Unavailable invitation or
MFA-enrollment capabilities remain visibly disabled with plain recovery copy.
When the separately gated secure invitation transport is active, the invitation
form requires a 3–500 character attributable reason, retains the entered values
through failure or ambiguous timeout, and clears them only after a confirmed
reason-bound receipt. The surface uses the existing Admin vector icon set rather
than emoji and keeps every repeated action at least 44px.
When secure active-factor replacement is enabled, Active MFA exposes one
`Replace authenticator` action. It opens a focused phone bottom sheet or centered
desktop dialog with initial close focus, Escape recovery, explicit lost-factor
stop copy, a 3–500 character reason, bounded QR/manual key, and a labelled
six-digit input. The old factor is described as active until verification
succeeds; retry/retirement uncertainty keeps the setup context rather than
claiming completion. Controls remain at least 44px, use exact short property
transitions, and respect reduced motion.
Loading, empty, permission, conflict, success, and retry states avoid decorative
motion and horizontal overflow at 375px.

### Admin system-readiness interaction contract

System Readiness is a compact Admin BOS evidence sheet, not a monitoring
dashboard. It shows only the protected request, current AAL2 session, database
boundary, and named-contract presence as available/action-needed checks. Raw
provider errors, URLs, staff identifiers, event rows, secrets, latency numbers,
throughput, uptime, and inferred deployment state never render. On phones it is
a scrollable bottom sheet; on larger screens it is centered. The close action
receives initial focus, Escape closes safely, every action is at least 44px, and
loading/unavailable states preserve the disclaimer that booleans are not live
provider or production proof.

### Admin flight-scan interaction contract

Flight scanning preserves the compact Admin BOS product system. Milan packing
and Manila receiving remain visually and verbally distinct, with separate
expected, scanned, remaining, and discrepancy feedback; the interface never
copies a Milan total into Manila. Staff can use camera, hardware-scanner input,
manual code entry, and box/line selection without changing operational meaning.
A pending scan prevents overlapping submissions, the visible count changes only
after server confirmation, and a failed-response retry retains the same
operation key. State changes use a focused reason dialog rather than a browser
prompt. Finalization stays open on failure, clearly requires a discrepancy note
when counts vary, uses 44px or larger primary targets, and avoids decorative
motion that would slow repeated scans. Reduced-motion and keyboard use remain
first-class.

### Admin lot and expiry interaction contract

The lot editor uses the Admin BOS Source Sans system and shows physical,
reserved, and sellable quantities as separate facts. FEFO order is structural;
attention flags never reorder dispatch. On phones, each lot becomes one readable
vertical work unit with labeled 44px controls and no horizontal dependency.
Positive stock visibly requires box, batch, expiry, hub, and custodian. Clearance
is an inline, reasoned 31–89 day decision—not a prompt or decorative warning.
Loading uses stable skeleton rows; empty, denied, validation, conflict, and retry
states remain inside the workflow. Frequent edits have only 150ms press/focus
feedback, no entrance choreography, emoji icons, pulsing expiry warnings, or
layout animation. The final action states exactly that it records a reconciliation
and remains disabled until a specific reason is present.

### Admin coupon interaction contract

Coupon administration uses the Admin BOS Source Sans system and treats every
promotion change as a financial configuration decision, not a playful marketing
effect. Desktop uses the established compact register; phones use readable cards
with no horizontal-table dependency. Codes, rules, windows, usage, and state stay
visible before the action. Create, activate, pause, and archive require labeled
44px controls, a specific inline reason, disabled/loading feedback, safe recovery,
and explicit consequences. Archive is confirmed in a focused reason dialog and
never presented as deletion. Loading, empty, permission, validation, duplicate,
conflict, and retry states remain distinct. No emoji, raw provider errors,
decorative entrance motion, or urgency theater is permitted.

### Admin customer-directory interaction contract

The customer directory uses the Admin BOS Source Sans/tokens and explains its
identity mode before showing metrics. Canonical guest, account, contact, and
channel facts remain visually distinct; matching contact text is never styled as
a verified merge. Desktop uses a compact register and phones use vertical cards
with 44px refresh controls and no horizontal-table requirement. Operational
counts render only when their complete source succeeds; unavailable is not shown
as zero. Loading, empty, permission, partial-data, and error states stay visible
without raw provider messages. The surface is an operational identity directory,
not a marketing broadcast list, and adds no decorative motion or invented action.

### Admin product-master interaction contract

Inventory uses the Admin BOS Source Sans/tokens and separates content edits,
media assignment, lifecycle decisions, physical lots, and permanent deletion.
All five lifecycle states remain visible; a specific reason is collected in a
focused phone bottom sheet before a signed transition, and Live readiness is
stated before confirmation. Detail saves require a specific inline reason and
surface stale-version conflicts without discarding the editor. Staff without
Admin authority see disabled 44px edit/status/delete controls with an explicit
permission explanation. Numeric fields retain numeric input semantics. Loading,
empty, permission, validation, not-found, readiness, transition, conflict, busy,
success, and retry states remain distinct and never expose provider errors.
Deletion stays visually separate and retains PIN confirmation. Frequent actions
use only short press/focus feedback, respect reduced motion, and add no entrance
choreography or perpetual animation.

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
