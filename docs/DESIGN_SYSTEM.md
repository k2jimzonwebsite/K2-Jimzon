# K2 Jimzon — Design System & Visual Guidelines

## 1. Design Philosophy

K2 Jimzon employs two purpose-built design systems tailored to their distinct audiences:

1. **Customer Storefront — "Luxury Wood & Italian Heritage"**:
   - Evokes the warmth of aged Italian walnut, espresso cafes, and high-end editorial magazines.
   - Warm, tactile, rich, and spacious.
2. **Staff Admin BOS — "High-Density Command Center"**:
   - Engineered for maximum operational speed, dense information display, zero horizontal overflow, and rapid barcode/keyboard workflows.
   - Dark canvas, crisp contrast, 44px mobile touch targets, and unmistakable status alerts.

---

## 2. Storefront Visual Tokens ("Luxury Wood Canvas")

### Color Palette
- **Canvas / Cream Background**: `#FBF9F4` (Warm Italian parchment / natural wood pulp)
- **Deep Navy Text & Borders**: `#0C1829` (Primary typography, high-contrast structural lines)
- **Soft Navy Secondary**: `#2C3E55` (Secondary text, subtitles, meta-labels)
- **Italian Olive Green Accent**: `#2D4F38` (Provenance badges, in-stock indicators, organic highlights)
- **Antique Gold / Ochre**: `#C69232` / `#D4A373` (Featured accents, VIP badges, selection rings)
- **Warm Terracotta Alert**: `#A94442` (Limited availability, clearance alerts, error boundaries)

### Typography
- **Headings**: Editorial serif styling (Playfair Display / Cormorant Garamond aesthetic) with generous letter-spacing.
- **Body & Controls**: Clean, legible modern sans-serif (Inter / System Sans) with comfortable line-heights.

### Tactile Interactions
- **Hover Transitions**: Subtle scale and smooth opacity shifts (150ms–250ms ease-out).
- **Reduced-Motion Respect**: All motion declarations honor `@media (prefers-reduced-motion: reduce)`.

---

## 3. Admin BOS Visual Tokens ("High-Density Command")

### Color Palette
- **Deep Slate Canvas**: `#080B11` / `#0D1117` (Deep dark-mode background)
- **Card Surface**: `#131924` (Subtle dark elevated surface)
- **Border / Grid Line**: `#212C3D` (Crisp 1px boundary lines)
- **Status Indicators**:
  - **Normal / Operational**: Emerald (`#10B981`)
  - **Warning / Review Required**: Amber (`#F59E0B`)
  - **Critical / Quarantined / Error**: Crimson (`#EF4444`)
  - **Informational / In Transit**: Sky Blue (`#38BDF8`)

### Ergonomics & Mobile Constraints
- **44px Minimum Touch Targets**: Critical actions (scan, confirm, submit, close) maintain 44px minimum touch boundaries on mobile screens.
- **375px Viewport Safety**: All modals, inventory grids, and intake wizards must collapse gracefully down to 375px with zero horizontal page scroll.
- **Density & Keyboard Navigation**: Desktop views support keyboard navigation, arrow keys, and hotkeys (`Esc` to dismiss, `Ctrl+K` for command palette).
