import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { GameScene } from './components/game/GameScene'
import { HUD } from './components/ui/HUD'
import { MainMenu } from './components/ui/MainMenu'
import { PauseMenu } from './components/ui/PauseMenu'
import { PerformanceMonitor } from './components/ui/PerformanceMonitor'
import { Confetti } from './components/ui/Confetti'
import { VirtualCursor } from './components/ui/VirtualCursor'
import { LobbyMenu } from './components/ui/LobbyMenu'
import { ConnectionStatus } from './components/ui/ConnectionStatus'
import { soundManager } from './utils/soundManager'
import { useMultiplayerStore } from './multiplayer/MultiplayerGameStore'


function App() {
  const gameState = useGameStore((state) => state.gameState)
  const setGameState = useGameStore((state) => state.setGameState)
  const playerPosition = useGameStore((state) => state.playerPosition)
  const isMultiplayer = useMultiplayerStore((state) => state.isMultiplayer)

  // Start background music when in menu, stop during gameplay
  useEffect(() => {
    if (gameState === 'menu' || (gameState as string) === 'multiplayer-lobby') {
      soundManager.playBackgroundMusic()
    } else {
      soundManager.stopBackgroundMusic()
    }
  }, [gameState])

  // Manage pointer lock and cursor visibility based on game state
  useEffect(() => {
    const shouldUnlock = gameState === 'menu' || gameState === 'paused' || gameState === 'finished' || gameState === 'camera-sweep' || gameState === 'multiplayer-lobby'
    const shouldLock = gameState === 'countdown' || gameState === 'playing'

    if (shouldUnlock && document.pointerLockElement) {
      // Release pointer lock for menus
      document.exitPointerLock()
      document.body.classList.remove('pointer-locked')
    }
    
    // Request pointer lock on click during gameplay
    const handleClick = () => {
      if (shouldLock && !document.pointerLockElement) {
        document.documentElement.requestPointerLock()
          .catch((err) => {
            console.warn('Pointer lock request failed:', err)
          })
      }
    }

    // Track pointer lock state changes
    const handlePointerLockChange = () => {
      if (document.pointerLockElement) {
        document.body.classList.add('pointer-locked')
      } else {
        document.body.classList.remove('pointer-locked')
      }
    }

    const handlePointerLockError = () => {
      console.error('Pointer lock error - user may need to interact with the page first')
      document.body.classList.remove('pointer-locked')
    }

    if (shouldLock) {
      document.addEventListener('click', handleClick)
    }
    
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    document.addEventListener('pointerlockerror', handlePointerLockError)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      document.removeEventListener('pointerlockerror', handlePointerLockError)
    }
  }, [gameState])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState === 'playing') {
        setGameState('paused')
      }

      // Cmd + Enter for native Fullscreen toggle (macOS optimized)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        
        const docEl = document.documentElement as any;
        const doc = document as any;
        
        const isFullscreen = doc.fullscreenElement || 
                             doc.webkitFullscreenElement || 
                             doc.mozFullScreenElement || 
                             doc.msFullscreenElement;

        if (!isFullscreen) {
          // Try different fullscreen methods with macOS-specific options
          const options = { navigationUI: 'hide' } as any
          
          if (docEl.requestFullscreen) {
            docEl.requestFullscreen(options).catch((err: Error) => {
              console.warn('Fullscreen request failed:', err)
            });
          } else if (docEl.webkitRequestFullscreen) {
            // Safari/Chrome on macOS - pass 1 for ALLOW_KEYBOARD_INPUT flag
            docEl.webkitRequestFullscreen(1);
          } else if (docEl.webkitEnterFullscreen) {
            // Older Safari
            docEl.webkitEnterFullscreen();
          } else if (docEl.mozRequestFullScreen) {
            docEl.mozRequestFullScreen();
          } else if (docEl.msRequestFullscreen) {
            docEl.msRequestFullscreen();
          }
        } else {
          if (doc.exitFullscreen) {
            doc.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            doc.webkitExitFullscreen();
          } else if (doc.webkitCancelFullScreen) {
            doc.webkitCancelFullScreen();
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

  // Show virtual cursor only in menu and pause states (not during gameplay or multiplayer lobby)
  const showVirtualCursor = gameState === 'menu' || gameState === 'paused'

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {gameState === 'menu' && <MainMenu />}
      {gameState === 'multiplayer-lobby' && (
        <LobbyMenu
          onStartGame={() => setGameState('camera-sweep')}
          onBackToMenu={() => setGameState('menu')}
        />
      )}
      {gameState !== 'menu' && gameState !== 'multiplayer-lobby' && (
        <>
          <GameScene />
          {(gameState === 'playing' || gameState === 'countdown' || gameState === 'finished') && (
            <>
              <HUD />
              {isMultiplayer && <ConnectionStatus />}
            </>
          )}
          {gameState === 'paused' && <PauseMenu />}
          {import.meta.env.DEV && <PerformanceMonitor />}
        </>
      )}
      {gameState === 'finished' && playerPosition <= 2 && <Confetti />}
      <VirtualCursor isVisible={showVirtualCursor} />
    </div>
  )
}

export default App