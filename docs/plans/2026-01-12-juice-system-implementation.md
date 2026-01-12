# Juice System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add cohesive "juice" (particles, sound, screen shake, damage numbers) to make Tank Wars feel satisfying to play.

**Architecture:** Centralized JuiceManager coordinates four subsystems (ParticleSystem, SoundManager, ShakeSystem, DamageNumbers). All effects scale with an intensity parameter (0-1). Quality settings (LOW/MEDIUM/HIGH) control particle counts and effect complexity.

**Tech Stack:** Phaser 3 Graphics API for particles/numbers, Web Audio API for procedural sounds, Phaser Camera for shake.

**Design Doc:** See `docs/plans/2026-01-12-juice-system-design.md` for full design rationale.

---

## Task 1: Create JuiceConfig

**Files:**
- Create: `src/juice/JuiceConfig.ts`

**Step 1: Create the juice directory**

```bash
mkdir -p src/juice
```

**Step 2: Create JuiceConfig.ts with all tunable parameters**

```typescript
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
```

**Step 3: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add src/juice/JuiceConfig.ts
git commit -m "feat(juice): add JuiceConfig with all tunable parameters"
```

---

## Task 2: Create ShakeSystem

**Files:**
- Create: `src/juice/ShakeSystem.ts`

**Step 1: Create ShakeSystem.ts**

```typescript
// src/juice/ShakeSystem.ts

import Phaser from 'phaser';
import { JUICE_CONFIG, getQualityValue } from './JuiceConfig';

/**
 * ShakeSystem - Classic arcade-style camera shake.
 * Uses random offset per frame with intensity decay.
 */
export class ShakeSystem {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private intensity: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(camera: Phaser.Cameras.Scene2D.Camera) {
    this.camera = camera;
  }

  /**
   * Trigger a shake effect.
   * @param intensity - Shake strength from 0-1
   */
  shake(intensity: number): void {
    if (!JUICE_CONFIG.enableShake) return;

    // Additive stacking, capped at 1.0
    this.intensity = Math.min(1.0, this.intensity + intensity);
  }

  /**
   * Update shake each frame. Call this in scene update().
   * @returns Current offset to apply to camera
   */
  update(): { x: number; y: number } {
    if (this.intensity <= JUICE_CONFIG.shake.minIntensity) {
      this.intensity = 0;
      this.offsetX = 0;
      this.offsetY = 0;
      return { x: 0, y: 0 };
    }

    const maxOffset = getQualityValue(JUICE_CONFIG.shake.maxOffset);

    // Random offset each frame (classic arcade style)
    this.offsetX = (Math.random() * 2 - 1) * this.intensity * maxOffset;
    this.offsetY = (Math.random() * 2 - 1) * this.intensity * maxOffset;

    // Decay intensity
    this.intensity *= JUICE_CONFIG.shake.decayRate;

    return { x: this.offsetX, y: this.offsetY };
  }

  /**
   * Get current shake offset without updating.
   */
  getOffset(): { x: number; y: number } {
    return { x: this.offsetX, y: this.offsetY };
  }

  /**
   * Check if currently shaking.
   */
  isShaking(): boolean {
    return this.intensity > JUICE_CONFIG.shake.minIntensity;
  }

  /**
   * Immediately stop all shake.
   */
  stop(): void {
    this.intensity = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }
}
```

**Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/juice/ShakeSystem.ts
git commit -m "feat(juice): add ShakeSystem for arcade-style camera shake"
```

---

## Task 3: Create ParticleSystem

**Files:**
- Create: `src/juice/ParticleSystem.ts`

**Step 1: Create ParticleSystem.ts with SNES-style rendering**

