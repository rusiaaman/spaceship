import { useEffect } from 'react'
import styled from '@emotion/styled'
import { useGameStore } from '@/store/gameStore'

const HUDContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  font-family: 'Orbitron', monospace;
  color: var(--hud-cyan);
`

const TopBar = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 40px;
  font-size: 18px;
  text-shadow: 0 0 10px var(--glow-blue);
`

const CountdownOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 150px;
  font-weight: 900;
  color: var(--hud-cyan);
  text-shadow: 0 0 50px var(--glow-blue);
  animation: pulse 0.5s ease-in-out infinite alternate;
  pointer-events: none;
  
  @keyframes pulse {
    from { opacity: 0.5; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
`;

const FinishMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  font-size: 60px;
  font-weight: bold;
  color: var(--hud-cyan);
  text-shadow: 0 0 30px var(--glow-blue);
  line-height: 1.2;
  pointer-events: all;
`;

const Button = styled.button`
  padding: 10px 30px;
  font-size: 20px;
  font-family: 'Orbitron', monospace;
  color: var(--hud-cyan);
  background: transparent;
  border: 2px solid var(--hud-cyan);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 2px;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
  
  &:hover {
    background: var(--hud-cyan);
    color: #000000;
    box-shadow: 0 0 20px var(--glow-blue);
    transform: scale(1.05);
  }
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
`

const Label = styled.div`
  font-size: 12px;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 2px;
`

const Value = styled.div`
  font-size: 24px;
  font-weight: bold;
`

const Crosshair = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border: 2px solid var(--hud-cyan);
  border-radius: 50%;
  box-shadow: 0 0 20px var(--glow-blue);
  
  &::before,
  &::after {
    content: '';
    position: absolute;
    background: var(--hud-cyan);
    box-shadow: 0 0 10px var(--glow-blue);
  }
  
  &::before {
    top: 50%;
    left: -10px;
    width: 8px;
    height: 2px;
    transform: translateY(-50%);
  }
  
  &::after {
    top: 50%;
    right: -10px;
    width: 8px;
    height: 2px;
    transform: translateY(-50%);
  }
`

const SpeedBar = styled.div`
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 8px;
  background: rgba(0, 212, 255, 0.2);
  border: 1px solid var(--hud-cyan);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
`

const SpeedFill = styled.div<{ speed: number }>`
  height: 100%;
  width: ${props => props.speed}%;
  background: linear-gradient(90deg, var(--glow-blue), var(--hud-cyan));
  box-shadow: 0 0 20px var(--glow-blue);
  transition: width 0.1s ease-out;
`

const Controls = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  font-size: 12px;
  opacity: 0.6;
  text-align: right;
  line-height: 1.6;
`

export const HUD = () => {
  const speed = useGameStore((state) => state.speed)
  const maxSpeed = useGameStore((state) => state.maxSpeed)
  const score = useGameStore((state) => state.score)
  const gameState = useGameStore((state) => state.gameState)
  const countdown = useGameStore((state) => state.countdown)
  const setCountdown = useGameStore((state) => state.setCountdown)
  const startRace = useGameStore((state) => state.startRace)
  const raceTime = useGameStore((state) => state.raceTime)
  const finishTime = useGameStore((state) => state.finishTime)
  const resetGame = useGameStore((state) => state.resetGame)
  
  const speedPercent = (speed / maxSpeed) * 100

  // Countdown logic
  useEffect(() => {
    if (gameState === 'countdown') {
      const timer = setTimeout(() => {
        if (countdown > 1) {
          setCountdown(countdown - 1);
        } else if (countdown === 1) {
          setCountdown(0); // For 'GO!'
          setTimeout(startRace, 1000); 
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [gameState, countdown, setCountdown, startRace]);

  // Format race time
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time * 100) % 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const countdownText = countdown > 0 ? countdown.toString() : 'GO!';

  return (
    <HUDContainer>
      <TopBar>
        <Stat>
          <Label>Speed</Label>
          <Value>{Math.round(speed)}</Value>
        </Stat>
        <Stat>
          <Label>{gameState === 'playing' ? 'Time' : 'Score'}</Label>
          <Value>
            {gameState === 'playing' ? formatTime(raceTime) : score}
          </Value>
        </Stat>
      </TopBar>

      <Crosshair />

      <SpeedBar>
        <SpeedFill speed={speedPercent} />
      </SpeedBar>

      <Controls>
        WASD / Arrows - Move<br />
        Q/E - Up/Down<br />
        Shift - Boost<br />
        Space - Brake<br />
        ESC - Pause
      </Controls>
      
      {gameState === 'countdown' && (
        <CountdownOverlay>{countdownText}</CountdownOverlay>
      )}
      
      {gameState === 'finished' && finishTime !== null && (
        <FinishMessage>
          MISSION COMPLETE!
          <br />
          <span style={{ fontSize: '0.6em', fontWeight: 'normal' }}>Time: {formatTime(finishTime)}</span>
          <br />
          <Button 
            onClick={resetGame} 
            style={{ 
              marginTop: '40px', 
              pointerEvents: 'all' 
            }}
          >
            RETRY
          </Button>
        </FinishMessage>
      )}
    </HUDContainer>
  )
}