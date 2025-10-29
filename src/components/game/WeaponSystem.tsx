import { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import { GAME_CONSTANTS } from '@/utils/constants'
import { profiler } from '@/utils/profiler'

// Create shared geometry once for all laser beams
const beamLength = 8
const beamWidth = 0.6
const sharedBeamGeometry = new THREE.CylinderGeometry(
  beamWidth,
  beamWidth,
  beamLength,
  8,
  1
)
sharedBeamGeometry.rotateX(Math.PI / 2)

// Reusable temp vectors for calculations (avoid allocations)
const tempVector1 = new THREE.Vector3()
const tempVector2 = new THREE.Vector3()
const tempQuat = new THREE.Quaternion()
const upVector = new THREE.Vector3(0, 0, 1)

export const WeaponSystem = () => {
  const activeProjectiles = useGameStore(state => state.activeProjectiles)
  const updateProjectiles = useGameStore(state => state.updateProjectiles)
  const removeProjectile = useGameStore(state => state.removeProjectile)
  const damageShip = useGameStore(state => state.damageShip)
  const getAIHealth = useGameStore(state => state.getAIHealth)
  const gameState = useGameStore(state => state.gameState)
  
  // Store refs for AI ship positions (will be updated from RaceElements)
  const aiShipPositionsRef = useRef<Map<number, THREE.Vector3>>(new Map())
  const playerPositionRef = useRef<THREE.Vector3>(new THREE.Vector3())
  
  // Spatial partitioning for collision detection
  const collisionCheckIntervalRef = useRef(0)
  const COLLISION_CHECK_INTERVAL = 0.016 // ~60fps, check every frame but batch operations

  useFrame((_state, delta) => {
    profiler.start('WeaponSystem.frame')
    
    if (gameState !== 'playing') {
      profiler.end('WeaponSystem.frame')
      return
    }

    // Update projectile positions
    profiler.start('WeaponSystem.updateProjectiles')
    updateProjectiles(delta)
    profiler.end('WeaponSystem.updateProjectiles')

    // Throttle collision checks slightly for performance
    collisionCheckIntervalRef.current += delta
    if (collisionCheckIntervalRef.current < COLLISION_CHECK_INTERVAL) {
      profiler.end('WeaponSystem.frame')
      return
    }
    collisionCheckIntervalRef.current = 0

    // Check collisions with spatial optimization
    profiler.start('WeaponSystem.collisionCheck')
    const projectilesToRemove: string[] = []
    const collisionRadius = GAME_CONSTANTS.SHIP_COLLISION_RADIUS
    const collisionRadiusSq = collisionRadius * collisionRadius // Use squared distance to avoid sqrt
    
    for (let i = 0; i < activeProjectiles.length; i++) {
      const projectile = activeProjectiles[i]
      
      // Quick bounds check - remove projectiles that are too far
      if (Math.abs(projectile.position.z) > GAME_CONSTANTS.RACE_DISTANCE + 500) {
        projectilesToRemove.push(projectile.id)
        continue
      }

      if (projectile.isPlayerProjectile) {
        // Check collision with AI ships
        for (const [aiId, aiPos] of aiShipPositionsRef.current) {
          const health = getAIHealth(aiId)
          if (health <= 0) continue // Skip destroyed ships
          
          // Use squared distance to avoid expensive sqrt
          const distSq = projectile.position.distanceToSquared(aiPos)
          if (distSq < collisionRadiusSq) {
            damageShip(aiId, GAME_CONSTANTS.PROJECTILE_DAMAGE)
            projectilesToRemove.push(projectile.id)
            break // Exit inner loop early
          }
        }
      } else {
        // Check collision with player
        const distSq = projectile.position.distanceToSquared(playerPositionRef.current)
        if (distSq < collisionRadiusSq) {
          damageShip('player', GAME_CONSTANTS.PROJECTILE_DAMAGE)
          projectilesToRemove.push(projectile.id)
        }
      }
    }

    // Batch remove hit projectiles
    if (projectilesToRemove.length > 0) {
      profiler.start('WeaponSystem.removeProjectiles')
      projectilesToRemove.forEach(id => removeProjectile(id))
      profiler.end('WeaponSystem.removeProjectiles')
    }
    profiler.end('WeaponSystem.collisionCheck')
    profiler.end('WeaponSystem.frame')
    
    profiler.frame()
  })

  // Expose refs for other components to update positions
  const weaponSystemRefs = useMemo(() => ({
    aiShipPositions: aiShipPositionsRef.current,
    playerPosition: playerPositionRef.current
  }), [])
  
  // Use a stable reference instead of window object
  useCallback(() => {
    ;(window as any).__weaponSystemRefs = weaponSystemRefs
  }, [weaponSystemRefs])()

  return (
    <group>
      {activeProjectiles.map(projectile => (
        <LaserBeam key={projectile.id} projectile={projectile} />
      ))}
    </group>
  )
}

interface LaserBeamProps {
  projectile: {
    id: string
    position: THREE.Vector3
    direction: THREE.Vector3
    color: string
  }
}

const LaserBeam = ({ projectile }: LaserBeamProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  
  // Pre-calculate and cache initial values
  const initialData = useMemo(() => {
    const dir = tempVector1.copy(projectile.direction).normalize()
    const pos = tempVector2.copy(dir).multiplyScalar(beamLength / 2).add(projectile.position)
    const quat = new THREE.Quaternion().setFromUnitVectors(upVector, dir)
    return { position: pos.clone(), quaternion: quat.clone() }
  }, [projectile.id]) // Only recalculate if projectile ID changes (never)
  
  useFrame(() => {
    if (!groupRef.current) return
    
    // Calculate beam position (slightly ahead in direction)
    tempVector1.copy(projectile.direction).normalize().multiplyScalar(beamLength / 2)
    groupRef.current.position.copy(projectile.position).add(tempVector1)
    
    // Calculate beam orientation
    tempVector2.copy(projectile.direction).normalize()
    tempQuat.setFromUnitVectors(upVector, tempVector2)
    groupRef.current.quaternion.copy(tempQuat)
  })

  return (
    <group ref={groupRef} position={initialData.position} quaternion={initialData.quaternion}>
      {/* Main beam with combined glow effect */}
      <mesh ref={meshRef} geometry={sharedBeamGeometry}>
        <meshBasicMaterial
          color={projectile.color}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Single glow layer - reduced from 3 layers */}
      <mesh ref={glowRef} geometry={sharedBeamGeometry} scale={1.8}>
        <meshBasicMaterial
          color={projectile.color}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Optimized point light */}
      <pointLight
        color={projectile.color}
        intensity={20}
        distance={20}
        decay={2}
      />
    </group>
  )
}