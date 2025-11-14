/**
 * Lobby menu for multiplayer game
 */

import { useState } from 'react';
import styled from '@emotion/styled';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/multiplayer/MultiplayerGameStore';
import { NetworkManager } from '@/network/NetworkManager';
import { getMultiplayerController } from '@/multiplayer/MultiplayerController';

interface LobbyMenuProps {
  onStartGame: () => void;
  onBackToMenu: () => void;
}

const MenuContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #000000 0%, #0a1628 50%, #001a33 100%);
  font-family: 'Orbitron', monospace;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);
    animation: pulse 8s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.8; }
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 600px;
  padding: 48px;
  background: rgba(10, 22, 40, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(0, 212, 255, 0.3);
  box-shadow: 
    0 0 60px rgba(0, 212, 255, 0.2),
    inset 0 0 60px rgba(0, 212, 255, 0.05);
`;

const Title = styled.h1`
  font-size: 56px;
  font-weight: 900;
  background: linear-gradient(135deg, #00d4ff 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
  margin-bottom: 12px;
  letter-spacing: 4px;
  text-shadow: 0 0 40px rgba(0, 212, 255, 0.5);
  animation: titleGlow 3s ease-in-out infinite;

  @keyframes titleGlow {
    0%, 100% {
      filter: drop-shadow(0 0 20px rgba(0, 212, 255, 0.6));
    }
    50% {
      filter: drop-shadow(0 0 30px rgba(0, 212, 255, 0.9));
    }
  }
`;

const Subtitle = styled.p`
  text-align: center;
  color: rgba(100, 200, 255, 0.8);
  font-size: 16px;
  margin-bottom: 40px;
  font-weight: 300;
  letter-spacing: 1px;
`;

const InputGroup = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  color: #00d4ff;
  margin-bottom: 8px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 18px;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(0, 212, 255, 0.3);
  border-radius: 12px;
  color: white;
  font-family: 'Orbitron', monospace;
  font-size: 16px;
  transition: all 0.3s ease;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  &:focus {
    border-color: #00d4ff;
    background: rgba(0, 212, 255, 0.05);
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
  }

  &.room-code {
    text-align: center;
    font-size: 24px;
    letter-spacing: 4px;
    text-transform: uppercase;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  width: 100%;
  padding: 16px 24px;
  font-family: 'Orbitron', monospace;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid;
  position: relative;
  overflow: hidden;

  ${props => {
    if (props.variant === 'danger') {
      return `
        background: rgba(220, 38, 38, 0.2);
        border-color: #dc2626;
        color: #fca5a5;

        &:hover:not(:disabled) {
          background: rgba(220, 38, 38, 0.3);
          box-shadow: 0 0 30px rgba(220, 38, 38, 0.4);
          transform: translateY(-2px);
        }
      `;
    } else if (props.variant === 'secondary') {
      return `
        background: rgba(55, 65, 81, 0.6);
        border-color: rgba(156, 163, 175, 0.5);
        color: #d1d5db;

        &:hover:not(:disabled) {
          background: rgba(75, 85, 99, 0.8);
          border-color: rgba(156, 163, 175, 0.8);
          transform: translateY(-2px);
        }
      `;
    } else {
      return `
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%);
        border-color: #00d4ff;
        color: white;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        &:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.4) 0%, rgba(59, 130, 246, 0.4) 100%);
          box-shadow: 0 0 30px rgba(0, 212, 255, 0.5);
          transform: translateY(-2px);

          &::before {
            left: 100%;
          }
        }
      `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 32px 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.5), transparent);
  }

  span {
    color: rgba(100, 200, 255, 0.6);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 2px;
  }
`;

const InfoText = styled.div`
  text-align: center;
  font-size: 12px;
  color: rgba(156, 163, 175, 0.7);
  margin-top: 24px;
  line-height: 1.6;

  p {
    margin: 4px 0;
  }
`;

