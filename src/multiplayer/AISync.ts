/**
 * AI synchronization for multiplayer
 * Host manages AI, broadcasts state to peers
 */

import * as THREE from 'three';
import type { AIState } from '@/network/protocol';
import { useMultiplayerStore } from './MultiplayerGameStore';

export class AISync {
  private aiStates: Map<number, AIState> = new Map();

  /**
   * Update AI state (host only)
   */
  updateAIState(
    aiId: number,
    position: THREE.Vector3,
    rotation: THREE.Euler,
    health: number,
    maxHealth: number,
    isDestroyed: boolean,
    isInvulnerable: boolean,
    distanceToFinish: number,
    sizeClass: string
  ): void {
    const aiState: AIState = {
      id: aiId,
      position: [position.x, position.y, position.z],
      rotation: [rotation.x, rotation.y, rotation.z],
      health,
      maxHealth,
      isDestroyed,
      isInvulnerable,
      distanceToFinish,
      sizeClass
    };

    this.aiStates.set(aiId, aiState);
  }

  /**
   * Get all AI states for broadcasting
   */
  getAllAIStates(): AIState[] {
    return Array.from(this.aiStates.values());
  }

  /**
   * Apply AI states from host (peer only)
   */
  applyAIStates(aiStates: AIState[]): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (multiplayerStore.isHost) {
      return; // Host doesn't receive AI states
    }

    // Store AI states for rendering
    for (const aiState of aiStates) {
      this.aiStates.set(aiState.id, aiState);
    }
  }

  /**
   * Get AI state by ID
   */
  getAIState(aiId: number): AIState | undefined {
    return this.aiStates.get(aiId);
  }

  /**
   * Clear all AI states
   */
  clear(): void {
    this.aiStates.clear();
  }
}