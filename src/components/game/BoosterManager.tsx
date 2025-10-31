import { useMemo, memo, useEffect } from 'react'
import { SpeedBooster } from './SpeedBooster'
import { GAME_CONSTANTS } from '@/utils/constants'
import { useGameStore } from '@/store/gameStore'
import * as THREE from 'three'

const BoosterManagerComponent = () => {
  const { BOOSTER_COUNT, BOOSTER_SPACING, BOOSTER_RING_RADIUS } = GAME_CONSTANTS
  const spatialIndices = useGameStore(state => state.spatialIndices)
  
  // Generate booster positions along the track
  const boosterPositions = useMemo(() => {
    const positions: Array<{ id: number; position: [number, number, number] }> = []
    
    for (let i = 0; i < BOOSTER_COUNT; i++) {
      // Start placing boosters after some initial distance
      const zPosition = -(i + 1) * BOOSTER_SPACING - 100
      
      // Alternate between left, center, and right positions
      const xPositions = [-25, 0, 25]
      const xPosition = xPositions[i % 3]
      
      positions.push({
        id: i,
        position: [xPosition, 0, zPosition]
      })
    }
    
    return positions
  }, [BOOSTER_COUNT, BOOSTER_SPACING])

  // Initialize spatial index for boosters
  useEffect(() => {
    // Add all boosters to spatial index
    boosterPositions.forEach(booster => {
      spatialIndices.boosters.addOrUpdate({
        id: booster.id,
        position: new THREE.Vector3(...booster.position),
        radius: BOOSTER_RING_RADIUS
      })
    })
    
    spatialIndices.boosters.rebuild()
    
    // Cleanup on unmount
    return () => {
      spatialIndices.boosters.clear()
    }
  }, [boosterPositions, spatialIndices, BOOSTER_RING_RADIUS])

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