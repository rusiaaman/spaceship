/**
 * Advanced AI behaviors using Yuka game AI library
 * Implements steering behaviors, pursuit, evasion, and formation flying
 */

import * as YUKA from 'yuka'
import * as THREE from 'three'

/**
 * Convert THREE.Vector3 to YUKA.Vector3
 */
export function toYukaVector(v: THREE.Vector3): YUKA.Vector3 {
  return new YUKA.Vector3(v.x, v.y, v.z)
}

/**
 * Convert YUKA.Vector3 to THREE.Vector3
 */
export function toThreeVector(v: YUKA.Vector3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.y, v.z)
}

/**
 * AI ship vehicle using Yuka
 */
export class AIVehicle extends YUKA.Vehicle {
  id: number
  health: number = 100
  targetSpeed: number
  
  constructor(id: number, position: THREE.Vector3, targetSpeed: number) {
    super()
    this.id = id
    this.position.copy(toYukaVector(position))
    this.maxSpeed = targetSpeed
    this.targetSpeed = targetSpeed
    this.maxForce = 50
    this.mass = 1
    this.updateOrientation = true
  }

  /**
   * Update vehicle with damage effects
   */
  updateWithDamage(speedReduction: number): void {
    this.maxSpeed = this.targetSpeed * (1 - speedReduction)
  }
}

/**
 * Pursuit behavior - chase a moving target
 */
export class PursuitBehavior {
  private pursueBehavior: YUKA.PursuitBehavior

  constructor(_vehicle: AIVehicle, target: YUKA.Vehicle, predictionFactor: number = 1.0) {
    this.pursueBehavior = new YUKA.PursuitBehavior(target, predictionFactor)
  }

  calculate(vehicle: AIVehicle, force: YUKA.Vector3): YUKA.Vector3 {
    return this.pursueBehavior.calculate(vehicle, force)
  }
}

/**
 * Evasion behavior - flee from a moving target
 */
export class EvasionBehavior {
  private evadeBehavior: YUKA.EvadeBehavior

  constructor(_vehicle: AIVehicle, target: YUKA.Vehicle, panicDistance: number = 100, predictionFactor: number = 1.0) {
    this.evadeBehavior = new YUKA.EvadeBehavior(target, panicDistance, predictionFactor)
  }

  calculate(vehicle: AIVehicle, force: YUKA.Vector3): YUKA.Vector3 {
    return this.evadeBehavior.calculate(vehicle, force)
  }
}

/**
 * Obstacle avoidance behavior
 */
export class ObstacleAvoidanceBehavior {
  private obstacles: YUKA.GameEntity[] = []
  private avoidBehavior: YUKA.ObstacleAvoidanceBehavior

  constructor(obstacles: YUKA.GameEntity[] = []) {
    this.obstacles = obstacles
    this.avoidBehavior = new YUKA.ObstacleAvoidanceBehavior(obstacles)
  }

  addObstacle(obstacle: YUKA.GameEntity): void {
    this.obstacles.push(obstacle)
    this.avoidBehavior = new YUKA.ObstacleAvoidanceBehavior(this.obstacles)
  }

  calculate(vehicle: AIVehicle, force: YUKA.Vector3): YUKA.Vector3 {
    return this.avoidBehavior.calculate(vehicle, force)
  }
}

/**
 * Separation behavior - maintain distance from neighbors
 */
export class SeparationBehavior {
  private separateBehavior: YUKA.SeparationBehavior

  constructor(_vehicles: AIVehicle[]) {
    this.separateBehavior = new YUKA.SeparationBehavior()
  }

  calculate(vehicle: AIVehicle, force: YUKA.Vector3): YUKA.Vector3 {
    return this.separateBehavior.calculate(vehicle, force)
  }
}

/**
 * Alignment behavior - match velocity with neighbors
 */
export class AlignmentBehavior {
  private alignBehavior: YUKA.AlignmentBehavior

