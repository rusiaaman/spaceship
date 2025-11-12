import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
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
import { SoundController } from './SoundController'
import { CameraSweep } from './CameraSweep'
import { CountdownCamera } from './CountdownCamera'
import { useGameStore } from '@/store/gameStore'
import { profiler } from '@/utils/profiler'

// Spatial Index Manager - rebuilds indices when needed
const SpatialIndexManager = () => {
  useFrame(() => {
    profiler.start('SpatialIndexManager')
    const spatialIndices = useGameStore.getState().spatialIndices
    
    // Rebuild only if needed (very fast when no changes)
    spatialIndices.rebuildIfNeeded()
    profiler.end('SpatialIndexManager')
  })
  
  return null
}

export const GameScene = () => {
  const spaceshipRef = useRef<THREE.Group>(null!)
  const gameState = useGameStore((state) => state.gameState)

  return (
    <>
      <SoundController />
      <Canvas
      camera={{ position: [0, 2, 5], fov: 75, near: 0.1, far: 6000 }}
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

      {/* Camera sweep animation */}
      {gameState === 'camera-sweep' && <CameraSweep />}
      {/* Countdown camera - maintains finish line view */}
      {gameState === 'countdown' && <CountdownCamera />}
      
      {/* Game elements */}
      <StarField />
      <Cockpit />
      <RaceElements />
      <BoosterManager />
      <WeaponSystem />
      <CombatEffectsManager />
      <SpatialIndexManager />
      
      <group ref={spaceshipRef} />
      <SpaceshipController ref={spaceshipRef} />
      <SpaceshipModel spaceshipRef={spaceshipRef} />

      {/* Post-processing effects - heavily optimized for performance */}
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.9}
          mipmapBlur
          levels={5}
          width={512}
          height={512}
        />
      </EffectComposer>
    </Canvas>
    </>
  )
}