const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Store player data: { id, x, y, socket }
const players = {};

// PROXIMITY SETTINGS - Adjust this to control chat distance
const CHAT_PROXIMITY_DISTANCE = 250;  // Pixels

// Calculate Euclidean distance between two points
function getDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Get all players within proximity distance
function getPlayersInRange(senderId, distance) {
  const sender = players[senderId];
  if (!sender) return [];
  
  return Object.keys(players)
    .filter(id => {
      if (id === senderId) return false;
      const player = players[id];
      return getDistance(sender.x, sender.y, player.x, player.y) <= distance;
    });
}

io.on('connection', (socket) => {
  console.log(`✅ Player connected: ${socket.id}`);
  
  // FIXED: Spawn at BOTTOM CENTER (walkable area near fountain)
  players[socket.id] = {
    id: socket.id,
    x: 960,   // Horizontal center
    y: 900,   // Bottom area (on walkable ground, not on buildings)
    socket: socket
  };
  
  // Send initialization data to new player
  const playerList = Object.keys(players).map(id => ({
    id,
    x: players[id].x,
    y: players[id].y
  }));
  
  socket.emit('init', {
    playerId: socket.id,
    players: playerList
  });
  
  console.log(`📤 Sent init to ${socket.id}:`, { playerId: socket.id, players: playerList });
  
  // Notify other players
  socket.broadcast.emit('playerJoined', {
    id: socket.id,
    x: players[socket.id].x,
    y: players[socket.id].y
  });
  
  // Handle player movement
  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      
      // Broadcast to all players
      io.emit('playerMoved', {
        id: socket.id,
        x: data.x,
        y: data.y
      });
    }
  });
  
  // Handle PROXIMITY-BASED chat messages
  socket.on('chatMessage', (data) => {
    const sender = players[socket.id];
    if (!sender) return;
    
    // Get players within proximity
    const nearbyPlayerIds = getPlayersInRange(socket.id, CHAT_PROXIMITY_DISTANCE);
    
    const chatData = {
      senderId: socket.id,
      message: data.message,
      x: sender.x,
      y: sender.y
    };
    
    // Send to sender (self)
    socket.emit('chatMessage', chatData);
    
    // Send only to nearby players
    nearbyPlayerIds.forEach(playerId => {
      if (players[playerId] && players[playerId].socket) {
        players[playerId].socket.emit('chatMessage', chatData);
      }
    });
    
    console.log(`💬 Proximity chat from ${socket.id.substring(0, 6)}: "${data.message}" to ${nearbyPlayerIds.length} nearby players`);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
