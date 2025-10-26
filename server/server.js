// Main server: Express HTTP + Socket.io WebSocket layer
// Architecture: Event-driven (Node.js event loop handles async I/O)
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const gameState = require('./gameState');
const proximityManager = require('./proximityManager');
const config = require('./config');

// Express app setup
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files (HTML, JS, assets)
app.use(express.static(path.join(__dirname, '../client')));

// WebSocket connection handler
// Event: 'connection' fires when client connects
// Socket represents bi-directional communication channel
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Add player to game state (HashMap insertion)
  const player = gameState.addPlayer(socket.id);
  
  // Send current game state to new player only
  // This is a unicast message (one recipient)
  socket.emit('init', {
    playerId: socket.id,
    players: gameState.getAllPlayers()
  });
  
  // Broadcast new player to all OTHER clients
  // socket.broadcast = everyone except sender
  // This is a multicast message (many recipients, excluding sender)
  socket.broadcast.emit('playerJoined', player);

  // Handle player movement
  // Event-driven: fires when client sends 'move' event
  socket.on('move', (data) => {
    // Update HashMap with new position
    gameState.updatePlayer(socket.id, data.x, data.y);
    
    // Delta broadcast: only send changed data
    // Optimization: don't send full game state, just the delta
    io.emit('playerMoved', {
      id: socket.id,
      x: data.x,
      y: data.y
    });
  });

  // Handle proximity chat
  // Algorithm: Filter recipients by distance, then unicast to each
  socket.on('chatMessage', (data) => {
    const sender = gameState.getPlayer(socket.id);
    
    if (!sender) return;
    
    // Get players within Euclidean distance threshold
    // Time complexity: O(n) where n = total players
    const nearbySocketIds = proximityManager.getNearbySocketIds(
      socket.id,
      { x: sender.x, y: sender.y },
      gameState
    );
    
    // Unicast to each nearby player
    // Why not broadcast? Because we need selective recipients
    // This is targeted multicast
    nearbySocketIds.forEach(recipientId => {
      io.to(recipientId).emit('chatMessage', {
        senderId: socket.id,
        message: data.message,
        timestamp: Date.now()
      });
    });
    
    // Echo back to sender for confirmation
    socket.emit('chatMessage', {
      senderId: socket.id,
      message: data.message,
      timestamp: Date.now()
    });
  });

  // Handle disconnect
  // Event: 'disconnect' fires when client loses connection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    // Remove from HashMap
    gameState.removePlayer(socket.id);
    
    // Broadcast removal to all clients
    io.emit('playerLeft', socket.id);
  });
});

// Server tick loop (optional - for server-side simulation)
// This is like a game loop but on server
// setInterval creates periodic callback (event-driven timing)
setInterval(() => {
  // Future: Add NPC movement, collision detection, etc.
  // Current: Delta updates already sent on player actions
}, 1000 / config.SERVER_TICK_RATE);

server.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});
