import * as THREE from 'three'

// Reusable temp vectors to avoid allocations
const tempVec1 = new THREE.Vector3()
const tempVec2 = new THREE.Vector3()

/**
 * Check if a point is within a sphere (optimized with squared distance)
 */
export const checkSphereCollision = (
  point: THREE.Vector3,
  sphereCenter: THREE.Vector3,
  sphereRadius: number
): boolean => {
  return point.distanceToSquared(sphereCenter) < sphereRadius * sphereRadius
}

/**
 * Calculate if target is within a cone from origin (optimized)
 */
export const isInCone = (
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  target: THREE.Vector3,
  coneAngleDegrees: number
): boolean => {
  tempVec1.copy(target).sub(origin).normalize()
  const dotProduct = direction.dot(tempVec1)
  const angleThreshold = Math.cos(coneAngleDegrees * Math.PI / 180)
  return dotProduct > angleThreshold
}

/**
 * Add random offset for AI accuracy (optimized)
 */
export const addAccuracyOffset = (
  direction: THREE.Vector3,
  accuracy: number
): THREE.Vector3 => {
  const offset = (1 - accuracy) * (Math.random() - 0.5) * 2
  tempVec1.copy(direction)
  tempVec1.x += offset * 0.5
  tempVec1.y += offset * 0.5
  return tempVec1.normalize()
}

/**
 * Calculate lead target position for moving targets (optimized)
 */
export const calculateLeadTarget = (
  shooterPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  targetVelocity: THREE.Vector3,
  projectileSpeed: number
): THREE.Vector3 => {
  tempVec1.copy(targetPos).sub(shooterPos)
  const distance = tempVec1.length()
  const timeToHit = distance / projectileSpeed
  
  tempVec2.copy(targetVelocity).multiplyScalar(timeToHit)
  return tempVec1.copy(targetPos).add(tempVec2)
}