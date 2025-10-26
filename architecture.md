Perfect! Here's your comprehensive **ARCHITECTURE.md** file that documents everything for AI context window persistence and team knowledge sharing:

```markdown
# Metaverse Chat - Architecture Documentation
**Project**: 2D Multiplayer Metaverse with Proximity Chat  
**Last Updated**: October 26, 2025  
**Status**: Active Development - Phase 1 Complete

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Backend Components](#backend-components)
4. [Frontend Components](#frontend-components)
5. [Communication Protocol](#communication-protocol)
6. [Data Structures & Algorithms](#data-structures--algorithms)
7. [Technology Stack](#technology-stack)
8. [File Structure](#file-structure)
9. [Implementation Phases](#implementation-phases)
10. [Development Workflow](#development-workflow)
11. [Running the Project](#running-the-project)

---

## Project Overview

### Vision
A 2D isometric metaverse where players can:
- Move freely in real-time
- Chat with nearby players using proximity-based communication
- Interact in different zones (shops, outdoor areas, meeting points)

### Design Philosophy
**System Architecture Approach**: Treat every problem as a structured design exercise
- **Step 1**: Define inputs, outputs, constraints (like DSA problems)
- **Step 2**: Map to existing resources (libraries, pretrained models, APIs)
- **Step 3**: Break into primitives (HashMap, pub-sub, event queues)
- **Step 4**: Design macro architecture (client/server/database/communication)
- **Step 5**: Make micro decisions (algorithms, data structures, message formats)
- **Step 6**: Iterate with MVP → features → optimization

### Success Criteria
- ✅ Movement + chat works for multiple players with <100ms latency
- ✅ Smooth animation at ~60 FPS client-side
- ✅ Proximity chat using Euclidean distance filtering
- ✅ Delta updates for bandwidth optimization
- ✅ Scalable architecture supporting future features (rooms, NPCs, AI)

---

## System Architecture

### Macro Architecture Pattern
**Client-Server Model** with authoritative server

```
┌─────────────────┐         WebSocket          ┌─────────────────┐
│                 │ ◄─────────────────────────► │                 │
│  Client (Browser)│         Socket.io          │  Node.js Server │
│  - Phaser.js    │                             │  - Express      │
│  - HTML/CSS UI  │                             │  - Socket.io    │
│                 │                             │                 │
└─────────────────┘                             └─────────────────┘
       │                                                │
       │                                                │
       ▼                                                ▼
  Rendering Layer                              Game State Manager
  - Sprites/Background                         - Player positions (HashMap)
  - Chat UI (HTML overlay)                     - Proximity calculations
  - Input handling                             - Room management
