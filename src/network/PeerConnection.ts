/**
 * WebRTC Peer Connection wrapper
 */

export interface PeerConnectionCallbacks {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (data: any) => void;
}

export class PeerConnection {
  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private callbacks: PeerConnectionCallbacks = {};
  private peerId: string;
  private isInitiator: boolean;

  constructor(peerId: string, isInitiator: boolean, iceServers?: RTCIceServer[]) {
    this.peerId = peerId;
    this.isInitiator = isInitiator;

    // Use public STUN servers
    const defaultIceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];

    this.pc = new RTCPeerConnection({
      iceServers: iceServers || defaultIceServers
    });

    this.setupPeerConnection();
  }

  /**
   * Set up peer connection event handlers
   */
  private setupPeerConnection(): void {
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        // ICE candidate will be sent via signaling
        this.onIceCandidate?.(event.candidate);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log(`[Peer ${this.peerId}] ICE connection state:`, this.pc.iceConnectionState);
      
      if (this.pc.iceConnectionState === 'failed' || this.pc.iceConnectionState === 'closed') {
        this.callbacks.onClose?.();
      }
    };

    this.pc.ondatachannel = (event) => {
      console.log(`[Peer ${this.peerId}] Data channel received`);
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }

  /**
   * Set up data channel event handlers
   */
  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log(`[Peer ${this.peerId}] Data channel opened`);
      this.callbacks.onOpen?.();
    };

    this.dataChannel.onclose = () => {
      console.log(`[Peer ${this.peerId}] Data channel closed`);
      this.callbacks.onClose?.();
    };

    this.dataChannel.onerror = (error) => {
      console.error(`[Peer ${this.peerId}] Data channel error:`, error);
      this.callbacks.onError?.(new Error('Data channel error'));
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.callbacks.onMessage?.(data);
      } catch (error) {
        console.error(`[Peer ${this.peerId}] Failed to parse message:`, error);
      }
    };
  }

  /**
   * Create data channel (initiator only)
   */
  createDataChannel(label: string = 'game-data'): void {
    if (!this.isInitiator) {
      console.warn('[Peer] Only initiator should create data channel');
      return;
    }

    this.dataChannel = this.pc.createDataChannel(label, {
      ordered: false, // Allow out-of-order delivery for lower latency
      maxRetransmits: 0 // Don't retransmit, prefer fresh data
    });

    this.setupDataChannel();
  }

  /**
   * Create offer
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * Create answer
   */
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * Set remote description
   */
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(description);
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (error) {
      console.error(`[Peer ${this.peerId}] Failed to add ICE candidate:`, error);
    }
  }

  /**
   * Send data
   */
  send(data: any): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn(`[Peer ${this.peerId}] Data channel not ready`);
      return;
    }

    try {
      this.dataChannel.send(JSON.stringify(data));
    } catch (error) {
      console.error(`[Peer ${this.peerId}] Failed to send data:`, error);
    }
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: PeerConnectionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Close connection
   */
  close(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    this.pc.close();
  }

  /**
   * Get connection state
   */
  getConnectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.dataChannel?.readyState === 'open';
  }

  /**
   * ICE candidate callback (to be set externally)
   */
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
}