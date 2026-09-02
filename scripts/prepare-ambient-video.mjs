#!/usr/bin/env node
/**
 * Prepares the Pasabuy and Wholesale hero clips.
 *
 * These play in a band at the top of each page and are meant to be watched, so
 * they keep their full 1280x720 detail. An earlier version blurred them into a
 * backdrop; that made them cheap but pointless, since the footage is the reason
 * they exist.
 *
 * What is still done to them:
 *
 * - **Audio is removed.** They are silent hero loops. An audio track is dead
 *   weight and, on some browsers, enough to refuse autoplay outright.
 * - **Encoded for streaming, not for archive.** CRF 26 with faststart, so the
 *   first frames arrive without waiting for the whole file.
 * - **A poster frame is emitted.** It carries the reduced-motion case, where no
 *   video plays at all, and shows while the video buffers.
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

// Full source resolution. The clip is the point of the band it sits in, so
// nothing is thrown away here.
const WIDTH = 1280
const HEIGHT = 720
const FILTER = `scale=${WIDTH}:${HEIGHT}`

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
      '-c:v', 'libx264', '-profile:v', 'high', '-crf', '26', '-preset', 'slow',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4,
    ])

    // VP9 for browsers that take it, usually smaller again.
    ffmpeg([
      '-i', input, '-an', '-vf', FILTER,
      '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-deadline', 'good', '-cpu-used', '2',
      webm,
    ])

    // The still that carries reduced motion and the pre-play frame.
    ffmpeg([
      '-i', input, '-vf', `${FILTER},select=eq(n\\,0)`, '-frames:v', '1', '-q:v', '6', poster,
    ])

    console.log(`${clip.name}: mp4 ${kb(mp4)}, webm ${kb(webm)}, poster ${kb(poster)}`)
  }

  console.log(`\nWrote ${CLIPS.length * 3} files to public/ambient/.`)
}

main()
