import { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import { GAME_CONSTANTS } from '@/utils/constants'
import { profiler } from '@/utils/profiler'
import { soundManager } from '@/utils/soundManager'

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

// Constant vector
const upVector = new THREE.Vector3(0, 0, 1) // World Y axis for cylinder orientation

export const WeaponSystem = () => {
  const activeProjectiles = useGameStore(state => state.activeProjectiles)
  const updateProjectiles = useGameStore(state => state.updateProjectiles)
  const removeProjectile = useGameStore(state => state.removeProjectile)
  const damageShip = useGameStore(state => state.damageShip)
  const getAIHealth = useGameStore(state => state.getAIHealth)
  const incrementHitsLanded = useGameStore(state => state.incrementHitsLanded)
  const gameState = useGameStore(state => state.gameState)
  const isPlayerInvulnerable = useGameStore(state => state.isPlayerInvulnerable)
  
  // Store refs for AI ship positions (will be updated from RaceElements)
  const aiShipPositionsRef = useRef<Map<number, THREE.Vector3>>(new Map())
  const playerPositionRef = useRef<THREE.Vector3>(new THREE.Vector3())
  
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

    // Get spatial indices from store
    const spatialIndices = useGameStore.getState().spatialIndices
    
    // Only rebuild indices if needed (incremental updates)
    if (spatialIndices.needsRebuild()) {
      profiler.start('WeaponSystem.rebuildIndices')
      spatialIndices.rebuildIfNeeded()
      profiler.end('WeaponSystem.rebuildIndices')
    }

    // Check collisions using spatial indexing - O(log n) instead of O(n²)
    profiler.start('WeaponSystem.collisionCheck')
    const projectilesToRemove: string[] = []
    const collisionRadius = GAME_CONSTANTS.SHIP_COLLISION_RADIUS
    
    for (let i = 0; i < activeProjectiles.length; i++) {
      const projectile = activeProjectiles[i]
      
      // Quick bounds check - remove projectiles that are too far
      if (Math.abs(projectile.position.z) > GAME_CONSTANTS.RACE_DISTANCE + 500) {
        projectilesToRemove.push(projectile.id)
        continue
      }

      const isPlayerProjectile = (projectile.state & 2) !== 0 // Check PLAYER_OWNED flag

      if (isPlayerProjectile) {
        // Use spatial index to find nearby AI ships - O(log n)
        const nearbyShips = spatialIndices.aiShips.queryRadius(
          projectile.position,
          collisionRadius + 5 // Add projectile radius
        )
        
        for (const ship of nearbyShips) {
          const aiId = ship.id as number
          const health = getAIHealth(aiId)
          if (health <= 0) continue // Skip destroyed ships
          
          // Skip invulnerable ships (blinking after respawn)
          const isInvulnerable = useGameStore.getState().isAIInvulnerable(aiId)
          if (isInvulnerable) continue
          
          // Precise collision check
          const distSq = projectile.position.distanceToSquared(ship.position)
          const totalRadiusSq = (collisionRadius + ship.radius) ** 2
          
          if (distSq < totalRadiusSq) {
            const healthBefore = getAIHealth(aiId)
            damageShip(aiId, GAME_CONSTANTS.PROJECTILE_DAMAGE)
            const healthAfter = getAIHealth(aiId)
            
            // Play explosion sound if ship was destroyed, otherwise hit sound
            if (healthBefore > 0 && healthAfter <= 0) {
              soundManager.playSound('explosion')
            } else {
              soundManager.playSound('hit')
            }
            
            incrementHitsLanded() // Track successful hit
            projectilesToRemove.push(projectile.id)
            break
          }
        }
      } else {
        // Check collision with player
        const distSq = projectile.position.distanceToSquared(playerPositionRef.current)
        
        if (distSq < collisionRadius * collisionRadius) {
          // Projectile hit the player
          projectilesToRemove.push(projectile.id) // Projectile is removed on hit, regardless of invulnerability
          
          if (isPlayerInvulnerable()) {
            // If invulnerable, skip sound and damage application
            console.log('[WeaponSystem] AI projectile hit player, but player is invulnerable.')
            continue
          }
          
          // Apply damage if not invulnerable
          soundManager.playSound('ship-damage')
          damageShip('player', GAME_CONSTANTS.PROJECTILE_DAMAGE)
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
  
  // Local temporary mutable objects for calculations within useFrame
  const localTempVec1 = useRef(new THREE.Vector3()).current
  const localTempVec2 = useRef(new THREE.Vector3()).current
  const localTempQuat = useRef(new THREE.Quaternion()).current
  
  useFrame(() => {
    if (!groupRef.current) return
    
    // Calculate beam position (slightly ahead in direction)
    localTempVec1.copy(projectile.direction).normalize().multiplyScalar(beamLength / 2)
    groupRef.current.position.copy(projectile.position).add(localTempVec1)
    
    // Calculate beam orientation
    localTempVec2.copy(projectile.direction).normalize()
    localTempQuat.setFromUnitVectors(upVector, localTempVec2)
    groupRef.current.quaternion.copy(localTempQuat)
  })

  return (
    <group ref={groupRef}>
      {/* Single optimized beam - removed glow layer and point light for performance */}
      <mesh geometry={sharedBeamGeometry}>
        <meshBasicMaterial
          color={projectile.color}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}