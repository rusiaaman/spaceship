/**
 * Input manager for capturing and sending player inputs
 */

import type { PlayerInput } from '@/network/protocol';
import { MessageType, createMessage } from '@/network/protocol';
import { useMultiplayerStore } from './MultiplayerGameStore';

export class InputManager {
  private sequenceNumber: number = 0;
  private inputBuffer: PlayerInput[] = [];
  private maxBufferSize: number = 60; // 1 second at 60fps

  /**
   * Capture current input state
   */
  captureInput(controls: {
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
  }): PlayerInput {
    const multiplayerStore = useMultiplayerStore.getState();
    const playerId = multiplayerStore.myPlayerId || 'unknown';

    const input: PlayerInput = {
      playerId,
      timestamp: performance.now(),
      forward: controls.forward,
      backward: controls.backward,
      left: controls.left,
      right: controls.right,
      up: controls.up,
      down: controls.down,
      shoot: controls.shoot,
      boost: controls.boost,
      brake: controls.brake,
      toggleCamera: controls.toggleCamera,
      sequenceNumber: this.sequenceNumber++
    };

    // Store in buffer for reconciliation
    this.inputBuffer.push(input);
    if (this.inputBuffer.length > this.maxBufferSize) {
      this.inputBuffer.shift();
    }

    return input;
  }

  /**
   * Send input to host
   */
  sendInput(input: PlayerInput): void {
    const multiplayerStore = useMultiplayerStore.getState();
    const networkManager = multiplayerStore.networkManager;

    if (!networkManager || multiplayerStore.isHost) {
      return; // Host doesn't send inputs to itself
    }

    const message = createMessage(MessageType.PLAYER_INPUT, input);
    networkManager.sendToHost(message);
  }

  /**
   * Get input by sequence number (for reconciliation)
   */
  getInputBySequence(sequenceNumber: number): PlayerInput | undefined {
    return this.inputBuffer.find(input => input.sequenceNumber === sequenceNumber);
  }

  /**
   * Clear inputs up to sequence number (after reconciliation)
   */
  clearInputsUpTo(sequenceNumber: number): void {
    this.inputBuffer = this.inputBuffer.filter(
      input => input.sequenceNumber > sequenceNumber
    );
  }

  /**
   * Get all inputs after sequence number
   */
  getInputsAfter(sequenceNumber: number): PlayerInput[] {
    return this.inputBuffer.filter(
      input => input.sequenceNumber > sequenceNumber
    );
  }

  /**
   * Clear all buffered inputs
   */
  clear(): void {
    this.inputBuffer = [];
    this.sequenceNumber = 0;
  }
}