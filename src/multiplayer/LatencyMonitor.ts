/**
 * Latency monitoring for multiplayer
 */

import { MessageType, createMessage } from '@/network/protocol';
import { useMultiplayerStore } from './MultiplayerGameStore';

export class LatencyMonitor {
  private pingInterval: number = 2000; // Ping every 2 seconds
  private lastPingTime: number = 0;
  private pendingPings: Map<string, number> = new Map();

  /**
   * Update latency monitoring
   */
  update(currentTime: number): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (!multiplayerStore.isMultiplayer || !multiplayerStore.networkManager) {
      return;
    }

    // Send ping periodically
    if (currentTime - this.lastPingTime >= this.pingInterval) {
      this.sendPing();
      this.lastPingTime = currentTime;
    }
  }

  /**
   * Send ping to measure latency
   */
  private sendPing(): void {
    const multiplayerStore = useMultiplayerStore.getState();
    const pingId = `ping-${Date.now()}`;
    const timestamp = performance.now();

    this.pendingPings.set(pingId, timestamp);

    const message = createMessage(MessageType.PING, { pingId });
    
    if (multiplayerStore.isHost) {
      multiplayerStore.networkManager?.broadcast(message);
    } else {
      multiplayerStore.networkManager?.sendToHost(message);
    }
  }

  /**
   * Handle incoming ping (respond with pong)
   */
  handlePing(pingId: string, senderId: string): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    const message = createMessage(MessageType.PONG, { pingId });
    multiplayerStore.networkManager?.sendTo(senderId, message);
  }

  /**
   * Handle incoming pong (calculate latency)
   */
  handlePong(pingId: string): void {
    const sentTime = this.pendingPings.get(pingId);
    
    if (sentTime) {
      const latency = performance.now() - sentTime;
      const multiplayerStore = useMultiplayerStore.getState();
      multiplayerStore.updateLatency(latency);
      
      this.pendingPings.delete(pingId);
    }
  }

  /**
   * Clear pending pings
   */
  clear(): void {
    this.pendingPings.clear();
    this.lastPingTime = 0;
  }
}