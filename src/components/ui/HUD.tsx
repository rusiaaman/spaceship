import { useEffect, useState, useRef } from 'react'
import styled from '@emotion/styled'
import { useGameStore } from '@/store/gameStore'

import { Confetti } from './Confetti'
import { Leaderboard } from './Leaderboard'

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

const FinishOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, 
    rgba(0, 212, 255, 0.15) 0%, 
    rgba(0, 0, 0, 0.8) 50%,
    rgba(0, 0, 0, 0.95) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
  animation: fadeIn 0.5s ease-out;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const FinishMessage = styled.div`
  text-align: center;
  animation: slideUp 0.8s ease-out;
  
  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(50px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const RaceTitle = styled.div`
  font-size: 80px;
  font-weight: 900;
  color: var(--hud-cyan);
  text-shadow: 
    0 0 20px var(--glow-blue),
    0 0 40px var(--glow-blue),
    0 0 60px var(--glow-blue);
  letter-spacing: 8px;
  text-transform: uppercase;
  margin-bottom: 20px;
  animation: glow 2s ease-in-out infinite alternate;
  
  @keyframes glow {
    from { 
      text-shadow: 
        0 0 20px var(--glow-blue),
        0 0 40px var(--glow-blue),
        0 0 60px var(--glow-blue);
    }
    to { 
      text-shadow: 
        0 0 30px var(--glow-blue),
        0 0 60px var(--glow-blue),
        0 0 90px var(--glow-blue),
        0 0 120px rgba(0, 212, 255, 0.5);
    }
  }
`;

const TimeDisplay = styled.div`
  font-size: 48px;
  font-weight: 600;
  color: #ffffff;
  margin: 30px 0;
  padding: 20px 40px;
  background: rgba(0, 212, 255, 0.1);
  border: 2px solid var(--hud-cyan);
  border-radius: 12px;
  display: inline-block;
  box-shadow: 
    0 0 20px rgba(0, 212, 255, 0.3),
    inset 0 0 20px rgba(0, 212, 255, 0.1);
  animation: pulse 1.5s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
`;

const TimeLabel = styled.span`
  font-size: 24px;
  color: var(--hud-cyan);
  opacity: 0.8;
  margin-right: 15px;
  text-transform: uppercase;
  letter-spacing: 2px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  margin: 40px 0;
  max-width: 600px;
