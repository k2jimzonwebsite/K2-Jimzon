import { expect, test } from '@playwright/test'
import { readFile, stat } from 'node:fs/promises'

// The Pasabuy and Wholesale backdrops are decoration on pages whose real job is
// a form. Everything pinned here exists to stop that decoration from becoming
// expensive, loud, or unreadable later — the three ways an ambient video goes
// wrong long after someone approved how it looked.

const component = () => readFile('src/components/AmbientBackdrop.jsx', 'utf8')
const css = () => readFile('src/index.css', 'utf8')

test('the blur is baked into the asset, never filtered at runtime', async () => {
  const [styles, prep] = await Promise.all([
    css(),
    readFile('scripts/prepare-ambient-video.mjs', 'utf8'),
  ])

  // A CSS filter over a playing video repaints every frame on the GPU. It also
  // costs nothing to get wrong, which is why it needs a test rather than a
  // comment: the visual result looks identical on a development laptop.
  const block = styles.slice(styles.indexOf('.ambient-backdrop {'), styles.indexOf('.store-atmosphere {'))
  expect(block).not.toMatch(/filter:\s*blur/)
  expect(block).not.toMatch(/backdrop-filter/)

  expect(prep).toContain('gblur=sigma=')
  expect(prep).toContain("'-an'") // no audio on a background clip
})

test('nothing downloads a video on a phone or under reduced motion', async () => {
  const source = await component()

  // Hiding a video in CSS still downloads it. The element must not be rendered
  // at all, which is what keeps this off a mobile data plan.
  expect(source).toContain("window.matchMedia('(min-width: 768px)')")
  expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')")
  expect(source).toContain('setPlaysVideo(wide.matches && !still.matches)')
  expect(source).toContain('{playsVideo ? (')
  // Both media queries are re-evaluated, not read once at mount.
  expect(source).toContain("wide.addEventListener('change', decide)")
  expect(source).toContain("still.addEventListener('change', decide)")
})

test('autoplay is made to actually happen, and its failure is survivable', async () => {
  const source = await component()

  // React applies `muted` as a property after attach, so the browser judges its
  // autoplay policy against an unmuted element and refuses. Setting it on the
  // node is what makes muted autoplay work at all.
  expect(source).toContain('node.muted = true')
  expect(source).toContain('node.defaultMuted = true')
  // One play() on mount is not enough: readyState is often 0 and the promise
  // rejects against an element with nothing buffered.
  expect(source).toContain("node.addEventListener('canplay', attempt)")
  // A browser may still refuse. The poster is already the right fallback, so
  // the rejection is caught rather than left to surface as an unhandled one.
  expect(source).toMatch(/started\.catch\(\(\) => \{\}\)/)
})

test('the backdrop is decorative and unreachable by keyboard', async () => {
  const source = await component()

  expect(source).toContain('aria-hidden="true"')
  expect(source).toContain('tabIndex={-1}')
  // Decorative image, so an empty alt rather than a described one.
  expect(source).toContain('alt=""')
})

test('both themes are styled, and neither is left to inherit the other', async () => {
  const styles = await css()

  // Light multiplies into the wood canvas; dark has to add light instead,
  // because screen over a near-black ground is the only blend that shows.
  expect(styles).toContain(':root:not(.dark) .ambient-backdrop__media')
  expect(styles).toContain('mix-blend-mode: multiply')
  expect(styles).toContain('.dark .ambient-backdrop__media')
  expect(styles).toContain('mix-blend-mode: screen')
  // Each theme gets its own scrim, since the same one cannot serve both.
  expect(styles).toContain(':root:not(.dark) .ambient-backdrop__scrim')
  expect(styles).toContain('.dark .ambient-backdrop__scrim')
})

test('the generated media stays small enough to be decoration', async () => {
  // The sources are about 3 MB each. Blurring in the encoder is what makes them
  // affordable; if someone regenerates without it these budgets fail loudly
  // rather than quietly costing every visitor several megabytes.
  const budgets = [
    ['public/ambient/pasabuy.mp4', 200],
    ['public/ambient/pasabuy.webm', 150],
    ['public/ambient/pasabuy.jpg', 40],
    ['public/ambient/wholesale.mp4', 200],
    ['public/ambient/wholesale.webm', 150],
    ['public/ambient/wholesale.jpg', 40],
  ]
  for (const [file, maxKb] of budgets) {
    const { size } = await stat(file)
    expect(size / 1024, `${file} exceeds ${maxKb} KB`).toBeLessThan(maxKb)
  }
})

test('the Wholesale hero no longer depends on a third-party image host', async () => {
  const view = await readFile('src/views/Wholesale.jsx', 'utf8')

  expect(view).toContain('src="/ambient/wholesale-still.jpg"')
  // Explicit dimensions so the panel reserves its space and cannot shift layout.
  expect(view).toContain('width="1280"')
  expect(view).toContain('height="720"')
  // The hotlink and its now-unused import are both gone.
  expect(view).not.toContain('LIFESTYLE')
  expect(view).not.toContain('unsplash')
})

test('both pages contain the backdrop rather than letting it escape', async () => {
  const [pasabuy, wholesale] = await Promise.all([
    readFile('src/views/Pasabuy.jsx', 'utf8'),
    readFile('src/views/Wholesale.jsx', 'utf8'),
  ])

  for (const [name, view] of [['pasabuy', pasabuy], ['wholesale', wholesale]]) {
    expect(view).toContain('AmbientBackdrop')
    // `isolate` gives the absolute backdrop a stacking context to sit in, and
    // the content is lifted above it. Without both, the backdrop either covers
    // the page or escapes its section.
    expect(view, `${name} needs an isolated positioned container`).toContain('relative isolate')
    expect(view, `${name} must lift its content above the backdrop`).toContain('relative z-10')
  }
})