```

### Why This Architecture?
1. **Server authority prevents cheating** - server validates all positions
2. **WebSocket for low latency** - full-duplex TCP for real-time updates
3. **Separation of concerns** - backend logic independent of frontend visuals
4. **Scalable** - can add Redis for multi-server state later

---

## Backend Components

### File: `server/gameState.js`
**Purpose**: Game state management using HashMap pattern

**Data Structure**:
```
{
  players: {
    [socketId]: {
      id: String,        // Socket ID (unique player identifier)
      x: Number,         // X coordinate
      y: Number,         // Y coordinate
      lastUpdate: Number // Timestamp for delta calculation
    }
  }
}
```

**Key Methods**:
- `addPlayer(socketId, x, y)` - O(1) insertion
- `updatePlayer(socketId, x, y)` - O(1) lookup + update
- `removePlayer(socketId)` - O(1) deletion
- `getAllPlayers()` - O(n) iteration (returns array)
- `getPlayer(socketId)` - O(1) lookup

**Pattern**: Singleton (one shared game state instance)

### File: `server/proximityManager.js`
**Purpose**: Proximity chat filtering using Euclidean distance

**Algorithm**: 
```
Distance = √((x₂-x₁)² + (y₂-y₁)²)
Filter players where Distance ≤ PROXIMITY_CHAT_RADIUS
```

**Key Methods**:
- `calculateDistance(pos1, pos2)` - O(1) Pythagorean theorem
- `getPlayersInProximity(senderPos, allPlayers)` - O(n) linear scan with filter
- `getNearbySocketIds(senderId, senderPos, gameState)` - O(n) returns socket IDs

**Time Complexity**: O(n) where n = total players (unavoidable for proximity checks)

### File: `server/server.js`
**Purpose**: Express HTTP server + Socket.io WebSocket layer

**Event Handlers**:
- `connection` - Player joins, send init state
- `move` - Update player position, broadcast delta
- `chatMessage` - Filter by proximity, unicast to nearby players
- `disconnect` - Remove player, broadcast leave event

**Communication Pattern**: Event-driven (Node.js event loop)

### File: `server/config.js`
**Purpose**: Configuration constants

**Constants**:
```
SERVER_TICK_RATE: 30,          // Hz (updates per second)
PROXIMITY_CHAT_RADIUS: 200,    // pixels
PORT: 3000
```

---

## Frontend Components

### File: `client/game.js`
**Purpose**: Phaser game loop + socket event listeners

**Data Structure**:
```
players = {
  [playerId]: PhaserSpriteObject  // HashMap for O(1) sprite access
}
```

**Rendering Layers** (by depth):
1. **Layer 0**: Background image (`depth = 0`)
2. **Layer 1+**: Player sprites (`depth = sprite.y` for isometric sorting)

**Key Functions**:
- `preload()` - Load assets (background, sprites)
- `create()` - Initialize scene, setup socket listeners
- `update()` - Game loop at 60 FPS, handle input, send movement
- `addPlayer(player)` - Create sprite with y-based depth
- `displayChatMessage(text)` - DOM manipulation for chat

**Input Handling**:
- Arrow keys: Polled every frame in `update()`
- Chat input: Event listener on Enter key

### File: `client/index.html`
**Purpose**: HTML structure with CSS overlay

**UI Pattern**: Absolute positioning with z-index layering
- Canvas: `z-index: 1` (game rendering)
- Chat UI: `z-index: 10` (above canvas)

**Chat UI Components**:
- `#chat-messages` - Scrollable div (150px height)
- `#chat-input` - Text input with Enter key handler

### Depth Sorting (Isometric Illusion)
**Algorithm**: Y-based depth for pseudo-3D effect
```
sprite.setDepth(sprite.y);  // Higher y = closer to camera = rendered on top
```
Phaser sorts sprites by depth each frame using painter's algorithm (back-to-front).

---

## Communication Protocol

### Message Format

**Client → Server**:
```
// Movement
socket.emit('move', { x: Number, y: Number });

// Chat
socket.emit('chatMessage', { message: String });
```

**Server → Client**:
```
// Initial state (unicast)
socket.emit('init', {
  playerId: String,
  players: Array<{id, x, y}>
});

// Player joined (broadcast)
io.emit('playerJoined', { id: String, x: Number, y: Number });

// Delta movement update (broadcast)
io.emit('playerMoved', { id: String, x: Number, y: Number });

// Proximity chat (targeted unicast)
io.to(recipientId).emit('chatMessage', {
  senderId: String,
  message: String,
  timestamp: Number
});

// Player left (broadcast)
io.emit('playerLeft', playerId: String);
```

### Update Strategy
**Delta updates**: Only send changed data (`{id, x, y}`) vs full game state  
**Client send rate**: 60 FPS (on movement)  
**Server broadcast rate**: 30 Hz (configurable)

---

## Data Structures & Algorithms

### HashMap (O(1) Operations)
**Backend**: `gameState.players` object  
**Frontend**: `players` object  
**Why**: Instant player lookup by socket ID for position updates

### Euclidean Distance (O(1) per pair)
**Formula**: `√((x₂-x₁)² + (y₂-y₁)²)`  
**Use**: Proximity chat filtering  
**Optimization**: Could use squared distance to avoid sqrt (premature optimization avoided for clarity)

### Linear Filter (O(n))
**Pattern**: Array.filter() with distance predicate  
**Use**: Find all players within chat radius  
**Trade-off**: O(n) unavoidable for proximity checks unless using spatial partitioning (future optimization)

