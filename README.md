# Tank Wars

A turn-based artillery game built with Phaser 3 and TypeScript, inspired by classics like Scorched Earth, Worms, and Metal Slug.

![Tank Wars](https://img.shields.io/badge/Phaser-3.80-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Turn-based gameplay** - Two players take turns adjusting angle and power to hit each other
- **Destructible terrain** - Explosions create craters that change the battlefield
- **Procedural terrain generation** - Four terrain presets with seeded random generation
- **SNES-style pixel art** - Three-layer terrain rendering with grass, dirt, and stone
- **Metal Slug inspired tanks** - Detailed pixel art tanks with treads, viewports, and rivets
- **AI opponent** - Play against the computer with multiple AI personalities
- **Physics simulation** - Projectiles affected by gravity and wind
- **Juice effects** - Screen shake, particles, muzzle flash, and damage numbers

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/jimmyfnc/tank-wars.git
cd tank-wars

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## How to Play

### Controls

| Key | Action |
|-----|--------|
| Left/Right Arrow | Adjust aim angle |
| Up/Down Arrow | Adjust power |
| Space | Fire |
| R | Restart game |
| ESC | Return to menu |

### Game Modes

- **Player vs Player** - Two players on the same keyboard
- **Player vs Computer** - Battle against AI with different personalities:
  - **Sharpshooter** - High accuracy, methodical
  - **Wildcard** - Unpredictable shots
  - **Cautious** - Conservative power choices

### Terrain Types

Select from four procedurally generated terrain presets:
- **Rolling Hills** - Classic artillery terrain
- **Flat Plains** - Open battlefield
- **Mountains** - Dramatic elevation changes
- **Cratered** - Pre-damaged lunar landscape

## Project Structure

```
tank-wars/
├── src/
│   ├── main.ts           # Entry point
│   ├── config.ts         # Game configuration
│   ├── scenes/
│   │   ├── MenuScene.ts  # Main menu
│   │   └── GameScene.ts  # Core gameplay
│   ├── entities/
│   │   ├── Tank.ts       # Tank with pixel art rendering
│   │   └── Projectile.ts # Physics-based projectile
│   ├── world/
│   │   └── Terrain.ts    # Procedural terrain generation
│   ├── state/
│   │   └── TurnManager.ts # Turn-based state machine
│   ├── ai/
│   │   └── TankAI.ts     # AI opponent logic
│   ├── juice/
│   │   └── index.ts      # Visual effects manager
│   └── utils/
│       └── random.ts     # Seeded PRNG utilities
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Technical Highlights

- **Seeded PRNG** - Mulberry32 algorithm for reproducible terrain generation
- **Midpoint displacement** - Fractal terrain generation algorithm
- **Raycast collision** - Prevents fast projectiles from tunneling through terrain
- **State machine** - Clean turn-based game flow management

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built with [Phaser 3](https://phaser.io/)
- Inspired by Scorched Earth, Worms, and Metal Slug
