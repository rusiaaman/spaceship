import { useRef, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Torus } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'

interface SpeedBoosterProps {
  id: number
  position: [number, number, number]
}

const SpeedBoosterComponent = ({ id, position }: SpeedBoosterProps) => {
  const groupRef = useRef<THREE.Group>(null!)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!)
  const wasCollectedRef = useRef(false)

  // Check collection status directly in useFrame to avoid subscribing to the entire store
  // (raceTime updates every frame and would otherwise trigger many subscribers)
  useFrame((state) => {
    // If already marked collected, skip all work
    if (wasCollectedRef.current) return

    // Read store once via getState (no subscription)
    const collectedBoosters = useGameStore.getState().collectedBoosters
    if (collectedBoosters.has(id)) {
      // Mark locally so future frames do nothing
      wasCollectedRef.current = true
      return
    }

    if (!groupRef.current) return

    const time = state.clock.elapsedTime

    // Simple rotation only
    groupRef.current.rotation.z = time * 1.5

    // Pulse emissive intensity instead of scale
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 1.5 + Math.sin(time * 3) * 0.5
    }
  })

  // Read once during render to determine initial visibility. BoosterManager will remove the component
  // when the booster is collected which triggers a proper unmount. Using getState here avoids subscribing.
  const isCollectedNow = useGameStore.getState().collectedBoosters.has(id)
  if (isCollectedNow) {
    return null
  }

  return (
    <group position={position} ref={groupRef}>
      {/* Single main ring - reduced segments for performance */}
      <Torus args={[20, 2, 8, 16]}>
        <meshStandardMaterial 
          ref={materialRef}
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={1.5}
          metalness={0.8}
          roughness={0.2}
        />
      </Torus>
      
      {/* Single inner ring - reduced segments */}
      <Torus args={[15, 1.5, 8, 16]}>
        <meshStandardMaterial 
          color="#00aaff"
          emissive="#00aaff"
          emissiveIntensity={1}
          transparent
          opacity={0.5}
        />
      </Torus>
      
      {/* Single point light instead of multiple */}
      <pointLight 
        position={[0, 0, 0]} 
        color="#00ffff" 
        intensity={2} 
        distance={35} 
      />
    </group>
  )
}

// Memoize to prevent unnecessary re-renders
export const SpeedBooster = memo(SpeedBoosterComponent)