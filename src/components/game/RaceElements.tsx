
import { useMemo, useRef, forwardRef, useEffect } from 'react';
import * as THREE from 'three';
import { GAME_CONSTANTS } from '@/utils/constants';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/store/gameStore';
import { profiler } from '@/utils/profiler';
import { ShipState, BitFlagUtils } from '@/utils/BitFlags';
import { PredictiveTargeting } from '@/utils/AIBehaviors';
import { SOLAR_CONSTANTS, PLANETARY_POSITIONS } from '@/utils/solarSystemData';

interface AIShipProps {
  position: [number, number, number];
  rotationY: number;
  color: string;
  sizeScale: number;
}

// Shared geometries for all AI ships (performance optimization)
const aiBodyGeometry = new THREE.BoxGeometry(2, 1, 4)
const aiWingGeometry = new THREE.BoxGeometry(6, 0.3, 2)

// Reuseable star texture for AI ships (same logic as Planets)
const getShipStarTexture = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)')
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, 64)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const AISpaceship = forwardRef<THREE.Group, AIShipProps>(({ position, rotationY, color, sizeScale }, ref) => {
  const groupRef = useRef<THREE.Group>(null)
  const starDotRef = useRef<THREE.Points>(null)
  const starMaterialRef = useRef<THREE.PointsMaterial>(null)
  
  // Sync external ref with internal ref
  useEffect(() => {
    if (!ref) return
    if (typeof ref === 'function') {
      ref(groupRef.current)
    } else {
      ref.current = groupRef.current
    }
  }, [ref])

  const starTexture = useMemo(() => getShipStarTexture(), [])
  const dotGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))
    return geo
  }, [])

  useFrame((state) => {
    if (groupRef.current && starMaterialRef.current && starDotRef.current) {
       const dist = state.camera.position.distanceTo(groupRef.current.position)
       
       // Fading logic for ships
       // Ships are small (~5 units). Fade in dot when we are > 500 units away.
       const fadeStart = 2000
       const fadeEnd = 200
       
       let opacity = 0
       if (dist > fadeStart) {
         opacity = 1.0
       } else if (dist > fadeEnd) {
         opacity = (dist - fadeEnd) / (fadeStart - fadeEnd)
       }
       
       // Always visible if far enough
       starMaterialRef.current.opacity = opacity
       starDotRef.current.visible = opacity > 0.01
       
       // Note: We are modifying material per instance? 
       // No, materials are creating inside component, so unique per ship instance. SAFE.
    }
  })

  return (
    <group position={position} rotation-y={rotationY} ref={groupRef} scale={0.5 * sizeScale}>
      {/* Main body - using shared geometry, scaled by ship size (matches player ship scale) */}
      <mesh geometry={aiBodyGeometry} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.3}
          metalness={0.6}
          roughness={0.4}
          toneMapped={false}
        />
      </mesh>
      {/* Wings - using shared geometry */}
      <mesh geometry={aiWingGeometry} position={[0, 0, 0.5]}>
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.15}
          metalness={0.4}
          roughness={0.5}
          toneMapped={false}
        />
      </mesh>
      
      {/* Distant Visibility Star Dot */}
      <points ref={starDotRef} geometry={dotGeometry}>
        <pointsMaterial
          ref={starMaterialRef}
          map={starTexture}
          size={6} // Slightly smaller than planets (8)
          sizeAttenuation={false}
          color={new THREE.Color(color)}
          transparent={true}
          opacity={1}
          depthWrite={false}
          depthTest={true}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
});
AISpaceship.displayName = 'AISpaceship'


interface RacerStanding {
  id: number | 'player';
  name: string;
  distance: number;
  finished: boolean;
  finishTime?: number;
  finishOrder?: number; // Order in which racer finished (1st, 2nd, 3rd, etc.)
}

