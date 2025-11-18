import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { StarField } from './StarField'
import { SolarSystem } from './SolarSystem'
import { TrackCheckpoints } from './TrackCheckpoints'
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
import { RemotePlayersManager } from './RemotePlayersManager'
import { RemoteAIManager } from './RemoteAIManager'
import { useGameStore } from '@/store/gameStore'
import { useMultiplayerStore } from '@/multiplayer/MultiplayerGameStore'
import { getMultiplayerController } from '@/multiplayer/MultiplayerController'
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

// Multiplayer Update Manager
const MultiplayerUpdateManager = () => {
  useFrame((_, delta) => {
    const multiplayerStore = useMultiplayerStore.getState();
    if (multiplayerStore.isMultiplayer) {
      const controller = getMultiplayerController();
      controller.update(delta);
    }
  });
  
  return null;
}

export const GameScene = () => {
  const spaceshipRef = useRef<THREE.Group>(null!)
  const gameState = useGameStore((state) => state.gameState)
  const isMultiplayer = useMultiplayerStore((state) => state.isMultiplayer)

  // Initialize multiplayer controller when entering game
  useEffect(() => {
    if (isMultiplayer && gameState !== 'menu' && gameState !== 'multiplayer-lobby') {
      const controller = getMultiplayerController();
      controller.initialize();
      
      return () => {
        // Don't cleanup here, only when leaving multiplayer entirely
      };
    }
  }, [isMultiplayer, gameState]);

  return (
    <>
      <SoundController />
      <Canvas
      camera={{ position: [0, 0.5, 1.5], fov: 70, near: 0.01, far: 20000000000 }}
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
      {/* Lighting - space environment */}
      <ambientLight intensity={0.1} />

      {/* Camera sweep animation */}
      {gameState === 'camera-sweep' && <CameraSweep />}
      {/* Countdown camera - maintains finish line view */}
      {gameState === 'countdown' && <CountdownCamera />}
      
      {/* Game elements */}
      <StarField />
      <SolarSystem />
      <TrackCheckpoints />
      <Cockpit />
      <RaceElements />
      <BoosterManager />
      <WeaponSystem />
      <CombatEffectsManager />
      <SpatialIndexManager />
      <MultiplayerUpdateManager />
      
      {/* Remote players and AI */}
      {isMultiplayer && (
        <>
          <RemotePlayersManager />
          <RemoteAIManager />
        </>
      )}
      
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