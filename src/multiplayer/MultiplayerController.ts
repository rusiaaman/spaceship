/**
 * Main multiplayer controller coordinating all multiplayer systems
 */

import { MessageType, createMessage, type NetworkMessage } from '@/network/protocol';
import { useMultiplayerStore } from './MultiplayerGameStore';
import { useGameStore } from '@/store/gameStore';
import { InputManager } from './InputManager';
import { StateSync } from './StateSync';
import { CombatSync } from './CombatSync';
import { AISync } from './AISync';
import { LatencyMonitor } from './LatencyMonitor';

export class MultiplayerController {
  private inputManager: InputManager;
  private stateSync: StateSync;
  private combatSync: CombatSync;
  private aiSync: AISync;
  private latencyMonitor: LatencyMonitor;
  private isInitialized: boolean = false;

  constructor() {
    this.inputManager = new InputManager();
    this.stateSync = new StateSync();
    this.combatSync = new CombatSync();
    this.aiSync = new AISync();
    this.latencyMonitor = new LatencyMonitor();
  }

  /**
   * Initialize multiplayer systems
   */
  initialize(): void {
    if (this.isInitialized) return;

    const multiplayerStore = useMultiplayerStore.getState();
    const networkManager = multiplayerStore.networkManager;

    if (!networkManager) {
      console.error('[Multiplayer] Cannot initialize without network manager');
      return;
    }

    // Set up message handlers
    networkManager.setCallbacks({
      ...networkManager['callbacks'], // Preserve existing callbacks
      onMessage: (message: NetworkMessage, senderId: string) => {
        this.handleMessage(message, senderId);
      }
    });

    this.isInitialized = true;
    console.log('[Multiplayer] Controller initialized');
  }

  /**
   * Update multiplayer systems (called every frame)
   */
  update(_delta: number, controls?: any): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (!multiplayerStore.isMultiplayer || !this.isInitialized) {
      return;
    }

    const currentTime = performance.now();

    // Host: Send state updates
    if (multiplayerStore.isHost) {
      this.stateSync.updateHost(currentTime);
    }

    // Peer: Send inputs to host
    if (!multiplayerStore.isHost && controls) {
      const input = this.inputManager.captureInput(controls);
      this.inputManager.sendInput(input);
    }

    // Update latency monitoring
    this.latencyMonitor.update(currentTime);
  }

  /**
   * Handle incoming network messages
   */
  private handleMessage(message: NetworkMessage, senderId: string): void {
    switch (message.type) {
      case MessageType.PLAYER_INPUT:
        this.stateSync.handlePlayerInput(message.data, senderId);
        break;

      case MessageType.FULL_STATE:
      case MessageType.DELTA_STATE:
        this.stateSync.handleStateUpdate(message);
        break;

      case MessageType.GAME_START:
        this.handleGameStart(message.data);
        break;

      case MessageType.PROJECTILE_FIRED:
        this.combatSync.handleProjectileFired(message.data);
        break;

      case MessageType.SHIP_DAMAGED:
        this.combatSync.handleShipDamaged(message.data);
        break;

      case MessageType.SHIP_DESTROYED:
        this.combatSync.handleShipDestroyed(message.data);
        break;

      case MessageType.BOOSTER_COLLECTED:
        this.handleBoosterCollected(message.data);
        break;

      case MessageType.PLAYER_FINISHED:
        this.handlePlayerFinished(message.data);
        break;

      case MessageType.PING:
        this.latencyMonitor.handlePing(message.data.pingId, senderId);
        break;

      case MessageType.PONG:
        this.latencyMonitor.handlePong(message.data.pingId);
        break;

      default:
        console.warn('[Multiplayer] Unhandled message type:', message.type);
    }
  }

  /**
   * Handle game start message
   */
  private handleGameStart(_data: any): void {
    const gameStore = useGameStore.getState();
    gameStore.setGameState('camera-sweep');
    console.log('[Multiplayer] Game started by host');
  }


  /**
   * Handle booster collected
   */
  private handleBoosterCollected(data: any): void {
    const multiplayerStore = useMultiplayerStore.getState();
    const gameStore = useGameStore.getState();

    if (data.playerId === multiplayerStore.myPlayerId) {
      // Local player collected booster
      gameStore.activateBoost(3); // 3 second boost
      gameStore.refillAmmo();
    } else {
      // Remote player collected booster
      multiplayerStore.updateRemotePlayer(data.playerId, {
        isBoosting: true
      });
    }
  }

  /**
   * Handle player finished
   */
  private handlePlayerFinished(data: any): void {
    const multiplayerStore = useMultiplayerStore.getState();

    if (data.playerId !== multiplayerStore.myPlayerId) {
      multiplayerStore.updateRemotePlayer(data.playerId, {
        finishTime: data.finishTime,
        racePosition: data.position
      });
    }
  }

  /**
   * Broadcast booster collected (host only)
   */
  broadcastBoosterCollected(playerId: string, boosterId: number): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (!multiplayerStore.isHost) {
      return;
    }

    const message = createMessage(MessageType.BOOSTER_COLLECTED, {
      playerId,
      boosterId,
      timestamp: performance.now()
    });

    multiplayerStore.networkManager?.broadcast(message);
  }

  /**
   * Broadcast player finished (host only)
   */
  broadcastPlayerFinished(playerId: string, finishTime: number, position: number): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (!multiplayerStore.isHost) {
      return;
    }

    const message = createMessage(MessageType.PLAYER_FINISHED, {
      playerId,
      finishTime,
      position,
      timestamp: performance.now()
    });

    multiplayerStore.networkManager?.broadcast(message);
  }

  /**
   * Broadcast game start (host only)
   */
  broadcastGameStart(): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (!multiplayerStore.isHost) {
      console.warn('[Multiplayer] Only host can start game');
      return;
    }

    const message = {
      type: MessageType.GAME_START,
      data: { timestamp: performance.now() },
      timestamp: performance.now()
    };

    multiplayerStore.networkManager?.broadcast(message);
    console.log('[Multiplayer] Broadcasted game start');
  }

  /**
   * Clean up multiplayer systems
   */
  cleanup(): void {
    this.inputManager.clear();
    this.stateSync.reset();
    this.aiSync.clear();
    this.latencyMonitor.clear();
    this.isInitialized = false;
    console.log('[Multiplayer] Controller cleaned up');
  }

  /**
   * Get input manager
   */
  getInputManager(): InputManager {
    return this.inputManager;
  }

  /**
   * Get state sync
   */
  getStateSync(): StateSync {
    return this.stateSync;
  }

  /**
   * Get combat sync
   */
  getCombatSync(): CombatSync {
    return this.combatSync;
  }

  /**
   * Get AI sync
   */
  getAISync(): AISync {
    return this.aiSync;
  }
}

// Singleton instance
let multiplayerController: MultiplayerController | null = null;

export function getMultiplayerController(): MultiplayerController {
  if (!multiplayerController) {
    multiplayerController = new MultiplayerController();
  }
  return multiplayerController;
}