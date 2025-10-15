import styled from '@emotion/styled'
import { useGameStore } from '@/store/gameStore'
import { useEffect } from 'react'

const PauseContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  z-index: 100;
  font-family: 'Orbitron', monospace;
`

const Title = styled.h2`
  font-size: 48px;
  color: var(--hud-cyan);
  text-shadow: 0 0 20px var(--glow-blue);
  margin-bottom: 40px;
  letter-spacing: 6px;
`

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const Button = styled.button`
  padding: 15px 50px;
  font-size: 18px;
  font-family: 'Orbitron', monospace;
  color: var(--hud-cyan);
  background: transparent;
  border: 2px solid var(--hud-cyan);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 3px;
  min-width: 250px;
  
  &:hover {
    background: var(--hud-cyan);
    color: #000000;
    box-shadow: 0 0 30px var(--glow-blue);
  }
`

export const PauseMenu = () => {
  const { setGameState, resetGame } = useGameStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGameState('playing')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setGameState])

  const handleResume = () => {
    setGameState('playing')
  }

  const handleMainMenu = () => {
    resetGame()
  }

  return (
    <PauseContainer>
      <Title>PAUSED</Title>
      <ButtonGroup>
        <Button onClick={handleResume}>Resume</Button>
        <Button onClick={handleMainMenu}>Main Menu</Button>
      </ButtonGroup>
    </PauseContainer>
  )
}