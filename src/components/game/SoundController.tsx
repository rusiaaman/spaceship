import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store/gameStore'
import { soundManager } from '@/utils/soundManager'

export const SoundController = () => {
  const gameState = useGameStore(state => state.gameState)
  const countdown = useGameStore(state => state.countdown)
  const prevCountdownRef = useRef(countdown)
  const prevGameStateRef = useRef(gameState)

  useEffect(() => {
    // Stop engine sound when returning to menu
    if (gameState === 'menu' && prevGameStateRef.current !== 'menu') {
      soundManager.stopEngineSound()
    }

    // Pause music when paused
    if (gameState === 'paused' && prevGameStateRef.current === 'playing') {
      soundManager.pauseBackgroundMusic()
    }

    // Resume music when unpausing
    if (gameState === 'playing' && prevGameStateRef.current === 'paused') {
      soundManager.resumeBackgroundMusic()
    }

    // Stop engine sound when race finishes
    if (gameState === 'finished' && prevGameStateRef.current === 'playing') {
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