  constructor(_vehicles: AIVehicle[]) {
    this.alignBehavior = new YUKA.AlignmentBehavior()
  }

  calculate(vehicle: AIVehicle, force: YUKA.Vector3): YUKA.Vector3 {
    return this.alignBehavior.calculate(vehicle, force)
  }
}

/**
 * Formation behavior - maintain position in formation
 */
export class FormationBehavior {
  private offsetBehavior: YUKA.OffsetPursuitBehavior
  private offset: YUKA.Vector3

  constructor(leader: YUKA.Vehicle, offset: THREE.Vector3) {
    this.offset = toYukaVector(offset)
    this.offsetBehavior = new YUKA.OffsetPursuitBehavior(leader, this.offset)
  }

  calculate(vehicle: AIVehicle, force: YUKA.Vector3): YUKA.Vector3 {
    return this.offsetBehavior.calculate(vehicle, force)
  }
}

/**
 * Wander behavior - random exploration
 */
export class WanderBehavior {
  private wanderBehavior: YUKA.WanderBehavior

  constructor(radius: number = 10, distance: number = 20, jitter: number = 5) {
    this.wanderBehavior = new YUKA.WanderBehavior()
    this.wanderBehavior.radius = radius
    this.wanderBehavior.distance = distance
    this.wanderBehavior.jitter = jitter
  }

  calculate(vehicle: AIVehicle, force: YUKA.Vector3, delta?: number): YUKA.Vector3 {
    return this.wanderBehavior.calculate(vehicle, force, delta || 0)
  }
}

/**
 * AI behavior state machine
 */
export const AIBehaviorState = {
  RACING: 'racing',
  PURSUING: 'pursuing',
  EVADING: 'evading',
  FORMATION: 'formation',
  WANDERING: 'wandering'
} as const

export type AIBehaviorState = typeof AIBehaviorState[keyof typeof AIBehaviorState]

/**
 * AI Controller that manages behavior switching
 */
export class AIController {
  vehicle: AIVehicle
  currentState: AIBehaviorState = AIBehaviorState.RACING
  
  private steeringManager: YUKA.SteeringManager
  private separationBehavior: SeparationBehavior
  private wanderBehavior: WanderBehavior
  
  // Behavior weights
  private weights = {
    separation: 2.0,
    wander: 0.5,
    pursuit: 1.5,
    evasion: 2.0
  }

  constructor(vehicle: AIVehicle, allVehicles: AIVehicle[]) {
    this.vehicle = vehicle
    this.steeringManager = new YUKA.SteeringManager(vehicle)
    
    // Add base behaviors
    this.separationBehavior = new SeparationBehavior(allVehicles.filter(v => v.id !== vehicle.id))
    this.wanderBehavior = new WanderBehavior(8, 15, 3)
    
    // Add separation with high weight
    const separationSteering = new YUKA.SteeringBehavior()
    const sepBehavior = this.separationBehavior
    separationSteering.calculate = (v: YUKA.Vehicle, force: YUKA.Vector3) => {
      return sepBehavior.calculate(v as AIVehicle, force)
    }
    separationSteering.weight = this.weights.separation
    this.steeringManager.add(separationSteering)
    
    // Add wander with low weight for natural movement
    const wanderSteering = new YUKA.SteeringBehavior()
    const wandBehavior = this.wanderBehavior
    wanderSteering.calculate = (v: YUKA.Vehicle, force: YUKA.Vector3) => {
      return wandBehavior.calculate(v as AIVehicle, force)
    }
    wanderSteering.weight = this.weights.wander
    this.steeringManager.add(wanderSteering)
  }

  /**
   * Add pursuit behavior
   */
  addPursuit(target: YUKA.Vehicle): void {
    const pursuitBehavior = new PursuitBehavior(this.vehicle, target, 0.5)
    const steering = new YUKA.SteeringBehavior()
    steering.calculate = (v: YUKA.Vehicle, force: YUKA.Vector3) => {
      return pursuitBehavior.calculate(v as AIVehicle, force)
    }
    steering.weight = this.weights.pursuit
    this.steeringManager.add(steering)
  }

