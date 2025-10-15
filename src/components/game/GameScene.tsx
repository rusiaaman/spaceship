import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { StarField } from './StarField'
import { Cockpit } from './Cockpit'
import { SpaceshipController } from './SpaceshipController'
import RaceElements from './RaceElements'

export const GameScene = () => {
  const spaceshipRef = useRef<THREE.Group>(null!)

  return (
    <Canvas
      camera={{ position: [0, 2, 5], fov: 75, near: 0.1, far: 2000 }}
      gl={{ antialias: true }}
      style={{ background: '#000000' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />

      {/* Game elements */}
      <StarField />
      <Cockpit />
      <RaceElements />
      
      <group ref={spaceshipRef} />
      <SpaceshipController ref={spaceshipRef} />

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </Canvas>
  )
}