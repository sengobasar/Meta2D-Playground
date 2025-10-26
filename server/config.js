// Configuration constants - like #define in C++ or final in Java
// Separating config follows DRY principle: change once, effect everywhere
module.exports = {
  SERVER_TICK_RATE: 30,           // Hz - 30 updates/sec (game industry standard)
  PROXIMITY_CHAT_RADIUS: 200,     // pixels - Euclidean distance threshold
  PORT: 3000
};
