import { expect, test } from '@playwright/test'
import { readdir, readFile } from 'node:fs/promises'

const adminViews = new URL('../src/views/admin/', import.meta.url)

async function modalFiles() {
  return (await readdir(adminViews))
    .filter((name) => name.endsWith('Modal.jsx'))
    .sort()
}

test('every Admin modal uses the shared dialog primitive', async () => {
  const files = await modalFiles()

  expect(files).toHaveLength(18)

  for (const file of files) {
    const source = await readFile(new URL(file, adminViews), 'utf8')
    expect(source, `${file} must import AdminDialog`).toMatch(
      /import\s+\{\s*AdminDialog\s*\}\s+from\s+['"]\.\.\/\.\.\/components\/ui\/AdminDialog['"]/,
    )
    expect(source, `${file} must render AdminDialog`).toContain('<AdminDialog')
    const usage = source.match(/<AdminDialog\b[^>]*>/s)?.[0] || ''
    expect(usage, `${file} must connect its close behavior`).toContain('onClose=')
    expect(usage, `${file} must expose an accessible name`).toContain('labelledBy=')
  }
})

test('the obsolete modal shell cannot become a competing primitive', async () => {
  const adminKit = await readFile(new URL('../src/components/ui/adminKit.jsx', import.meta.url), 'utf8')
  expect(adminKit).not.toContain('ModalShell')
})

test('the shared dialog owns the complete keyboard and focus lifecycle', async () => {
  const source = await readFile(
    new URL('../src/components/ui/AdminDialog.jsx', import.meta.url),
    'utf8',
  )

  expect(source).toMatch(/role:\s*['"]dialog['"]/) 
  expect(source).toMatch(/['"]aria-modal['"]:\s*['"]true['"]/) 
  expect(source).toContain("event.key === 'Escape'")
  expect(source).toContain("event.key !== 'Tab'")
  expect(source).toContain('initialFocusRef')
  expect(source).toContain('previousFocusRef.current?.focus')
  expect(source).toContain("document.querySelectorAll('[data-admin-dialog=\"true\"]')")
})

test('Admin operational text never falls below the 12px product-register floor', async () => {
  const roots = [
    new URL('../src/views/admin/', import.meta.url),
    new URL('../src/components/admin/', import.meta.url),
  ]
  const sources = []
  for (const root of roots) {
    const files = (await readdir(root, { recursive: true })).filter((name) => name.endsWith('.jsx'))
    sources.push(...await Promise.all(files.map((name) => readFile(new URL(name.replaceAll('\\', '/'), root), 'utf8'))))
  }
  expect(sources.join('\n')).not.toMatch(/text-\[(?:10|11)px\]/)
})

test('Admin recovery flows never use blocking browser dialogs', async () => {
  const files = [
    'InventoryGrid.jsx',
    'SmartPasteModal.jsx',
    'OmniOperationsHub.jsx',
  ]
  const sources = await Promise.all(
    files.map((file) => readFile(new URL(file, adminViews), 'utf8')),
  )
  const combined = sources.join('\n')

  expect(combined).not.toMatch(/\b(?:window\.)?(?:alert|prompt|confirm)\s*\(/)
  expect(sources[2]).toContain('<AdminDialog')
  expect(sources[2]).toContain('id="handover-note"')
})

test('Admin owns one responsive page heading and a main workspace landmark', async () => {
  const admin = await readFile(new URL('Admin.jsx', adminViews), 'utf8')
  const childViews = ['ConsignmentManager.jsx', 'Kanban.jsx', 'StaffPermissionManager.jsx', 'Suppliers.jsx']
  const children = await Promise.all(childViews.map(file => readFile(new URL(file, adminViews), 'utf8')))

  expect(admin).toContain('<main className="min-w-0 flex-1 flex flex-col h-full overflow-hidden">')
  expect(admin).toMatch(/lg:hidden[\s\S]*?<h1/)
  expect(children.join('\n')).not.toContain('<h1')
})
