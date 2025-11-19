import { useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'
import { useGameStore } from '@/store/gameStore'
import { soundManager } from '@/utils/soundManager'
import { SHIP_SIZE_CLASSES, type ShipSizeClass } from '@/utils/constants'
import { Settings } from './Settings'

const MenuContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #000000 0%, #0a1628 100%);
  z-index: 100;
  font-family: 'Orbitron', monospace;
`

const Title = styled.h1`
  font-size: 72px;
  font-weight: bold;
  color: var(--hud-cyan);
  text-shadow: 0 0 30px var(--glow-blue);
  margin-bottom: 60px;
  letter-spacing: 8px;
  animation: glow 2s ease-in-out infinite;
  
  @keyframes glow {
    0%, 100% {
      text-shadow: 0 0 30px var(--glow-blue), 0 0 60px var(--glow-blue);
    }
    50% {
      text-shadow: 0 0 40px var(--glow-blue), 0 0 80px var(--glow-blue);
    }
  }
`

const Button = styled.button`
  padding: 20px 60px;
  font-size: 24px;
  font-family: 'Orbitron', monospace;
  color: var(--hud-cyan);
  background: transparent;
  border: 2px solid var(--hud-cyan);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 4px;
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
  pointer-events: all;
  
  &:hover {
    background: var(--hud-cyan);
    color: #000000;
    box-shadow: 0 0 40px var(--glow-blue);
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  &:focus-visible {
    outline: 2px solid var(--hud-cyan);
    outline-offset: 4px;
  }
`

const Subtitle = styled.p`
  font-size: 18px;
  color: var(--space-blue);
  margin-top: 40px;
  opacity: 0.7;
  text-align: center;
  max-width: 600px;
  line-height: 1.6;
`

const SizeSelector = styled.div`
  background: rgba(10, 22, 40, 0.8);
  padding: 30px;
  border-radius: 12px;
  border: 1px solid var(--hud-cyan);
  margin-bottom: 40px;
  max-width: 700px;
`

const SizeSelectorTitle = styled.h2`
  font-size: 24px;
  color: var(--hud-cyan);
  margin-bottom: 20px;
  text-align: center;
  letter-spacing: 2px;
`

const SizeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 20px;
`

const SizeButton = styled.button<{ isSelected: boolean; isFocused?: boolean }>`
  padding: 16px 12px;
  font-family: 'Orbitron', monospace;
  background: ${props => props.isSelected ? 'var(--hud-cyan)' : 'rgba(0, 0, 0, 0.5)'};
  color: ${props => props.isSelected ? '#000000' : 'var(--hud-cyan)'};
  border: 2px solid ${props => props.isSelected ? 'var(--hud-cyan)' : 'rgba(0, 212, 255, 0.3)'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  outline: ${props => props.isFocused ? '2px solid var(--hud-cyan)' : 'none'};
  outline-offset: 4px;
  pointer-events: all;
  
  &:hover {
    background: ${props => props.isSelected ? 'var(--hud-cyan)' : 'rgba(0, 212, 255, 0.2)'};
    border-color: var(--hud-cyan);
    transform: scale(1.05);
  }
  
  &:focus-visible {
    outline: 2px solid var(--hud-cyan);
    outline-offset: 4px;
  }
  
  .size-name {
    font-weight: bold;
    display: block;
    margin-bottom: 4px;
  }
  
  .size-scale {
    font-size: 11px;
    opacity: 0.8;
  }
`

const SizeStats = styled.div`
  font-size: 14px;
  color: rgba(0, 212, 255, 0.7);
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    
    .stat-value {
      color: var(--hud-cyan);
      font-weight: bold;
    }
  }
`

export const MainMenu = () => {
  const setGameState = useGameStore((state) => state.setGameState)
  const playerSizeClass = useGameStore((state) => state.playerSizeClass)
  const setPlayerSizeClass = useGameStore((state) => state.setPlayerSizeClass)
  
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [showModeSelect, setShowModeSelect] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const startButtonRef = useRef<HTMLButtonElement>(null)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const sizeClasses = Object.keys(SHIP_SIZE_CLASSES) as ShipSizeClass[]

  const handleSinglePlayer = () => {
    setShowModeSelect(false)
  }

  const handleMultiplayer = () => {
    // Navigate to multiplayer lobby
    setGameState('multiplayer-lobby' as any)
  }

  const handleStart = () => {
    // Initialize audio context on user interaction (required by browsers)
    soundManager.playSound('boost-collect') // Play a quick sound to initialize audio context
    setGameState('camera-sweep')
  }
  
  const sizeConfig = SHIP_SIZE_CLASSES[playerSizeClass]

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings) return // Don't handle keys when settings is open
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const currentIndex = sizeClasses.indexOf(playerSizeClass)
        const newIndex = currentIndex > 0 ? currentIndex - 1 : sizeClasses.length - 1
        setPlayerSizeClass(sizeClasses[newIndex])
        setFocusedIndex(newIndex)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        const currentIndex = sizeClasses.indexOf(playerSizeClass)
        const newIndex = currentIndex < sizeClasses.length - 1 ? currentIndex + 1 : 0
        setPlayerSizeClass(sizeClasses[newIndex])
        setFocusedIndex(newIndex)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (focusedIndex === -1) {
          handleStart()
        }
      } else if (e.key === 'ArrowDown' || e.key === 'Tab') {
        e.preventDefault()
        setFocusedIndex(-1)
        startButtonRef.current?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex(sizeClasses.indexOf(playerSizeClass))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playerSizeClass, setPlayerSizeClass, focusedIndex, sizeClasses, showSettings])

  // Show mode selection first
  if (showModeSelect) {
    return (
      <MenuContainer>
        <Title>SPACE ODYSSEY</Title>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
          <Button onClick={handleSinglePlayer}>SINGLE PLAYER</Button>
          <Button onClick={handleMultiplayer}>MULTIPLAYER</Button>
        </div>

        <Subtitle>
          Race through the cosmos at hyperspeed.<br />
          Master your controls and claim victory.
        </Subtitle>
      </MenuContainer>
    )
  }

  return (
    <MenuContainer>
      <Title>SPACE ODYSSEY</Title>
      
      <SizeSelector>
        <SizeSelectorTitle>SELECT SHIP SIZE</SizeSelectorTitle>
        <SizeGrid>
          {sizeClasses.map((sizeClass, index) => {
            const config = SHIP_SIZE_CLASSES[sizeClass]
            const isSelected = playerSizeClass === sizeClass
            const isFocused = focusedIndex === index
            return (
              <SizeButton
                key={sizeClass}
                isSelected={isSelected}
                isFocused={isFocused}
                onClick={() => {
                  setPlayerSizeClass(sizeClass)
                  setFocusedIndex(index)
                }}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <span className="size-name">{config.name}</span>
                <span className="size-scale">×{config.scale.toFixed(1)}</span>
              </SizeButton>
            )
          })}
        </SizeGrid>
        <SizeStats>
          <div className="stat-row">
            <span>Size:</span>
            <span className="stat-value">×{sizeConfig.scale.toFixed(1)}</span>
          </div>
          <div className="stat-row">
            <span>Maneuverability:</span>
            <span className="stat-value">×{sizeConfig.maneuverability.toFixed(1)}</span>
          </div>
          <div className="stat-row">
            <span>Max Speed:</span>
            <span className="stat-value">{sizeConfig.maxSpeed}</span>
          </div>
          <div className="stat-row">
            <span>Acceleration:</span>
            <span className="stat-value">×{(1 / sizeConfig.mass).toFixed(2)}</span>
          </div>
          <div className="stat-row">
            <span>Hull Integrity:</span>
            <span className="stat-value">{sizeConfig.maxHealth} HP</span>
          </div>
        </SizeStats>
      </SizeSelector>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        <Button 
          onClick={() => setShowModeSelect(true)}
          style={{ flex: 1, padding: '20px 40px' }}
        >
          BACK
        </Button>
        <Button 
          ref={settingsButtonRef}
          onClick={() => setShowSettings(true)}
          style={{ flex: 1, padding: '20px 40px' }}
        >
          SETTINGS
        </Button>
        <Button 
          ref={startButtonRef} 
          onClick={handleStart}
          style={{ flex: 2 }}
        >
          START RACE
        </Button>
      </div>
      
      <Subtitle>
        Race through the cosmos at hyperspeed.<br />
        Master your controls and claim victory.
      </Subtitle>
      
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </MenuContainer>
  )
}