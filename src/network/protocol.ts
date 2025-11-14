/**
 * Network protocol definitions for multiplayer
 */

import type * as THREE from 'three';

// Message types
export enum MessageType {
  // Connection
  PLAYER_JOIN = 0,
  PLAYER_LEAVE = 1,
  
  // Game control
  GAME_START = 2,
  GAME_STATE_UPDATE = 3,
  
  // Player input
  PLAYER_INPUT = 4,
  
  // Game state sync
  FULL_STATE = 5,
  DELTA_STATE = 6,
  
  // Combat
  PROJECTILE_FIRED = 7,
  PROJECTILE_HIT = 8,
  SHIP_DAMAGED = 9,
  SHIP_DESTROYED = 10,
  SHIP_RESPAWNED = 11,
  
  // Boosters
  BOOSTER_COLLECTED = 12,
  
  // Race events
  PLAYER_FINISHED = 13,
  
  // Ping/latency
  PING = 14,
  PONG = 15,
  
  // Player list sync
  PLAYER_LIST = 16,
}

// Player input state (sent from peer to host)
export interface PlayerInput {
  playerId: string;
  timestamp: number;
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  shoot: boolean;
  boost: boolean;
  brake: boolean;
  toggleCamera: boolean;
  sequenceNumber: number;
}

// Player state (synced from host to peers)
export interface PlayerState {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  velocity: [number, number, number];
  health: number;
  maxHealth: number;
  ammo: number;
  maxAmmo: number;
  speed: number;
  isInvulnerable: boolean;
  isBoosting: boolean;
  isRespawning: boolean;
  distanceToFinish: number;
  racePosition: number;
  finishTime: number | null;
  sizeClass: string;
}

// AI state (synced from host to peers)
export interface AIState {
  id: number;
  position: [number, number, number];
  rotation: [number, number, number];
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
  isInvulnerable: boolean;
  distanceToFinish: number;
  sizeClass: string;
}

// Full game state (periodic backup sync)
export interface FullGameState {
  timestamp: number;
  raceTime: number;
  gameState: string;
  countdown: number;
  players: PlayerState[];
  aiShips: AIState[];
  projectiles: ProjectileState[];
}

// Delta state update (high frequency)
export interface DeltaStateUpdate {
  timestamp: number;
  raceTime: number;
  playerUpdates: Partial<PlayerState>[];
  aiUpdates: Partial<AIState>[];
}

// Projectile state
export interface ProjectileState {
  id: string;
  position: [number, number, number];
  direction: [number, number, number];
  ownerId: string; // player ID or 'ai-{id}'
  isPlayerOwned: boolean;
}

// Combat events
export interface ProjectileFiredEvent {
  projectileId: string;
  ownerId: string;
  position: [number, number, number];
  direction: [number, number, number];
  timestamp: number;
}

export interface ProjectileHitEvent {
  projectileId: string;
  targetId: string; // player ID or 'ai-{id}'
  damage: number;
  timestamp: number;
}

export interface ShipDamagedEvent {
  targetId: string;
  damage: number;
  newHealth: number;
  timestamp: number;
}

export interface ShipDestroyedEvent {
  targetId: string;
  killerId: string;
  timestamp: number;
}

export interface ShipRespawnedEvent {
  targetId: string;
  position: [number, number, number];
  timestamp: number;
}

// Booster event
export interface BoosterCollectedEvent {
  playerId: string;
  boosterId: number;
  timestamp: number;
}

// Race event
export interface PlayerFinishedEvent {
  playerId: string;
  finishTime: number;
  position: number;
}

// Player list event
export interface PlayerListEvent {
  players: Array<{
    id: string;
    name: string;
    sizeClass: string;
  }>;
}

// Network message wrapper
export interface NetworkMessage {
  type: MessageType;
  data: any;
  timestamp: number;
  senderId?: string;
}

// Helper to create messages
export function createMessage(type: MessageType, data: any, senderId?: string): NetworkMessage {
  return {
    type,
    data,
    timestamp: performance.now(),
    senderId
  };
}

// Serialize Vector3 to array
export function serializeVector3(v: THREE.Vector3): [number, number, number] {
  return [v.x, v.y, v.z];
}

// Deserialize array to Vector3
export function deserializeVector3(arr: [number, number, number], target: THREE.Vector3): void {
  target.set(arr[0], arr[1], arr[2]);
}