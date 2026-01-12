// Game configuration constants
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

  // Terrain
  TERRAIN_BASE_HEIGHT: 400, // average ground level from top
  TERRAIN_VARIATION: 100, // max height variation

  // Camera
  CAMERA_EASE_DURATION: 500, // ms for camera transitions

  // Colors (as hex numbers for Phaser Graphics)
  COLORS: {
    TANK_P1: 0x4444ff,
    TANK_P2: 0xff4444,
    TURRET: 0x333333,
    PROJECTILE: 0x222222,
    TERRAIN_TOP: 0x44aa44,
    TERRAIN_BOTTOM: 0x886644,
    EXPLOSION: 0xff8800,
    UI_BG: 0x000000,
    UI_TEXT: 0xffffff
  }
};
