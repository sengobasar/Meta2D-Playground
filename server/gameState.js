// Data structure: HashMap (JavaScript Object) for O(1) player CRUD operations
// Similar to unordered_map in C++ or HashMap in Java
class GameState {
  constructor() {
    // Key-value store: { socketId: {x, y, playerId} }
    // Time complexity: O(1) for get/set/delete
    this.players = {};
  }

  // Add player - O(1) hash insertion
  addPlayer(socketId, x = 400, y = 300) {
    this.players[socketId] = {
      id: socketId,
      x: x,
      y: y,
      lastUpdate: Date.now() // Timestamp for delta calculation
    };
    return this.players[socketId];
  }

  // Update player position - O(1) hash lookup + update
  updatePlayer(socketId, x, y) {
    if (this.players[socketId]) {
      // Delta update: only modify changed properties
      // This is space-efficient: don't resend unchanged data
      this.players[socketId].x = x;
      this.players[socketId].y = y;
      this.players[socketId].lastUpdate = Date.now();
      return true;
    }
    return false;
  }

  // Remove player - O(1) hash deletion
  removePlayer(socketId) {
    delete this.players[socketId];
  }

  // Get all players - O(n) where n = player count
  // Returns array for easy iteration
  getAllPlayers() {
    return Object.values(this.players);
  }

  // Get specific player - O(1) lookup
  getPlayer(socketId) {
    return this.players[socketId];
  }
}

module.exports = new GameState(); // Singleton pattern: one shared state
