import { expect, test } from '@playwright/test'
import { readFile, stat } from 'node:fs/promises'

// A silent looping clip in a band across the top of Pasabuy and Wholesale.
//
// The first version of this blurred the footage into an atmospheric backdrop.
// The owner rejected it: the clips exist to be seen, and a backdrop nobody can
// make out is cost without benefit. These contracts hold the corrected shape —
// sharp footage in its own band, with the costs that decision brings kept
// visible rather than left to drift.

const component = () => readFile('src/components/HeroVideo.jsx', 'utf8')
const css = () => readFile('src/index.css', 'utf8')
const prep = () => readFile('scripts/prepare-ambient-video.mjs', 'utf8')

test('the footage stays sharp, in the asset and at runtime', async () => {
  const [styles, script] = await Promise.all([css(), prep()])

  // Neither the encoder nor the stylesheet may quietly reintroduce the blur.
  expect(script).not.toContain('gblur')
  expect(script).toContain('const WIDTH = 1280')
  expect(script).toContain('const HEIGHT = 720')

  const block = styles.slice(styles.indexOf('.hero-video {'), styles.indexOf('.store-atmosphere {'))
  expect(block).not.toMatch(/filter:\s*blur/)
  expect(block).not.toMatch(/backdrop-filter/)
})

test('the clips are silent and stream from the first frame', async () => {
  const script = await prep()

  // Audio is dead weight on a silent hero and is enough to make some browsers
  // refuse autoplay outright.
  expect(script).toContain("'-an'")
  // faststart puts the index first, so playback can begin before the whole file
  // has arrived.
  expect(script).toContain("'-movflags', '+faststart'")
})

test('reduced motion gets a still and never fetches the video', async () => {
  const source = await component()

  // Hiding a video in CSS still downloads it, so the element must not render.
  expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')")
  expect(source).toContain('setPlaysVideo(!still.matches)')
  expect(source).toContain('{playsVideo ? (')
  // Re-evaluated rather than read once at mount.
  expect(source).toContain("still.addEventListener('change', decide)")
})

test('autoplay is made to actually happen, and its failure is survivable', async () => {
  const source = await component()

  // React applies `muted` as a property after attach, so the browser judges its
  // autoplay policy against an unmuted element and refuses.
  expect(source).toContain('node.muted = true')
  expect(source).toContain('node.defaultMuted = true')
  // One play() on mount rejects against an element with nothing buffered, which
  // leaves a permanently paused video showing its poster.
  expect(source).toContain("node.addEventListener('canplay', attempt)")
  expect(source).toMatch(/started\.catch\(\(\) => \{\}\)/)
  // A poster is always present, so something is on screen before the first frame.
  expect(source).toContain('poster={poster}')
})

test('no copy is laid over the moving footage', async () => {
  const [pasabuy, wholesale, styles] = await Promise.all([
    readFile('src/views/Pasabuy.jsx', 'utf8'),
    readFile('src/views/Wholesale.jsx', 'utf8'),
    css(),
  ])

  // Text cannot hold a contrast ratio against footage that keeps changing
  // underneath it, so the band carries no children but the media and its fade.
  const block = styles.slice(styles.indexOf('.hero-video {'), styles.indexOf('.store-atmosphere {'))
  expect(block).toContain('.hero-video__fade')

  for (const view of [pasabuy, wholesale]) {
    // Self-closing with no children: nothing can be nested over the video.
    expect(view).toMatch(/<HeroVideo[^>]*\/>/)
  }
})

test('the band is bounded at both ends of the viewport range', async () => {
  const styles = await css()

  // Never eats a laptop screen, never collapses to a strip on a phone.
  expect(styles).toContain('height: clamp(15rem, 52vh, 34rem)')
})

test('the shipped media stays within a hero budget', async () => {
  // Sharp footage costs more than the blurred version did, which was the point.
  // These ceilings keep that cost deliberate: a re-encode at a careless quality
  // setting fails here rather than quietly costing every visitor several
  // megabytes on a mobile connection.
  const budgets = [
    ['public/ambient/pasabuy.mp4', 1400],
    ['public/ambient/pasabuy.webm', 1100],
    ['public/ambient/pasabuy.jpg', 90],
    ['public/ambient/wholesale.mp4', 1400],
    ['public/ambient/wholesale.webm', 1100],
    ['public/ambient/wholesale.jpg', 90],
  ]
  for (const [file, maxKb] of budgets) {
    const { size } = await stat(file)
    expect(size / 1024, `${file} exceeds ${maxKb} KB`).toBeLessThan(maxKb)
  }
})

test('the Wholesale hero no longer depends on a third-party image host', async () => {
  const view = await readFile('src/views/Wholesale.jsx', 'utf8')

  // The hotlinked Unsplash canal is gone, and so is the still that briefly
  // replaced it — it sat directly beneath the moving version of itself.
  expect(view).not.toContain('LIFESTYLE')
  expect(view).not.toContain('unsplash')
  expect(view).not.toContain('wholesale-still.jpg')
  // The review notice it used to be pinned over is now the panel's content.
  expect(view).toContain('Manual Commercial Review')
})

test('both pages open with the band, before any content', async () => {
  const [pasabuy, wholesale] = await Promise.all([
    readFile('src/views/Pasabuy.jsx', 'utf8'),
    readFile('src/views/Wholesale.jsx', 'utf8'),
  ])

  for (const [name, view] of [['pasabuy', pasabuy], ['wholesale', wholesale]]) {
    expect(view).toContain('HeroVideo')
    const main = view.indexOf('<main')
    const hero = view.indexOf('<HeroVideo')
    const heading = view.indexOf('<h1')
    expect(hero, `${name} band must be inside main`).toBeGreaterThan(main)
    expect(hero, `${name} band must come before the headline`).toBeLessThan(heading)
  }
})

test('a video interrupted by a tab switch comes back on its own', async () => {
  const source = await component()

  // Browsers pause media in a hidden tab and do not reliably restart it.
  // Measured before this was added: once paused the element stayed paused
  // permanently, so a visitor who switched away and returned found the hero
  // frozen on whatever frame it stopped at.
  expect(source).toContain("document.addEventListener('visibilitychange', resume)")
  expect(source).toContain("node.addEventListener('pause', resume)")
  expect(source).toContain('if (!document.hidden && node.paused) attempt()')

  // No play() attempts against a hidden tab; they only fail.
  expect(source).toContain('if (document.hidden) return')
})

test('the video listeners do not outlive the element', async () => {
  const source = await component()

  // The visibilitychange listener lives on `document` and closes over the node,
  // so it leaks every time the reduced-motion preference flips the video away.
  // React 19 ref cleanup is what releases it.
  const ref = source.slice(source.indexOf('const attachVideo'), source.indexOf('const poster'))
  expect(ref).toContain('return () => {')
  for (const removed of [
    "document.removeEventListener('visibilitychange', resume)",
    "node.removeEventListener('pause', resume)",
    "node.removeEventListener('canplay', attempt)",
  ]) {
    expect(ref, `cleanup must release ${removed}`).toContain(removed)
  }
})
