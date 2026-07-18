import * as THREE from 'three'

/**
 * Distributes points evenly around a sphere's surface using the Fibonacci spiral.
 * Returns an array of THREE.Vector3.
 */
export function generateFibonacciSphere(samples, radius = 1) {
  const points = []
  const phi = Math.PI * (3 - Math.sqrt(5)) // Golden angle in radians

  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i

    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r

    points.push(new THREE.Vector3(x * radius, y * radius, z * radius))
  }

  return points
}
