# Quick Start Guide

## Running the Game

### Single Player Mode
1. The game client is already running at `http://localhost:5174`
2. Click "SINGLE PLAYER" from the main menu
3. Select your ship size
4. Click "START RACE"

### Multiplayer Mode

**Prerequisites:**
- ✅ Signaling server is running on port 3001
- ✅ Game client is running on port 5174

**To Play Multiplayer:**

1. **Create a Room (Host)**
   - Click "MULTIPLAYER" from main menu
   - Enter your name
   - Click "Create Room"
   - Share the 6-character room code with friends

2. **Join a Room (Peer)**
   - Click "MULTIPLAYER" from main menu
   - Enter your name
   - Enter the room code
   - Click "Join Room"

3. **Start the Game**
   - Host clicks "Start Game" when all players are ready
   - Game begins with camera sweep animation

## Current Status

### ✅ Working
- Single player racing with AI opponents
- Multiplayer lobby system
- Real-time state synchronization
- Combat system (projectiles, damage, explosions)
- Booster collection
- Leaderboard with all players
- Latency monitoring

### ⚠️ Known Issues
- Remote players use placeholder box models (not actual ships)
- Socket.io-client requires signaling server to be running
- No reconnection support if disconnected

## Controls

- **W/↑** - Forward
- **S/↓** - Backward  
- **A/←** - Turn Left
- **D/→** - Turn Right
- **Q** - Up
- **E** - Down
- **Mouse** - Aim (when pointer locked)
- **Left Click** - Shoot
- **C** - Toggle Camera View
- **ESC** - Pause
- **Cmd+Enter** - Fullscreen

## Troubleshooting

### "Failed to connect to signaling server"
- Ensure the signaling server is running: `cd server && npm run dev`
- Server should be on port 3001

### "Room not found"
- Room codes expire when empty
- Create a new room

### Game won't load
- Check browser console for errors
- Ensure all dependencies are installed: `npm install`
- Clear browser cache and reload

### Performance issues
- Lower graphics quality in browser settings
- Close other tabs/applications
- Check FPS in top-right corner (dev mode only)

## Development

### Running Both Servers
```bash
# Terminal 1: Signaling Server
cd server
npm run dev

# Terminal 2: Game Client  
npm run dev
```

### Building for Production
```bash
npm run build
npm run preview
```

## Next Steps

See `MULTIPLAYER_STATUS.md` for detailed implementation status and `MULTIPLAYER_SETUP.md` for deployment instructions.