// Helper function to sort and assign ranks based on finish order
const assignRanksWithTies = (racers: RacerStanding[]): (RacerStanding & { rank: number })[] => {
  // Sort racers: 1. Finished first, 2. By finish order (asc), 3. By distance (asc)
  const sortedRacers = racers.sort((a, b) => {
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;

    if (a.finished && b.finished) {
      // Sort by finish order (who crossed the line first)
      return (a.finishOrder ?? Infinity) - (b.finishOrder ?? Infinity);
    }

    // Use distance for racing ships (lower distance is better)
    return a.distance - b.distance;
  });

  const rankedRacers: (RacerStanding & { rank: number })[] = [];

  for (let i = 0; i < sortedRacers.length; i++) {
    const currentRacer = sortedRacers[i];
    let currentRank: number;

    if (i === 0) {
      currentRank = 1;
    } else {
      const prevRacer = sortedRacers[i - 1];

      let isTie = false;
      if (currentRacer.finished && prevRacer.finished) {
        // Tie based on finish order (should never happen as finish order is sequential)
        isTie = (currentRacer.finishOrder === prevRacer.finishOrder);
      } else if (!currentRacer.finished && !prevRacer.finished) {
        // Tie based on distance (using a small tolerance)
        isTie = Math.abs(currentRacer.distance - prevRacer.distance) < 0.1;
      }

      if (isTie) {
        currentRank = rankedRacers[i - 1].rank;
      } else {
        currentRank = i + 1;
      }
    }

    rankedRacers.push({ ...currentRacer, rank: currentRank });
  }
  return rankedRacers;
};

type AIShipInternal = {
  id: number
  name: string
  color: string
  baseX: number
  z: number
  prevZ: number // Track previous frame position for crossing detection
  speed: number
  finished: boolean
  finishTime?: number
}

/**
 * Detect if a ship crossed the Neptune finish threshold between frames
 * Uses interpolation to find exact crossing point
 * @param prevZ - Ship's Z position in previous frame
 * @param nextZ - Ship's calculated Z position for current frame
 * @param shipX - Ship's X position
 * @param neptunePos - Neptune's 3D position
 * @param threshold - Finish detection threshold radius
 * @returns Object with crossed flag and stopZ position
 */
function detectNeptuneCrossing(
  prevZ: number,
  nextZ: number,
  shipX: number,
  neptunePos: THREE.Vector3,
  threshold: number
): { crossed: boolean; stopZ: number } {
  // Ship moving in negative Z direction
  // Check if we crossed Neptune's Z coordinate
  const neptuneCrossed = prevZ > neptunePos.z && nextZ <= neptunePos.z
  
  if (!neptuneCrossed) {
    return { crossed: false, stopZ: nextZ }
  }
  
  // Interpolate to find where ship enters finish zone
  // Subdivide movement for accuracy
  const totalDistance = prevZ - nextZ
  const steps = 10 // 10 subdivisions provides good accuracy
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const testZ = prevZ - (totalDistance * t)
    const testPos = new THREE.Vector3(shipX, 0, testZ)
    const distToNeptune = testPos.distanceTo(neptunePos)
    
    if (distToNeptune <= threshold) {
      // Found entry point into finish zone
      return { crossed: true, stopZ: testZ }
    }
  }
  
  // Fallback: stop at Neptune's Z coordinate
  return { crossed: true, stopZ: neptunePos.z }
}

