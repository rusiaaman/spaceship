import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { GAME_CONSTANTS } from '@/utils/constants'

export const StarField = () => {
  const pointsRef = useRef<THREE.Points>(null)

  // Static starfield positions (no per-frame movement)
  const positions = useMemo(() => {
    const positions = new Float32Array(GAME_CONSTANTS.STAR_COUNT * 3)

    // Extend the field to cover the entire race track and beyond
    const raceLength = GAME_CONSTANTS.RACE_DISTANCE + 500 // Extra buffer beyond finish

    for (let i = 0; i < GAME_CONSTANTS.STAR_COUNT; i++) {
      const i3 = i * 3

      // Create stars in a cylindrical volume along the entire race track
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * GAME_CONSTANTS.STAR_SPREAD
      const depth = Math.random() * raceLength // Extend to full race length

      positions[i3] = Math.cos(angle) * radius
      positions[i3 + 1] = Math.sin(angle) * radius
      positions[i3 + 2] = -depth - 50 // Start from -50 and extend backward
    }

    return positions
  }, [])

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={GAME_CONSTANTS.STAR_COUNT}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={2.5}
        color="#ffffff"
        sizeAttenuation={true}
        transparent={false}
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}