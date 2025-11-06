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
  const incrementHitsLanded = useGameStore(state => state.incrementHitsLanded)
  const gameState = useGameStore(state => state.gameState)
  
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
          soundManager.playSound('ship-damage')
          damageShip('player', GAME_CONSTANTS.PROJECTILE_DAMAGE)
          projectilesToRemove.push(projectile.id)
          // Note: We don't track AI hits on player as player stats
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