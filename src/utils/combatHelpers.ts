import * as THREE from 'three'
import { Vector3Pool } from './ObjectPool'

// Reusable temp vectors to avoid allocations (legacy support)
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
 * Calculate if target is within a cone from origin (optimized with pooling)
 */
export const isInCone = (
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  target: THREE.Vector3,
  coneAngleDegrees: number
): boolean => {
  const toTarget = Vector3Pool.acquire()
  toTarget.copy(target).sub(origin).normalize()
  
  const dotProduct = direction.dot(toTarget)
  const angleThreshold = Math.cos(coneAngleDegrees * Math.PI / 180)
  
  Vector3Pool.release(toTarget)
  
  return dotProduct > angleThreshold
}

/**
 * Add random offset for AI accuracy (optimized with pooling)
 */
export const addAccuracyOffset = (
  direction: THREE.Vector3,
  accuracy: number
): THREE.Vector3 => {
  const offset = (1 - accuracy) * (Math.random() - 0.5) * 2
  const result = Vector3Pool.acquire()
  
  result.copy(direction)
  result.x += offset * 0.5
  result.y += offset * 0.5
  result.normalize()
  
  return result
}

/**
 * Calculate lead target position for moving targets (optimized with pooling)
 */
export const calculateLeadTarget = (
  shooterPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  targetVelocity: THREE.Vector3,
  projectileSpeed: number
): THREE.Vector3 => {
  const toTarget = Vector3Pool.acquire()
  const velocityOffset = Vector3Pool.acquire()
  const result = Vector3Pool.acquire()
  
  toTarget.copy(targetPos).sub(shooterPos)
  const distance = toTarget.length()
  const timeToHit = distance / projectileSpeed
  
  velocityOffset.copy(targetVelocity).multiplyScalar(timeToHit)
  result.copy(targetPos).add(velocityOffset)
  
  Vector3Pool.release(toTarget)
  Vector3Pool.release(velocityOffset)
  
  return result
}

/**
 * Fast ray-sphere intersection test
 * Returns distance to intersection or -1 if no hit
 */
export const raySphereIntersect = (
  rayOrigin: THREE.Vector3,
  rayDirection: THREE.Vector3,
  sphereCenter: THREE.Vector3,
  sphereRadius: number
): number => {
  const oc = tempVec1.copy(rayOrigin).sub(sphereCenter)
  
  const a = rayDirection.dot(rayDirection)
  const b = 2.0 * oc.dot(rayDirection)
  const c = oc.dot(oc) - sphereRadius * sphereRadius
  
  const discriminant = b * b - 4 * a * c
  
  if (discriminant < 0) {
    return -1 // No intersection
  }
  
  const t = (-b - Math.sqrt(discriminant)) / (2.0 * a)
  return t >= 0 ? t : -1
}

/**
 * Calculate ballistic trajectory for projectile with gravity
 */
export const calculateBallisticTrajectory = (
  startPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  projectileSpeed: number,
  gravity: number = 0 // Usually 0 in space
): { direction: THREE.Vector3; timeToHit: number } | null => {
  const toTarget = tempVec1.copy(targetPos).sub(startPos)
  const horizontalDist = Math.sqrt(toTarget.x * toTarget.x + toTarget.z * toTarget.z)
  const verticalDist = toTarget.y
  
  // Solve quadratic for launch angle
  const v2 = projectileSpeed * projectileSpeed
  const v4 = v2 * v2
  const g = gravity
  const x = horizontalDist
  const y = verticalDist
  
  if (g === 0) {
    // No gravity - simple case
    const direction = toTarget.normalize()
    const timeToHit = toTarget.length() / projectileSpeed
    return { direction, timeToHit }
  }
  
  const discriminant = v4 - g * (g * x * x + 2 * y * v2)
  
  if (discriminant < 0) {
    return null // Can't reach target
  }
  
  const angle = Math.atan((v2 - Math.sqrt(discriminant)) / (g * x))
  
  const direction = tempVec2.set(
    toTarget.x / horizontalDist * Math.cos(angle),
    Math.sin(angle),
    toTarget.z / horizontalDist * Math.cos(angle)
  ).normalize()
  
  const timeToHit = horizontalDist / (projectileSpeed * Math.cos(angle))
  
  return { direction: direction.clone(), timeToHit }
}

/**
 * Predict future position of target based on current velocity
 */
export const predictPosition = (
  currentPos: THREE.Vector3,
  velocity: THREE.Vector3,
  timeAhead: number
): THREE.Vector3 => {
  const predicted = Vector3Pool.acquire()
  predicted.copy(currentPos).add(
    tempVec1.copy(velocity).multiplyScalar(timeAhead)
  )
  return predicted
}

/**
 * Calculate optimal intercept point for two moving objects
 */
export const calculateInterceptPoint = (
  pursuerPos: THREE.Vector3,
  pursuerSpeed: number,
  targetPos: THREE.Vector3,
  targetVelocity: THREE.Vector3
): THREE.Vector3 | null => {
  const toTarget = tempVec1.copy(targetPos).sub(pursuerPos)
  const a = targetVelocity.lengthSq() - pursuerSpeed * pursuerSpeed
  const b = 2 * toTarget.dot(targetVelocity)
  const c = toTarget.lengthSq()
  
  const disc = b * b - 4 * a * c
  
  if (disc < 0) {
    return null // Can't intercept
  }
  
  const t1 = (-b + Math.sqrt(disc)) / (2 * a)
  const t2 = (-b - Math.sqrt(disc)) / (2 * a)
  
  const t = Math.min(t1, t2)
  
  if (t < 0) {
    return null // Target moving away
  }
  
  const intercept = Vector3Pool.acquire()
  intercept.copy(targetPos).add(
    tempVec2.copy(targetVelocity).multiplyScalar(t)
  )
  
  return intercept
}

/**
 * Check if line segment intersects sphere
 */
export const lineSegmentSphereIntersect = (
  lineStart: THREE.Vector3,
  lineEnd: THREE.Vector3,
  sphereCenter: THREE.Vector3,
  sphereRadius: number
): boolean => {
  const lineDir = tempVec1.copy(lineEnd).sub(lineStart)
  const lineLength = lineDir.length()
  lineDir.normalize()
  
  const t = raySphereIntersect(lineStart, lineDir, sphereCenter, sphereRadius)
  
  return t >= 0 && t <= lineLength
}