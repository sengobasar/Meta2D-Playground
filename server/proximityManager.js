// Proximity chat using Euclidean distance formula
// Algorithm: Filter players within radius using 2D distance calculation
const config = require('./config');

class ProximityManager {
  
  // Calculate Euclidean distance: sqrt((x2-x1)^2 + (y2-y1)^2)
  // Time complexity: O(1) - constant arithmetic operations
  // Math principle: Pythagorean theorem in 2D coordinate space
  calculateDistance(pos1, pos2) {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Filter players within proximity radius
  // Algorithm: Linear scan with predicate filter
  // Time complexity: O(n) where n = total players
  // Space complexity: O(k) where k = nearby players
  getPlayersInProximity(senderPos, allPlayers) {
    return allPlayers.filter(player => {
      // Calculate distance for each player
      const distance = this.calculateDistance(senderPos, {
        x: player.x,
        y: player.y
      });
      
      // Predicate: include if within threshold
      // This is essentially a range query in 2D space
      return distance <= config.PROXIMITY_CHAT_RADIUS;
    });
  }

  // Get socket IDs of nearby players (for targeted broadcast)
  // Returns array of socket IDs - used for io.to(socketId).emit()
  getNearbySocketIds(senderId, senderPos, gameState) {
    const allPlayers = gameState.getAllPlayers();
    
    // Filter excluding sender (don't echo back)
    const nearbyPlayers = this.getPlayersInProximity(senderPos, allPlayers)
      .filter(player => player.id !== senderId);
    
    // Map operation: transform player objects to socket IDs
    // Array.map is O(n) transformation
    return nearbyPlayers.map(player => player.id);
  }
}

module.exports = new ProximityManager();
