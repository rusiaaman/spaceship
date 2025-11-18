
import { useMemo, useRef, forwardRef, useEffect } from 'react';
import * as THREE from 'three';
import { GAME_CONSTANTS } from '@/utils/constants';
import { Cylinder, Torus, Text3D, Center } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/store/gameStore';
import { profiler } from '@/utils/profiler';
import { ShipState, BitFlagUtils } from '@/utils/BitFlags';
import { PredictiveTargeting } from '@/utils/AIBehaviors';
import { SOLAR_CONSTANTS } from '@/utils/solarSystemData';

interface AIShipProps {
  position: [number, number, number];
  rotationY: number;
  color: string;
  sizeScale: number;
}

// Shared geometries for all AI ships (performance optimization)
const aiBodyGeometry = new THREE.BoxGeometry(2, 1, 4)
const aiWingGeometry = new THREE.BoxGeometry(6, 0.3, 2)

const AISpaceship = forwardRef<THREE.Group, AIShipProps>(({ position, rotationY, color, sizeScale }, ref) => {
  return (
    <group position={position} rotation-y={rotationY} ref={ref} scale={0.5 * sizeScale}>
      {/* Main body - using shared geometry, scaled by ship size (matches player ship scale) */}
      <mesh geometry={aiBodyGeometry} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.3}
          metalness={0.6}
          roughness={0.4}
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
        />
      </mesh>
    </group>
  );
});
AISpaceship.displayName = 'AISpaceship'

// Finish Disk component - Vertical disk facing the starting position
const FinishDisk = () => {
  const { FINISH_DISK_RADIUS, RACE_DISTANCE } = GAME_CONSTANTS;
  
  // Position the disk far away on the negative Z axis
  const position: [number, number, number] = [0, 0, -RACE_DISTANCE];

  return (
    <group position={position}>
      {/* Outer Ring - TRUE scale (36,000 km diameter, 240 km thick) */}
      <Torus args={[FINISH_DISK_RADIUS, 1000, 16, 64]}>
        <meshBasicMaterial color="#00ff00" />
      </Torus>
      {/* Inner transparent disk */}
      <Cylinder args={[FINISH_DISK_RADIUS, FINISH_DISK_RADIUS, 100, 64, 1, true]} rotation-x={Math.PI / 2}>
        <meshStandardMaterial color="#00ff00" transparent opacity={0.1} side={THREE.DoubleSide} />
      </Cylinder>
      {/* Glowing inner ring */}
      <Torus args={[FINISH_DISK_RADIUS * 0.8, 800, 16, 64]}>
        <meshBasicMaterial color="#00ff00" transparent opacity={0.5} />
      </Torus>
      
      {/* 3D Text Label - MASSIVE scale (1,200 km tall text!) */}
      <Center position={[0, 200000, 0]} rotation-y={Math.PI}>
        <Text3D
          font="/fonts/Orbitron_Bold.json"
          size={5000}
          height={1000}
          curveSegments={12}
          bevelEnabled
          bevelThickness={200}
          bevelSize={150}
          bevelOffset={0}
          bevelSegments={5}
        >
          FINISH LINE
          <meshBasicMaterial 
            color="#00ff00" 
            toneMapped={false}
          />
        </Text3D>
      </Center>
      
      {/* Additional glow ring for visibility from vast distances */}
      <Torus args={[FINISH_DISK_RADIUS * 1.1, 1200, 16, 64]} position={[0, 0, 0]}>
        <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
      </Torus>
    </group>
  );
};

interface RacerStanding {
  id: number | 'player';
  name: string;
  distance: number;
  finished: boolean;
  finishTime?: number;
}

