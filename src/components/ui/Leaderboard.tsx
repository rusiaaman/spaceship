import styled from '@emotion/styled'
import { useGameStore } from '@/store/gameStore'

const LeaderboardContainer = styled.div`
  position: fixed;
  top: 120px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid var(--hud-cyan);
  border-radius: 8px;
  padding: 15px;
  min-width: 200px;
  font-family: 'Orbitron', monospace;
  color: var(--hud-cyan);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
  backdrop-filter: blur(10px);
  z-index: 10;
`

const Title = styled.div`
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  border-bottom: 1px solid var(--hud-cyan);
  padding-bottom: 8px;
`

const RacerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const RacerItem = styled.div<{ isPlayer?: boolean; position: number }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: ${props => props.isPlayer 
    ? 'rgba(0, 212, 255, 0.2)' 
    : 'rgba(0, 212, 255, 0.05)'};
  border-radius: 4px;
  border-left: 3px solid ${props => {
    if (props.position === 1) return '#FFD700'; // Gold
    if (props.position === 2) return '#C0C0C0'; // Silver
    if (props.position === 3) return '#CD7F32'; // Bronze
    return 'var(--hud-cyan)';
  }};
  font-size: 14px;
  transition: all 0.3s ease;
  
  ${props => props.isPlayer && `
    box-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
    font-weight: bold;
  `}
`

const Position = styled.div<{ position: number }>`
  font-size: 18px;
  font-weight: bold;
  min-width: 25px;
  text-align: center;
  color: ${props => {
    if (props.position === 1) return '#FFD700';
    if (props.position === 2) return '#C0C0C0';
    if (props.position === 3) return '#CD7F32';
    return 'var(--hud-cyan)';
  }};
`

const Name = styled.div`
  flex: 1;
`

const Distance = styled.div`
  font-size: 12px;
  opacity: 0.7;
`

export const Leaderboard = () => {
  const aiStandings = useGameStore(state => state.aiStandings)
  const playerPosition = useGameStore(state => state.playerPosition)
  const distanceToFinish = useGameStore(state => state.distanceToFinish)
  const gameState = useGameStore(state => state.gameState)

  if (gameState !== 'playing') return null

  // Combine player and AI standings
  const allRacers = [
    { name: 'YOU', distance: distanceToFinish, position: playerPosition, isPlayer: true },
    ...aiStandings.map((ai) => ({ ...ai, isPlayer: false }))
  ].sort((a, b) => a.position - b.position)

  return (
    <LeaderboardContainer>
      <Title>Standings</Title>
      <RacerList>
        {allRacers.map((racer, index) => (
          <RacerItem 
            key={index} 
            isPlayer={racer.isPlayer}
            position={racer.position}
          >
            <Position position={racer.position}>
              {racer.position}
            </Position>
            <Name>{racer.name}</Name>
            <Distance>{Math.round(racer.distance)}m</Distance>
          </RacerItem>
        ))}
      </RacerList>
    </LeaderboardContainer>
  )
}