```typescript
// src/juice/ParticleSystem.ts

import Phaser from 'phaser';
import { JUICE_CONFIG, getQualityValue } from './JuiceConfig';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  colorIndex: number;
  palette: number[];
  lifetime: number;
  maxLifetime: number;
  gravity: boolean;
}

/**
 * ParticleSystem - SNES-style chunky pixel particles.
 * Uses limited color palettes and dithered fade-out.
 */
export class ParticleSystem {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private particles: Particle[] = [];
  private frameCount: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(100); // Above most game objects
  }

  /**
   * Spawn explosion particles (debris + flash).
   */
  explosion(x: number, y: number, intensity: number): void {
    if (!JUICE_CONFIG.enableParticles) return;

    const debrisCount = Math.floor(getQualityValue(JUICE_CONFIG.particles.debrisCount) * intensity);
    const smokeCount = Math.floor(getQualityValue(JUICE_CONFIG.particles.smokeCount) * intensity);

    // Explosion flash (large, fast-fading white/yellow particles)
    for (let i = 0; i < 4; i++) {
      this.spawn({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100,
        size: (8 + Math.random() * 4) * JUICE_CONFIG.pixelSize,
        colorIndex: 0,
        palette: [0xffffff, 0xffff00, 0xff8800],
        lifetime: 0,
        maxLifetime: 150,
        gravity: false,
      });
    }

    // Debris particles (small, gravity-affected)
    for (let i = 0; i < debrisCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200 * intensity;
      this.spawn({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50, // Bias upward
        size: (3 + Math.random() * 2) * JUICE_CONFIG.pixelSize,
        colorIndex: 0,
        palette: JUICE_CONFIG.palettes.explosion,
        lifetime: 0,
        maxLifetime: 400 + Math.random() * 300,
        gravity: true,
      });
    }

    // Smoke particles (slow rise)
    for (let i = 0; i < smokeCount; i++) {
      this.spawn({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 30,
        vy: -20 - Math.random() * 40,
        size: (4 + Math.random() * 2) * JUICE_CONFIG.pixelSize,
        colorIndex: 0,
        palette: JUICE_CONFIG.palettes.smoke,
        lifetime: 0,
        maxLifetime: 600 + Math.random() * 400,
        gravity: false,
      });
    }
  }

  /**
   * Spawn smoke trail particle (for projectile).
   */
  trail(x: number, y: number): void {
    if (!JUICE_CONFIG.enableParticles) return;

    const interval = getQualityValue(JUICE_CONFIG.particles.trailInterval);
    if (this.frameCount % interval !== 0) return;

    this.spawn({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 10,
      vy: -10 - Math.random() * 20,
      size: (2 + Math.random()) * JUICE_CONFIG.pixelSize,
      colorIndex: 0,
      palette: JUICE_CONFIG.palettes.smoke,
      lifetime: 0,
      maxLifetime: 300 + Math.random() * 200,
      gravity: false,
    });
  }

  /**
   * Spawn dust particles (for tank landing).
   */
  dust(x: number, y: number, intensity: number): void {
    if (!JUICE_CONFIG.enableParticles) return;

    const count = Math.floor(6 * intensity);
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI; // Upward arc
      const speed = 30 + Math.random() * 60 * intensity;
      this.spawn({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (2 + Math.random()) * JUICE_CONFIG.pixelSize,
        colorIndex: 0,
        palette: JUICE_CONFIG.palettes.dust,
        lifetime: 0,
        maxLifetime: 300 + Math.random() * 200,
        gravity: true,
      });
    }
  }

  /**
   * Spawn muzzle flash particles (for firing).
   */
  muzzleFlash(x: number, y: number, angle: number): void {
    if (!JUICE_CONFIG.enableParticles) return;

    // Small flash
    for (let i = 0; i < 3; i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const speed = 50 + Math.random() * 100;
      this.spawn({
        x,
        y,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        size: (2 + Math.random() * 2) * JUICE_CONFIG.pixelSize,
        colorIndex: 0,
        palette: [0xffffff, 0xffff00, 0xff8800],
        lifetime: 0,
        maxLifetime: 100 + Math.random() * 50,
        gravity: false,
      });
    }

    // Smoke puff
    for (let i = 0; i < 2; i++) {
      this.spawn({
        x,
        y,
        vx: Math.cos(angle) * 20 + (Math.random() - 0.5) * 20,
        vy: Math.sin(angle) * 20 - 10,
        size: (3 + Math.random()) * JUICE_CONFIG.pixelSize,
        colorIndex: 0,
        palette: JUICE_CONFIG.palettes.smoke,
        lifetime: 0,
        maxLifetime: 250 + Math.random() * 150,
        gravity: false,
      });
    }
  }

  private spawn(particle: Particle): void {
    const maxCount = getQualityValue(JUICE_CONFIG.particles.maxCount);
    if (this.particles.length >= maxCount) {
      // Remove oldest particle
      this.particles.shift();
    }
    this.particles.push(particle);
  }

  /**
   * Update all particles. Call each frame.
   */
  update(dt: number): void {
    this.frameCount++;

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.lifetime += dt * 1000;

      if (p.lifetime >= p.maxLifetime) {
        this.particles.splice(i, 1);
        continue;
      }

      // Apply gravity
      if (p.gravity) {
        p.vy += 400 * dt; // Match game gravity
      }

      // Move
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Advance color through palette based on lifetime
      const progress = p.lifetime / p.maxLifetime;
      p.colorIndex = Math.floor(progress * (p.palette.length - 1));
    }

    // Render
    this.render();
  }

  private render(): void {
    this.graphics.clear();

    for (const p of this.particles) {
      const progress = p.lifetime / p.maxLifetime;
      const color = p.palette[Math.min(p.colorIndex, p.palette.length - 1)];

      // SNES-style dithered fade: use checkerboard pattern in final 30% of life
      if (progress > 0.7) {
        const ditherPhase = (Math.floor(p.x / 2) + Math.floor(p.y / 2) + this.frameCount) % 2;
        if (ditherPhase === 0) continue; // Skip every other pixel for dither
      }

      // Snap to pixel grid
      const px = Math.floor(p.x / JUICE_CONFIG.pixelSize) * JUICE_CONFIG.pixelSize;
      const py = Math.floor(p.y / JUICE_CONFIG.pixelSize) * JUICE_CONFIG.pixelSize;

      this.graphics.fillStyle(color);
      this.graphics.fillRect(px, py, p.size, p.size);
    }
  }

  /**
   * Clear all particles.
   */
  clear(): void {
    this.particles = [];
    this.graphics.clear();
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.graphics.destroy();
  }
}
```

**Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/juice/ParticleSystem.ts
git commit -m "feat(juice): add ParticleSystem with SNES-style rendering"
```

---

## Task 4: Create DamageNumbers System

**Files:**
- Create: `src/juice/DamageNumbers.ts`

**Step 1: Create DamageNumbers.ts with scaling punch effect**

```typescript
// src/juice/DamageNumbers.ts

import Phaser from 'phaser';
import { JUICE_CONFIG } from './JuiceConfig';

interface DamageNumber {
  x: number;
  y: number;
  damage: number;
  color: number;
  isDirectHit: boolean;
  lifetime: number;
  text: Phaser.GameObjects.Text;
}

/**
 * DamageNumbers - Floating damage text with scaling punch effect.
 * White → Yellow → Red color progression based on damage.
 */
export class DamageNumbers {
  private scene: Phaser.Scene;
  private numbers: DamageNumber[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show a damage number at position.
   */
  show(x: number, y: number, damage: number, isDirectHit: boolean = false): void {
    if (!JUICE_CONFIG.enableDamageNumbers) return;

    const config = JUICE_CONFIG.damageNumbers;

    // Determine color based on damage
    let color = config.colors.low;
    if (damage >= config.thresholds.high) {
      color = config.colors.high;
    } else if (damage >= config.thresholds.medium) {
      color = config.colors.medium;
    }

    // Create text object
    const text = this.scene.add.text(x, y - 20, damage.toString(), {
      fontSize: `${config.fontSize}px`,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: isDirectHit ? '#ffffff' : `#${color.toString(16).padStart(6, '0')}`,
      stroke: `#${config.outlineColor.toString(16).padStart(6, '0')}`,
      strokeThickness: config.outlineWidth,
    });

    text.setOrigin(0.5, 0.5);
    text.setDepth(200); // Above particles
    text.setScale(config.punchScale); // Start scaled up for punch effect

    this.numbers.push({
      x,
      y: y - 20,
      damage,
      color,
      isDirectHit,
      lifetime: 0,
      text,
    });
  }

  /**
   * Update all damage numbers. Call each frame.
   */
  update(dt: number): void {
    const config = JUICE_CONFIG.damageNumbers;

    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const num = this.numbers[i];
      num.lifetime += dt * 1000;

      if (num.lifetime >= config.lifetime) {
        num.text.destroy();
        this.numbers.splice(i, 1);
        continue;
      }

      // Punch effect: scale down from punchScale to 1.0
      if (num.lifetime < config.punchDuration) {
        const punchProgress = num.lifetime / config.punchDuration;
        // Snap to discrete sizes for SNES feel (3 sizes)
        const scaleSteps = [config.punchScale, 1.5, 1.0];
        const stepIndex = Math.min(Math.floor(punchProgress * 3), 2);
        num.text.setScale(scaleSteps[stepIndex]);

        // Direct hit: flash white then transition to red
        if (num.isDirectHit && punchProgress > 0.5) {
          num.text.setColor(`#${num.color.toString(16).padStart(6, '0')}`);
        }
      } else {
        num.text.setScale(1.0);
      }

      // Float upward
      num.y -= config.floatSpeed * dt;
      num.text.setPosition(num.x, num.y);

      // Dithered fade in final 30% (SNES style)
      const progress = num.lifetime / config.lifetime;
      if (progress > 0.7) {
        // Flicker visibility for dither effect
        const visible = (Math.floor(num.lifetime / 50) % 2) === 0;
        num.text.setVisible(visible);
      }
    }
  }

