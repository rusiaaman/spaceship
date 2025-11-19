import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { PlanetData } from '@/utils/solarSystemData'

interface PlanetProps {
  data: PlanetData
  position: [number, number, number]
  distance?: number // Distance from camera for LOD
}

// Reusable texture generator for the star dot
// Using a texture ensures proper rendering with built-in materials that support log depth buffer
const getStarTexture = () => {
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

export const Planet = ({ data, position, distance = 0 }: PlanetProps) => {
  // References
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const starDotRef = useRef<THREE.Points>(null)
  const starMaterialRef = useRef<THREE.PointsMaterial>(null)
  
  const camera = useThree(state => state.camera)
  
  // Determine LOD based on distance
  const segments = useMemo(() => {
    if (distance > 10000) return 16 // Far: low detail
    if (distance > 1000) return 32 // Medium distance
    return 64 // Close: high detail
  }, [distance])

  // Generate texture once
  const starTexture = useMemo(() => getStarTexture(), [])

  // Star Dot / Visibility Logic
  useFrame(() => {
    if (!groupRef.current || !starMaterialRef.current || !starDotRef.current) return

    const worldPos = new THREE.Vector3()
    groupRef.current.getWorldPosition(worldPos)
    const dist = camera.position.distanceTo(worldPos)
    
    // Fade Logic
    const planetRadius = data.radiusGameUnits
    const fadeStart = planetRadius * 2000
    const fadeEnd = planetRadius * 200
    
    let opacity = 0
    if (dist > fadeStart) {
      opacity = 1.0
    } else if (dist > fadeEnd) {
      opacity = (dist - fadeEnd) / (fadeStart - fadeEnd)
    }
    
    starMaterialRef.current.opacity = opacity
    starDotRef.current.visible = opacity > 0.01
    
    // Ensure sorting is correct for transparent objects
    starMaterialRef.current.depthWrite = false;
  })
  
  const dotGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))
    return geo
  }, [])

  return (
    <group ref={groupRef} position={position}>
      {/* 3D Planet Sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[data.radiusGameUnits, segments, segments]} />
        <meshStandardMaterial
          color={data.color}
          emissive={data.emissive || data.color}
          emissiveIntensity={data.emissiveIntensity || 0.5}
          roughness={0.2}
          metalness={0.8}
          toneMapped={false}
        />
      </mesh>
      
      {/* Screen-space Star Dot using Built-in PointsMaterial */}
      {/* This automatically handles Logarithmic Depth Buffer correctly */}
      <points ref={starDotRef} geometry={dotGeometry}>
        <pointsMaterial
          ref={starMaterialRef}
          map={starTexture}
          size={8} // 8 pixels
          sizeAttenuation={false} // Constant screen size
          color={new THREE.Color(data.emissive || data.color)}
          transparent={true}
          opacity={1}
          depthWrite={false}
          depthTest={true} // Essential so planets don't show through the cockpit
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
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
        roughness={0.2}
        metalness={0.8}
        toneMapped={false}
      />
    </mesh>
  )
}