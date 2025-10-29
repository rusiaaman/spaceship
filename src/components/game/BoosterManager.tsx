import { useMemo, memo } from 'react'
import { SpeedBooster } from './SpeedBooster'
import { GAME_CONSTANTS } from '@/utils/constants'

const BoosterManagerComponent = () => {
  const { BOOSTER_COUNT, BOOSTER_SPACING } = GAME_CONSTANTS
  
  // Don't subscribe to collectedBoosters at all - let individual boosters handle it
  // This prevents re-renders of the entire manager when a booster is collected

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