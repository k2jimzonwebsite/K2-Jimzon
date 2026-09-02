import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const sheet = readFileSync('src/views/admin/Sheet.jsx', 'utf8')

/**
 * Two reported faults, pinned so they cannot come back.
 *
 * Ticking Published reloaded the whole sheet and lost the reader's place. The
 * cause was a realtime subscription wired straight to `fetchProducts`: a write
 * to `products` raises a change event for its own author, so every edit
 * triggered a full reload with a loading state, and the row someone was working
 * on had to be found again.
 */

test.describe('sheet does not reset itself', () => {
  test('realtime patches one row instead of reloading everything', () => {
    // The subscription must not call the loader. This is the exact regression.
    expect(sheet).not.toMatch(/table:\s*'products'\s*\}\s*,\s*fetchProducts\s*\)/u)
    expect(sheet).toContain("table: 'products' }, applyRealtimeChange)")
  })

  test('a realtime change is folded in by SKU, not appended blindly', () => {
    const handler = /const applyRealtimeChange = \(payload\) => \{([\s\S]*?)\n  \}/.exec(sheet)?.[1] ?? ''
    expect(handler).toBeTruthy()
    // All three event kinds are handled; a missing DELETE branch would leave
    // removed products on screen until a manual reload.
    expect(handler).toContain("payload?.eventType === 'DELETE'")
    expect(handler).toContain('findIndex(row => row.sku === incoming.sku)')
    expect(handler).toContain('prev.filter(row => row.sku !== removed.sku)')
  })

  test('a colleague cannot overwrite the cell being typed in', () => {
    expect(sheet).toContain('editingCellRef.current = { sku: r.sku, field }')
    expect(sheet).toContain('editingCellRef.current = null')
    const handler = /const applyRealtimeChange = \(payload\) => \{([\s\S]*?)\n  \}/.exec(sheet)?.[1] ?? ''
    expect(handler).toContain('editingCellRef.current')
    expect(handler).toContain('[editing.field]: prev[at][editing.field]')
  })

  test('a background refresh leaves the rows on screen', () => {
    // `setLoading(true)` swaps the table for a loading state, which throws away
    // the scroll position for a list about to look almost identical.
    expect(sheet).toContain('if (!background) setLoading(true)')
    expect(sheet).not.toMatch(/onProductCreated=\{fetchProducts\}/u)
    expect(sheet).toMatch(/onProductCreated=\{\(\) => fetchProducts\(\{ background: true \}\)\}/u)
    expect(sheet).toMatch(/onEnriched=\{\(\) => fetchProducts\(\{ background: true \}\)\}/u)
  })
})

test.describe('sheet keyboard navigation', () => {
  test('cells carry on-screen coordinates', () => {
    // Coordinates are the filtered position, so arrowing follows what is
    // actually visible rather than the unfiltered list underneath.
    const cellAttrs = [...sheet.matchAll(/data-k2-cell=\{`\$\{position\}:\$\{colIdx\}`\}/gu)]
    expect(cellAttrs.length).toBeGreaterThanOrEqual(2)
  })

  test('the handler is delegated from the scroll container', () => {
    expect(sheet).toMatch(/ref=\{tableContainerRef\}\s+onKeyDown=\{handleGridKeyDown\}/u)
  })

  test('vertical keys move, horizontal keys are left to the caret', () => {
    const handler = /const handleGridKeyDown = \(event\) => \{([\s\S]*?)\n  \}/.exec(sheet)?.[1] ?? ''
    expect(handler).toBeTruthy()
    expect(handler).toContain("['ArrowUp', 'ArrowDown', 'Enter']")
    // Left/Right inside a text box move the caret, which is what someone
    // correcting a price expects.
    expect(handler).not.toContain('ArrowLeft')
    expect(handler).not.toContain('ArrowRight')
  })

  test('dropdowns keep their own arrow behaviour', () => {
    const handler = /const handleGridKeyDown = \(event\) => \{([\s\S]*?)\n  \}/.exec(sheet)?.[1] ?? ''
    // Up and Down already mean "change the option" in a select and "move a
    // line" in a textarea. Stealing those breaks the control to add a shortcut.
    expect(handler).toContain("element.tagName === 'SELECT'")
    expect(handler).toContain("element.tagName === 'TEXTAREA'")
  })

  test('a checkbox is never asked to select its text', () => {
    const handler = /const handleGridKeyDown = \(event\) => \{([\s\S]*?)\n  \}/.exec(sheet)?.[1] ?? ''
    expect(handler).toContain("target.type !== 'checkbox'")
  })

  test('movement is scoped to the sheet, not the whole document', () => {
    const handler = /const handleGridKeyDown = \(event\) => \{([\s\S]*?)\n  \}/.exec(sheet)?.[1] ?? ''
    // A document-wide lookup would jump into another sheet or a modal rendering
    // the same coordinates.
    expect(handler).toContain('tableContainerRef.current')
    expect(handler).not.toContain('document.querySelector')
  })
})