  /**
   * Clear all damage numbers.
   */
  clear(): void {
    for (const num of this.numbers) {
      num.text.destroy();
    }
    this.numbers = [];
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.clear();
  }
}
```

**Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/juice/DamageNumbers.ts
git commit -m "feat(juice): add DamageNumbers with scaling punch effect"
```

---

## Task 5: Create SoundManager and SynthSoundProvider

**Files:**
- Create: `src/juice/SoundManager.ts`

**Step 1: Create SoundManager.ts with Web Audio synthesis**

```typescript
// src/juice/SoundManager.ts

import { JUICE_CONFIG } from './JuiceConfig';

/**
 * Sound provider interface for future extensibility.
 * Allows swapping between synth sounds and file-based sounds.
 */
export interface ISoundProvider {
  play(name: string, options?: SoundOptions): void;
  setVolume(volume: number): void;
}

export interface SoundOptions {
  intensity?: number; // 0-1, affects volume and pitch
  x?: number; // For positional audio (optional future use)
}

/**
 * SynthSoundProvider - Procedural sound synthesis using Web Audio API.
 * Generates SNES-style retro sounds without audio files.
 */
class SynthSoundProvider implements ISoundProvider {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeOscillators: number = 0;
  private maxOscillators: number = 6; // SNES-style limited channels

  private getContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        this.audioContext = new AudioContext();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = JUICE_CONFIG.masterVolume;
      } catch {
        console.warn('Web Audio API not available');
        return null;
      }
    }
    return this.audioContext;
  }

  play(name: string, options: SoundOptions = {}): void {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Limit simultaneous sounds (SNES style)
    if (this.activeOscillators >= this.maxOscillators) return;

    const intensity = options.intensity ?? 1.0;
    const config = JUICE_CONFIG.sounds[name as keyof typeof JUICE_CONFIG.sounds];
    if (!config) return;

    const now = ctx.currentTime;

    // Create oscillator for tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'square'; // SNES-style square wave
    osc.frequency.value = config.frequency * (0.95 + Math.random() * 0.1); // ±5% variation

    // Create noise for texture
    const noiseBuffer = this.createNoiseBuffer(ctx, config.duration);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();

    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = config.frequency * 2;
    noiseFilter.Q.value = 1;

    // Connect oscillator
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    // Connect noise
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // Set volumes based on noise amount and intensity
    const baseVolume = 0.3 * intensity;
    oscGain.gain.setValueAtTime(baseVolume * (1 - config.noiseAmount), now);
    noiseGain.gain.setValueAtTime(baseVolume * config.noiseAmount, now);

    // Envelope: quick attack, decay to zero
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

    // Pitch drop for impact sounds
    if (name === 'explosion' || name === 'hit' || name === 'land') {
      osc.frequency.exponentialRampToValueAtTime(config.frequency * 0.5, now + config.duration);
    }

    // Start and stop
    this.activeOscillators++;
    osc.start(now);
    noise.start(now);
    osc.stop(now + config.duration);
    noise.stop(now + config.duration);

    osc.onended = () => {
      this.activeOscillators--;
      osc.disconnect();
      oscGain.disconnect();
      noise.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
    };
  }

  private createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }
}

/**
 * SoundManager - Central audio management.
 * Wraps sound provider for easy swapping between synth and file-based sounds.
 */
export class SoundManager {
  private provider: ISoundProvider;

  constructor() {
    this.provider = new SynthSoundProvider();
  }

  /**
   * Play a sound effect.
   */
  play(name: string, options?: SoundOptions): void {
    if (!JUICE_CONFIG.enableSound) return;
    this.provider.play(name, options);
  }

  /**
   * Set master volume.
   */
  setVolume(volume: number): void {
    JUICE_CONFIG.masterVolume = volume;
    this.provider.setVolume(volume);
  }

  /**
   * Swap to a different sound provider (for future file-based sounds).
   */
  setProvider(provider: ISoundProvider): void {
    this.provider = provider;
  }
}
```

**Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/juice/SoundManager.ts
git commit -m "feat(juice): add SoundManager with Web Audio synthesis"
```

---

## Task 6: Create JuiceManager

**Files:**
- Create: `src/juice/JuiceManager.ts`
- Create: `src/juice/index.ts` (barrel export)

**Step 1: Create JuiceManager.ts to coordinate all systems**

```typescript
// src/juice/JuiceManager.ts

import Phaser from 'phaser';
import { ParticleSystem } from './ParticleSystem';
import { ShakeSystem } from './ShakeSystem';
import { DamageNumbers } from './DamageNumbers';
import { SoundManager } from './SoundManager';
import { JUICE_CONFIG, JuiceQuality } from './JuiceConfig';

/**
 * JuiceManager - Central coordinator for all game juice effects.
 * Provides high-level methods that trigger coordinated effects.
 */
export class JuiceManager {
  private scene: Phaser.Scene;
  private particles: ParticleSystem;
  private shake: ShakeSystem;
  private damageNumbers: DamageNumbers;
  private sound: SoundManager;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.particles = new ParticleSystem(scene);
    this.shake = new ShakeSystem(scene.cameras.main);
    this.damageNumbers = new DamageNumbers(scene);
    this.sound = new SoundManager();
  }

  /**
   * Trigger explosion effects at position.
   * Coordinates particles, shake, and sound based on intensity.
   */
  explosion(x: number, y: number, intensity: number = 1.0): void {
    this.particles.explosion(x, y, intensity);
    this.shake.shake(intensity);
    this.sound.play('explosion', { intensity });
  }

  /**
   * Trigger fire/launch effects.
   * @param x - Muzzle position X
   * @param y - Muzzle position Y
   * @param angle - Firing angle in radians
   */
  fire(x: number, y: number, angle: number): void {
    this.particles.muzzleFlash(x, y, angle);
    this.sound.play('fire');
  }

  /**
   * Spawn smoke trail particle at projectile position.
   */
  trail(x: number, y: number): void {
    this.particles.trail(x, y);
  }

  /**
   * Show damage number at position.
   */
  showDamage(x: number, y: number, damage: number, isDirectHit: boolean = false): void {
    this.damageNumbers.show(x, y, damage, isDirectHit);
    this.sound.play('hit', { intensity: damage / 50 });
  }

  /**
   * Trigger tank landing effects.
   */
  tankLanded(x: number, y: number, fallDistance: number): void {
    const intensity = Math.min(fallDistance / 100, 1.0);
    this.particles.dust(x, y, intensity);
    this.shake.shake(intensity * 0.5);
    this.sound.play('land', { intensity });
  }

  /**
   * Update all juice systems. Call each frame.
   */
  update(dt: number): { shakeOffset: { x: number; y: number } } {
    this.particles.update(dt);
    this.damageNumbers.update(dt);
    const shakeOffset = this.shake.update();

    return { shakeOffset };
  }

  /**
   * Set quality level for all effects.
   */
  setQuality(quality: JuiceQuality): void {
    JUICE_CONFIG.quality = quality;
  }

  /**
   * Get current quality setting.
   */
  getQuality(): JuiceQuality {
    return JUICE_CONFIG.quality;
  }

  /**
   * Reset/clear all active effects.
   */
  reset(): void {
    this.particles.clear();
    this.damageNumbers.clear();
    this.shake.stop();
  }

  /**
   * Clean up all resources.
   */
  destroy(): void {
    this.particles.destroy();
    this.damageNumbers.destroy();
  }
}
```

**Step 2: Create barrel export index.ts**

```typescript
// src/juice/index.ts

export { JuiceManager } from './JuiceManager';
export { JUICE_CONFIG, JuiceQuality, getQualityValue } from './JuiceConfig';
export { ParticleSystem } from './ParticleSystem';
export { ShakeSystem } from './ShakeSystem';
export { DamageNumbers } from './DamageNumbers';
export { SoundManager, ISoundProvider, SoundOptions } from './SoundManager';
```

**Step 3: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/juice/JuiceManager.ts src/juice/index.ts
git commit -m "feat(juice): add JuiceManager to coordinate all effects"
```

