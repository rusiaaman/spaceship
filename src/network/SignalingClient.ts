/**
 * Signaling client for WebRTC connection setup
 */

import type { Socket } from 'socket.io-client';

export interface SignalingCallbacks {
  onPlayerJoined?: (data: { playerId: string; playerCount: number }) => void;
  onPlayerLeft?: (data: { playerId: string; wasHost: boolean; newHostId?: string }) => void;
  onWebRTCOffer?: (data: { senderId: string; offer: RTCSessionDescriptionInit }) => void;
  onWebRTCAnswer?: (data: { senderId: string; answer: RTCSessionDescriptionInit }) => void;
  onWebRTCIceCandidate?: (data: { senderId: string; candidate: RTCIceCandidateInit }) => void;
}

export class SignalingClient {
  private socket: Socket | null = null;
  private serverUrl: string;
  private callbacks: SignalingCallbacks = {};

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  /**
   * Connect to signaling server
   */
  async connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Dynamic import
        const { io } = await import('socket.io-client');
        
        if (!io) {
          throw new Error('Failed to load socket.io-client');
        }
        
        this.socket = io(this.serverUrl, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
          console.log('[Signaling] Connected to server');
          this.setupEventListeners();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('[Signaling] Connection error:', error);
          reject(error);
        });

        this.socket.on('disconnect', () => {
          console.log('[Signaling] Disconnected from server');
        });
      } catch (error) {
        console.error('[Signaling] Failed to initialize:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from signaling server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('player-joined', (data) => {
      this.callbacks.onPlayerJoined?.(data);
    });

    this.socket.on('player-left', (data) => {
      this.callbacks.onPlayerLeft?.(data);
    });

    this.socket.on('webrtc-offer', (data) => {
      this.callbacks.onWebRTCOffer?.(data);
    });

    this.socket.on('webrtc-answer', (data) => {
      this.callbacks.onWebRTCAnswer?.(data);
    });

    this.socket.on('webrtc-ice-candidate', (data) => {
      this.callbacks.onWebRTCIceCandidate?.(data);
    });
  }

  /**
   * Register callbacks
   */
  setCallbacks(callbacks: SignalingCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Create a new room
   */
  createRoom(): Promise<{ roomId: string; isHost: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to signaling server'));
        return;
      }

      this.socket.emit('create-room', (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Join an existing room
   */
  joinRoom(roomId: string): Promise<{ roomId: string; isHost: boolean; hostId: string; players: string[] }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to signaling server'));
        return;
      }

      this.socket.emit('join-room', { roomId }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Get room info
   */
  getRoomInfo(roomId: string): Promise<{ exists: boolean; playerCount?: number; hostId?: string }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to signaling server'));
        return;
      }

      this.socket.emit('get-room-info', { roomId }, (response: any) => {
        resolve(response);
      });
    });
  }

  /**
   * Send WebRTC offer
   */
  sendOffer(targetId: string, offer: RTCSessionDescriptionInit): void {
    if (!this.socket) return;
    this.socket.emit('webrtc-offer', { targetId, offer });
  }

  /**
   * Send WebRTC answer
   */
  sendAnswer(targetId: string, answer: RTCSessionDescriptionInit): void {
    if (!this.socket) return;
    this.socket.emit('webrtc-answer', { targetId, answer });
  }

  /**
   * Send ICE candidate
   */
  sendIceCandidate(targetId: string, candidate: RTCIceCandidateInit): void {
    if (!this.socket) return;
    this.socket.emit('webrtc-ice-candidate', { targetId, candidate });
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | null {
    return this.socket?.id || null;
  }
}