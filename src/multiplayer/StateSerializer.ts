/**
 * Efficient state serialization for network transmission
 */

import * as THREE from 'three';
import type { PlayerState, AIState, ProjectileState, FullGameState } from '@/network/protocol';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from './MultiplayerGameStore';
import { getMultiplayerController } from './MultiplayerController';
import { ShipState, BitFlagUtils } from '@/utils/BitFlags';

/**
 * Serialize player state from game store
 */
export function serializePlayerState(playerId: string): PlayerState {
  const gameStore = useGameStore.getState();
  const multiplayerStore = useMultiplayerStore.getState();
  
  // Get player position from spaceship ref (if available)
  const playerPosition = (window as any).__weaponSystemRefs?.playerPosition || new THREE.Vector3();
  
  return {
    id: playerId,
    name: multiplayerStore.playerNames.get(playerId) || 'Player',
    position: [playerPosition.x, playerPosition.y, playerPosition.z],
    rotation: [0, 0, 0], // TODO: Get from spaceship rotation
    velocity: [0, 0, gameStore.speed], // Simplified velocity
    health: gameStore.playerHealth,
    maxHealth: gameStore.playerMaxHealth,
    ammo: gameStore.playerAmmo,
    maxAmmo: gameStore.playerMaxAmmo,
    speed: gameStore.speed,
    isInvulnerable: BitFlagUtils.has(gameStore.playerState, ShipState.INVULNERABLE),
    isBoosting: BitFlagUtils.has(gameStore.playerState, ShipState.BOOSTING),
    isRespawning: BitFlagUtils.has(gameStore.playerState, ShipState.RESPAWNING),
    distanceToFinish: gameStore.distanceToFinish,
    racePosition: gameStore.playerPosition,
    finishTime: gameStore.finishTime,
    sizeClass: gameStore.playerSizeClass
  };
}

/**
 * Serialize AI state
 */
export function serializeAIState(aiId: number, position: THREE.Vector3, rotation: THREE.Euler): AIState {
  const gameStore = useGameStore.getState();
  
  return {
    id: aiId,
    position: [position.x, position.y, position.z],
    rotation: [rotation.x, rotation.y, rotation.z],
    health: gameStore.getAIHealth(aiId),
    maxHealth: gameStore.getAIMaxHealth(aiId),
    isDestroyed: BitFlagUtils.has(gameStore.aiStateArray[aiId], ShipState.DESTROYED),
    isInvulnerable: gameStore.isAIInvulnerable(aiId),
    distanceToFinish: 0, // TODO: Calculate from position
    sizeClass: gameStore.aiSizeClasses[aiId]
  };
}

/**
 * Serialize projectile state
 */
export function serializeProjectileState(projectile: any): ProjectileState {
  return {
    id: projectile.id,
    position: [projectile.position.x, projectile.position.y, projectile.position.z],
    direction: [projectile.direction.x, projectile.direction.y, projectile.direction.z],
    ownerId: BitFlagUtils.has(projectile.state, 1) ? 'player' : 'ai', // Simplified
    isPlayerOwned: BitFlagUtils.has(projectile.state, 1)
  };
}

/**
 * Serialize full game state (periodic backup)
 */
export function serializeFullGameState(): FullGameState {
  const gameStore = useGameStore.getState();
  const multiplayerStore = useMultiplayerStore.getState();
  
  // Serialize all players
  const players: PlayerState[] = [];
  
  // Add local player
  if (multiplayerStore.myPlayerId) {
    players.push(serializePlayerState(multiplayerStore.myPlayerId));
  }
  
  // Add remote players
  for (const remotePlayer of multiplayerStore.remotePlayers.values()) {
    players.push(remotePlayer.state);
  }
  
  // Serialize AI ships (host only)
  const aiShips: AIState[] = [];
  if (multiplayerStore.isHost) {
    const controller = getMultiplayerController();
    aiShips.push(...controller.getAISync().getAllAIStates());
  }
  
  // Serialize projectiles
  const projectiles: ProjectileState[] = gameStore.activeProjectiles.map(serializeProjectileState);
  
  return {
    timestamp: performance.now(),
    raceTime: gameStore.raceTime,
    gameState: gameStore.gameState,
    countdown: gameStore.countdown,
    players,
    aiShips,
    projectiles
  };
}

/**
 * Deserialize and apply player state
 */
export function applyPlayerState(playerId: string, state: Partial<PlayerState>): void {
  const multiplayerStore = useMultiplayerStore.getState();
  multiplayerStore.updateRemotePlayer(playerId, state);
}

/**
 * Deserialize and apply full game state
 */
export function applyFullGameState(fullState: FullGameState): void {
  const gameStore = useGameStore.getState();
  const multiplayerStore = useMultiplayerStore.getState();
  
  // Update game time and state
  gameStore.setRaceTime(fullState.raceTime);
  gameStore.setGameState(fullState.gameState as any);
  gameStore.setCountdown(fullState.countdown);
  
  // Update remote players
  for (const playerState of fullState.players) {
    if (playerState.id !== multiplayerStore.myPlayerId) {
      applyPlayerState(playerState.id, playerState);
    }
  }
  
  // Update AI ships (if not host)
  if (!multiplayerStore.isHost && fullState.aiShips) {
    const controller = getMultiplayerController();
    controller.getAISync().applyAIStates(fullState.aiShips);
  }
  
  // Update projectiles (if not host)
  if (!multiplayerStore.isHost) {
    // TODO: Sync projectiles
  }
}