const AIManager = () => {
  const { 
    AI_COUNT, AI_FORMATION_ROW_Z_OFFSET, AI_FORMATION_ROW_X_SPREAD,
    FINISH_NEPTUNE_THRESHOLD, LOG_GROWTH_RATE, LOG_BASE_ACCEL,
    AI_SHOOT_CHANCE, AI_SHOOT_RANGE, AI_SHOOT_CONE,
    AI_ACCURACY, AI_FIRE_RATE
  } = GAME_CONSTANTS

  const setAIStandings = useGameStore((s) => s.setAIStandings)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
  const gameState = useGameStore((s) => s.gameState)
  const isRaceStarted = useGameStore((s) => s.isRaceStarted)
  const getAISpeedReduction = useGameStore((s) => s.getAISpeedReduction)
  const updateAISpeedReduction = useGameStore((s) => s.updateAISpeedReduction)
  const fireProjectile = useGameStore((s) => s.fireProjectile)
  const spatialIndices = useGameStore((s) => s.spatialIndices)
  const aiStateArray = useGameStore((s) => s.aiStateArray)
  const updateAIRespawns = useGameStore((s) => s.updateAIRespawns)
  const isAIInvulnerable = useGameStore((s) => s.isAIInvulnerable)
  const setAIRespawnPosition = useGameStore((s) => s.setAIRespawnPosition)
  const getAIRespawnPosition = useGameStore((s) => s.getAIRespawnPosition)
  const getAISizeConfig = useGameStore((s) => s.getAISizeConfig)

  // Track finish order globally
  const finishOrderMapRef = useRef<Map<number | 'player', number>>(new Map())

  const aiShipsData = useMemo(() => {
    const colors = [
      '#FF4444', '#FF8800', '#FFFF00', '#00FF88', '#00FFFF', 
      '#0088FF', '#FF00FF', '#CC00FF', '#FF0088', '#88FF00', 
      '#00CC00', '#4400FF', '#FF44FF', '#884400', '#888888'
    ];
    const names = [
      'Viper', 'Phoenix', 'Falcon', 'Thunder', 'Storm', 
      'Predator', 'Ghost', 'Stinger', 'Raptor', 'Kraken',
      'Comet', 'Arrow', 'Nova', 'Pulsar', 'Goliath'
    ];

    return Array.from({ length: AI_COUNT }).map((_, i) => {
      const sizeConfig = getAISizeConfig(i)
      
      // V-Formation: Player at center, AIs spread in V toward Neptune
      // Left wing: AI 0-6, Right wing: AI 7-13
      let baseX: number
      let initialZ: number
      
      if (i < AI_COUNT / 2) {
        // Left wing
        const row = i
        baseX = -(row + 1) * AI_FORMATION_ROW_X_SPREAD
        initialZ = -(row + 1) * AI_FORMATION_ROW_Z_OFFSET
      } else {
        // Right wing
        const row = i - Math.floor(AI_COUNT / 2)
        baseX = (row + 1) * AI_FORMATION_ROW_X_SPREAD
        initialZ = -(row + 1) * AI_FORMATION_ROW_Z_OFFSET
      }
      
      return {
        id: i,
        name: names[i % names.length],
        color: colors[i % colors.length],
        baseX,
        initialZ,
        sizeScale: sizeConfig.scale
      }
    })
  }, [AI_COUNT, AI_FORMATION_ROW_Z_OFFSET, AI_FORMATION_ROW_X_SPREAD, getAISizeConfig])

  const aiRefs = useRef<THREE.Group[]>([])
  aiRefs.current = []

  const aiStateRef = useRef<AIShipInternal[]>([])
  const finishOrderRef = useRef<number[]>([])
  const initOnceRef = useRef(false)
  const aiEndedRef = useRef(false)
  const frameCounterRef = useRef(0)
  const lastAIUpdateFrame = useRef(0)
  const aiBoosterCooldownRef = useRef<number[]>([]) // Cooldown tracking for each AI

  // Initialize AI states immediately (not in useEffect to avoid timing issues)
  if (aiStateRef.current.length === 0 || !initOnceRef.current) {
    aiStateRef.current = aiShipsData.map((d) => {
      return {
        id: d.id,
        name: d.name,
        color: d.color,
        baseX: d.baseX,
        z: d.initialZ,
        prevZ: d.initialZ, // Initialize prevZ same as z
        speed: 0, // Start at 0, will accelerate like player
        finished: false,
      }
    })
    finishOrderRef.current = []
    aiEndedRef.current = false
    initOnceRef.current = true
  }

  // Reset AI states when entering menu, camera-sweep, or countdown
  useEffect(() => {
    if (gameState === 'menu' || gameState === 'camera-sweep' || gameState === 'countdown') {
      aiStateRef.current = aiShipsData.map((d) => {
        return {
          id: d.id,
          name: d.name,
          color: d.color,
          baseX: d.baseX,
          z: d.initialZ,
          prevZ: d.initialZ, // Reset prevZ as well
          speed: 0,
          finished: false,
        }
      })
      finishOrderRef.current = []
      finishOrderMapRef.current.clear() // Clear finish order map
      aiEndedRef.current = false
    }
  }, [aiShipsData, gameState, getAISizeConfig])

  useFrame((_state, delta) => {
    profiler.start('AIManager.frame')
    
    frameCounterRef.current++
    const currentFrame = frameCounterRef.current
    
    // AI update every 2 frames for performance (still smooth at 30 AI updates/sec)
    const shouldUpdateAI = currentFrame - lastAIUpdateFrame.current >= 2
    
    const raceTime = useGameStore.getState().raceTime
    const lastAIShotTimes = useGameStore.getState().lastAIShotTimes

    // Update speed reductions every frame (lightweight)
    profiler.start('AIManager.speedReduction')
    updateAISpeedReduction(delta)
    profiler.end('AIManager.speedReduction')
    
    // Update AI respawns every frame
    profiler.start('AIManager.respawns')
    updateAIRespawns(delta, raceTime)
    profiler.end('AIManager.respawns')

    // Get player position for AI targeting
    const playerPos = (window as any).__weaponSystemRefs?.playerPosition || new THREE.Vector3()

    // Early exit: if finished, keep updating standings but don't move
    const standingsTemp: { id: number, name: string, distance: number, finished: boolean, finishTime?: number }[] = []

    // Move, apply positions, and detect finish
    profiler.start('AIManager.updateShips')
    
    // Batch position updates for spatial index
    const spatialUpdates: Array<{ id: number; position: THREE.Vector3; radius: number }> = []
    
    for (let i = 0; i < aiStateRef.current.length; i++) {
      const st = aiStateRef.current[i]

      // Check if AI is destroyed using bit flags
      const aiState = aiStateArray[st.id]
      const isDestroyed = BitFlagUtils.has(aiState, ShipState.DESTROYED)
      const isInvulnerable = isAIInvulnerable(st.id)
      
      // Apply to mesh
      const ref = aiRefs.current[i]
      
      if (isDestroyed) {
        // Store the position where AI was destroyed for respawn
        if (ref && ref.visible) {
          setAIRespawnPosition(st.id, ref.position.x, ref.position.z)
        }
        
        // Hide destroyed ships
        if (ref) {
          ref.visible = false
        }
        continue
      }
      
      // Check if AI just respawned and should be repositioned (only once)
      const respawnPos = getAIRespawnPosition(st.id)
      if (respawnPos && isInvulnerable) {
        // Check if we just transitioned from destroyed to alive
        const wasJustRespawned = st.z !== respawnPos.z
        if (wasJustRespawned) {
          // Use respawn position only on the first frame after respawn
          st.z = respawnPos.z
          // No xOffset in new formation system
        }
      }
      
      // Show ship and apply blinking effect if invulnerable
      if (ref) {
        ref.visible = true
        
        // Blinking effect during invulnerability
        if (isInvulnerable) {
          // Blink at 5Hz (5 times per second)
          const blinkFrequency = 5
          const blinkPhase = (raceTime * blinkFrequency) % 1
          ref.visible = blinkPhase < 0.5
        }
      }

      // No sway, no xOffset - ships stay in formation
      const finalX = st.baseX
      
      // Store previous position BEFORE calculating movement
      const prevZ = st.z
      
      // Calculate next position (don't apply yet)
      let nextZ = st.z
      let effectiveGameSpeed = 0
      
      // Only calculate movement if not finished
      if (gameState === 'playing' && isRaceStarted && !st.finished) {
        // Get AI size config for mass-based acceleration
        const sizeConfig = getAISizeConfig(st.id)
        const massFactor = 1.0 / Math.max(0.1, sizeConfig.mass)
        
        // Apply exponential acceleration (matching player physics)
        const absSpeed = Math.abs(st.speed)
        const currentMaxSpeed = sizeConfig.maxSpeed
        const headroom = Math.max(0, 1 - (absSpeed / currentMaxSpeed))
        
        // Same formula as player: (baseAccel + speed * growthRate) * headroom * massFactor
        const instantaneousAccel = (LOG_BASE_ACCEL + absSpeed * LOG_GROWTH_RATE) * headroom * massFactor
        st.speed += instantaneousAccel * delta
        
        // Clamp to max speed
        st.speed = Math.min(st.speed, currentMaxSpeed)
        
        // Apply speed reduction from damage
        const speedReduction = getAISpeedReduction(st.id)
        effectiveGameSpeed = st.speed * (1 - speedReduction)
        
        // Convert game speed to actual movement speed (same as player)
        const effectiveSpeed = SOLAR_CONSTANTS.gameSpeedToUnitsPerSec(effectiveGameSpeed)
        
        // Calculate next Z position (don't apply yet)
        nextZ = st.z - effectiveSpeed * delta
      }
      
      // Check for Neptune crossing using interpolation
      const neptunePos = new THREE.Vector3(
        PLANETARY_POSITIONS.neptune.x,
        PLANETARY_POSITIONS.neptune.y,
        PLANETARY_POSITIONS.neptune.z
      )
      
      const crossing = detectNeptuneCrossing(
        prevZ,
        nextZ,
        finalX,
        neptunePos,
        FINISH_NEPTUNE_THRESHOLD
      )
      
      if (!st.finished && crossing.crossed) {
        // Ship crossed finish threshold!
        st.finished = true
        st.finishTime = useGameStore.getState().raceTime
        st.speed = 0
        st.z = crossing.stopZ // Stop at threshold boundary
        finishOrderRef.current.push(st.id)
        
        // Record finish order (1-based: 1st, 2nd, 3rd, etc.)
        finishOrderMapRef.current.set(st.id, finishOrderRef.current.length)
      } else if (!st.finished && gameState === 'playing' && isRaceStarted) {
        // Normal movement - apply next position
        st.z = nextZ
      }
      
      // Update previous position for next frame
      st.prevZ = st.z
      
      // Update distance for standings (calculate after position is finalized)
      const currentAiPos = new THREE.Vector3(finalX, 0, st.z)
      const distanceToNeptune = currentAiPos.distanceTo(neptunePos)
      
      // Check booster collision for AI ships
      if (gameState === 'playing' && isRaceStarted && !st.finished) {
        if (!aiBoosterCooldownRef.current[st.id]) {
          aiBoosterCooldownRef.current[st.id] = 0
        }

        const currentTime = raceTime
        // Use a cooldown to prevent constant re-triggering of the reusable booster effect
        if (currentTime - aiBoosterCooldownRef.current[st.id] >= 0.5) {
          const { BOOSTER_RING_RADIUS, BOOSTER_DURATION, BOOSTER_RADIUS } = GAME_CONSTANTS
          const aiPos = new THREE.Vector3(finalX, 0, st.z)
          const nearbyBoosters = spatialIndices.boosters.queryRadius(aiPos, BOOSTER_RING_RADIUS * 1.5)

          for (const booster of nearbyBoosters) {
            // Check distance to permanent booster
            const distance = aiPos.distanceTo(booster.position)
            if (distance < BOOSTER_RADIUS + 3) {
              // AI collected reusable booster
              aiBoosterCooldownRef.current[st.id] = currentTime

              // Boost AI speed
              st.speed = Math.min(st.speed * GAME_CONSTANTS.BOOSTER_SPEED_MULTIPLIER, GAME_CONSTANTS.MAX_SPEED * GAME_CONSTANTS.BOOSTER_SPEED_MULTIPLIER)

              // Schedule boost end
              setTimeout(() => {
                st.speed = st.speed / GAME_CONSTANTS.BOOSTER_SPEED_MULTIPLIER
              }, BOOSTER_DURATION * 1000)

              break
            }
          }
        }
      }
      

      if (ref && ref.visible) {
        ref.position.set(finalX, 0, st.z)
        // No rotation wobble
        
        // Batch spatial index update
        spatialUpdates.push({
          id: st.id,
          position: ref.position.clone(),
          radius: 6 // SHIP_COLLISION_RADIUS
        })
        
        // Update position for weapon system (legacy support)
        if ((window as any).__weaponSystemRefs) {
          (window as any).__weaponSystemRefs.aiShipPositions.set(st.id, ref.position.clone())
        }
        
        // AI Shooting logic - only update when shouldUpdateAI
        if (shouldUpdateAI && gameState === 'playing' && isRaceStarted) {
          profiler.start('AIManager.shooting')
          
          const distanceToPlayer = ref.position.distanceTo(playerPos)
          
          // Distance-based LOD: only shoot if player is reasonably close
          if (distanceToPlayer < AI_SHOOT_RANGE) {
            // Calculate angle to player
            const toPlayer = playerPos.clone().sub(ref.position).normalize()
            const forward = new THREE.Vector3(0, 0, -1)
            const angle = Math.acos(Math.max(-1, Math.min(1, forward.dot(toPlayer)))) * (180 / Math.PI)
            
            // Check if player is in front cone
            if (angle < AI_SHOOT_CONE) {
              const lastShot = lastAIShotTimes[st.id] || 0
              const timeSinceLastShot = raceTime - lastShot
              
              // Random shooting with fire rate limit
              if (timeSinceLastShot > AI_FIRE_RATE && Math.random() < AI_SHOOT_CHANCE * delta * 2) { // *2 to compensate for frame skipping
                // Use predictive targeting
                const playerVelocity = new THREE.Vector3(0, 0, -useGameStore.getState().speed)
                const leadPosition = PredictiveTargeting.calculateLeadPosition(
                  ref.position,
                  playerPos,
                  playerVelocity,
                  GAME_CONSTANTS.PROJECTILE_SPEED
                )
                
                const shootDir = leadPosition.sub(ref.position).normalize()
                
                // Add accuracy variation
                const accuracyOffset = (1 - AI_ACCURACY) * (Math.random() - 0.5) * 2
                shootDir.x += accuracyOffset * 0.5
                shootDir.y += accuracyOffset * 0.5
                shootDir.normalize()
                
                const spawnPos = ref.position.clone().add(shootDir.clone().multiplyScalar(3))
                fireProjectile(spawnPos, shootDir, false)
                
                // Update last shot time using typed array
                const newTimes = lastAIShotTimes.slice()
                newTimes[st.id] = raceTime
                useGameStore.setState({ lastAIShotTimes: newTimes })
              }
            }
          }
          profiler.end('AIManager.shooting')
        }
      }

      // Update distance for standings
      const dist = st.finished ? 0 : distanceToNeptune
      standingsTemp.push({ id: st.id, name: st.name, distance: dist, finished: st.finished, finishTime: st.finishTime })
    }
    
    // Batch update spatial index
    if (spatialUpdates.length > 0) {
      spatialUpdates.forEach(update => {
        spatialIndices.aiShips.addOrUpdate(update)
      })
    }
    
    if (shouldUpdateAI) {
      lastAIUpdateFrame.current = currentFrame
    }
    
    profiler.end('AIManager.updateShips')

    // --- Combined Ranking with Player and Tie Handling ---
    const playerRaceState = useGameStore.getState()
    
    // Check if player finished and record finish order
    if (playerRaceState.finishTime && !finishOrderMapRef.current.has('player')) {
      finishOrderRef.current.push(-1) // Use -1 as player marker in array
      finishOrderMapRef.current.set('player', finishOrderRef.current.length)
    }
    
    const playerRacer: RacerStanding = {
      id: 'player',
      name: 'YOU', // Name matches Leaderboard component
      distance: playerRaceState.distanceToFinish,
      finished: !!playerRaceState.finishTime,
      finishTime: playerRaceState.finishTime ?? undefined,
      finishOrder: finishOrderMapRef.current.get('player'),
    }

    // Convert AI data to RacerStanding interface
    const aiRacers: RacerStanding[] = standingsTemp.map(s => ({
      id: s.id,
      name: s.name,
      distance: s.distance,
      finished: s.finished,
      finishTime: s.finishTime,
      finishOrder: finishOrderMapRef.current.get(s.id),
    }));

    const allRacers = [playerRacer, ...aiRacers];

    // Assign ranks using tie handling logic
    const rankedRacers = assignRanksWithTies(allRacers);

    // Extract updated player position and AI standings
    const playerRanked = rankedRacers.find(r => r.id === 'player');
    
    // Filter AI standings to update the store's aiStandings structure (name, distance, position)
    const aiStandingsUpdated = rankedRacers
      .filter(r => r.id !== 'player')
      .map(r => ({
        name: r.name,
        distance: r.distance,
        position: r.rank 
      }));

    // Update the store
    // The player's rank is stored separately in playerPosition
    if (playerRanked) {
      setPlayerPosition(playerRanked.rank);
    }
    setAIStandings(aiStandingsUpdated);
    // --- End Combined Ranking ---
    
    profiler.end('AIManager.frame')
  })

  return (
    <>
      {aiStateRef.current.length === aiShipsData.length && aiShipsData.map((ship, idx) => (
        <AISpaceship
          key={ship.id}
          ref={(el: THREE.Group) => { if (el) aiRefs.current[idx] = el }}
          position={[ship.baseX, 0, aiStateRef.current[idx]?.z ?? ship.initialZ]}
          rotationY={0}
          color={ship.color}
          sizeScale={ship.sizeScale}
        />
      ))}
    </>
  )
}

const RaceElements = () => {
  return (
    <group>
      <AIManager />
    </group>
  );
};

export default RaceElements;