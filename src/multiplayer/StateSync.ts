/**
 * State synchronization manager
 */

import * as THREE from 'three';
import { MessageType, createMessage, type FullGameState, type PlayerInput, type NetworkMessage } from '@/network/protocol';
import { useMultiplayerStore } from './MultiplayerGameStore';
import { useGameStore } from '@/store/gameStore';
import { serializeFullGameState, applyFullGameState, serializePlayerState } from './StateSerializer';

export class StateSync {
  private lastFullStateSent: number = 0;
  private fullStateInterval: number = 100; // Send full state every 100ms (10Hz)
  private lastDeltaSent: number = 0;
  private deltaInterval: number = 16.67; // Send delta every ~16ms (60Hz)
  
  // Client-side prediction
  private predictedPosition: THREE.Vector3 = new THREE.Vector3();

  /**
   * Update state sync (called every frame on host)
   */
  updateHost(currentTime: number): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (!multiplayerStore.isHost || !multiplayerStore.networkManager) {
      return;
    }

    // Send full state periodically as backup
    if (currentTime - this.lastFullStateSent >= this.fullStateInterval) {
      this.sendFullState();
      this.lastFullStateSent = currentTime;
    }

    // Send delta updates at high frequency
    if (currentTime - this.lastDeltaSent >= this.deltaInterval) {
      this.sendDeltaUpdate();
      this.lastDeltaSent = currentTime;
    }
  }

  /**
   * Send full game state to all peers
   */
  private sendFullState(): void {
    const multiplayerStore = useMultiplayerStore.getState();
    const fullState = serializeFullGameState();

    const message = createMessage(MessageType.FULL_STATE, fullState);
    multiplayerStore.networkManager?.broadcast(message);
  }

  /**
   * Send delta state update
   */
  private sendDeltaUpdate(): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    // For now, just send player states (optimize later with deltas)
    const players = [];
    
    if (multiplayerStore.myPlayerId) {
      players.push(serializePlayerState(multiplayerStore.myPlayerId));
    }

    const message = createMessage(MessageType.DELTA_STATE, {
      timestamp: performance.now(),
      raceTime: useGameStore.getState().raceTime,
      playerUpdates: players,
      aiUpdates: [] // TODO: Add AI updates
    });

    multiplayerStore.networkManager?.broadcast(message);
  }

  /**
   * Handle incoming state update (peer only)
   */
  handleStateUpdate(message: NetworkMessage): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (multiplayerStore.isHost) {
      return; // Host doesn't receive state updates
    }

    if (message.type === MessageType.FULL_STATE) {
      const fullState = message.data as FullGameState;
      applyFullGameState(fullState);
    } else if (message.type === MessageType.DELTA_STATE) {
      // Apply delta updates
      const deltaState = message.data;
      
      // Update remote players
      if (deltaState.playerUpdates) {
        for (const playerUpdate of deltaState.playerUpdates) {
          if (playerUpdate.id !== multiplayerStore.myPlayerId) {
            multiplayerStore.updateRemotePlayer(playerUpdate.id, playerUpdate);
          }
        }
      }
    }
  }

  /**
   * Handle player input (host only)
   */
  handlePlayerInput(input: PlayerInput, senderId: string): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (!multiplayerStore.isHost) {
      return;
    }

    // Apply input to remote player's game state
    // TODO: Implement input processing for remote players
    console.log('[StateSync] Received input from', senderId, input);
  }

  /**
   * Predict local player position (client-side prediction)
   */
  predictPosition(velocity: THREE.Vector3, delta: number): THREE.Vector3 {
    this.predictedPosition.copy(velocity).multiplyScalar(delta);
    return this.predictedPosition;
  }

  /**
   * Reconcile predicted position with server state
   */
  reconcile(serverPosition: THREE.Vector3, localPosition: THREE.Vector3): THREE.Vector3 {
    // Interpolate between predicted and server position
    const interpolationFactor = 0.3; // Adjust for smoothness vs accuracy
    return localPosition.lerp(serverPosition, interpolationFactor);
  }

  /**
   * Reset sync state
   */
  reset(): void {
    this.lastFullStateSent = 0;
    this.lastDeltaSent = 0;
    this.predictedPosition.set(0, 0, 0);
  }
}