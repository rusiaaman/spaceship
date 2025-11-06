import { useMemo, memo, useEffect, useRef } from 'react'
import { SpeedBooster } from './SpeedBooster'
import { GAME_CONSTANTS } from '@/utils/constants'
import { useGameStore } from '@/store/gameStore'
import * as THREE from 'three'

const BoosterManagerComponent = () => {
  const { BOOSTER_COUNT, BOOSTER_RADIUS, RACE_DISTANCE } = GAME_CONSTANTS
  const gameState = useGameStore((state) => state.gameState)

  // Generate booster positions along the track
  const boosterPositions = useMemo(() => {
    const positions: Array<{ id: number; position: [number, number, number] }> = []
    
    // Distribute boosters evenly across the entire track
    const spacing = RACE_DISTANCE / (BOOSTER_COUNT + 1)
    
    for (let i = 0; i < BOOSTER_COUNT; i++) {
      // Distribute evenly from start to finish
      const zPosition = -(i + 1) * spacing
      
      // Alternate between left, center, and right positions
      const xPositions = [-25, 0, 25]
      const xPosition = xPositions[i % 3]
      
      positions.push({
        id: i,
        position: [xPosition, 0, zPosition]
      })
    }
    
    return positions
  }, [BOOSTER_COUNT, RACE_DISTANCE])

  // Initialize spatial index for boosters when game starts
  useEffect(() => {
    if (gameState === 'countdown' || gameState === 'playing') {
      const { spatialIndices } = useGameStore.getState();
      spatialIndices.boosters.clear();
      boosterPositions.forEach(booster => {
        spatialIndices.boosters.addOrUpdate({
          id: booster.id,
          position: new THREE.Vector3(...booster.position),
          radius: BOOSTER_RADIUS // Use correct collision radius
        });
      });
      spatialIndices.boosters.rebuild();
    }
  }, [boosterPositions, BOOSTER_RADIUS, gameState]);

  return (
    <group>
      {boosterPositions.map((booster) => (
        <SpeedBooster
          key={booster.id}
          id={booster.id}
          position={booster.position}
        />
      ))}
    </group>
  )
}

// Memo to prevent re-renders
export const BoosterManager = memo(BoosterManagerComponent)