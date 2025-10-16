
import { useMemo, useRef, forwardRef, useEffect } from 'react';
import * as THREE from 'three';
import { GAME_CONSTANTS } from '@/utils/constants';
import { Cylinder, Torus, Box } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/store/gameStore';

interface AIShipProps {
  position: [number, number, number];
  rotationY: number;
  color: string;
}

const AISpaceship = forwardRef<THREE.Group, AIShipProps>(({ position, rotationY, color }, ref) => {
  return (
    <group position={position} rotation-y={rotationY} ref={ref}>
      {/* Main body */}
      <Box args={[2, 1, 4]} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </Box>
      {/* Wings */}
      <Box args={[6, 0.3, 2]} position={[0, 0, 0.5]}>
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          metalness={0.6}
          roughness={0.3}
        />
      </Box>
      {/* Cockpit */}
      <Box args={[1.2, 0.8, 1.5]} position={[0, 0.6, 0.5]}>
        <meshStandardMaterial 
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </Box>
      {/* Engine glow */}
      <pointLight position={[0, 0, -2]} color={color} intensity={2} distance={10} />
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
      {/* Outer Ring - vertical, facing towards player */}
      <Torus args={[FINISH_DISK_RADIUS, 1, 16, 100]}>
        <meshBasicMaterial color="#00ff00" />
      </Torus>
      {/* Inner transparent disk - vertical, facing player */}
      <Cylinder args={[FINISH_DISK_RADIUS, FINISH_DISK_RADIUS, 0.1, 64, 1, true]} rotation-x={Math.PI / 2}>
        <meshStandardMaterial color="#00ff00" transparent opacity={0.1} side={THREE.DoubleSide} />
      </Cylinder>
      {/* Add glowing effect rings */}
      <Torus args={[FINISH_DISK_RADIUS * 0.8, 0.5, 16, 100]}>
        <meshBasicMaterial color="#00ff00" transparent opacity={0.5} />
      </Torus>
      <Torus args={[FINISH_DISK_RADIUS * 0.6, 0.3, 16, 100]}>
        <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
      </Torus>
    </group>
  );
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
    FINISH_DISK_RADIUS
  } = GAME_CONSTANTS

  const setAIStandings = useGameStore((s) => s.setAIStandings)
  const gameState = useGameStore((s) => s.gameState)
  const isRaceStarted = useGameStore((s) => s.isRaceStarted)

  const aiShipsData = useMemo(() => {
    const colors = ['#ff4444', '#ff8800', '#ffff00', '#ff00ff', '#00ff88'];
    const names = ['Viper', 'Phoenix', 'Falcon', 'Thunder', 'Storm'];
    const half = (AI_COUNT - 1) / 2

    return Array.from({ length: AI_COUNT }).map((_, i) => {
      const baseX = (i - half) * 8
      // Spawn ahead of player toward finish (negative z)
      const nearMin = Math.min(Math.abs(AI_INITIAL_Z_MIN), Math.abs(AI_INITIAL_Z_MAX))
      const nearMax = Math.max(Math.abs(AI_INITIAL_Z_MIN), Math.abs(AI_INITIAL_Z_MAX))
      const zNeg = - (Math.random() * (nearMax - nearMin) + nearMin)
      return {
        id: i,
        name: names[i % names.length],
        color: colors[i % colors.length],
        baseX,
        initialZ: zNeg as number
      }
    })
  }, [AI_COUNT, AI_INITIAL_Z_MAX, AI_INITIAL_Z_MIN])

  const aiRefs = useRef<THREE.Group[]>([])
  aiRefs.current = []

  const aiStateRef = useRef<AIShipInternal[]>([])
  const finishOrderRef = useRef<number[]>([])
  const initOnceRef = useRef(false)
  const aiEndedRef = useRef(false)

  // Initialize or reset AI states when entering menu or countdown
  useEffect(() => {
    if (gameState === 'menu' || gameState === 'countdown' || !initOnceRef.current) {
      aiStateRef.current = aiShipsData.map((d) => {
        const variance = 1 + (Math.random() * 2 - 1) * AI_SPEED_VARIANCE
        const speed = MAX_SPEED * AI_SPEED_MULTIPLIER * variance
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
  }, [aiShipsData, gameState, MAX_SPEED, AI_SPEED_MULTIPLIER, AI_SPEED_VARIANCE])

  useFrame((state, delta) => {
    const finishZ = -RACE_DISTANCE
    const t = state.clock.elapsedTime

    // Early exit: if finished, keep updating standings but don't move
    const standingsTemp: { id: number, name: string, distance: number, finished: boolean, finishTime?: number }[] = []

    // First pass: desired positions (without separation)
    const desiredX: number[] = []
    const currentZ: number[] = []
    for (let i = 0; i < aiStateRef.current.length; i++) {
      const st = aiStateRef.current[i]
      const sway = Math.sin(t * AI_LATERAL_SWAY_FREQUENCY + st.phase) * AI_LATERAL_SWAY_AMPLITUDE
      desiredX[i] = st.baseX + sway + st.xOffset
      currentZ[i] = st.z
    }

    // Simple pairwise separation to avoid overlap
    const sepZ = 12
    const sepX = 4
    for (let i = 0; i < aiStateRef.current.length; i++) {
      for (let j = i + 1; j < aiStateRef.current.length; j++) {
        const dz = Math.abs(currentZ[i] - currentZ[j])
        const dx = desiredX[i] - desiredX[j]
        if (dz < sepZ && Math.abs(dx) < sepX) {
          const push = (sepX - Math.abs(dx)) * 0.5 // base magnitude
          const dir = dx >= 0 ? 1 : -1
          aiStateRef.current[i].xOffset += dir * push * delta * 5
          aiStateRef.current[j].xOffset -= dir * push * delta * 5
        }
      }
    }

    // Dampen xOffset
    for (let i = 0; i < aiStateRef.current.length; i++) {
      const st = aiStateRef.current[i]
      st.xOffset = THREE.MathUtils.damp(st.xOffset, 0, 2, delta)
    }

    // Move, apply positions, and detect finish
    for (let i = 0; i < aiStateRef.current.length; i++) {
      const st = aiStateRef.current[i]

      if (gameState === 'playing' && isRaceStarted && !st.finished) {
        // Move forward toward finish (negative Z direction)
        st.z -= st.speed * delta
      }

      // Recompute finalX after separation/damping
      const sway = Math.sin(t * AI_LATERAL_SWAY_FREQUENCY + st.phase) * AI_LATERAL_SWAY_AMPLITUDE
      let finalX = st.baseX + sway + st.xOffset
      finalX = THREE.MathUtils.clamp(finalX, -30, 30)

      // Apply to mesh
      const ref = aiRefs.current[i]
      if (ref) {
        ref.position.set(finalX, 0, st.z)
        ref.rotation.z = Math.sin(t * AI_LATERAL_SWAY_FREQUENCY + st.phase) * 0.1
      }

      // Finish detection: cross finishZ and within disk radius
      if (!st.finished && st.z <= finishZ && Math.abs(finalX) <= FINISH_DISK_RADIUS) {
        st.finished = true
        st.finishTime = useGameStore.getState().raceTime
        finishOrderRef.current.push(st.id)

        // If AI finishes first, end the race
        if (!aiEndedRef.current) {
          aiEndedRef.current = true
          const raceTime = useGameStore.getState().raceTime
          if (useGameStore.getState().gameState === 'playing') {
            useGameStore.getState().finishRace(raceTime)
          }
        }
      }

      const dist = st.finished ? 0 : Math.max(0, Math.abs(st.z - finishZ))
      standingsTemp.push({ id: st.id, name: st.name, distance: dist, finished: st.finished, finishTime: st.finishTime })
    }

    // Order standings: finished by finish order, then by distance
    const finishedList = standingsTemp
      .filter(s => s.finished)
      .sort((a, b) => (finishOrderRef.current.indexOf(a.id)) - (finishOrderRef.current.indexOf(b.id)))

    const racingList = standingsTemp
      .filter(s => !s.finished)
      .sort((a, b) => a.distance - b.distance)

    const ordered = [...finishedList, ...racingList]

    // Assign positions within AI group
    const finalStandings = ordered.map((s, idx) => ({
      name: s.name,
      distance: s.distance,
      position: idx + 1
    }))

    setAIStandings(finalStandings)
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
