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
  
  // Check collection status directly in useFrame to avoid re-renders

  useFrame((state) => {
    // Check collection status without subscribing to store
    if (!wasCollectedRef.current) {
      const collectedBoosters = useGameStore.getState().collectedBoosters
      if (collectedBoosters.has(id)) {
        wasCollectedRef.current = true
        return
      }
    } else {
      return // Already collected
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

  if (wasCollectedRef.current) {
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