# Spaceship Multiplayer Signaling Server

This is a lightweight WebRTC signaling server for the Spaceship multiplayer game. It handles initial connection handshakes between peers but does NOT relay game data (that's done via WebRTC data channels).

## Setup

```bash
cd server
npm install
```

## Running

### Development (with auto-reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

The server runs on port 3001 by default. You can change this with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `CLIENT_URL` - Client URL for CORS (default: http://localhost:5173)

## Deployment

This server can be deployed to any Node.js hosting platform:

- **Heroku**: `git push heroku main`
- **Railway**: Connect your GitHub repo
- **Render**: Connect your GitHub repo
- **DigitalOcean App Platform**: Connect your GitHub repo
- **AWS/GCP/Azure**: Deploy as a container or serverless function

Make sure to set the `CLIENT_URL` environment variable to your production client URL.

## API

The server uses Socket.io for real-time communication. See `index.js` for available events:

- `create-room` - Create a new multiplayer room
- `join-room` - Join an existing room
- `webrtc-offer` - Forward WebRTC offer
- `webrtc-answer` - Forward WebRTC answer
- `webrtc-ice-candidate` - Forward ICE candidate

## Health Check

```bash
curl http://localhost:3001/health
```