import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface PlanetRingsProps {
  position: [number, number, number]
  innerRadius: number
  outerRadius: number
  textureUrl: string
}

export const PlanetRings = ({ position, innerRadius, outerRadius, textureUrl }: PlanetRingsProps) => {
  const texture = useLoader(
    THREE.TextureLoader,
    textureUrl,
    undefined,
    () => {
      console.warn('Failed to load ring texture, using fallback')
    }
  )
  
  return (
    <mesh position={position} rotation-x={Math.PI / 2}>
      <ringGeometry args={[innerRadius, outerRadius, 64]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        transparent
        opacity={0.8}
      />
    </mesh>
  )
}