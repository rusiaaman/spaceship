import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store/gameStore'
import { soundManager } from '@/utils/soundManager'

export const SoundController = () => {
  const gameState = useGameStore(state => state.gameState)
  const countdown = useGameStore(state => state.countdown)
  const prevCountdownRef = useRef(countdown)
  const prevGameStateRef = useRef(gameState)

  useEffect(() => {
    // Stop engine sound when returning to menu or finishing
    if ((gameState === 'menu' || gameState === 'finished') && prevGameStateRef.current !== gameState) {
      soundManager.stopEngineSound()
    }

    prevGameStateRef.current = gameState
  }, [gameState])

  useEffect(() => {
    // Play countdown beep sound
    if (gameState === 'countdown' && countdown > 0 && countdown !== prevCountdownRef.current) {
      soundManager.playSound('countdown')
    }
    prevCountdownRef.current = countdown
  }, [countdown, gameState])

  return null
}