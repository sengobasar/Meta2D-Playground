const config = require('./config');

class ProximityManager {
  calculateDistance(pos1, pos2) {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getPlayersInProximity(senderPos, allPlayers) {
    return allPlayers.filter(player => {
      const distance = this.calculateDistance(senderPos, {
        x: player.x,
        y: player.y
      });
      return distance <= config.PROXIMITY_CHAT_RADIUS;
    });
  }

  getNearbySocketIds(senderId, senderPos, gameState) {
    const allPlayers = gameState.getAllPlayers();
    const nearbyPlayers = this.getPlayersInProximity(senderPos, allPlayers)
      .filter(player => player.id !== senderId);
    return nearbyPlayers.map(player => player.id);
  }
}

module.exports = new ProximityManager();