### Pub-Sub Pattern
**Implementation**: Socket.io event emitters  
**Use**: Player movement broadcasts, chat message routing  
**Benefit**: Decoupled event handling

### Event-Driven Architecture
**Platform**: Node.js event loop  
**Benefit**: Non-blocking I/O for concurrent connections

---

## Technology Stack

### Backend
- **Node.js**: v18+ (JavaScript runtime)
- **Express**: v4.18.2 (HTTP server)
- **Socket.io**: v4.6.1 (WebSocket library with fallbacks)

### Frontend
- **Phaser**: v3.55.2 (2D game engine)
- **Socket.io-client**: v4.6.1 (WebSocket client)
- **Vanilla HTML/CSS**: For chat UI overlay

### Development Tools
- **Git**: Version control with feature branching
- **npm**: Package management
- **VS Code**: Recommended IDE

### AI Tools for Assets
- **Ludo.ai Sprite Generator**: Animated sprite sheets
- **OpenArt**: Background generation
- **Midjourney**: High-quality isometric backgrounds

---

## File Structure

```
metaverse-chat/
├── server/
│   ├── server.js              # Entry point: HTTP + Socket.io
│   ├── gameState.js           # HashMap for player state (Singleton)
│   ├── proximityManager.js    # Euclidean distance calculator
│   └── config.js              # Constants (tick rate, radius, port)
├── client/
│   ├── index.html             # HTML structure with chat overlay
│   ├── game.js                # Phaser game + socket listeners
│   └── assets/
│       ├── background.png     # Isometric metaverse background
│       └── (future: player sprites, audio, etc.)
├── docs/
│   └── ARCHITECTURE.md        # This file
├── package.json               # Dependencies and scripts
├── .gitignore                 # Ignore node_modules, etc.
└── README.md                  # Project setup instructions
```

---

## Implementation Phases

### ✅ Phase 0: Architecture Design (Completed Oct 26, 2025)
- Macro → Micro framework established
- Backend/frontend separation defined
- Communication protocol designed
- Data structures selected (HashMap, proximity filter)

### ✅ Phase 1: Core Multiplayer (Completed Oct 26, 2025)
**Branch**: `main`  
**Features**:
- Backend: GameState HashMap with O(1) operations
- Backend: Proximity chat using Euclidean distance
- Frontend: Basic Phaser canvas with circles as players
- Frontend: HTML chat overlay with real-time messaging
- WebSocket: Delta updates for movement
- WebSocket: Proximity-filtered chat broadcasts

**Backend Contract Established**:
```
// This contract NEVER changes - frontend iterations don't affect backend
socket.emit('move', { x: Number, y: Number });
socket.emit('chatMessage', { message: String });
```

### ✅ Phase 2: Isometric Background (Completed Oct 26, 2025)
**Branch**: `feature/isometric-background` → merged to `main`  
**Changes**: Frontend only
- Added `preload()` for background asset loading
- Background rendering at depth 0
- Y-based depth sorting for player sprites
- Aspect-ratio-preserving background scaling

**Backend Impact**: ZERO (still receives/sends `{x, y}`)

### 🔄 Phase 3: Animated Sprites (Next - Planned)
**Branch**: `feature/animated-player-sprites`  
**Changes**: Frontend only
- Replace circles with sprite sheets
- Walk animation (4 frames @ 8 FPS)
- Idle animation (1 frame)
- State machine: idle ↔ walking
- flipX for left/right movement

**Backend Impact**: ZERO

### 📋 Phase 4: Multi-Room System (Planned)
**Changes**: Backend + Frontend
- Backend: Room manager using `socket.join(roomId)`
- Backend: Separate game state per room
- Frontend: Room transition zones
- Message routing: `io.to(roomId).emit()`

### 📋 Phase 5: Collision Detection (Planned)
**Changes**: Frontend only
- Add collision boundaries for buildings
- Raycast or AABB collision checks
- Prevent player movement through obstacles