  /**
   * Add evasion behavior
   */
  addEvasion(target: YUKA.Vehicle, panicDistance: number = 80): void {
    const evasionBehavior = new EvasionBehavior(this.vehicle, target, panicDistance, 0.8)
    const steering = new YUKA.SteeringBehavior()
    steering.calculate = (v: YUKA.Vehicle, force: YUKA.Vector3) => {
      return evasionBehavior.calculate(v as AIVehicle, force)
    }
    steering.weight = this.weights.evasion
    this.steeringManager.add(steering)
  }

  /**
   * Update AI vehicle
   */
  update(delta: number): void {
    this.vehicle.update(delta)
  }

  /**
   * Get current velocity as THREE.Vector3
   */
  getVelocity(): THREE.Vector3 {
    return toThreeVector(this.vehicle.velocity)
  }

  /**
   * Get current position as THREE.Vector3
   */
  getPosition(): THREE.Vector3 {
    return toThreeVector(this.vehicle.position)
  }

  /**
   * Set position
   */
  setPosition(pos: THREE.Vector3): void {
    this.vehicle.position.copy(toYukaVector(pos))
  }

  /**
   * Apply forward force (for racing)
   */
  applyForwardForce(force: number): void {
    const forward = this.vehicle.forward.clone().multiplyScalar(force)
    this.vehicle.velocity.add(forward)
  }
}

/**
 * Predictive targeting system
 */
export class PredictiveTargeting {
  /**
   * Calculate lead position for hitting a moving target
   */
  static calculateLeadPosition(
    shooterPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    targetVelocity: THREE.Vector3,
    projectileSpeed: number
  ): THREE.Vector3 {
    const toTarget = targetPos.clone().sub(shooterPos)
    const distance = toTarget.length()
    
    // Time for projectile to reach current target position
    const timeToHit = distance / projectileSpeed
    
    // Predict where target will be
    const leadPosition = targetPos.clone().add(
      targetVelocity.clone().multiplyScalar(timeToHit)
    )
    
    return leadPosition
  }

  /**
   * Calculate optimal firing solution
   */
  static calculateFiringSolution(
    shooterPos: THREE.Vector3,
    shooterVelocity: THREE.Vector3,
    targetPos: THREE.Vector3,
    targetVelocity: THREE.Vector3,
    projectileSpeed: number
  ): { direction: THREE.Vector3; timeToHit: number } | null {
    // Relative velocity
    const relativeVelocity = targetVelocity.clone().sub(shooterVelocity)
    const relativeSpeed = relativeVelocity.length()
    
    // If target is moving faster than projectile, can't hit
    if (relativeSpeed >= projectileSpeed) {
      return null
    }
    
    const toTarget = targetPos.clone().sub(shooterPos)
    const distance = toTarget.length()
    
    // Quadratic equation to solve for intercept time
    const a = relativeSpeed * relativeSpeed - projectileSpeed * projectileSpeed
    const b = 2 * toTarget.dot(relativeVelocity)
    const c = distance * distance
    
    const discriminant = b * b - 4 * a * c
    
    if (discriminant < 0) {
      return null // No solution
    }
    
    const t1 = (-b + Math.sqrt(discriminant)) / (2 * a)
    const t2 = (-b - Math.sqrt(discriminant)) / (2 * a)
    
    const timeToHit = Math.min(t1, t2)
    
    if (timeToHit < 0) {
      return null // Target is moving away
    }
    
    const interceptPoint = targetPos.clone().add(
      relativeVelocity.clone().multiplyScalar(timeToHit)
    )
    
    const direction = interceptPoint.sub(shooterPos).normalize()
    
    return { direction, timeToHit }
  }
}