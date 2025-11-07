import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { GameScene } from './components/game/GameScene'
import { HUD } from './components/ui/HUD'
import { MainMenu } from './components/ui/MainMenu'
import { PauseMenu } from './components/ui/PauseMenu'
import { PerformanceMonitor } from './components/ui/PerformanceMonitor'
import { Confetti } from './components/ui/Confetti'
import { soundManager } from './utils/soundManager'


function App() {
  const gameState = useGameStore((state) => state.gameState)
  const setGameState = useGameStore((state) => state.setGameState)
  const playerPosition = useGameStore((state) => state.playerPosition)

  // Start background music when in menu, stop during gameplay
  useEffect(() => {
    if (gameState === 'menu') {
      soundManager.playBackgroundMusic()
    } else {
      soundManager.stopBackgroundMusic()
    }
  }, [gameState])

  useEffect(() => {
    // Initial automatic cursor capture
    document.documentElement.requestPointerLock()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState === 'playing') {
        setGameState('paused')
      }

      // Cmd + Enter for Fullscreen toggle (using cross-browser approach)
      if (e.metaKey && e.key === 'Enter') {
        e.preventDefault()
        
        const docEl = document.documentElement as any;
        const doc = document as any;
        
        const isFullscreen = doc.fullscreenElement || 
                             doc.webkitFullscreenElement || 
                             doc.mozFullScreenElement || 
                             doc.msFullscreenElement;

        if (!isFullscreen) {
          if (docEl.requestFullscreen) {
            docEl.requestFullscreen();
          } else if (docEl.webkitRequestFullscreen) {
            docEl.webkitRequestFullscreen(); // Chrome/Safari
          } else if (docEl.mozRequestFullScreen) {
            docEl.mozRequestFullScreen(); // Firefox
          } else if (docEl.msRequestFullscreen) {
            docEl.msRequestFullscreen(); // IE/Edge
          }
        } else {
          if (doc.exitFullscreen) {
            doc.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            doc.webkitExitFullscreen();
          } else if (doc.mozCancelFullScreen) {
            doc.mozCancelFullScreen();
          } else if (doc.msExitFullscreen) {
            doc.msExitFullscreen();
          }
        }
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
      {gameState === 'finished' && playerPosition <= 3 && <Confetti />}
    </div>
  )
}

export default App