// Helper function to sort and assign ranks with tie handling (Dense Ranking)
const assignRanksWithTies = (racers: RacerStanding[]): (RacerStanding & { rank: number })[] => {
  // Sort racers: 1. Finished first, 2. By finish time (asc), 3. By distance (asc)
  const sortedRacers = racers.sort((a, b) => {
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;

    if (a.finished && b.finished) {
      // Sort by finish time (lower is better)
      return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity);
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
        // Tie based on finish time
        isTie = (currentRacer.finishTime === prevRacer.finishTime);
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
  speed: number
  phase: number
  xOffset: number
  finished: boolean
  finishTime?: number
}

const AIManager = () => {
  const { 
    AI_COUNT, AI_SPEED_MULTIPLIER, AI_SPEED_VARIANCE,
    AI_LATERAL_SWAY_AMPLITUDE, AI_LATERAL_SWAY_FREQUENCY,
    MAX_SPEED, RACE_DISTANCE, AI_INITIAL_Z_MIN, AI_INITIAL_Z_MAX,
    FINISH_DISK_RADIUS, AI_SHOOT_CHANCE, AI_SHOOT_RANGE, AI_SHOOT_CONE,
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
    const half = (AI_COUNT - 1) / 2

    return Array.from({ length: AI_COUNT }).map((_, i) => {
      const sizeConfig = getAISizeConfig(i)
      const baseX = (i - half) * 8 * sizeConfig.scale // Adjust spacing based on size
      // Spawn ahead of player toward finish (negative z)
      const nearMin = Math.min(Math.abs(AI_INITIAL_Z_MIN), Math.abs(AI_INITIAL_Z_MAX))
      const nearMax = Math.max(Math.abs(AI_INITIAL_Z_MIN), Math.abs(AI_INITIAL_Z_MAX))
      const zNeg = - (Math.random() * (nearMax - nearMin) + nearMin)
      return {
        id: i,
        name: names[i % names.length],
        color: colors[i % colors.length],
        baseX,
        initialZ: zNeg as number,
        sizeScale: sizeConfig.scale
      }
    })
  }, [AI_COUNT, AI_INITIAL_Z_MAX, AI_INITIAL_Z_MIN, getAISizeConfig])

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
      const sizeConfig = getAISizeConfig(d.id)
      const variance = 1 + (Math.random() * 2 - 1) * AI_SPEED_VARIANCE
      // Use size-specific max speed
      const speed = sizeConfig.maxSpeed * AI_SPEED_MULTIPLIER * variance
      return {
        id: d.id,
        name: d.name,
        color: d.color,
        baseX: d.baseX,
        z: d.initialZ,
        speed,
        phase: Math.random() * Math.PI * 2,
        xOffset: 0,
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
        const sizeConfig = getAISizeConfig(d.id)
        const variance = 1 + (Math.random() * 2 - 1) * AI_SPEED_VARIANCE
        // Use size-specific max speed
        const speed = sizeConfig.maxSpeed * AI_SPEED_MULTIPLIER * variance
        return {
          id: d.id,
          name: d.name,
          color: d.color,
          baseX: d.baseX,
          z: d.initialZ,
          speed,
          phase: Math.random() * Math.PI * 2,
          xOffset: 0,
          finished: false,
        }
      })
      finishOrderRef.current = []
      aiEndedRef.current = false
    }
  }, [aiShipsData, gameState, MAX_SPEED, AI_SPEED_MULTIPLIER, AI_SPEED_VARIANCE, getAISizeConfig])

  useFrame((state, delta) => {
    profiler.start('AIManager.frame')
    
    frameCounterRef.current++
    const currentFrame = frameCounterRef.current
    
    // AI update every 2 frames for performance (still smooth at 30 AI updates/sec)
    const shouldUpdateAI = currentFrame - lastAIUpdateFrame.current >= 2
    
    const finishZ = -RACE_DISTANCE
    const t = state.clock.elapsedTime
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

    // First pass: desired positions (without separation)
    profiler.start('AIManager.positionCalc')
    const desiredX: number[] = []
    const currentZ: number[] = []
    for (let i = 0; i < aiStateRef.current.length; i++) {
      const st = aiStateRef.current[i]
      const sway = Math.sin(t * AI_LATERAL_SWAY_FREQUENCY + st.phase) * AI_LATERAL_SWAY_AMPLITUDE
      desiredX[i] = st.baseX + sway + st.xOffset
      currentZ[i] = st.z
    }

    // Optimized separation - only check nearby ships
    const sepZ = 12
    const sepX = 4
    // Only run collision when AI updates
    if (shouldUpdateAI) {
      for (let i = 0; i < aiStateRef.current.length; i++) {
        for (let j = i + 1; j < aiStateRef.current.length; j++) {
          const dz = Math.abs(currentZ[i] - currentZ[j])
          if (dz > sepZ) continue // Skip if too far apart in Z
          
          const dx = desiredX[i] - desiredX[j]
          if (Math.abs(dx) < sepX) {
            const push = (sepX - Math.abs(dx)) * 0.5
            const dir = dx >= 0 ? 1 : -1
            aiStateRef.current[i].xOffset += dir * push * delta * 5
            aiStateRef.current[j].xOffset -= dir * push * delta * 5
          }
        }
      }
    }

    profiler.end('AIManager.positionCalc')
    
    // Dampen xOffset
    for (let i = 0; i < aiStateRef.current.length; i++) {
      const st = aiStateRef.current[i]
      st.xOffset = THREE.MathUtils.damp(st.xOffset, 0, 2, delta)
    }

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
          st.xOffset = respawnPos.x - st.baseX
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

      if (gameState === 'playing' && isRaceStarted && !st.finished) {
        // Apply speed reduction from damage
        const speedReduction = getAISpeedReduction(st.id)
        const effectiveGameSpeed = st.speed * (1 - speedReduction)
        
        // Convert game speed to actual movement speed (same as player)
        const effectiveSpeed = SOLAR_CONSTANTS.gameSpeedToUnitsPerSec(effectiveGameSpeed)
        
        // Move forward toward finish (negative Z direction)
        st.z -= effectiveSpeed * delta
      }

      // Recompute finalX after separation/damping - TRUE scale
      const sway = Math.sin(t * AI_LATERAL_SWAY_FREQUENCY + st.phase) * AI_LATERAL_SWAY_AMPLITUDE
      let finalX = st.baseX + sway + st.xOffset
      finalX = THREE.MathUtils.clamp(finalX, -100000, 100000) // 24,000 km track width
      
      // Check booster collision for AI ships (after finalX is calculated)
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
        ref.rotation.z = Math.sin(t * AI_LATERAL_SWAY_FREQUENCY + st.phase) * 0.1
        
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

      // Finish detection: cross finishZ and within disk radius
      if (!st.finished && st.z <= finishZ && Math.abs(finalX) <= FINISH_DISK_RADIUS) {
        st.finished = true
        st.finishTime = useGameStore.getState().raceTime
        finishOrderRef.current.push(st.id)
        
        // AI ships can finish, but don't end the race
        // The race only ends when the player finishes (handled in SpaceshipController)
      }

      const dist = st.finished ? 0 : Math.max(0, Math.abs(st.z - finishZ))
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
    const playerRacer: RacerStanding = {
      id: 'player',
      name: 'YOU', // Name matches Leaderboard component
      distance: playerRaceState.distanceToFinish,
      finished: !!playerRaceState.finishTime,
      finishTime: playerRaceState.finishTime ?? undefined,
    }

    // Convert AI data to RacerStanding interface
    const aiRacers: RacerStanding[] = standingsTemp.map(s => ({
      id: s.id,
      name: s.name,
      distance: s.distance,
      finished: s.finished,
      finishTime: s.finishTime,
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
      <FinishDisk />
      <AIManager />
    </group>
  );
};

export default RaceElements;