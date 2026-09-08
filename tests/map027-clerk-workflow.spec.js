import { test, expect } from '@playwright/test'
import { deriveStoreMoment } from '../src/components/shop/storeGuideState.js'
import { computeFraming, visibleHeight } from '../src/components/shop/keeperRig.js'
import { clerkPose } from '../src/components/shop/clerkPoses.js'
import { readFile } from 'node:fs/promises'

const shelf = { name: 'Pantry', products: [{ sku: 'p1', name: 'Pasta' }] }
const product = shelf.products[0]

test('question listening takes precedence over product presentation', () => {
  expect(deriveStoreMoment({ shelf, product, questionActive: true })).toMatchObject({ id: 'listening', gesture: 'listen' })
})

test('help and chat derive distinct truthful clerk activities', () => {
  expect(deriveStoreMoment({ shelf, product, sheet: 'faq' })).toMatchObject({ id: 'reading', gesture: 'read' })
  expect(deriveStoreMoment({ shelf, product, sheet: 'chat' })).toMatchObject({ id: 'handoff', gesture: 'listen' })
  expect(deriveStoreMoment({ sheet: 'chat' }).message).not.toMatch(/sent|online|confirmed|paid/i)
})

test('a refused addition cannot be masked by the previous success pulse', () => {
  expect(deriveStoreMoment({ shelf, product, basketPulse: 1, basketError: 'No more units available.' })).toMatchObject({
    id: 'unavailable', gesture: 'think', message: 'No more units available.',
  })
})

test('shelf and full clerk bounds fit phone, tablet and desktop resting views', () => {
  for (const aspect of [375 / 430, 560 / 700, 1060 / 800]) {
    const frame = computeFraming({ height: 16.3, aspect, left: -8, right: 17, front: 3.2 })
    const halfWidth = visibleHeight(frame.distance - 3.2) * aspect / 2
    expect(frame.targetX - halfWidth).toBeLessThanOrEqual(-8)
    expect(frame.targetX + halfWidth).toBeGreaterThanOrEqual(17)
    expect(frame.target - visibleHeight(frame.distance - 3.2) / 2).toBeLessThanOrEqual(frame.bottom)
  }
})

test('each shopper activity has a distinct bounded pose and presentation requires an item', () => {
  const poses = ['wave', 'celebrate', 'listen', 'think', 'read', 'point', 'rest'].map(value => clerkPose(value))
  poses.push(clerkPose('present', true))
  expect(new Set(poses.map(pose => JSON.stringify([pose.right, pose.left, pose.elbows, pose.head]))).size).toBe(poses.length)
  for (const pose of poses) {
    for (const angle of [...pose.right, ...pose.left, ...pose.elbows, ...pose.head]) {
      expect(Number.isFinite(angle)).toBe(true)
      expect(Math.abs(angle)).toBeLessThan(Math.PI)
    }
  }
  expect(clerkPose('present', false).name).toBe('point-left')
  expect(clerkPose('present', true).name).toBe('presenting')
  expect(clerkPose('unknown').name).toBe('idle')
})

test('the local clerk asset exports the complete articulation without studio objects or external dependencies', async () => {
  const bytes = await readFile(new URL('../public/models/k2-clerk-anime.glb', import.meta.url))
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67)
  expect(bytes.readUInt32LE(4)).toBe(2)
  expect(bytes.readUInt32LE(8)).toBe(bytes.length)
  expect(bytes.length).toBeLessThan(1_500_000)
  const asset = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'))
  const joints = asset.nodes.flatMap(node => node.extras?.joint ? [node.extras.joint] : [])
  expect(joints.sort()).toEqual(['ClerkRoot', 'Body', 'Head', 'RightArm', 'LeftArm', 'RightElbow', 'LeftElbow', 'RightLeg', 'LeftLeg', 'RightEye', 'LeftEye', 'Mouth'].sort())
  expect(asset.nodes.some(node => /^(Cube|Camera|Light)(\.|$)/.test(node.name))).toBe(false)
  expect(asset.buffers.every(buffer => !buffer.uri)).toBe(true)
  expect((asset.images || []).every(image => !image.uri)).toBe(true)
  expect(asset.meshes.reduce((count, mesh) => count + mesh.primitives.length, 0)).toBeLessThanOrEqual(40)
})
