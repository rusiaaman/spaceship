import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import type { PlanetData } from '@/utils/solarSystemData'

interface PlanetProps {
  data: PlanetData
  position: [number, number, number]
  distance?: number // Distance from camera for LOD
}

export const Planet = ({ data, position, distance = 0 }: PlanetProps) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Determine LOD based on distance
  const segments = useMemo(() => {
    if (distance > 10000) return 16 // Far: low detail
    if (distance > 1000) return 32 // Medium distance
    return 64 // Close: high detail
  }, [distance])
  
  // Use solid colors instead of textures for now
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[data.radiusGameUnits, segments, segments]} />
      <meshStandardMaterial
        color={data.color}
        emissive={data.emissive || data.color}
        emissiveIntensity={data.emissiveIntensity || 0.5}
        roughness={0.7}
        metalness={0.3}
        toneMapped={false}
      />
    </mesh>
  )
}

// Fallback planet without texture loading
export const PlanetFallback = ({ data, position }: Omit<PlanetProps, 'distance'>) => {
  return (
    <mesh position={position}>
      <sphereGeometry args={[data.radiusGameUnits, 32, 32]} />
      <meshStandardMaterial
        color={data.color}
        emissive={data.emissive || data.color}
        emissiveIntensity={data.emissiveIntensity || 0.5}
        roughness={0.7}
        metalness={0.3}
        toneMapped={false}
      />
    </mesh>
  )
}