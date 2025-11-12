import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '@/store/gameStore'
import { GAME_CONSTANTS } from '@/utils/constants'

export const CountdownCamera = () => {
  const { camera } = useThree()
  const gameState = useGameStore((state) => state.gameState)
  
  useFrame(() => {
    // During countdown, keep camera at starting position looking at finish line
    if (gameState === 'countdown') {
      // Maintain the position from end of camera sweep
      camera.position.set(0, 2, 5)
      // Keep looking at the finish line
      camera.lookAt(0, 0, -GAME_CONSTANTS.RACE_DISTANCE)
    }
  })
  
  return null
}