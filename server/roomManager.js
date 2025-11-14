/**
 * Room Manager for multiplayer lobbies
 */

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Generate a short, memorable room code
   */
  generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars
    let roomId = '';
    for (let i = 0; i < 6; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Ensure uniqueness
    if (this.rooms.has(roomId)) {
      return this.generateRoomId();
    }
    
    return roomId;
  }

  /**
   * Create a new room
   */
  createRoom(hostId) {
    const roomId = this.generateRoomId();
    this.rooms.set(roomId, {
      id: roomId,
      hostId,
      players: [hostId],
      createdAt: Date.now()
    });
    return roomId;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * Add player to room
   */
  addPlayerToRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (room && !room.players.includes(playerId)) {
      room.players.push(playerId);
    }
  }

  /**
   * Remove player from room
   */
  removePlayerFromRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter(id => id !== playerId);

    // Host migration if host left
    if (room.hostId === playerId && room.players.length > 0) {
      room.hostId = room.players[0];
      console.log(`[${new Date().toISOString()}] Host migrated to ${room.hostId} in room ${roomId}`);
    }
  }

  /**
   * Find room by player ID
   */
  findRoomByPlayer(playerId) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.includes(playerId)) {
        return roomId;
      }
    }
    return null;
  }

  /**
   * Delete room
   */
  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }

  /**
   * Get total room count
   */
  getRoomCount() {
    return this.rooms.size;
  }

  /**
   * Clean up old empty rooms (run periodically)
   */
  cleanupOldRooms(maxAgeMs = 3600000) { // 1 hour default
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.length === 0 && now - room.createdAt > maxAgeMs) {
        this.deleteRoom(roomId);
      }
    }
  }
}