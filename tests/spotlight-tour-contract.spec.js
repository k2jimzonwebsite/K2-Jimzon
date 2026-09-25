import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { SPOTLIGHT_TOURS, CHATGPT_PROMPT_TEMPLATES, generateChatGPTListingPrompt } from '../src/components/admin/tour/tourData.js'

test.describe('Admin BOS Interactive Spotlight Tour Contract Suite', () => {
  test('SPOTLIGHT_TOURS defines all 8 operational lifecycles', () => {
    const requiredKeys = [
      'manual_inventory',
      'auto_inventory',
      'cross_border_lifecycle',
      'inventory_handover',
      'monthly_count',
      'new_order',
      'pasabuy_lifecycle',
      'channel_integration_lifecycle',
    ]

    requiredKeys.forEach((key) => {
      expect(SPOTLIGHT_TOURS, `SPOTLIGHT_TOURS must define ${key}`).toHaveProperty(key)
      const tour = SPOTLIGHT_TOURS[key]
      expect(tour.title.trim().length).toBeGreaterThan(5)
      expect(tour.theme.trim().length).toBeGreaterThan(2)
      expect(tour.steps.length).toBeGreaterThanOrEqual(3)
    })
  })

  test('All tour steps define valid directives, explanations, and registered sections', () => {
    const validSections = [
      'inventory',
      'consignments',
      'fulfillment',
      'owner_count_close',
      'pasabuy',
      'channel_integrations',
      'hub',
    ]

    Object.values(SPOTLIGHT_TOURS).forEach((tour) => {
      tour.steps.forEach((step, idx) => {
        expect(step.stepNumber).toBe(idx + 1)
        expect(step.title.trim().length).toBeGreaterThan(3)
        expect(step.directive.trim().length).toBeGreaterThan(5)
        expect(step.sopAction.trim().length).toBeGreaterThan(10)
        expect(step.whatToClick.trim().length).toBeGreaterThan(5)
        expect(step.exitCriteria.trim().length).toBeGreaterThan(5)
        if (step.targetSelector) {
          expect(step.targetSelector).toMatch(/^\[data-tour="[a-z0-9-]+"]$/)
        }
        expect(validSections, `Step ${step.id} has valid section`).toContain(step.targetSection)
      })
    })
  })

  test('ChatGPT Prompt Templates satisfy catalog and schema requirements', () => {
    expect(CHATGPT_PROMPT_TEMPLATES.length).toBeGreaterThanOrEqual(4)
    const keys = CHATGPT_PROMPT_TEMPLATES.map((t) => t.key)
    expect(keys).toContain('dolci')
    expect(keys).toContain('pasta')
    expect(keys).toContain('caffe')
    expect(keys).toContain('olio')

    CHATGPT_PROMPT_TEMPLATES.forEach((tpl) => {
      expect(tpl.prompt).toContain('JSON')
      expect(tpl.prompt).toContain('country_of_origin')
      expect(tpl.prompt).toContain('Italy')
      expect(tpl.prompt).toContain('allergens')
      expect(tpl.prompt).toContain('ingredients')
    })

    const generated = generateChatGPTListingPrompt('dolci', 'Cantucci alle Mandorle 500g')
    expect(generated).toContain('Cantucci alle Mandorle 500g')
    expect(generated).toContain('Dolci')
  })

  test('InventoryGrid provides all required data-tour selector anchors', async () => {
    const gridSource = await readFile(path.join(process.cwd(), 'src/views/admin/InventoryGrid.jsx'), 'utf8')
    const requiredAnchors = [
      'data-tour="inventory-actions"',
      'data-tour="add-inventory-btn"',
      'data-tour="scan-box-btn"',
      'data-tour="add-product-btn"',
      'data-tour="search-input"',
    ]
    requiredAnchors.forEach((anchor) => {
      expect(gridSource, `InventoryGrid.jsx must define anchor ${anchor}`).toContain(anchor)
    })
  })

  test('Inventory intake entry points start with a scan in both catalog modes', async () => {
    const inventory = await readFile(path.join(process.cwd(), 'src/views/admin/InventoryGrid.jsx'), 'utf8')
    const sheet = await readFile(path.join(process.cwd(), 'src/views/admin/Sheet.jsx'), 'utf8')
    const scanner = await readFile(path.join(process.cwd(), 'src/views/admin/ScanToAiModal.jsx'), 'utf8')
    expect(inventory).toContain('onClick={openIntake}')
    expect(sheet).toContain('onClick={openIntake}')
    expect(inventory).toContain('onOpenSmartPaste=')
    expect(sheet).toContain('onOpenSmartPaste=')
    expect(scanner).toContain('onExistingProduct(existing)')
  })

  test('AdminToolsWidget enforces clean SVG icons, backdrop overlay, and close button', async () => {
    const toolsSource = await readFile(path.join(process.cwd(), 'src/views/admin/AdminToolsWidget.jsx'), 'utf8')
    // No emoji in TOOLS array
    expect(toolsSource).not.toContain("icon: '⚙️'")
    expect(toolsSource).not.toContain("icon: '💰'")
    expect(toolsSource).not.toContain("icon: '🧮'")
    expect(toolsSource).not.toContain("icon: '📦'")
    expect(toolsSource).not.toContain("icon: '📝'")
    // Has backdrop
    expect(toolsSource).toContain('bg-black/60 backdrop-blur-sm')
    // Has close button
    expect(toolsSource).toContain('aria-label="Close tools menu"')
    // Clean SVG icons used
    expect(toolsSource).toContain('SettingsIcon')
    expect(toolsSource).toContain('CalculatorIcon')
  })

  test('Admin.jsx mounts SpotlightTourOverlay, TourSelectionModal, and Add inventory action', async () => {
    const adminSource = await readFile(path.join(process.cwd(), 'src/views/admin/Admin.jsx'), 'utf8')
    expect(adminSource).toContain('SpotlightTourOverlay')
    expect(adminSource).toContain('TourSelectionModal')
    expect(adminSource).toContain('handleStartTour')
    expect(adminSource).toContain('Guided Tours')
    expect(adminSource).toContain("launchInventoryTool('add-inventory')")
    expect(adminSource).toContain('onStartTour={handleStartTour}')
    expect(adminSource).not.toContain('<span>🗺️</span>')
  })

  test('Enforces strict typography floor (>=12px) across tour and chooser components', async () => {
    const tourFiles = [
      'src/components/admin/tour/SpotlightTourOverlay.jsx',
      'src/components/admin/tour/TourSelectionModal.jsx',
      'src/components/admin/tour/tourData.js',
      'src/views/admin/AdminToolsWidget.jsx',
    ]

    for (const file of tourFiles) {
      const content = await readFile(path.join(process.cwd(), file), 'utf8')
      expect(content, `${file} must not contain text-[9px]`).not.toContain('text-[9px]')
      expect(content, `${file} must not contain text-[10px]`).not.toContain('text-[10px]')
      expect(content, `${file} must not contain text-[11px]`).not.toContain('text-[11px]')
    }
  })

  test('Enforces strict touch target floor (min 44px) across tour and chooser components', async () => {
    const tourFiles = [
      'src/components/admin/tour/SpotlightTourOverlay.jsx',
      'src/components/admin/tour/TourSelectionModal.jsx',
    ]

    for (const file of tourFiles) {
      const content = await readFile(path.join(process.cwd(), file), 'utf8')
      // All interactive button elements should have min-h-11 or min-h-[44px]
      const buttonMatches = content.match(/<button[\s\S]*?<\/button>/g) || []
      expect(buttonMatches.length).toBeGreaterThan(0)
      for (const btn of buttonMatches) {
        const hasMinH11 = btn.includes('min-h-11') || btn.includes('min-h-[44px]') || btn.includes('min-h-[48px]')
        expect(hasMinH11, `Button in ${file} must have min-h-11 touch target: ${btn.slice(0, 80)}`).toBe(true)
      }
    }
  })

  test('Humanizer rules strictly enforced: no em dashes and no AI buzzwords in tour data', async () => {
    const tourDataContent = await readFile(path.join(process.cwd(), 'src/components/admin/tour/tourData.js'), 'utf8')
    
    // Zero em dashes or en dashes
    expect(tourDataContent).not.toContain('—')
    expect(tourDataContent).not.toContain('–')

    // Zero forbidden AI buzzwords
    const forbiddenBuzzwords = [
      'seamless',
      'pivotal',
      'crucial',
      'vital',
      'delve',
      'tapestry',
      'landscape',
      'testament',
      'foster',
      'enhance',
    ]
    forbiddenBuzzwords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'i')
      expect(tourDataContent, `tourData.js must not contain AI buzzword '${word}'`).not.toMatch(regex)
    })
  })

  test('Anti-emoji policy strictly enforced across tours, widgets, and updated admin views', async () => {
    const checkedFiles = [
      'src/components/admin/tour/SpotlightTourOverlay.jsx',
      'src/components/admin/tour/TourSelectionModal.jsx',
      'src/components/admin/tour/tourData.js',
      'src/views/admin/AdminToolsWidget.jsx',
      'src/views/admin/ConsignmentManager.jsx',
      'src/views/admin/OmniOperationsHub.jsx',
      'src/views/admin/PasabuyManager.jsx',
    ]

    // Common unicode emojis range
    const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u

    for (const file of checkedFiles) {
      const content = await readFile(path.join(process.cwd(), file), 'utf8')
      const match = content.match(emojiRegex)
      expect(match, `Found emoji in ${file}: ${match ? match[0] : ''}`).toBeNull()
    }
  })

  test('SpotlightTourOverlay contract enforces Option A dual-advance 4-panel surround backdrop and cross-section indicator', async () => {
    const overlayFile = await readFile(path.join(process.cwd(), 'src/components/admin/tour/SpotlightTourOverlay.jsx'), 'utf8')
    // Option A 4-panel surround backdrop structure
    expect(overlayFile).toContain('Top backdrop panel')
    expect(overlayFile).toContain('Bottom backdrop panel')
    expect(overlayFile).toContain('Left backdrop panel')
    expect(overlayFile).toContain('Right backdrop panel')
    // Target highlight frame must not intercept pointer events
    expect(overlayFile).toContain('className="fixed pointer-events-none rounded-xl')
    // Cross-section workspace indicator
    expect(overlayFile).toContain('Switching workspace to')
    // Safe keyboard handlers
    expect(overlayFile).toContain("e.key === 'Escape'")
    expect(overlayFile).toContain("e.key === 'n'")
    expect(overlayFile).toContain("e.key === 'p'")
  })
})
