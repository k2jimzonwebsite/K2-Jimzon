#!/usr/bin/env node
/**
 * Prepares the Pasabuy and Wholesale ambient background media.
 *
 * The source clips in `assets/` are 1280x720 H.264 with an AAC track, about
 * 3 MB each. They are used as a dimmed, blurred atmosphere behind page content,
 * never as something the visitor is meant to watch, which changes what the
 * asset needs to be:
 *
 * - **The blur is baked in, not applied in CSS.** A runtime `filter: blur()`
 *   over a full-bleed video repaints every frame on the GPU, which is exactly
 *   the cost a mid-range phone cannot absorb. Blurring in the encoder also
 *   strips the high-frequency detail that dominates the bitrate, so the file
 *   gets dramatically smaller for free: ~3 MB becomes ~110 KB.
 * - **Resolution drops to 640x360.** Nothing blurred at this strength survives
 *   above that, so larger frames spend bytes on detail the viewer cannot see.
 * - **Audio is removed.** It is decoration behind a form. An audio track is
 *   dead weight and, on some browsers, enough to refuse autoplay outright.
 * - **A poster frame is emitted.** It carries the reduced-motion and mobile
 *   cases, where no video loads at all.
 *
 * Requires ffmpeg on PATH. Outputs to `public/ambient/`, which ships with the
 * storefront build.
 *
 *   node scripts/prepare-ambient-video.mjs
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const sourceDir = path.join(root, 'assets')
const outDir = path.join(root, 'public', 'ambient')

// Strong enough that no recognisable subject survives, which is the point:
// it must read as atmosphere, not as a video someone is meant to watch.
const BLUR_SIGMA = 18
const WIDTH = 640
const HEIGHT = 360
const FILTER = `scale=${WIDTH}:${HEIGHT},gblur=sigma=${BLUR_SIGMA}`

const CLIPS = [
  { source: 'Pasabuy.mp4', name: 'pasabuy' },
  { source: 'Wholesale.mp4', name: 'wholesale' },
]

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] })
}

function kb(file) {
  return `${(fs.statSync(file).size / 1024).toFixed(1)} KB`
}

function main() {
  const missing = CLIPS.filter((clip) => !fs.existsSync(path.join(sourceDir, clip.source)))
  if (missing.length > 0) {
    console.error(`Missing source clips: ${missing.map((c) => c.source).join(', ')}`)
    process.exitCode = 1
    return
  }
  fs.mkdirSync(outDir, { recursive: true })

  for (const clip of CLIPS) {
    const input = path.join(sourceDir, clip.source)
    const mp4 = path.join(outDir, `${clip.name}.mp4`)
    const webm = path.join(outDir, `${clip.name}.webm`)
    const poster = path.join(outDir, `${clip.name}.jpg`)

    // H.264 baseline of support, for Safari and everything older.
    ffmpeg([
      '-i', input, '-an', '-vf', FILTER,
      '-c:v', 'libx264', '-profile:v', 'main', '-crf', '30', '-preset', 'slow',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4,
    ])

    // VP9 for browsers that take it, usually smaller again.
    ffmpeg([
      '-i', input, '-an', '-vf', FILTER,
      '-c:v', 'libvpx-vp9', '-crf', '40', '-b:v', '0', '-deadline', 'good', '-cpu-used', '2',
      webm,
    ])

    // The still that carries reduced-motion, mobile, and the pre-play frame.
    ffmpeg([
      '-i', input, '-vf', `${FILTER},select=eq(n\\,0)`, '-frames:v', '1', '-q:v', '6', poster,
    ])

    // A sharp frame at full source resolution, for the places these clips are
    // shown as a picture rather than as atmosphere — the Wholesale hero panel
    // uses one. Taken a little into the clip, since frame 0 is often the
    // weakest composition.
    const still = path.join(outDir, `${clip.name}-still.jpg`)
    ffmpeg(['-ss', '3', '-i', input, '-frames:v', '1', '-q:v', '4', still])

    console.log(`${clip.name}: mp4 ${kb(mp4)}, webm ${kb(webm)}, poster ${kb(poster)}, still ${kb(still)}`)
  }

  console.log(`\nWrote ${CLIPS.length * 3} files to public/ambient/.`)
}

main()
