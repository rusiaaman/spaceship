/**
 * Combat synchronization for multiplayer
 */

import * as THREE from 'three';
import { MessageType, createMessage, type ProjectileFiredEvent, type ShipDamagedEvent, type ShipDestroyedEvent } from '@/network/protocol';
import { useMultiplayerStore } from './MultiplayerGameStore';
import { useGameStore } from '@/store/gameStore';
import { soundManager } from '@/utils/soundManager';

export class CombatSync {
  /**
   * Broadcast projectile fired (host only)
   */
  broadcastProjectileFired(
    projectileId: string,
    ownerId: string,
    position: THREE.Vector3,
    direction: THREE.Vector3
  ): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (!multiplayerStore.isHost) {
      return;
    }

    const event: ProjectileFiredEvent = {
      projectileId,
      ownerId,
      position: [position.x, position.y, position.z],
      direction: [direction.x, direction.y, direction.z],
      timestamp: performance.now()
    };

    const message = createMessage(MessageType.PROJECTILE_FIRED, event);
    multiplayerStore.networkManager?.broadcast(message);
  }

  /**
   * Handle incoming projectile fired event (peer only)
   */
  handleProjectileFired(event: ProjectileFiredEvent): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (multiplayerStore.isHost) {
      return; // Host doesn't receive projectile events
    }

    const gameStore = useGameStore.getState();
    const position = new THREE.Vector3(event.position[0], event.position[1], event.position[2]);
    const direction = new THREE.Vector3(event.direction[0], event.direction[1], event.direction[2]);

    // Spawn projectile locally
    const isPlayerOwned = event.ownerId === multiplayerStore.myPlayerId;
    gameStore.fireProjectile(position, direction, isPlayerOwned);
    
    if (!isPlayerOwned) {
      soundManager.playSound('weapon-fire');
    }
  }

  /**
   * Broadcast ship damaged (host only)
   */
  broadcastShipDamaged(targetId: string, damage: number, newHealth: number): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (!multiplayerStore.isHost) {
      return;
    }

    const event: ShipDamagedEvent = {
      targetId,
      damage,
      newHealth,
      timestamp: performance.now()
    };

    const message = createMessage(MessageType.SHIP_DAMAGED, event);
    multiplayerStore.networkManager?.broadcast(message);
  }

  /**
   * Handle incoming ship damaged event (peer only)
   */
  handleShipDamaged(event: ShipDamagedEvent): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (multiplayerStore.isHost) {
      return;
    }

    // Apply damage to local game state
    if (event.targetId === multiplayerStore.myPlayerId) {
      // Damage to local player
      const gameStore = useGameStore.getState();
      gameStore.damageShip('player', event.damage);
      soundManager.playSound('ship-damage');
    } else if (event.targetId.startsWith('ai-')) {
      // Damage to AI ship
      const aiId = parseInt(event.targetId.split('-')[1]);
      const gameStore = useGameStore.getState();
      gameStore.damageShip(aiId, event.damage);
    } else {
      // Damage to remote player - update their state
      multiplayerStore.updateRemotePlayer(event.targetId, {
        health: event.newHealth
      });
    }
  }

  /**
   * Broadcast ship destroyed (host only)
   */
  broadcastShipDestroyed(targetId: string, killerId: string): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (!multiplayerStore.isHost) {
      return;
    }

    const event: ShipDestroyedEvent = {
      targetId,
      killerId,
      timestamp: performance.now()
    };

    const message = createMessage(MessageType.SHIP_DESTROYED, event);
    multiplayerStore.networkManager?.broadcast(message);
  }

  /**
   * Handle incoming ship destroyed event (peer only)
   */
  handleShipDestroyed(event: ShipDestroyedEvent): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (multiplayerStore.isHost) {
      return;
    }

    soundManager.playSound('explosion');

    if (event.targetId === multiplayerStore.myPlayerId) {
      // Local player destroyed
      const gameStore = useGameStore.getState();
      gameStore.damageShip('player', 999); // Force destruction
    } else if (event.targetId.startsWith('ai-')) {
      // AI ship destroyed
      const aiId = parseInt(event.targetId.split('-')[1]);
      const gameStore = useGameStore.getState();
      gameStore.damageShip(aiId, 999);
    } else {
      // Remote player destroyed
      multiplayerStore.updateRemotePlayer(event.targetId, {
        health: 0,
        isRespawning: true
      });
    }
  }

  /**
   * Handle projectile hit on host
   */
  handleProjectileHit(_projectileId: string, targetId: string | number, damage: number): void {
    const multiplayerStore = useMultiplayerStore.getState();
    
    if (!multiplayerStore.isHost) {
      return;
    }

    const gameStore = useGameStore.getState();
    
    // Apply damage locally
    if (typeof targetId === 'number' || targetId === 'player') {
      gameStore.damageShip(targetId, damage);
    }
    
    // Get new health
    let newHealth = 0;
    let targetIdStr = '';
    
    if (targetId === 'player') {
      newHealth = gameStore.playerHealth;
      targetIdStr = multiplayerStore.myPlayerId || 'player';
    } else if (typeof targetId === 'number') {
      newHealth = gameStore.getAIHealth(targetId);
      targetIdStr = `ai-${targetId}`;
    }

    // Broadcast damage
    this.broadcastShipDamaged(targetIdStr, damage, newHealth);

    // Check if destroyed
    if (newHealth <= 0) {
      // TODO: Get killer ID from projectile owner
      this.broadcastShipDestroyed(targetIdStr, 'unknown');
    }

    soundManager.playSound('hit');
  }
}