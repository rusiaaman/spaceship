import { useRef, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Torus } from '@react-three/drei'
import * as THREE from 'three'

interface SpeedBoosterProps {
  id: number
  position: [number, number, number]
}

const SpeedBoosterComponent = ({ id: _id, position }: SpeedBoosterProps) => {
  const groupRef = useRef<THREE.Group>(null!)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!)

  useFrame((state) => {
    if (!groupRef.current) return

    const time = state.clock.elapsedTime

    // Simple rotation only
    groupRef.current.rotation.z = time * 1.5

    // Pulse emissive intensity instead of scale
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 1.5 + Math.sin(time * 3) * 0.5
    }
  })

  return (
    <group position={position} ref={groupRef}>
      {/* Main ring - MASSIVE scale (24 million km diameter!) */}
      <Torus args={[100000000, 10000000, 8, 32]}>
        <meshStandardMaterial 
          ref={materialRef}
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </Torus>
      
      {/* Inner ring - MASSIVE scale with high emissive */}
      <Torus args={[75000000, 8000000, 8, 32]}>
        <meshStandardMaterial 
          color="#00aaff"
          emissive="#00aaff"
          emissiveIntensity={1.2}
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      </Torus>
      
      {/* Outer glow ring for visibility from extreme distances */}
      <Torus args={[120000000, 12000000, 8, 32]}>
        <meshStandardMaterial 
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={1.0}
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </Torus>
      
      {/* Point light for glow - MASSIVE distance */}
      <pointLight 
        position={[0, 0, 0]} 
        color="#00ffff" 
        intensity={1000} 
        distance={200000000} 
      />
    </group>
  )
}

// Memoize to prevent unnecessary re-renders
export const SpeedBooster = memo(SpeedBoosterComponent)