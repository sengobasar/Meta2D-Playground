// Phaser game configuration
const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,
    height: 1080
  },
  parent: 'game-container',
  backgroundColor: '#2d2d2d',
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);
const socket = io();

let players = {};
let myPlayerId = null;
let cursors = null;
let gameScene = null;
let pendingInit = null;
let chatFocused = false;  // NEW: Track chat input focus

const DIRECTION = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3
};

socket.on('connect', () => console.log('🔌 Socket connected:', socket.id));

socket.on('init', (data) => {
  console.log('📥 Init received:', data);
  myPlayerId = data.playerId;
  if (!gameScene) {
    pendingInit = data;
    return;
  }
  initializePlayers(data);
});

function initializePlayers(data) {
  data.players.forEach(player => {
    if (player.id !== myPlayerId) {
      addPlayer(gameScene, player);
    }
  });
  
  const myPlayerData = data.players.find(p => p.id === myPlayerId);
  if (myPlayerData) {
    players[myPlayerId] = createPlayerSprite(gameScene, myPlayerData.x, myPlayerData.y, true);
    console.log('✅ Player created');
  }
  pendingInit = null;
}

socket.on('playerJoined', (player) => {
  if (gameScene) addPlayer(gameScene, player);
});

socket.on('playerMoved', (data) => {
  if (players[data.id] && players[data.id].sprite) {
    const playerObj = players[data.id];
    playerObj.sprite.x = data.x;
    playerObj.sprite.y = data.y;
    
    if (playerObj.shadow) {
      playerObj.shadow.x = data.x;
      playerObj.shadow.y = data.y - 30;
    }
    
    playerObj.sprite.setDepth(data.y + 1);
    if (playerObj.shadow) playerObj.shadow.setDepth(data.y - 1);
  }
});

socket.on('playerLeft', (playerId) => {
  if (players[playerId]) {
    if (players[playerId].sprite) players[playerId].sprite.destroy();
    if (players[playerId].shadow) players[playerId].shadow.destroy();
    delete players[playerId];
  }
});

socket.on('chatMessage', (data) => {
  displayChatMessage(`Player ${data.senderId.substring(0, 4)}: ${data.message}`);
});

function preload() {
  console.log('🔄 Preload started...');
  
  this.load.image('background', 'assets/background.png');
  
  this.load.spritesheet('player_walk_down', 'assets/player2.png', {
    frameWidth: 32,
    frameHeight: 64
  });
  
  this.load.spritesheet('player_walk_up', 'assets/player0.png', {
    frameWidth: 32,
    frameHeight: 64
  });
  
  this.load.spritesheet('player_walk_right', 'assets/player1.png', {
    frameWidth: 32,
    frameHeight: 64
  });
  
  this.load.spritesheet('player_walk_left', 'assets/player3.png', {
    frameWidth: 32,
    frameHeight: 64
  });
  
  this.load.spritesheet('player_stand', 'assets/stand.png', {
    frameWidth: 32,
    frameHeight: 64
  });
  
  this.load.on('complete', () => console.log('✅ All assets loaded'));
}

