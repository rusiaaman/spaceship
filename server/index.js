/**
 * Signaling Server for WebRTC P2P Multiplayer
 * Lightweight server for initial connection handshake only
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './roomManager.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: roomManager.getRoomCount() });
});

io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Client connected: ${socket.id}`);

  // Create a new room
  socket.on('create-room', (callback) => {
    const roomId = roomManager.createRoom(socket.id);
    socket.join(roomId);
    console.log(`[${new Date().toISOString()}] Room created: ${roomId} by ${socket.id}`);
    callback({ roomId, isHost: true });
  });

  // Join an existing room
  socket.on('join-room', ({ roomId }, callback) => {
    const room = roomManager.getRoom(roomId);
    
    if (!room) {
      callback({ error: 'Room not found' });
      return;
    }

    if (room.players.length >= 8) {
      callback({ error: 'Room is full' });
      return;
    }

    roomManager.addPlayerToRoom(roomId, socket.id);
    socket.join(roomId);

    // Notify existing players about new player
    socket.to(roomId).emit('player-joined', {
      playerId: socket.id,
      playerCount: room.players.length
    });

    console.log(`[${new Date().toISOString()}] Player ${socket.id} joined room ${roomId}`);
    callback({ 
      roomId, 
      isHost: false,
      hostId: room.hostId,
      players: room.players
    });
  });

  // WebRTC signaling: forward offer
  socket.on('webrtc-offer', ({ targetId, offer }) => {
    console.log(`[${new Date().toISOString()}] Forwarding offer from ${socket.id} to ${targetId}`);
    io.to(targetId).emit('webrtc-offer', {
      senderId: socket.id,
      offer
    });
  });

  // WebRTC signaling: forward answer
  socket.on('webrtc-answer', ({ targetId, answer }) => {
    console.log(`[${new Date().toISOString()}] Forwarding answer from ${socket.id} to ${targetId}`);
    io.to(targetId).emit('webrtc-answer', {
      senderId: socket.id,
      answer
    });
  });

  // WebRTC signaling: forward ICE candidate
  socket.on('webrtc-ice-candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('webrtc-ice-candidate', {
      senderId: socket.id,
      candidate
    });
  });

  // Get room info
  socket.on('get-room-info', ({ roomId }, callback) => {
    const room = roomManager.getRoom(roomId);
    if (room) {
      callback({ 
        exists: true,
        playerCount: room.players.length,
        hostId: room.hostId
      });
    } else {
      callback({ exists: false });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[${new Date().toISOString()}] Client disconnected: ${socket.id}`);
    
    const roomId = roomManager.findRoomByPlayer(socket.id);
    if (roomId) {
      const room = roomManager.getRoom(roomId);
      const wasHost = room?.hostId === socket.id;
      
      roomManager.removePlayerFromRoom(roomId, socket.id);
      
      // Notify other players
      socket.to(roomId).emit('player-left', {
        playerId: socket.id,
        wasHost,
        newHostId: room?.hostId // May be different if host migrated
      });

      // Clean up empty rooms
      if (room && room.players.length === 0) {
        roomManager.deleteRoom(roomId);
        console.log(`[${new Date().toISOString()}] Room ${roomId} deleted (empty)`);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Signaling server running on port ${PORT}`);
});