`;

const StatCard = styled.div`
  background: rgba(0, 212, 255, 0.05);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  animation: fadeInScale 0.6s ease-out backwards;
  animation-delay: calc(var(--index) * 0.1s);
  
  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: var(--hud-cyan);
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 0 0 10px var(--glow-blue);
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 50px;
  animation: fadeIn 1s ease-out 0.8s backwards;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 15px 40px;
  font-size: 20px;
  font-family: 'Orbitron', monospace;
  color: ${props => props.variant === 'primary' ? '#000000' : 'var(--hud-cyan)'};
  background: ${props => props.variant === 'primary' ? 'var(--hud-cyan)' : 'transparent'};
  border: 2px solid var(--hud-cyan);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 600;
  box-shadow: ${props => props.variant === 'primary' 
    ? '0 0 30px rgba(0, 212, 255, 0.6)' 
    : '0 0 10px rgba(0, 212, 255, 0.3)'};
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: ${props => props.variant === 'primary' 
      ? 'rgba(255, 255, 255, 0.3)' 
      : 'rgba(0, 212, 255, 0.3)'};
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: width 0.6s ease, height 0.6s ease;
  }
  
  &:hover {
    background: ${props => props.variant === 'primary' ? '#ffffff' : 'var(--hud-cyan)'};
    color: #000000;
    box-shadow: 0 0 40px var(--glow-blue);
    transform: scale(1.05) translateY(-2px);
    
    &::before {
      width: 300px;
      height: 300px;
    }
  }
  
  &:active {
    transform: scale(0.98) translateY(0);
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

const SpeedFill = styled.div<{ speed: number; isBoosting: boolean }>`
  height: 100%;
  width: ${props => props.speed}%;
  background: linear-gradient(90deg, 
    ${props => props.isBoosting ? '#00ffff' : props.speed > 80 ? '#ff4444' : 'var(--glow-blue)'}, 
    ${props => props.isBoosting ? '#00ff88' : props.speed > 80 ? '#ff8844' : 'var(--hud-cyan)'}
  );
  box-shadow: 0 0 20px ${props => props.isBoosting ? '#00ffff' : props.speed > 80 ? '#ff4444' : 'var(--glow-blue)'};
  transition: width 0.05s ease-out, background 0.3s ease;
  animation: ${props => props.isBoosting ? 'boostPulse 0.5s ease-in-out infinite' : 'none'};
  
  @keyframes boostPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`

const HealthBarContainer = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  width: 250px;
`;

const HealthBarLabel = styled.div`
  font-size: 12px;
  color: var(--hud-cyan);
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
`;

const HealthBarTrack = styled.div`
  width: 100%;
  height: 20px;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid var(--hud-cyan);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
`;

const HealthBarFill = styled.div<{ health: number }>`
  height: 100%;
  width: ${props => props.health}%;
  background: linear-gradient(90deg, 
    ${props => props.health > 60 ? '#00ff88' : props.health > 30 ? '#ffaa00' : '#ff4444'},
    ${props => props.health > 60 ? '#00ffff' : props.health > 30 ? '#ffdd00' : '#ff8844'}
  );
  box-shadow: 0 0 10px ${props => props.health > 60 ? '#00ff88' : props.health > 30 ? '#ffaa00' : '#ff4444'};
  transition: width 0.3s ease, background 0.3s ease;
`;

const HealthValue = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 0 0 5px #000000;
  pointer-events: none;
`;

const DamageVignette = styled.div<{ active: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: radial-gradient(circle at center, transparent 40%, rgba(255, 0, 0, 0.4) 100%);
  opacity: ${props => props.active ? 1 : 0};
  transition: opacity 0.2s ease;
  animation: ${props => props.active ? 'damagePulse 0.3s ease-out' : 'none'};
  
  @keyframes damagePulse {
    0% { opacity: 0; }
    50% { opacity: 1; }
    100% { opacity: 0.5; }
  }
`;

const ShootCooldown = styled.div<{ progress: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 3px solid rgba(0, 212, 255, 0.3);
  pointer-events: none;
  
  &::after {
    content: '';
    position: absolute;
    top: -3px;
    left: -3px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 3px solid var(--hud-cyan);
    border-right-color: transparent;
    border-bottom-color: transparent;
    transform: rotate(${props => props.progress * 360}deg);
    opacity: ${props => props.progress < 1 ? 1 : 0};
    transition: opacity 0.1s ease;
    box-shadow: 0 0 10px var(--glow-blue);
  }
`;

const BoostIndicator = styled.div<{ active: boolean }>`
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 16px;
  font-weight: bold;
  color: #00ffff;
  text-shadow: 0 0 20px #00ffff;
  opacity: ${props => props.active ? 1 : 0};
  transition: opacity 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 3px;
  animation: ${props => props.active ? 'boostGlow 0.5s ease-in-out infinite' : 'none'};
  
  @keyframes boostGlow {
    0%, 100% { 
      text-shadow: 0 0 20px #00ffff, 0 0 30px #00ffff;
    }
    50% { 
      text-shadow: 0 0 30px #00ffff, 0 0 50px #00ffff, 0 0 70px #00ffff;
    }
  }
`

const AmmoContainer = styled.div`
  position: absolute;
  top: 80px;
  left: 20px;
  width: 250px;
`;

const AmmoLabel = styled.div`
  font-size: 12px;
  color: var(--hud-cyan);
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
`;

const AmmoDisplay = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const AmmoDot = styled.div<{ filled: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.filled ? 'var(--hud-cyan)' : 'rgba(0, 212, 255, 0.2)'};
  border: 1px solid ${props => props.filled ? 'var(--hud-cyan)' : 'rgba(0, 212, 255, 0.3)'};
  box-shadow: ${props => props.filled ? '0 0 8px var(--glow-blue)' : 'none'};
  transition: all 0.2s ease;
`;

const Controls = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  font-size: 12px;
  opacity: 0.6;
  text-align: right;
  line-height: 1.6;
`

const CameraMode = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: 14px;
  color: var(--hud-cyan);
  text-shadow: 0 0 10px var(--glow-blue);
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 2px;
`

const PointerLockHint = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  color: var(--hud-cyan);
  text-shadow: 0 0 20px var(--glow-blue);
  text-align: center;
  pointer-events: none;
  animation: fadeInOut 2s ease-in-out infinite;
  
  @keyframes fadeInOut {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
`

export const HUD = () => {
  // Optimize subscriptions - use individual selectors for primitives
  const speed = useGameStore(state => state.speed)
  const gameState = useGameStore(state => state.gameState)
  const countdown = useGameStore(state => state.countdown)
  const playerHealth = useGameStore(state => state.playerHealth)
  const playerMaxHealth = useGameStore(state => state.playerMaxHealth)
  const playerAmmo = useGameStore(state => state.playerAmmo)
  const playerMaxAmmo = useGameStore(state => state.playerMaxAmmo)
  const raceTime = useGameStore(state => state.raceTime)
  const finishTime = useGameStore(state => state.finishTime)
  const distanceToFinish = useGameStore(state => state.distanceToFinish)
  const playerPosition = useGameStore(state => state.playerPosition)
  const cameraView = useGameStore(state => state.cameraView)
  const playerState = useGameStore(state => state.playerState)
  const lastShotTime = useGameStore(state => state.lastShotTime)

  const [isPointerLocked, setIsPointerLocked] = useState(false)
  const [showDamageFlash, setShowDamageFlash] = useState(false)
  const prevHealthRef = useRef(playerHealth)

  // Get static or infrequent values without subscription
  const maxSpeed = useGameStore.getState().maxSpeed
  const setCountdown = useGameStore.getState().setCountdown
  const startRace = useGameStore.getState().startRace
  const resetGame = useGameStore.getState().resetGame

  const isBoosting = (playerState & 4) !== 0 // Calculate isBoosting locally

  
  const speedPercent = (speed / maxSpeed) * 100
  const healthPercent = (playerHealth / playerMaxHealth) * 100
  const shootCooldownProgress = Math.min(1, (raceTime - lastShotTime) / 0.25)

  // Show damage flash when health decreases
  useEffect(() => {
    if (playerHealth < prevHealthRef.current) {
      setShowDamageFlash(true)
      setTimeout(() => setShowDamageFlash(false), 300)
    }
    prevHealthRef.current = playerHealth
  }, [playerHealth])

  // Track pointer lock state
  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === document.body)
    }

    document.addEventListener('pointerlockchange', handlePointerLockChange)
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange)
  }, [])

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
      <Leaderboard />
      
      {/* Health Bar */}
      {(gameState === 'playing' || gameState === 'countdown') && (
        <>
          <HealthBarContainer>
            <HealthBarLabel>Hull Integrity</HealthBarLabel>
            <HealthBarTrack>
              <HealthBarFill health={healthPercent} />
              <HealthValue>{Math.round(playerHealth)}</HealthValue>
            </HealthBarTrack>
          </HealthBarContainer>
          
          {/* Ammo Display */}
          <AmmoContainer>
            <AmmoLabel>Ammo</AmmoLabel>
            <AmmoDisplay>
              {Array.from({ length: playerMaxAmmo }).map((_, i) => (
                <AmmoDot key={i} filled={i < playerAmmo} />
              ))}
            </AmmoDisplay>
          </AmmoContainer>
        </>
      )}
      
      {/* Damage Vignette */}
      <DamageVignette active={showDamageFlash || playerHealth < 30} />
      
      <TopBar>
        <Stat>
          <Label>Speed</Label>
          <Value>{Math.round(speed)}</Value>
        </Stat>
        <Stat>
          <Label>Time</Label>
          <Value>{formatTime(raceTime)}</Value>
        </Stat>
        <Stat>
          <Label>Distance</Label>
          <Value>{Math.round(distanceToFinish)}m</Value>
        </Stat>
      </TopBar>

      <Crosshair />
      
      {/* Shoot Cooldown Indicator */}
      {gameState === 'playing' && (
        <ShootCooldown progress={shootCooldownProgress} />
      )}

      <BoostIndicator active={isBoosting}>
        ⚡ BOOST ACTIVE ⚡
      </BoostIndicator>

      <SpeedBar>
        <SpeedFill speed={speedPercent} isBoosting={isBoosting} />
      </SpeedBar>

      <CameraMode>
        {cameraView === 'first-person' ? '📷 First Person' : '📷 Third Person'}
      </CameraMode>

      <Controls>
        WASD / Arrows - Move<br />
        Mouse - Look Around<br />
        Left Click - Shoot<br />
        Q/E - Pitch Up/Down<br />
        Shift - Boost<br />
        Space - Brake<br />
        C - Toggle Camera<br />
        ESC - Pause
      </Controls>

      {gameState === 'playing' && !isPointerLocked && (
        <PointerLockHint>
          Click to capture mouse
        </PointerLockHint>
      )}
      
      {gameState === 'countdown' && (
        <CountdownOverlay>{countdownText}</CountdownOverlay>
      )}
      
      {gameState === 'finished' && finishTime !== null && (
        <>
          <Confetti />
          <FinishOverlay>
          <FinishMessage>
            <RaceTitle>RACE COMPLETE!</RaceTitle>
            
            <TimeDisplay>
              <TimeLabel>Final Time:</TimeLabel>
              {formatTime(finishTime)}
            </TimeDisplay>
            
            <StatsGrid>
              <StatCard style={{ '--index': 0 } as React.CSSProperties}>
                <StatLabel>Position</StatLabel>
                <StatValue style={{ 
                  color: playerPosition === 1 ? '#FFD700' : 
                         playerPosition === 2 ? '#C0C0C0' : 
                         playerPosition === 3 ? '#CD7F32' : '#ffffff'
                }}>
                  {playerPosition === 1 ? '🥇' : playerPosition === 2 ? '🥈' : playerPosition === 3 ? '🥉' : playerPosition}
                  {playerPosition === 1 ? 'st' : playerPosition === 2 ? 'nd' : playerPosition === 3 ? 'rd' : 'th'}
                </StatValue>
              </StatCard>
              <StatCard style={{ '--index': 1 } as React.CSSProperties}>
                <StatLabel>Max Speed</StatLabel>
                <StatValue>{Math.round(maxSpeed)}</StatValue>
              </StatCard>
              <StatCard style={{ '--index': 2 } as React.CSSProperties}>
                <StatLabel>Avg Speed</StatLabel>
                <StatValue>{Math.round(1000 / finishTime)}</StatValue>
              </StatCard>
            </StatsGrid>
            
            <ButtonGroup>
              <Button variant="primary" onClick={resetGame}>
                RETRY RACE
              </Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                MAIN MENU
              </Button>
            </ButtonGroup>
          </FinishMessage>
        </FinishOverlay>
        </>
      )}
    </HUDContainer>
  )
}