### 📋 Phase 6: NPC Integration (Planned)
**Changes**: Backend + Frontend
- Server-side NPC movement (simple AI)
- NPC chat responses (pretrained LLM integration)
- Shop interaction zones

---

## Development Workflow

### Git Branching Strategy
**Pattern**: GitHub Flow (feature branches)

```
# Start new feature
git checkout -b feature/feature-name

# Make changes, commit frequently
git add .
git commit -m "Descriptive message about what changed"

# Test locally
npm start

# When working, merge to main
git checkout main
git merge feature/feature-name

# Push to remote
git push origin main
```

### Branch Naming Convention
- `feature/` - New features (e.g., `feature/animated-sprites`)
- `fix/` - Bug fixes (e.g., `fix/chat-scroll-bug`)
- `refactor/` - Code improvements without new features

### Commit Message Format
```
<type>: <description> (<scope>)

Examples:
- feat: Add isometric background with depth sorting (frontend)
- fix: Correct proximity distance calculation (backend)
- refactor: Extract player creation into helper function (frontend)
- docs: Update ARCHITECTURE.md with Phase 2 completion
```

### Testing Checklist
Before merging any branch:
1. ✅ Server starts without errors (`npm start`)
2. ✅ Open 2+ browser tabs to `http://localhost:3000`
3. ✅ Players can see each other moving
4. ✅ Chat messages appear only for nearby players
5. ✅ No console errors in browser DevTools
6. ✅ Backend code unchanged (if frontend-only feature)

---

## Running the Project

### Prerequisites
- Node.js v18+ installed
- npm v8+ installed
- Modern browser (Chrome, Firefox, Edge)

### Installation
```
# Clone repository
git clone <repository-url>
cd metaverse-chat

# Install dependencies
npm install
```

### Development Server
```
# Start server (listens on port 3000)
npm start

# Open browser
http://localhost:3000

# Open multiple tabs to test multiplayer
```

### Project Scripts
```
{
  "scripts": {
    "start": "node server/server.js",
    "dev": "nodemon server/server.js"  // Auto-restart on changes (install nodemon)
  }
}
```

### Environment Variables (Future)
```
PORT=3000
PROXIMITY_RADIUS=200
REDIS_URL=redis://localhost:6379  // For multi-server scaling
```

---

## Key Design Decisions

### Why WebSocket over HTTP polling?
- **Latency**: <100ms vs 1-2s with polling
- **Bandwidth**: Persistent connection vs repeated handshakes
- **Simplicity**: Socket.io handles reconnection, fallbacks

### Why HashMap over Array for players?
- **Lookup**: O(1) vs O(n) for finding player by ID
- **Update**: O(1) vs O(n) for position updates
- **Trade-off**: Slightly higher memory (negligible for <1000 players)

### Why HTML overlay vs Phaser UI?
- **Native features**: Keyboard input, scrolling, text selection
- **Development speed**: CSS styling faster than custom Phaser components
- **Accessibility**: Screen readers, tab navigation
- **Performance**: Browser-optimized text rendering

### Why Delta updates vs Full state?
- **Bandwidth**: 32 bytes vs 1KB+ per update
- **Scalability**: Supports 100+ concurrent players
- **Trade-off**: Slightly more complex (track changed properties)

### Why y-based depth sorting?
- **Isometric illusion**: Simulates 3D depth in 2D
- **Performance**: Phaser built-in depth sorting (optimized)
- **Simplicity**: Single property assignment vs complex z-buffer

---

## Future Optimizations

### Spatial Partitioning (Quadtree)
**Problem**: O(n) proximity checks scale poorly with 1000+ players  
**Solution**: Quadtree divides space into regions for O(log n) queries  
**When**: After 100+ concurrent players in single room

### Client-Side Prediction
**Problem**: Perceived lag between input and visual update  
**Solution**: Client predicts own movement, server reconciles  
**When**: After user feedback about input lag

### Server Sharding
**Problem**: Single Node.js process limited to ~10k connections  
**Solution**: Redis pub-sub for inter-server communication  
**When**: Before 5k concurrent players