const ErrorMessage = styled.div`
  padding: 14px 18px;
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid rgba(220, 38, 38, 0.5);
  border-radius: 12px;
  color: #fca5a5;
  font-size: 14px;
  margin-bottom: 20px;
  text-align: center;
`;

const RoomInfo = styled.div`
  text-align: center;
  margin-bottom: 32px;

  .room-code-label {
    font-size: 18px;
    color: #00d4ff;
    margin-bottom: 8px;
    font-weight: 600;
  }

  .room-code-value {
    font-size: 36px;
    font-weight: 900;
    color: white;
    letter-spacing: 8px;
    font-family: 'Orbitron', monospace;
    text-shadow: 0 0 20px rgba(0, 212, 255, 0.8);
  }

  .host-badge {
    display: inline-block;
    margin-top: 8px;
    padding: 6px 16px;
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid rgba(34, 197, 94, 0.5);
    border-radius: 20px;
    color: #86efac;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1px;
  }
`;

const PlayerList = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;

  .header {
    font-size: 18px;
    color: #00d4ff;
    margin-bottom: 16px;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .players {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
`;

const PlayerCard = styled.div<{ isLocal?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: ${props => props.isLocal 
    ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)'
    : 'rgba(31, 41, 55, 0.5)'};
  border: 1px solid ${props => props.isLocal 
    ? 'rgba(0, 212, 255, 0.4)'
    : 'rgba(75, 85, 99, 0.5)'};
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateX(4px);
    border-color: ${props => props.isLocal ? '#00d4ff' : 'rgba(156, 163, 175, 0.8)'};
  }

  .player-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${props => props.isLocal ? '#22c55e' : '#3b82f6'};
      box-shadow: 0 0 10px ${props => props.isLocal ? '#22c55e' : '#3b82f6'};
      animation: ${props => props.isLocal ? 'pulse-dot 2s ease-in-out infinite' : 'none'};
    }

    .player-name {
      color: ${props => props.isLocal ? 'white' : '#d1d5db'};
      font-weight: ${props => props.isLocal ? '700' : '500'};
      font-size: 15px;
    }
  }

  .player-size {
    font-size: 13px;
    color: rgba(156, 163, 175, 0.8);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  @keyframes pulse-dot {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.2);
    }
  }
`;

const LatencyIndicator = styled.div`
  text-align: center;
  font-size: 13px;
  color: rgba(156, 163, 175, 0.7);
  margin-bottom: 16px;

  .latency-value {
    color: #00d4ff;
    font-weight: 600;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

export function LobbyMenu({ onStartGame, onBackToMenu }: LobbyMenuProps) {
  const [playerName, setPlayerName] = useState('Player');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const multiplayerStore = useMultiplayerStore();
  const playerSizeClass = useGameStore(state => state.playerSizeClass);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    multiplayerStore.setConnectionError(null);

    try {
      const networkManager = new NetworkManager();
      multiplayerStore.setNetworkManager(networkManager);

      // Set up callbacks
      networkManager.setCallbacks({
        onPlayerJoined: (playerId) => {
          console.log('[Lobby] Player joined:', playerId);
          multiplayerStore.addRemotePlayer(playerId, 'Player');
          
          // If we're host, send the current player list to the new player
          // This will be sent when the data channel opens via onConnected
          if (multiplayerStore.isHost) {
            // Small delay to ensure peer connection is established
            setTimeout(() => {
              const controller = getMultiplayerController();
              controller.sendPlayerListToPeer(playerId);
            }, 1000); // Increased delay to ensure data channel is ready
          }
        },
        onPlayerLeft: (playerId) => {
          console.log('[Lobby] Player left:', playerId);
          multiplayerStore.removeRemotePlayer(playerId);
          
          // Update connection status
          const peerCount = networkManager.getPeerCount();
          if (peerCount === 0) {
            multiplayerStore.setIsConnected(false);
          }
        },
        onConnected: () => {
          console.log('[Lobby] Peer data channel connected');
          multiplayerStore.setIsConnected(true);
        },
        onDisconnected: () => {
          console.log('[Lobby] Peer data channel disconnected');
          // Only set disconnected if no other peers are connected
          const peerCount = networkManager.getPeerCount();
          if (peerCount === 0 || !networkManager.isConnected()) {
            multiplayerStore.setIsConnected(false);
          }
        }
      });

      // Connect and create room
      const result = await networkManager.connect();
      
      multiplayerStore.setIsMultiplayer(true);
      multiplayerStore.setIsHost(result.isHost);
      multiplayerStore.setRoomId(result.roomId);
      multiplayerStore.setMyPlayerId(networkManager.getPlayerId());
      multiplayerStore.playerNames.set(networkManager.getPlayerId()!, playerName);

      // Initialize multiplayer controller
      const controller = getMultiplayerController();
      controller.initialize();

      console.log('[Lobby] Room created:', result.roomId);
    } catch (error) {
      console.error('[Lobby] Failed to create room:', error);
      multiplayerStore.setConnectionError(error instanceof Error ? error.message : 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinRoomId.trim()) return;

    setIsJoining(true);
    multiplayerStore.setConnectionError(null);

    try {
      const networkManager = new NetworkManager();
      multiplayerStore.setNetworkManager(networkManager);

      // Set up callbacks
      networkManager.setCallbacks({
        onPlayerJoined: (playerId) => {
          console.log('[Lobby] Player joined:', playerId);
          multiplayerStore.addRemotePlayer(playerId, 'Player');
          
          // If we're host, send the current player list to the new player
          // This will be sent when the data channel opens via onConnected
          if (multiplayerStore.isHost) {
            // Small delay to ensure peer connection is established
            setTimeout(() => {
              const controller = getMultiplayerController();
              controller.sendPlayerListToPeer(playerId);
            }, 1000); // Increased delay to ensure data channel is ready
          }
        },
        onPlayerLeft: (playerId) => {
          console.log('[Lobby] Player left:', playerId);
          multiplayerStore.removeRemotePlayer(playerId);
          
          // Update connection status
          const peerCount = networkManager.getPeerCount();
          if (peerCount === 0) {
            multiplayerStore.setIsConnected(false);
          }
        },
        onConnected: () => {
          console.log('[Lobby] Peer data channel connected');
          multiplayerStore.setIsConnected(true);
        },
        onDisconnected: () => {
          console.log('[Lobby] Peer data channel disconnected');
          // Only set disconnected if no other peers are connected
          const peerCount = networkManager.getPeerCount();
          if (peerCount === 0 || !networkManager.isConnected()) {
            multiplayerStore.setIsConnected(false);
          }
        }
      });

      // Connect and join room
      const result = await networkManager.connect(joinRoomId.toUpperCase());
      
      multiplayerStore.setIsMultiplayer(true);
      multiplayerStore.setIsHost(result.isHost);
      multiplayerStore.setRoomId(result.roomId);
      multiplayerStore.setMyPlayerId(networkManager.getPlayerId());
      multiplayerStore.playerNames.set(networkManager.getPlayerId()!, playerName);

      // Initialize multiplayer controller
      const controller = getMultiplayerController();
      controller.initialize();

      // If joining as non-host, add the host as a remote player
      if (!result.isHost && result.hostId) {
        multiplayerStore.addRemotePlayer(result.hostId, 'Host');
        console.log('[Lobby] Added host as remote player:', result.hostId);
      }

      console.log('[Lobby] Joined room:', result.roomId);
    } catch (error) {
      console.error('[Lobby] Failed to join room:', error);
      multiplayerStore.setConnectionError(error instanceof Error ? error.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartGame = () => {
    if (!multiplayerStore.isHost) return;
    
    // Check if all peers are connected
    const networkManager = multiplayerStore.networkManager;
    if (!networkManager || !networkManager.isConnected()) {
      console.warn('[Lobby] Cannot start game - peers not connected');
      multiplayerStore.setConnectionError('Waiting for all players to connect...');
      return;
    }
    
    // Broadcast game start to all players
    const controller = getMultiplayerController();
    controller.broadcastGameStart();
    
    // Start game locally
    onStartGame();
  };

  const handleLeaveRoom = () => {
    multiplayerStore.networkManager?.disconnect();
    multiplayerStore.reset();
    onBackToMenu();
  };

  // If in lobby (room created/joined)
  if (multiplayerStore.roomId) {
    return (
      <MenuContainer>
        <ContentWrapper>
          <Title>MULTIPLAYER LOBBY</Title>
          
          <RoomInfo>
            <div className="room-code-label">Room Code</div>
            <div className="room-code-value">{multiplayerStore.roomId}</div>
            {multiplayerStore.isHost && (
              <div className="host-badge">★ HOST</div>
            )}
          </RoomInfo>

          <PlayerList>
            <div className="header">
              Players ({1 + multiplayerStore.remotePlayers.size}/8)
            </div>
            <div className="players">
              {/* Local player */}
              <PlayerCard isLocal>
                <div className="player-info">
                  <div className="status-dot" />
                  <span className="player-name">{playerName} (You)</span>
                </div>
                <span className="player-size">{playerSizeClass}</span>
              </PlayerCard>

              {/* Remote players */}
              {Array.from(multiplayerStore.remotePlayers.values()).map((player) => (
                <PlayerCard key={player.id}>
                  <div className="player-info">
                    <div className="status-dot" />
                    <span className="player-name">{player.name}</span>
                  </div>
                  <span className="player-size">{player.state.sizeClass}</span>
                </PlayerCard>
              ))}
            </div>
          </PlayerList>

          {multiplayerStore.latency > 0 && (
            <LatencyIndicator>
              Latency: <span className="latency-value">{multiplayerStore.latency.toFixed(0)}ms</span>
            </LatencyIndicator>
          )}

          <ButtonGroup>
            <Button variant="danger" onClick={handleLeaveRoom} style={{ flex: 1 }}>
              Leave Room
            </Button>
            
            {multiplayerStore.isHost ? (
              <Button
                onClick={handleStartGame}
                disabled={
                  multiplayerStore.remotePlayers.size === 0 || 
                  !multiplayerStore.isConnected
                }
                style={{ flex: 2 }}
              >
                {multiplayerStore.isConnected ? 'Start Game' : 'Connecting...'}
              </Button>
            ) : (
              <Button disabled style={{ flex: 2 }}>
                Waiting for Host...
              </Button>
            )}
          </ButtonGroup>
        </ContentWrapper>
      </MenuContainer>
    );
  }

  // Initial lobby screen
  return (
    <MenuContainer>
      <ContentWrapper>
        <Title>MULTIPLAYER</Title>
        <Subtitle>Race against other players online</Subtitle>

        {multiplayerStore.connectionError && (
          <ErrorMessage>{multiplayerStore.connectionError}</ErrorMessage>
        )}

        <InputGroup>
          <Label>Your Name</Label>
          <Input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            placeholder="Enter your name"
            autoFocus
          />
        </InputGroup>

        <Button
          onClick={handleCreateRoom}
          disabled={isCreating || !playerName.trim()}
        >
          {isCreating ? 'Creating...' : 'Create Room'}
        </Button>

        <Divider>
          <span>OR</span>
        </Divider>

        <InputGroup>
          <Label>Room Code</Label>
          <Input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
            maxLength={6}
            className="room-code"
            placeholder="XXXXXX"
          />
        </InputGroup>

        <Button
          onClick={handleJoinRoom}
          disabled={isJoining || !joinRoomId.trim() || !playerName.trim()}
          style={{ marginBottom: '16px' }}
        >
          {isJoining ? 'Joining...' : 'Join Room'}
        </Button>

        <Button variant="secondary" onClick={onBackToMenu}>
          Back to Menu
        </Button>

        <InfoText>
          <p>Share the room code with friends to play together</p>
          <p>Supports 2-8 players per room</p>
        </InfoText>
      </ContentWrapper>
    </MenuContainer>
  );
}