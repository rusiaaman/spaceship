# Multiplayer Setup Guide

This guide explains how to set up and run the multiplayer functionality for the Spaceship racing game.

## Architecture

The multiplayer system uses a **peer-to-peer (P2P) architecture** with WebRTC:

- **Signaling Server**: Lightweight Node.js server for initial connection handshake
- **WebRTC Data Channels**: Direct peer-to-peer connections for game data
- **Host-based Authority**: One player acts as the authoritative host

```
Player 1 (Host) ←→ Signaling Server ←→ Player 2 (Peer)
       ↓                                      ↓
       └──────── WebRTC Direct P2P ──────────┘
```

## Quick Start

### 1. Start the Signaling Server

```bash
cd server
npm install
npm run dev
```

The server will run on `http://localhost:3001`

### 2. Start the Game Client

In a separate terminal:

```bash
npm run dev
```

The game will run on `http://localhost:5173`

### 3. Play Multiplayer

1. Open the game in your browser
2. Click "MULTIPLAYER" from the main menu
3. Enter your name
4. Click "Create Room" to host a game
5. Share the 6-character room code with friends
6. Friends can join by clicking "Join Room" and entering the code
7. Once everyone is in the lobby, the host clicks "Start Game"

## Testing Locally

To test multiplayer on a single machine:

1. Start the signaling server and game client (see Quick Start)
2. Open `http://localhost:5173` in multiple browser windows/tabs
3. Create a room in one window
4. Join the room from other windows using the room code

**Note**: Use different browser profiles or incognito windows to simulate different users.

## Network Configuration

### Default Ports

- **Game Client**: 5173 (Vite dev server)
- **Signaling Server**: 3001

### Firewall Settings

For local network play, ensure these ports are open:

- TCP 3001 (signaling server)
- UDP 49152-65535 (WebRTC data channels)

### Playing Over Internet

To play with friends over the internet:

1. **Deploy the signaling server** to a cloud platform (see Deployment section)
2. **Update the client** to use the deployed server URL
3. **Use STUN/TURN servers** for NAT traversal (already configured with Google's public STUN servers)

## Deployment

### Signaling Server Deployment

The signaling server can be deployed to any Node.js hosting platform:

#### Option 1: Railway (Recommended - Free Tier Available)

1. Create account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set root directory to `/server`
5. Railway will auto-detect and deploy

#### Option 2: Render

1. Create account at [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your repository
4. Set:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`

#### Option 3: Heroku

```bash
cd server
heroku create your-app-name
git push heroku main
```

### Update Client Configuration

After deploying the signaling server, update the client to use the production URL:

In `src/network/SignalingClient.ts`, change the default URL:

```typescript
constructor(serverUrl: string = 'https://your-server.railway.app') {
```

Or pass it when creating the NetworkManager in `LobbyMenu.tsx`.

## Troubleshooting

### Connection Issues

**Problem**: "Failed to connect to signaling server"
- **Solution**: Ensure the signaling server is running and accessible
- Check browser console for CORS errors
- Verify the server URL is correct

**Problem**: "Room not found"
- **Solution**: Room codes are case-sensitive and expire when empty
- Create a new room if the old one was closed

**Problem**: WebRTC connection fails
- **Solution**: Check firewall settings
- Ensure STUN servers are accessible
- For restrictive networks, you may need a TURN server

### Performance Issues

**Problem**: High latency (>200ms)
- **Solution**: This is expected for long-distance connections
- The game uses client-side prediction to compensate
- Consider using a TURN server closer to players

**Problem**: Desync between players
- **Solution**: The host's game state is authoritative
- Peers will reconcile their state with the host periodically
- If severe, try reconnecting

### Browser Compatibility

Supported browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari 15.4+

WebRTC features may not work in older browsers.

## Advanced Configuration

### Custom STUN/TURN Servers

Edit `src/network/PeerConnection.ts`:

```typescript
const customIceServers: RTCIceServer[] = [
  { urls: 'stun:stun.your-server.com:3478' },
  { 
    urls: 'turn:turn.your-server.com:3478',
    username: 'user',
    credential: 'pass'
  }
];
```

### Adjusting Network Parameters

In `src/network/protocol.ts`, you can adjust:

- Message frequency (default: 60Hz)
- State snapshot interval (default: 10Hz)
- Latency compensation settings

## Development

### Running Tests

```bash
# Test signaling server
cd server
npm test  # (tests not yet implemented)

# Test client
npm test  # (tests not yet implemented)
```

### Debugging

Enable verbose logging:

```typescript
// In NetworkManager.ts
console.log('[Network]', ...);  // Already enabled
```

Check browser DevTools → Network tab for WebSocket connections.

## Current Limitations

- Maximum 8 players per room
- Host migration is basic (first remaining player becomes host)
- No spectator mode
- No reconnection after disconnect during race
- No anti-cheat measures (host is trusted)

## Roadmap

Future improvements:
- [ ] Dedicated server option (instead of P2P)
- [ ] Reconnection support
- [ ] Spectator mode
- [ ] Replay system
- [ ] Global leaderboards
- [ ] Matchmaking
- [ ] Voice chat integration

## Support

For issues or questions:
1. Check this guide
2. Review console logs
3. Check GitHub issues
4. Create a new issue with logs and reproduction steps