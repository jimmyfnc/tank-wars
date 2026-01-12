// Game configuration constants

/** Available terrain generation presets */
export type TerrainPreset =
  | 'rolling_hills'
  | 'flat_plains'
  | 'mountains'
  | 'cratered';

/** Terrain preset parameters */
export const TERRAIN_PRESETS: Record<
  TerrainPreset,
  {
    baseHeight: number;
    variation: number;
    roughness: number;
    description: string;
  }
> = {
  rolling_hills: {
    baseHeight: 400,
    variation: 100,
    roughness: 0.5,
    description: 'Rolling Hills',
  },
  flat_plains: {
    baseHeight: 450,
    variation: 30,
    roughness: 0.3,
    description: 'Flat Plains',
  },
  mountains: {
    baseHeight: 350,
    variation: 150,
    roughness: 0.7,
    description: 'Mountains',
  },
  cratered: {
    baseHeight: 400,
    variation: 80,
    roughness: 0.4,
    description: 'Cratered',
  },
};

export const GAME_CONFIG = {
  // Screen dimensions
  SCREEN_WIDTH: 800,
  SCREEN_HEIGHT: 600,

  // World dimensions (can be larger than screen for scrolling)
  WORLD_WIDTH: 800,
  WORLD_HEIGHT: 600,

  // Physics
  GRAVITY: 400, // pixels/sec^2
  MAX_WIND: 80, // max wind acceleration

  // Tank settings
  TANK_WIDTH: 40,
  TANK_HEIGHT: 20,
  TURRET_LENGTH: 25,
  TURRET_WIDTH: 6,
  INITIAL_HP: 100,
  MIN_ANGLE: 0,
  MAX_ANGLE: 180,
  MIN_POWER: 100,
  MAX_POWER: 500,
  DEFAULT_POWER: 300,
  DEFAULT_ANGLE: 45,
  ANGLE_SPEED: 60, // degrees per second
  POWER_SPEED: 150, // power units per second

  // Projectile
  PROJECTILE_RADIUS: 4,

  // Explosion
  EXPLOSION_RADIUS: 60,
  EXPLOSION_DAMAGE: 40,
  EXPLOSION_DURATION: 300, // ms
  DIRECT_HIT_BONUS: 20, // extra damage for very close hits

  // Terrain (legacy - used by existing code)
  TERRAIN_BASE_HEIGHT: 400, // average ground level from top
  TERRAIN_VARIATION: 100, // max height variation

  // Terrain layers (depth from surface in pixels)
  TERRAIN: {
    GRASS_DEPTH: 3,
    DIRT_DEPTH: 80,
    // Stone is everything below dirt
    ROCK_MIN_SIZE: 2,
    ROCK_MAX_SIZE: 4,
    ROCK_DENSITY: 0.02, // probability per pixel in dirt layer
  },

  // Camera
  CAMERA_EASE_DURATION: 500, // ms for camera transitions

  // Colors (as hex numbers for Phaser Graphics)
  COLORS: {
    // Legacy colors (kept for compatibility)
    TANK_P1: 0x4466cc,
    TANK_P2: 0xcc4444,
    TURRET: 0x333333,
    PROJECTILE: 0x222222,
    TERRAIN_TOP: 0x5dba3c,
    TERRAIN_BOTTOM: 0x4b3010,
    EXPLOSION: 0xff8800,
    UI_BG: 0x000000,
    UI_TEXT: 0xffffff,

    // SNES-style terrain palette
    TERRAIN_GRASS_LIGHT: 0x5dba3c,
    TERRAIN_GRASS_DARK: 0x3d8a2c,
    TERRAIN_DIRT_LIGHT: 0x8b6914,
    TERRAIN_DIRT_MID: 0x6b4914,
    TERRAIN_DIRT_DARK: 0x4b3010,
    TERRAIN_ROCK_LIGHT: 0x7a7a7a,
    TERRAIN_ROCK_MID: 0x5a5a5a,
    TERRAIN_ROCK_DARK: 0x3a3a3a,
    TERRAIN_STONE_LIGHT: 0x4a4a4a,
    TERRAIN_STONE_MID: 0x3a3a3a,
    TERRAIN_STONE_DARK: 0x2a2a2a,

    // Metal Slug style tank palette - Player 1 (blue)
    TANK_P1_LIGHT: 0x6688dd,
    TANK_P1_BASE: 0x4466cc,
    TANK_P1_DARK: 0x224488,

    // Metal Slug style tank palette - Player 2 (red)
    TANK_P2_LIGHT: 0xdd6666,
    TANK_P2_BASE: 0xcc4444,
    TANK_P2_DARK: 0x882222,

    // Shared tank colors
    TANK_TRACK: 0x444444,
    TANK_TRACK_DARK: 0x222222,
    TANK_BARREL: 0x333333,
    TANK_BARREL_DARK: 0x222222,
    TANK_RIVET: 0x888888,
    TANK_VIEWPORT: 0x88ccff,
  },
};
