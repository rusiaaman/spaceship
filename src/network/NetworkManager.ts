/**
 * Main network manager coordinating signaling and peer connections
 */

import { SignalingClient } from './SignalingClient';
import { PeerConnection } from './PeerConnection';
import type { NetworkMessage } from './protocol';

export interface NetworkManagerCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onPlayerJoined?: (playerId: string) => void;
  onPlayerLeft?: (playerId: string) => void;
  onMessage?: (message: NetworkMessage, senderId: string) => void;
  onHostMigrated?: (newHostId: string) => void;
}

export class NetworkManager {
  private signaling: SignalingClient;
  private peers: Map<string, PeerConnection> = new Map();
  private callbacks: NetworkManagerCallbacks = {};
  
  private roomId: string | null = null;
  private isHost: boolean = false;
  private myPlayerId: string | null = null;
  private hostId: string | null = null;

  constructor(signalingServerUrl?: string) {
    this.signaling = new SignalingClient(signalingServerUrl);
    this.setupSignalingCallbacks();
  }

  /**
   * Set up signaling callbacks
   */
  private setupSignalingCallbacks(): void {
    this.signaling.setCallbacks({
      onPlayerJoined: async (data) => {
        console.log('[Network] Player joined:', data.playerId);
        
        // If we're the host, initiate connection to new player
        if (this.isHost) {
          await this.connectToPeer(data.playerId, true);
        }
        
        this.callbacks.onPlayerJoined?.(data.playerId);
      },

      onPlayerLeft: (data) => {
        console.log('[Network] Player left:', data.playerId);
        
        // Close peer connection
        const peer = this.peers.get(data.playerId);
        if (peer) {
          peer.close();
          this.peers.delete(data.playerId);
        }

        // Handle host migration
        if (data.wasHost && data.newHostId) {
          this.hostId = data.newHostId;
          this.isHost = this.myPlayerId === data.newHostId;
          console.log('[Network] Host migrated to:', data.newHostId);
          this.callbacks.onHostMigrated?.(data.newHostId);
        }

        this.callbacks.onPlayerLeft?.(data.playerId);
      },

      onWebRTCOffer: async (data) => {
        console.log('[Network] Received WebRTC offer from:', data.senderId);
        await this.handleOffer(data.senderId, data.offer);
      },

      onWebRTCAnswer: async (data) => {
        console.log('[Network] Received WebRTC answer from:', data.senderId);
        await this.handleAnswer(data.senderId, data.answer);
      },

      onWebRTCIceCandidate: async (data) => {
        const peer = this.peers.get(data.senderId);
        if (peer) {
          await peer.addIceCandidate(data.candidate);
        }
      }
    });
  }

  /**
   * Connect to signaling server and create/join room
   */
  async connect(roomId?: string): Promise<{ roomId: string; isHost: boolean }> {
    await this.signaling.connect();
    this.myPlayerId = this.signaling.getSocketId();

    if (roomId) {
      // Join existing room
      const result = await this.signaling.joinRoom(roomId);
      this.roomId = result.roomId;
      this.isHost = result.isHost;
      this.hostId = result.hostId;

      // Connect to existing players (non-host only connects to host initially)
      if (!this.isHost) {
        await this.connectToPeer(result.hostId, true);
      }

      return result;
    } else {
      // Create new room
      const result = await this.signaling.createRoom();
      this.roomId = result.roomId;
      this.isHost = result.isHost;
      this.hostId = this.myPlayerId;

      return result;
    }
  }

  /**
   * Connect to a peer
   */
  private async connectToPeer(peerId: string, isInitiator: boolean): Promise<void> {
    const peer = new PeerConnection(peerId, isInitiator);
    
    peer.setCallbacks({
      onOpen: () => {
        console.log('[Network] Connected to peer:', peerId);
        this.callbacks.onConnected?.();
      },
      onClose: () => {
        console.log('[Network] Disconnected from peer:', peerId);
        this.peers.delete(peerId);
        this.callbacks.onDisconnected?.();
      },
      onError: (error) => {
        console.error('[Network] Peer error:', error);
      },
      onMessage: (data) => {
        this.callbacks.onMessage?.(data, peerId);
      }
    });

    // Handle ICE candidates
    peer.onIceCandidate = (candidate) => {
      this.signaling.sendIceCandidate(peerId, candidate.toJSON());
    };

    this.peers.set(peerId, peer);

    if (isInitiator) {
      peer.createDataChannel();
      const offer = await peer.createOffer();
      this.signaling.sendOffer(peerId, offer);
    }
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(senderId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    let peer = this.peers.get(senderId);
    
    if (!peer) {
      peer = new PeerConnection(senderId, false);
      
      peer.setCallbacks({
        onOpen: () => {
          console.log('[Network] Connected to peer:', senderId);
          this.callbacks.onConnected?.();
        },
        onClose: () => {
          console.log('[Network] Disconnected from peer:', senderId);
          this.peers.delete(senderId);
          this.callbacks.onDisconnected?.();
        },
        onMessage: (data) => {
          this.callbacks.onMessage?.(data, senderId);
        }
      });

      peer.onIceCandidate = (candidate) => {
        this.signaling.sendIceCandidate(senderId, candidate.toJSON());
      };

      this.peers.set(senderId, peer);
    }

    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    this.signaling.sendAnswer(senderId, answer);
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(senderId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(senderId);
    if (peer) {
      await peer.setRemoteDescription(answer);
    }
  }

  /**
   * Broadcast message to all peers
   */
  broadcast(message: NetworkMessage): void {
    for (const peer of this.peers.values()) {
      peer.send(message);
    }
  }

  /**
   * Send message to specific peer
   */
  sendTo(peerId: string, message: NetworkMessage): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.send(message);
    }
  }

  /**
   * Send message to host
   */
  sendToHost(message: NetworkMessage): void {
    if (this.hostId && !this.isHost) {
      this.sendTo(this.hostId, message);
    }
  }

  /**
   * Disconnect from all peers and signaling server
   */
  disconnect(): void {
    for (const peer of this.peers.values()) {
      peer.close();
    }
    this.peers.clear();
    this.signaling.disconnect();
    
    this.roomId = null;
    this.isHost = false;
    this.myPlayerId = null;
    this.hostId = null;
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: NetworkManagerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get room ID
   */
  getRoomId(): string | null {
    return this.roomId;
  }

  /**
   * Check if this client is the host
   */
  getIsHost(): boolean {
    return this.isHost;
  }

  /**
   * Get player ID
   */
  getPlayerId(): string | null {
    return this.myPlayerId;
  }

  /**
   * Get connected peer count
   */
  getPeerCount(): number {
    return this.peers.size;
  }

  /**
   * Check if connected to any peers
   */
  isConnected(): boolean {
    for (const peer of this.peers.values()) {
      if (peer.isConnected()) {
        return true;
      }
    }
    return false;
  }
}