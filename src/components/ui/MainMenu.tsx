import styled from '@emotion/styled'
import { useGameStore } from '@/store/gameStore'

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
  
  &:hover {
    background: var(--hud-cyan);
    color: #000000;
    box-shadow: 0 0 40px var(--glow-blue);
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.98);
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

export const MainMenu = () => {
  const setGameState = useGameStore((state) => state.setGameState)

  const handleStart = () => {
    setGameState('countdown')
  }

  return (
    <MenuContainer>
      <Title>SPACE ODYSSEY</Title>
      <Button onClick={handleStart}>START MISSION</Button>
      <Subtitle>
        Navigate through the cosmos at hyperspeed.<br />
        Master your controls and explore the infinite void.
      </Subtitle>
    </MenuContainer>
  )
}