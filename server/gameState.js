// Data structure: HashMap for O(1) player CRUD operations
class GameState {
  constructor() {
    this.players = {};
  }

  addPlayer(socketId, x = 400, y = 300) {
    this.players[socketId] = {
      id: socketId,
      x: x,
      y: y,
      lastUpdate: Date.now()
    };
    return this.players[socketId];
  }

  updatePlayer(socketId, x, y) {
    if (this.players[socketId]) {
      this.players[socketId].x = x;
      this.players[socketId].y = y;
      this.players[socketId].lastUpdate = Date.now();
      return true;
    }
    return false;
  }

  removePlayer(socketId) {
    delete this.players[socketId];
  }

  getAllPlayers() {
    return Object.values(this.players);
  }

  getPlayer(socketId) {
    return this.players[socketId];
  }
}

module.exports = new GameState();
