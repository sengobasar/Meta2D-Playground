// Phaser game configuration
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
const socket = io();

// Data structures for client-side game state
let players = {};  // HashMap: { playerId: spriteObject }
let myPlayerId = null;

function preload() {
  // Load isometric metaverse background
  // Asset: Your generated isometric town image
  this.load.image('background', 'assets/background.png');
}

function create() {
  // ========== RENDERING LAYER 1: Background ==========
  // Add background image centered at canvas center
  // Phaser coordinate system: (0,0) is top-left
  // Canvas center: (width/2, height/2) = (400, 300)
  const bg = this.add.image(400, 300, 'background');
  
  // Scale background to fill canvas if needed
  // Calculate scale ratio to maintain aspect ratio
  const scaleX = this.cameras.main.width / bg.width;
  const scaleY = this.cameras.main.height / bg.height;
  const scale = Math.max(scaleX, scaleY); // Use max to cover entire canvas
  bg.setScale(scale);
  
  // Set depth to 0 - renders behind everything
  // Phaser depth system: lower values render first (back to front)
  bg.setDepth(0);
  
  // ========== RENDERING LAYER 2: Players ==========
  // All player sprites will have depth > 0 to appear on top of background
  
  // Socket event: receive initial game state
  socket.on('init', (data) => {
    myPlayerId = data.playerId;
    
    // Populate initial players - O(n) loop
    data.players.forEach(player => {
      if (player.id !== myPlayerId) {
        addPlayer(player);
      }
    });
    
    // Create controllable player (self) - GREEN circle
    const myPlayer = this.add.circle(
      data.players.find(p => p.id === myPlayerId).x,
      data.players.find(p => p.id === myPlayerId).y,
      20, 
      0x00ff00
    );
    
    // Depth sorting: player sprites appear above background
    // y-based depth for isometric illusion: objects lower on screen appear in front
    myPlayer.setDepth(myPlayer.y);
    
    players[myPlayerId] = myPlayer;
  });
  
  // Socket event: another player joined
  socket.on('playerJoined', (player) => {
    addPlayer(player);
  });
  
  // Socket event: delta update for player movement
  socket.on('playerMoved', (data) => {
    if (players[data.id]) {
      // Update sprite position (rendering layer)
      players[data.id].x = data.x;
      players[data.id].y = data.y;
      
      // Update depth based on y position for isometric sorting
      // Rule: objects with higher y-value are "closer" to camera
      // This creates pseudo-3D effect where lower screen objects appear in front
      players[data.id].setDepth(data.y);
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
        socket.emit('chatMessage', { message });
        e.target.value = '';
      }
    }
  });
}

function update() {
  // Game loop: runs at ~60 FPS (Phaser default)
  
  if (!myPlayerId || !players[myPlayerId]) return;
  
  const player = players[myPlayerId];
  let moved = false;
  
  // Input polling: check keyboard state each frame - O(1)
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
  
  // Update depth in real-time for proper layering
  // This ensures player sprite renders correctly relative to isometric background
  if (moved) {
    player.setDepth(player.y);
    socket.emit('move', { x: player.x, y: player.y });
  }
}

// Helper: add other player to scene
// O(1) HashMap insertion + Phaser sprite creation
function addPlayer(player) {
  const sprite = game.scene.scenes[0].add.circle(player.x, player.y, 20, 0xff0000);
  
  // Depth sorting: y-based depth for isometric perspective
  // Algorithm: sprite.depth = sprite.y (higher y = closer to camera = rendered on top)
  sprite.setDepth(player.y);
  
  players[player.id] = sprite;
}

// Helper: display chat message
function displayChatMessage(text) {
  const chatDiv = document.getElementById('chat-messages');
  const msgElement = document.createElement('div');
  msgElement.textContent = text;
  chatDiv.appendChild(msgElement);
  chatDiv.scrollTop = chatDiv.scrollHeight; // Auto-scroll to bottom
}
