import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { StarField } from './StarField'
import { Cockpit } from './Cockpit'
import { SpaceshipController } from './SpaceshipController'
import { SpaceshipModel } from './SpaceshipModel'
import RaceElements from './RaceElements'
import { BoosterManager } from './BoosterManager'
import { WeaponSystem } from './WeaponSystem'
import { CombatEffectsManager } from './CombatEffects'

export const GameScene = () => {
  const spaceshipRef = useRef<THREE.Group>(null!)

  return (
    <Canvas
      camera={{ position: [0, 2, 5], fov: 75, near: 0.1, far: 2000 }}
      gl={{ 
        antialias: false, // Disable for better performance
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true
      }}
      dpr={[1, 1.5]} // Limit pixel ratio for better performance
      style={{ background: '#000000' }}
      frameloop="always"
      performance={{ min: 0.5 }} // Allow frame rate to drop if needed
    >
      {/* Lighting - reduced intensity for performance */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.4} />

      {/* Game elements */}
      <StarField />
      <Cockpit />
      <RaceElements />
      <BoosterManager />
      <WeaponSystem />
      <CombatEffectsManager />
      
      <group ref={spaceshipRef} />
      <SpaceshipController ref={spaceshipRef} />
      <SpaceshipModel spaceshipRef={spaceshipRef} />

      {/* Post-processing effects - reduced for performance */}
      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.8}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  )
}