function create() {
  console.log('🎮 Create started...');
  gameScene = this;
  
  const bg = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'background');
  const scaleX = this.cameras.main.width / bg.width;
  const scaleY = this.cameras.main.height / bg.height;
  bg.setScale(Math.max(scaleX, scaleY));
  bg.setDepth(0);
  
  this.anims.create({
    key: 'walk_down',
    frames: this.anims.generateFrameNumbers('player_walk_down', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  
  this.anims.create({
    key: 'walk_up',
    frames: this.anims.generateFrameNumbers('player_walk_up', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  
  this.anims.create({
    key: 'walk_right',
    frames: this.anims.generateFrameNumbers('player_walk_right', { start: 1, end: 3 }).concat(
      this.anims.generateFrameNumbers('player_walk_right', { start: 0, end: 0 })
    ),
    frameRate: 12,
    repeat: -1
  });
  
  this.anims.create({
    key: 'walk_left',
    frames: this.anims.generateFrameNumbers('player_walk_left', { start: 1, end: 3 }).concat(
      this.anims.generateFrameNumbers('player_walk_left', { start: 0, end: 0 })
    ),
    frameRate: 12,
    repeat: -1
  });
  
  this.anims.create({
    key: 'idle_down',
    frames: [{ key: 'player_stand', frame: 2 }],
    frameRate: 1
  });
  
  this.anims.create({
    key: 'idle_up',
    frames: [{ key: 'player_stand', frame: 0 }],
    frameRate: 1
  });
  
  this.anims.create({
    key: 'idle_right',
    frames: [{ key: 'player_stand', frame: 1 }],
    frameRate: 1
  });
  
  this.anims.create({
    key: 'idle_left',
    frames: [{ key: 'player_stand', frame: 3 }],
    frameRate: 1
  });
  
  cursors = this.input.keyboard.createCursorKeys();
  
  // FIXED CHAT INPUT - Allow spaces and prevent game interference
  const chatInput = document.getElementById('chat-input');
  
  // Track when chat is focused
  chatInput.addEventListener('focus', () => {
    chatFocused = true;
    console.log('💬 Chat focused - game paused');
  });
  
  chatInput.addEventListener('blur', () => {
    chatFocused = false;
    console.log('🎮 Game resumed');
  });
  
  // Handle all keyboard events when chat is focused
  chatInput.addEventListener('keydown', (e) => {
    // Stop event propagation to prevent Phaser from capturing keys
    if (chatFocused) {
      e.stopPropagation();
    }
    
    // Send message on Enter
    if (e.key === 'Enter' && e.target.value.trim()) {
      socket.emit('chatMessage', { message: e.target.value });
      e.target.value = '';
      chatInput.blur(); // Return focus to game
    }
    
    // Allow Escape to exit chat
    if (e.key === 'Escape') {
      chatInput.blur();
    }
  });
  
  // Also stop keyup and keypress propagation
  chatInput.addEventListener('keyup', (e) => {
    if (chatFocused) e.stopPropagation();
  });
  
  chatInput.addEventListener('keypress', (e) => {
    if (chatFocused) e.stopPropagation();
  });
  
  console.log('✅ Create completed with chat input fix');
  if (pendingInit) initializePlayers(pendingInit);
}

function update() {
  if (!myPlayerId || !players[myPlayerId]) return;
  
  // Don't move player when typing in chat!
  if (chatFocused) return;
  
  const playerObj = players[myPlayerId];
  const sprite = playerObj.sprite;
  const shadow = playerObj.shadow;
  
  let moved = false;
  let velocityX = 0;
  let velocityY = 0;
  let direction = playerObj.lastDirection || DIRECTION.DOWN;
  
  if (cursors.up.isDown) {
    velocityY = -5;
    direction = DIRECTION.UP;
    moved = true;
  } else if (cursors.down.isDown) {
    velocityY = 5;
    direction = DIRECTION.DOWN;
    moved = true;
  }
  
  if (cursors.left.isDown) {
    velocityX = -5;
    direction = DIRECTION.LEFT;
    moved = true;
  } else if (cursors.right.isDown) {
    velocityX = 5;
    direction = DIRECTION.RIGHT;
    moved = true;
  }
  
  if (moved) {
    sprite.x += velocityX;
    sprite.y += velocityY;
    
    if (shadow) {
      shadow.x = sprite.x;
      shadow.y = sprite.y - 30;
    }
    
    sprite.play(getWalkAnimationKey(direction), true);
    playerObj.lastDirection = direction;
    sprite.setDepth(sprite.y + 1);
    if (shadow) shadow.setDepth(sprite.y - 1);
    socket.emit('move', { x: sprite.x, y: sprite.y });
  } else {
    sprite.play(getIdleAnimationKey(playerObj.lastDirection || DIRECTION.DOWN), true);
  }
}

function getWalkAnimationKey(direction) {
  return ['walk_up', 'walk_right', 'walk_down', 'walk_left'][direction];
}

function getIdleAnimationKey(direction) {
  return ['idle_up', 'idle_right', 'idle_down', 'idle_left'][direction];
}

function createPlayerSprite(scene, x, y, isMyPlayer = false) {
  // Bigger shadow with subtle breathing animation
  const shadow = scene.add.ellipse(x, y - 30, 50, 15, 0x000000, 0.4);
  shadow.setDepth(y - 1);
  
  // Pulsing shadow animation for life-like effect
  scene.tweens.add({
    targets: shadow,
    scaleX: 1.08,
    scaleY: 1.08,
    alpha: 0.3,
    duration: 800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  
  const sprite = scene.add.sprite(x, y, 'player_walk_down', 0);
  sprite.setOrigin(0.5, 1.0);
  sprite.setScale(2.5);
  sprite.setTint(isMyPlayer ? 0x00ff00 : 0xff0000);
  sprite.setDepth(y + 1);
  sprite.play('idle_down');
  
  console.log('✅ Animated shadow created');
  return { sprite, shadow, lastDirection: DIRECTION.DOWN };
}

function addPlayer(scene, player) {
  players[player.id] = createPlayerSprite(scene, player.x, player.y, false);
}

function displayChatMessage(text) {
  const chatDiv = document.getElementById('chat-messages');
  const msgElement = document.createElement('div');
  msgElement.textContent = text;
  chatDiv.appendChild(msgElement);
  chatDiv.scrollTop = chatDiv.scrollHeight;
  if (chatDiv.children.length > 50) chatDiv.removeChild(chatDiv.children[0]);
}
