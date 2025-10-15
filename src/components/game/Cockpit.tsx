import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'

export const Cockpit = () => {
  const frameRef = useRef<THREE.Group>(null)
  const speed = useGameStore((state) => state.speed)
  const { camera } = useThree()

  useFrame((state) => {
    if (!frameRef.current) return
    
    // Attach cockpit to camera
    frameRef.current.position.copy(camera.position)
    frameRef.current.rotation.copy(camera.rotation)
    frameRef.current.translateZ(-3)
    frameRef.current.translateY(-1.2)

    // Subtle vibration effect based on speed
    const vibration = (speed / 100) * 0.001
    frameRef.current.position.y += Math.sin(state.clock.elapsedTime * 10) * vibration
    frameRef.current.position.x += Math.cos(state.clock.elapsedTime * 8) * vibration
  })

  return (
    <group ref={frameRef}>
      {/* Bottom horizontal bar */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4, 0.08, 0.08]} />
        <meshStandardMaterial
          color="#1e90ff"
          emissive="#00bfff"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Left angled frame */}
      <mesh position={[-1.8, 0.8, 0]} rotation={[0, 0, Math.PI / 8]}>
        <boxGeometry args={[0.08, 1.8, 0.08]} />
        <meshStandardMaterial
          color="#1e90ff"
          emissive="#00bfff"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Right angled frame */}
      <mesh position={[1.8, 0.8, 0]} rotation={[0, 0, -Math.PI / 8]}>
        <boxGeometry args={[0.08, 1.8, 0.08]} />
        <meshStandardMaterial
          color="#1e90ff"
          emissive="#00bfff"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Top left connector */}
      <mesh position={[-1.3, 1.5, 0]} rotation={[0, 0, Math.PI / 3]}>
        <boxGeometry args={[0.6, 0.08, 0.08]} />
        <meshStandardMaterial
          color="#1e90ff"
          emissive="#00bfff"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Top right connector */}
      <mesh position={[1.3, 1.5, 0]} rotation={[0, 0, -Math.PI / 3]}>
        <boxGeometry args={[0.6, 0.08, 0.08]} />
        <meshStandardMaterial
          color="#1e90ff"
          emissive="#00bfff"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Central HUD ring */}
      <mesh position={[0, 0.7, 0]}>
        <torusGeometry args={[0.4, 0.025, 16, 32]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={1.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Central crosshair dot */}
      <mesh position={[0, 0.7, 0.01]}>
        <circleGeometry args={[0.06, 32]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={2}
        />
      </mesh>

      {/* Horizontal crosshair line */}
      <mesh position={[0, 0.7, 0.01]}>
        <boxGeometry args={[0.8, 0.02, 0.01]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={1.5}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Vertical crosshair line */}
      <mesh position={[0, 0.7, 0.01]}>
        <boxGeometry args={[0.02, 0.8, 0.01]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={1.5}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Left panel display */}
      <group position={[-1.5, 0.4, 0]}>
        <mesh>
          <boxGeometry args={[0.3, 0.15, 0.02]} />
          <meshStandardMaterial
            color="#00bfff"
            emissive="#00bfff"
            emissiveIntensity={1.2}
          />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.3, 0.15, 0.02]} />
          <meshStandardMaterial
            color="#00bfff"
            emissive="#00bfff"
            emissiveIntensity={1.2}
          />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.3, 0.15, 0.02]} />
          <meshStandardMaterial
            color="#00bfff"
            emissive="#00bfff"
            emissiveIntensity={1.2}
          />
        </mesh>
      </group>

      {/* Right panel display */}
      <group position={[1.5, 0.4, 0]}>
        <mesh>
          <boxGeometry args={[0.3, 0.15, 0.02]} />
          <meshStandardMaterial
            color="#00bfff"
            emissive="#00bfff"
            emissiveIntensity={1.2}
          />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.3, 0.15, 0.02]} />
          <meshStandardMaterial
            color="#00bfff"
            emissive="#00bfff"
            emissiveIntensity={1.2}
          />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.3, 0.15, 0.02]} />
          <meshStandardMaterial
            color="#00bfff"
            emissive="#00bfff"
            emissiveIntensity={1.2}
          />
        </mesh>
      </group>

      {/* Point lights for glow effect */}
      <pointLight position={[0, 0.7, 0.3]} color="#00ffff" intensity={3} distance={4} />
      <pointLight position={[-1.5, 0.4, 0.3]} color="#00bfff" intensity={1.5} distance={2} />
      <pointLight position={[1.5, 0.4, 0.3]} color="#00bfff" intensity={1.5} distance={2} />
    </group>
  )
}