---

## Task 7: Integrate JuiceManager into GameScene

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Step 1: Add JuiceManager import and property**

At the top of the file, add import:
```typescript
import { JuiceManager } from '../juice';
```

Add property in the class (after `private explosionGraphics`):
```typescript
// Juice effects manager
private juice!: JuiceManager;
```

**Step 2: Initialize JuiceManager in create()**

In the `create()` method, after creating explosionGraphics, add:
```typescript
// Initialize juice effects system
this.juice = new JuiceManager(this);
```

**Step 3: Update fire() to trigger muzzle effects**

Modify the `fire()` method to add juice effects:
```typescript
private fire(): void {
  const tank = this.getActiveTank();
  const tip = tank.getTurretTip();
  const vel = tank.getFireVelocity();

  // Fire juice effects (muzzle flash + sound)
  const fireAngle = Math.atan2(vel.vy, vel.vx);
  this.juice.fire(tip.x, tip.y, fireAngle);

  this.projectile.fire(tip.x, tip.y, vel.vx, vel.vy, this.turnManager.wind);
  this.turnManager.fire();
}
```

**Step 4: Update handleImpact() to use juice explosion**

Modify `handleImpact()` - replace `this.showExplosion(x, y)` with juice:
```typescript
private handleImpact(x: number, y: number): void {
  this.projectile.deactivate();
  this.turnManager.projectileLanded();

  // Calculate intensity based on potential damage
  const intensity = 1.0; // Full explosion

  // Trigger juice effects (particles, shake, sound)
  this.juice.explosion(x, y, intensity);

  // Create crater in terrain (destructible terrain!)
  this.terrain.createCrater(x, y, GAME_CONFIG.EXPLOSION_RADIUS);

  // Apply damage to tanks in radius
  this.applyExplosionDamage(x, y);

  // After explosion animation, check for tank falling then resolve
  this.time.delayedCall(GAME_CONFIG.EXPLOSION_DURATION, () => {
    this.explosionGraphics.clear();

    // Check if tanks need to fall due to terrain destruction
    this.startTankSettling();
  });
}
```

**Step 5: Update applyExplosionDamage() to show damage numbers**

Modify the damage application to show numbers:
```typescript
private applyExplosionDamage(x: number, y: number): void {
  const radius = GAME_CONFIG.EXPLOSION_RADIUS;
  const maxDamage = GAME_CONFIG.EXPLOSION_DAMAGE;
  const directHitBonus = GAME_CONFIG.DIRECT_HIT_BONUS;

  [this.tank1, this.tank2].forEach(tank => {
    if (!tank.alive) return;

    const distance = tank.getDistanceFrom(x, y);

    if (distance < radius) {
      // Scale damage by distance (closer = more damage)
      const damageFactor = 1 - (distance / radius);
      let damage = Math.round(maxDamage * damageFactor);

      // Bonus damage for very close hits (direct hit)
      const isDirectHit = distance < 30;
      if (isDirectHit) {
        damage += directHitBonus;
      }

      tank.takeDamage(damage);

      // Show damage number
      this.juice.showDamage(tank.x, tank.y, damage, isDirectHit);

      console.log(`Tank ${tank.playerId} hit! Distance: ${distance.toFixed(1)}, Damage: ${damage}`);
    }
  });
}
```

**Step 6: Add smoke trail in projectile update**

In the `update()` method, inside the projectile active block, add trail:
```typescript
// Update projectile if active
if (this.projectile.active) {
  this.projectile.update(dt);

  // Spawn smoke trail particles
  this.juice.trail(this.projectile.x, this.projectile.y);

  // Camera follows projectile
  this.cameraTarget = { x: this.projectile.x, y: this.projectile.y };

  // ... rest of collision checks
}
```

**Step 7: Update updateTankFalling() to trigger landing effects**

Modify the tank falling update to add juice:
```typescript
private updateTankFalling(dt: number): void {
  let anyStillFalling = false;

  [this.tank1, this.tank2].forEach(tank => {
    if (!tank.alive || !tank.isFalling) return;

    const groundY = this.terrain.getGroundY(tank.x);
    const previousY = tank.y;
    const landed = tank.updateFalling(dt, groundY);

    if (landed) {
      // Tank just landed - trigger dust and sound
      const fallDistance = groundY - previousY;
      this.juice.tankLanded(tank.x, tank.y, Math.abs(fallDistance));
    } else if (tank.isFalling) {
      anyStillFalling = true;
      // Camera follows falling tank
      this.cameraTarget = { x: tank.x, y: tank.y };
    }
  });

  // When all tanks have settled, finish the turn resolution
  if (!anyStillFalling) {
    this.finishTurnResolution();
  }
}
```

