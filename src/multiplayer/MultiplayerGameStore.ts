/**
 * Extended game store for multiplayer functionality
 */

import { create } from 'zustand';
import type { NetworkManager } from '@/network/NetworkManager';
import type { PlayerState } from '@/network/protocol';

export interface RemotePlayer {
  id: string;
  name: string;
  state: PlayerState;
  lastUpdateTime: number;
}

export interface MultiplayerState {
  // Network
  networkManager: NetworkManager | null;
  isMultiplayer: boolean;
  isHost: boolean;
  roomId: string | null;
  myPlayerId: string | null;
  
  // Players
  remotePlayers: Map<string, RemotePlayer>;
  playerNames: Map<string, string>;
  
  // Connection
  isConnecting: boolean;
  isConnected: boolean;
  connectionError: string | null;
  
  // Latency
  latency: number;
  lastPingTime: number;
  
  // Actions
  setNetworkManager: (manager: NetworkManager | null) => void;
  setIsMultiplayer: (isMultiplayer: boolean) => void;
  setIsHost: (isHost: boolean) => void;
  setRoomId: (roomId: string | null) => void;
  setMyPlayerId: (playerId: string | null) => void;
  
  addRemotePlayer: (playerId: string, name: string) => void;
  removeRemotePlayer: (playerId: string) => void;
  updateRemotePlayer: (playerId: string, state: Partial<PlayerState>) => void;
  getRemotePlayer: (playerId: string) => RemotePlayer | undefined;
  
  setIsConnecting: (isConnecting: boolean) => void;
  setIsConnected: (isConnected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  
  updateLatency: (latency: number) => void;
  
  reset: () => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  // Initial state
  networkManager: null,
  isMultiplayer: false,
  isHost: false,
  roomId: null,
  myPlayerId: null,
  
  remotePlayers: new Map(),
  playerNames: new Map(),
  
  isConnecting: false,
  isConnected: false,
  connectionError: null,
  
  latency: 0,
  lastPingTime: 0,
  
  // Actions
  setNetworkManager: (manager) => set({ networkManager: manager }),
  setIsMultiplayer: (isMultiplayer) => set({ isMultiplayer }),
  setIsHost: (isHost) => set({ isHost }),
  setRoomId: (roomId) => set({ roomId }),
  setMyPlayerId: (playerId) => set({ myPlayerId: playerId }),
  
  addRemotePlayer: (newPlayerId, name) => {
    const state = get();
    const remotePlayers = new Map(state.remotePlayers);
    const playerNames = new Map(state.playerNames);
    
    remotePlayers.set(newPlayerId, {
      id: newPlayerId,
      name,
      state: {
        id: newPlayerId,
        name,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        velocity: [0, 0, 0],
        health: 100,
        maxHealth: 100,
        ammo: 30,
        maxAmmo: 30,
        speed: 0,
        isInvulnerable: false,
        isBoosting: false,
        isRespawning: false,
        distanceToFinish: 1000,
        racePosition: 1,
        finishTime: null,
        sizeClass: 'MEDIUM'
      },
      lastUpdateTime: performance.now()
    });
    
    playerNames.set(newPlayerId, name);
    
    set({ remotePlayers, playerNames });
  },
  
  removeRemotePlayer: (playerId) => {
    const remotePlayers = new Map(get().remotePlayers);
    const playerNames = new Map(get().playerNames);
    
    remotePlayers.delete(playerId);
    playerNames.delete(playerId);
    
    set({ remotePlayers, playerNames });
  },
  
  updateRemotePlayer: (playerId, stateUpdate) => {
    const remotePlayers = new Map(get().remotePlayers);
    const player = remotePlayers.get(playerId);
    
    if (player) {
      player.state = { ...player.state, ...stateUpdate };
      player.lastUpdateTime = performance.now();
      remotePlayers.set(playerId, player);
      set({ remotePlayers });
    }
  },
  
  getRemotePlayer: (playerId) => {
    return get().remotePlayers.get(playerId);
  },
  
  setIsConnecting: (isConnecting) => set({ isConnecting }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setConnectionError: (error) => set({ connectionError: error }),
  
  updateLatency: (latency) => set({ latency }),
  
  reset: () => set({
    networkManager: null,
    isMultiplayer: false,
    isHost: false,
    roomId: null,
    myPlayerId: null,
    remotePlayers: new Map(),
    playerNames: new Map(),
    isConnecting: false,
    isConnected: false,
    connectionError: null,
    latency: 0,
    lastPingTime: 0
  })
}));