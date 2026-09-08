// Radians in the exported Y-up rig. -X is the clerk's anatomical right.
// Pose targets are blended from the current joints, so new actions interrupt safely.
const REST = { right: [0, 0, -.12], left: [0, 0, .12], elbows: [-.10, -.10], head: [0, 0, 0] }
export function clerkPose(gesture, hasProduct = false) {
  if (gesture === 'wave') return { ...REST, name: 'wave', right: [0, 0, -2.2], elbows: [-.3, -.1] }
  if (gesture === 'celebrate') return { ...REST, name: 'happy', right: [-.25, 0, -.6], left: [-.25, 0, .6], elbows: [-2, -2], head: [-.09, 0, -.08] }
  if (gesture === 'listen') return { ...REST, name: 'listening', right: [-.25, 0, -.2], elbows: [-1.1, -.1], head: [.04, 0, .12] }
  if (gesture === 'think') return { ...REST, name: 'thinking', right: [-.45, 0, -.12], elbows: [-2.2, -.3], head: [.07, -.12, -.09] }
  if (gesture === 'read') return { ...REST, name: 'reading', right: [-.25, 0, -.1], left: [-.25, 0, .1], elbows: [-1.6, -1.6], head: [.22, 0, 0] }
  if (gesture === 'present' && hasProduct) return { ...REST, name: 'presenting', right: [-.25, 0, -.1], left: [-.25, 0, .1], elbows: [-1.5, -1.5], head: [-.04, 0, 0] }
  if (gesture === 'present' || gesture === 'point') return { ...REST, name: 'point-left', right: [-.15, 0, -1.22], elbows: [-.3, -.15], head: [0, -.2, 0] }
  return { ...REST, name: 'idle' }
}
