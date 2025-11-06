import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { GameScene } from './components/game/GameScene'
import { HUD } from './components/ui/HUD'
import { MainMenu } from './components/ui/MainMenu'
import { PauseMenu } from './components/ui/PauseMenu'
import { PerformanceMonitor } from './components/ui/PerformanceMonitor'
import { soundManager } from './utils/soundManager'

function App() {
  const gameState = useGameStore((state) => state.gameState)
  const setGameState = useGameStore((state) => state.setGameState)

  // Start background music on app load
  useEffect(() => {
    soundManager.playBackgroundMusic()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState === 'playing') {
        setGameState('paused')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, setGameState])

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {gameState === 'menu' && <MainMenu />}
      {gameState !== 'menu' && (
        <>
          <GameScene />
          {(gameState === 'playing' || gameState === 'countdown' || gameState === 'finished') && <HUD />}
          {gameState === 'paused' && <PauseMenu />}
          {import.meta.env.DEV && <PerformanceMonitor />}
        </>
      )}
    </div>
  )
}

export default App