### Asset Compression
**Problem**: Large background images slow initial load  
**Solution**: WebP format, progressive loading  
**When**: After performance profiling shows asset load bottleneck

---

## Troubleshooting

### Players not seeing each other
- Check both browser tabs connect (see console logs)
- Verify server running on port 3000
- Check firewall not blocking WebSocket connections

### Chat messages not appearing
- Verify players within PROXIMITY_CHAT_RADIUS (200 pixels)
- Check console for JavaScript errors
- Test Euclidean distance calculation manually

### Sprites not rendering
- Verify asset file in `client/assets/` directory
- Check browser DevTools Network tab for 404 errors
- Confirm file path in `preload()` matches actual filename

### Background not scaling correctly
- Verify image dimensions (recommended: 800x600 or higher)
- Check `setScale()` calculation uses Math.max()
- Try different scale modes if aspect ratio issues

---

## Contributing Guidelines

### Code Style
- **Indentation**: 2 spaces (JavaScript standard)
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Comments**: Algorithm explanations with DSA analogies
- **Line length**: Max 100 characters

### Comment Format
```
// Data structure explanation: what + why + time complexity
// Algorithm: step-by-step logic
// Pattern: design pattern name (Singleton, Pub-Sub, etc.)
```

### Documentation Requirements
- Update ARCHITECTURE.md for any architectural changes
- Add JSDoc comments for public methods
- Include complexity analysis (O notation) for algorithms
- Document breaking changes in commit messages

---

## References & Resources

### Learning Resources
- Phaser 3 Docs: https://photonstorm.github.io/phaser3-docs/
- Socket.io Docs: https://socket.io/docs/v4/
- Game Networking Patterns: Glenn Fiedler's articles
- DSA for Games: Algorithms course applied to game dev

### Asset Generation
- Ludo.ai: https://ludo.ai/
- OpenArt: https://openart.ai/
- PixelLab: https://www.pixellab.ai/

### Architecture Patterns
- C4 Model: https://c4model.com/
- Multiplayer Architecture: Gaffer on Games
- Event-Driven Design: Node.js patterns

---

## Changelog

### v0.3.0 - Oct 26, 2025
- Added isometric background with depth sorting
- Implemented y-based sprite layering
- Updated documentation with Phase 2 completion

### v0.2.0 - Oct 26, 2025
- Implemented proximity chat with Euclidean distance
- Added delta update optimization
- Created comprehensive architecture documentation

### v0.1.0 - Oct 26, 2025
- Initial multiplayer implementation
- Basic movement and chat functionality
- Client-server WebSocket communication established

---

## Contact & Support

**Maintainer**: [Your Name]  
**Repository**: [GitHub URL]  
**Issues**: [GitHub Issues URL]  
**Documentation**: This file + inline code comments

---

**Last Review**: October 26, 2025  
**Next Review**: After Phase 3 completion (animated sprites)
```

Save this as `docs/ARCHITECTURE.md` in your project root. This document serves as your **single source of truth** - whenever working with AI assistants or new team members, share this file first. It contains all architectural decisions, data structures, algorithms, and implementation history needed to continue development without context loss.

[1](https://www.reddit.com/r/gamedesign/comments/12ugfy3/free_gdd_template_with_navigation_examples_and/)
[2](https://www.nuclino.com/articles/game-design-document-template)
[3](https://www.gitbook.com/blog/how-to-write-a-game-design-document)
[4](https://connect-prd-cdn.unity.com/20201215/83f3733d-3146-42de-8a69-f461d6662eb1/Game-Design-Document-Template.pdf)
[5](https://www.pickfu.com/blog/wp-content/uploads/2024/06/Detailed-Game-Design-Documentation-Template.pdf)
[6](https://wwwx.cs.unc.edu/~pozefsky/seriousgames/NewDesignDocTemplate.pdf)
[7](https://meiri.itch.io/game-design-document-template)
[8](https://indiegameacademy.com/free-game-design-document-template-how-to-guide/)
[9](https://www.notion.com/templates/game-design-document)
[10](https://devforum.roblox.com/t/roblox-game-design-document-2023-edition/2152139)