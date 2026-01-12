# SNES Visual Overhaul Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Tank Wars visuals from programmer art to SNES-style pixel art with procedural terrain generation.

**Architecture:** Three independent systems - terrain generation (seeded PRNG + midpoint displacement), terrain rendering (layered pixel art), and tank graphics (Metal Slug style pixel art). Menu integration for terrain preset selection.

**Tech Stack:** Phaser 3 Graphics API, seeded PRNG (mulberry32), procedural pixel art rendering

---

## 1. Terrain Generation

### Seeded PRNG

Simple mulberry32 algorithm for reproducible randomness:

```typescript
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
```

### Generation Algorithm

- Midpoint displacement for natural hills
- Guaranteed flat spots at spawn positions (60px each side)
- Configurable parameters control overall shape

### Terrain Presets

| Preset | Base Height | Variation | Roughness | Description |
|--------|-------------|-----------|-----------|-------------|
| rolling_hills | 400 | 100 | 0.5 | Gentle waves (default) |
| flat_plains | 450 | 30 | 0.3 | Minimal height change |
| mountains | 350 | 150 | 0.7 | Dramatic peaks and valleys |
| cratered | 400 | 80 | 0.4 | Pre-existing dips |

### Config Additions

```typescript
// In GAME_CONFIG
TERRAIN: {
  PRESET: 'rolling_hills' as TerrainPreset,
  SEED: null as number | null,  // null = random each game
}
```

---

## 2. Terrain Rendering (SNES Style)

### Three-Layer System

| Layer | Depth from Surface | Colors | Details |
|-------|-------------------|--------|---------|
| Grass | 0-3px | Bright green + darker edge | 2-3px thick surface line |
| Dirt | 3-80px | Brown tones | Scattered rocks/pebbles |
| Stone | 80px+ | Gray/dark brown | Denser, darker fill |

### Color Palette (SNES-limited)

```typescript
TERRAIN_COLORS: {
  // Grass layer
  GRASS_LIGHT: 0x5dba3c,
  GRASS_DARK: 0x3d8a2c,

  // Dirt layer
  DIRT_LIGHT: 0x8b6914,
  DIRT_MID: 0x6b4914,
  DIRT_DARK: 0x4b3010,

  // Embedded rocks
  ROCK_LIGHT: 0x7a7a7a,
  ROCK_MID: 0x5a5a5a,
  ROCK_DARK: 0x3a3a3a,

  // Stone layer
  STONE_LIGHT: 0x4a4a4a,
  STONE_MID: 0x3a3a3a,
  STONE_DARK: 0x2a2a2a,
}
```

### Rock Placement

- Seeded random positions within dirt layer
- Varied sizes (2x2 to 4x4 pixels)
- Denser toward dirt/stone boundary
- Stored in array for consistent rendering after craters

---

## 3. Tank Graphics (Metal Slug Style)

### Visual Structure

```
     ████           <- Cannon barrel (rotates with angle)
    ██████          <- Turret dome (semi-circle)
   ████████         <- Turret base
  ██████████        <- Hull top (highlight)
 ████████████       <- Hull body (main color)
████████████████    <- Hull bottom (shadow)
 ██  ████  ██       <- Track wheels (3 circles)
████████████████    <- Track base
```

### Dimensions

- Total width: ~40px (same as current TANK_WIDTH)
- Hull height: ~16px
- Track height: ~6px
- Turret dome: ~8px radius
- Cannon length: 25px (same as TURRET_LENGTH)
- Cannon width: 4px

### Color Scheme Per Player

```typescript
TANK_COLORS: {
  P1: {
    HULL_LIGHT: 0x6688dd,
    HULL_BASE: 0x4466cc,
    HULL_DARK: 0x224488,
  },
  P2: {
    HULL_LIGHT: 0xdd6666,
    HULL_BASE: 0xcc4444,
    HULL_DARK: 0x882222,
  },
  SHARED: {
    TRACK: 0x444444,
    TRACK_DARK: 0x222222,
    BARREL: 0x333333,
    BARREL_DARK: 0x222222,
    RIVET: 0x888888,
  }
}
```

### Tank States

- **Alive:** Full color, all details
- **Destroyed:** Darkened 50%, no turret drawn, slight tilt

---

## 4. Menu Integration

### Terrain Selector in MenuScene

Add cycling terrain preset option:

```
╔══════════════════════════════╗
║        TANK WARS             ║
║                              ║
║     [1v1 Local Battle]       ║
║     [vs Computer]            ║
║                              ║
║  Terrain: Rolling Hills  ◄►  ║
║                              ║
║        Arrow keys to         ║
║        cycle terrain         ║
╚══════════════════════════════╝
```

### Data Flow

1. MenuScene stores selected preset
2. Pass preset to GameScene via `scene.start('GameScene', { terrainPreset: 'mountains' })`
3. GameScene passes preset to Terrain constructor
4. Terrain generates with preset parameters

---

## Implementation Order

1. **TerrainConfig** - Add preset types and PRNG to config
2. **Terrain Generation** - Seeded midpoint displacement algorithm
3. **Terrain Rendering** - Three-layer SNES pixel art
4. **Tank Graphics** - Metal Slug style pixel art
5. **Menu Integration** - Terrain preset selector
6. **Polish** - Test all presets, tune colors/parameters
