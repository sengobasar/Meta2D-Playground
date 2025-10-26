// Phaser game configuration
// Phaser uses Component pattern: game objects have behaviors
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

// Socket.io client connection
// WebSocket: full-duplex TCP connection for real-time bidirectional data
const socket = io();

// Data structures for client-side game state
let players = {};  // HashMap: { playerId: spriteObject }
let myPlayerId = null;

function preload() {
  // Load assets (sprites, etc.)
  // For now, using Phaser built-in shapes
}

function create() {
  // Initialize game scene
  
  // Socket event: receive initial game state
  // This is a one-time snapshot on connection
  socket.on('init', (data) => {
    myPlayerId = data.playerId;
    
    // Populate initial players - O(n) loop
    data.players.forEach(player => {
      if (player.id !== myPlayerId) {
        addPlayer(player);
      }
    });
    
    // Create controllable player (self)
    players[myPlayerId] = this.add.circle(data.players.find(p => p.id === myPlayerId).x, 
                                           data.players.find(p => p.id === myPlayerId).y, 
                                           20, 0x00ff00);
  });
  
  // Socket event: another player joined
  socket.on('playerJoined', (player) => {
    addPlayer(player);
  });
  
  // Socket event: delta update for player movement
  // This is O(1) because we directly access players HashMap
  socket.on('playerMoved', (data) => {
    if (players[data.id]) {
      // Update sprite position (rendering layer)
      players[data.id].x = data.x;
      players[data.id].y = data.y;
    }
  });
  
  // Socket event: player left
  socket.on('playerLeft', (playerId) => {
    if (players[playerId]) {
      players[playerId].destroy(); // Remove from Phaser scene
      delete players[playerId];    // Remove from HashMap
    }
  });
  
  // Socket event: receive proximity chat message
  socket.on('chatMessage', (data) => {
    displayChatMessage(`Player ${data.senderId.substring(0, 4)}: ${data.message}`);
  });
  
  // Input handling: keyboard
  this.cursors = this.input.keyboard.createCursorKeys();
  
  // Input handling: chat
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const message = e.target.value;
      if (message.trim()) {
        // Send chat to server
        socket.emit('chatMessage', { message });
        e.target.value = '';
      }
    }
  });
}

function update() {
  // Game loop: runs at ~60 FPS (Phaser default)
  // This is the "render loop" - update then draw
  
  if (!myPlayerId || !players[myPlayerId]) return;
  
  const player = players[myPlayerId];
  let moved = false;
  
  // Input polling: check keyboard state each frame
  // This is O(1) constant time check
  if (this.cursors.left.isDown) {
    player.x -= 3;
    moved = true;
  }
  if (this.cursors.right.isDown) {
    player.x += 3;
    moved = true;
  }
  if (this.cursors.up.isDown) {
    player.y -= 3;
    moved = true;
  }
  if (this.cursors.down.isDown) {
    player.y += 3;
    moved = true;
  }
  
  // Send delta update only when moved (optimization)
  // Avoids flooding server with redundant data
  if (moved) {
    socket.emit('move', { x: player.x, y: player.y });
  }
}

// Helper: add other player to scene
// O(1) HashMap insertion + Phaser sprite creation
function addPlayer(player) {
  players[player.id] = game.scene.scenes[0].add.circle(player.x, player.y, 20, 0xff0000);
}

// Helper: display chat message
function displayChatMessage(text) {
  const chatDiv = document.getElementById('chat-messages');
  const msgElement = document.createElement('div');
  msgElement.textContent = text;
  chatDiv.appendChild(msgElement);
  chatDiv.scrollTop = chatDiv.scrollHeight; // Auto-scroll to bottom
}