**Step 8: Update updateCamera() to apply shake offset**

Modify `updateCamera()` to include shake:
```typescript
private updateCamera(dt: number): void {
  // Update juice systems and get shake offset
  const { shakeOffset } = this.juice.update(dt);

  if (!this.cameraTarget) return;

  const camera = this.cameras.main;
  const currentX = camera.scrollX + camera.width / 2;
  const currentY = camera.scrollY + camera.height / 2;

  // Ease toward target
  const easeSpeed = 3;
  const newX = Phaser.Math.Linear(currentX, this.cameraTarget.x, easeSpeed * dt);
  const newY = Phaser.Math.Linear(currentY, this.cameraTarget.y, easeSpeed * dt);

  // Clamp camera to world bounds
  const halfWidth = camera.width / 2;
  const halfHeight = camera.height / 2;

  camera.scrollX = Phaser.Math.Clamp(newX - halfWidth, 0, GAME_CONFIG.WORLD_WIDTH - camera.width) + shakeOffset.x;
  camera.scrollY = Phaser.Math.Clamp(newY - halfHeight, 0, GAME_CONFIG.WORLD_HEIGHT - camera.height) + shakeOffset.y;
}
```

**Step 9: Update restartGame() to reset juice**

Add juice reset in `restartGame()`:
```typescript
private restartGame(): void {
  // Reset terrain
  this.terrain.reset();

  // Reset juice effects
  this.juice.reset();

  // ... rest of reset code
}
```

**Step 10: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds.

**Step 11: Manual test**

```bash
npm run dev
```

Test the following:
- [ ] Fire a shot - muzzle flash particles and fire sound
- [ ] Projectile in flight - smoke trail behind it
- [ ] Explosion on impact - debris particles, smoke, explosion sound, screen shake
- [ ] Damage dealt - floating damage numbers with color based on damage
- [ ] Tank falls after crater - dust particles, landing sound, small shake
- [ ] Multiple explosions - shake stacks but caps at max

**Step 12: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat(juice): integrate JuiceManager into GameScene

- Muzzle flash and sound on fire
- Smoke trail on projectile
- Particle explosion with screen shake
- Damage numbers with white/yellow/red colors
- Dust and thud on tank landing"
```

---

## Task 8: Clean Up Old Explosion Graphics

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Step 1: Remove old showExplosion method**

Delete the entire `showExplosion()` method (it's now replaced by juice particles):
```typescript
// DELETE THIS METHOD:
private showExplosion(x: number, y: number): void {
  this.explosionGraphics.clear();
  // ...
}
```

**Step 2: Remove explosionGraphics property and initialization**

Remove the property declaration:
```typescript
// DELETE:
private explosionGraphics!: Phaser.GameObjects.Graphics;
```

Remove from `create()`:
```typescript
// DELETE:
this.explosionGraphics = this.add.graphics();
```

Remove from `handleImpact()` the delayed call that clears it (keep the terrain/settling logic):
```typescript
// Change this:
this.time.delayedCall(GAME_CONFIG.EXPLOSION_DURATION, () => {
  this.explosionGraphics.clear();
  this.startTankSettling();
});

// To this:
this.time.delayedCall(GAME_CONFIG.EXPLOSION_DURATION, () => {
  this.startTankSettling();
});
```

Remove from `restartGame()`:
```typescript
// DELETE:
this.explosionGraphics.clear();
```

**Step 3: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds with no unused variable warnings.

**Step 4: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "refactor: remove old explosion graphics (replaced by particle system)"
```

---

## Summary

After completing all tasks, the juice system will provide:

| Effect | Trigger | Systems Used |
|--------|---------|--------------|
| Muzzle flash | Tank fires | Particles + Sound |
| Smoke trail | Projectile in flight | Particles |
| Explosion | Impact | Particles + Shake + Sound |
| Damage numbers | Tank hit | DamageNumbers + Sound |
| Dust cloud | Tank lands | Particles + Shake + Sound |

All effects scale with intensity and respect the quality setting (LOW/MEDIUM/HIGH).
