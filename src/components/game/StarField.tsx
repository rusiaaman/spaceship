import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import { GAME_CONSTANTS } from '@/utils/constants'

export const StarField = () => {
  const pointsRef = useRef<THREE.Points>(null)
  const speed = useGameStore((state) => state.speed)

  const [positions, velocities] = useMemo(() => {
    const positions = new Float32Array(GAME_CONSTANTS.STAR_COUNT * 3)
    const velocities = new Float32Array(GAME_CONSTANTS.STAR_COUNT)

    for (let i = 0; i < GAME_CONSTANTS.STAR_COUNT; i++) {
      const i3 = i * 3
      
      // Create stars in a cylindrical volume ahead of the camera
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * GAME_CONSTANTS.STAR_SPREAD
      const depth = Math.random() * GAME_CONSTANTS.STAR_SPREAD * 2

      positions[i3] = Math.cos(angle) * radius
      positions[i3 + 1] = Math.sin(angle) * radius
      positions[i3 + 2] = -depth - 50
      
      velocities[i] = Math.random() * 0.5 + 0.5
    }

    return [positions, velocities]
  }, [])

  useFrame(() => {
    if (!pointsRef.current) return

    const positionAttribute = pointsRef.current.geometry.attributes.position
    const speedFactor = (speed / GAME_CONSTANTS.MAX_SPEED) * 10 + 1

    for (let i = 0; i < GAME_CONSTANTS.STAR_COUNT; i++) {
      const i3 = i * 3
      
      // Move stars towards camera
      positionAttribute.array[i3 + 2] += velocities[i] * speedFactor

      // Reset star position when it passes the camera
      if (positionAttribute.array[i3 + 2] > 10) {
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * GAME_CONSTANTS.STAR_SPREAD

        positionAttribute.array[i3] = Math.cos(angle) * radius
        positionAttribute.array[i3 + 1] = Math.sin(angle) * radius
        positionAttribute.array[i3 + 2] = -GAME_CONSTANTS.STAR_SPREAD * 2
      }
    }

    positionAttribute.needsUpdate = true
  })

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
        size={3}
        color="#ffffff"
        sizeAttenuation={true}
        transparent={true}
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}