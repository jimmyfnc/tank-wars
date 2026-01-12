// src/juice/JuiceConfig.ts

export type JuiceQuality = 'LOW' | 'MEDIUM' | 'HIGH';

export const JUICE_CONFIG = {
  // Quality setting (can be changed at runtime)
  quality: 'HIGH' as JuiceQuality,

  // Master toggles (for accessibility/preference)
  enableParticles: true,
  enableSound: true,
  enableShake: true,
  enableDamageNumbers: true,

  // Sound
  masterVolume: 0.7,

  // Shake tuning
  shake: {
    maxOffset: { LOW: 3, MEDIUM: 5, HIGH: 8 },
    decayRate: 0.85, // Per-frame multiplier
    minIntensity: 0.01, // Stop shaking below this
  },

  // Particle settings per quality
  particles: {
    maxCount: { LOW: 30, MEDIUM: 60, HIGH: 100 },
    trailInterval: { LOW: 4, MEDIUM: 2, HIGH: 1 }, // Frames between trail particles
    debrisCount: { LOW: 8, MEDIUM: 16, HIGH: 24 },
    smokeCount: { LOW: 3, MEDIUM: 6, HIGH: 10 },
  },

  // SNES-style pixel size (screen pixels per "SNES pixel")
  pixelSize: 2,

  // Particle palettes (SNES-style limited colors)
  palettes: {
    explosion: [0xffffff, 0xffff00, 0xff8800, 0xff4400, 0x884400, 0x442200, 0x000000],
    smoke: [0xffffff, 0xcccccc, 0x888888, 0x444444],
    dust: [0xddcc99, 0xbbaa77, 0x998855, 0x776633],
  },

  // Damage number settings
  damageNumbers: {
    colors: {
      low: 0xffffff,    // white: 1-19
      medium: 0xffff00, // yellow: 20-39
      high: 0xff4444,   // red: 40+
    },
    thresholds: {
      medium: 20,
      high: 40,
    },
    fontSize: 16,
    outlineWidth: 2,
    outlineColor: 0x000000,
    punchScale: 2.0,     // Initial scale
    punchDuration: 100,  // ms to scale down
    floatSpeed: 30,      // px/sec upward
    lifetime: 900,       // ms total
  },

  // Sound synthesis parameters
  sounds: {
    explosion: {
      frequency: 100,
      duration: 0.3,
      noiseAmount: 0.8,
    },
    fire: {
      frequency: 200,
      duration: 0.15,
      noiseAmount: 0.4,
    },
    hit: {
      frequency: 150,
      duration: 0.1,
      noiseAmount: 0.6,
    },
    land: {
      frequency: 80,
      duration: 0.2,
      noiseAmount: 0.5,
    },
  },
};

// Helper to get quality-scaled value
export function getQualityValue<T>(config: { LOW: T; MEDIUM: T; HIGH: T }): T {
  return config[JUICE_CONFIG.quality];
}
