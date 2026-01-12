# Juice System Design

> **Status:** Approved
> **Date:** 2026-01-12
> **Goal:** Add cohesive "juice" (particles, sound, screen shake, damage numbers) to make Tank Wars feel satisfying to play.

---

## Overview

The juice system is a **centralized effects manager** that coordinates all feedback effects from a single place. This keeps GameScene clean and ensures effects scale together based on intensity.

### Design Principles

- **SNES visual style** — Chunky pixels (3-5px), limited vibrant palettes, dithering instead of alpha transparency
- **Adaptive quality** — Effects scale based on LOW/MEDIUM/HIGH quality setting
- **Unified intensity** — All effects accept an intensity parameter (0-1) so bigger explosions = more everything
- **Modular subsystems** — Each system is its own class, easy to extend or replace

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    GameScene                        │
│                        │                            │
│                        ▼                            │
│               ┌─────────────┐                       │
│               │ JuiceManager │◄── Central hub       │
│               └──────┬──────┘                       │
│         ┌────────┬───┴───┬────────┐                 │
│         ▼        ▼       ▼        ▼                 │
│   ┌─────────┐ ┌─────┐ ┌──────┐ ┌────────┐          │
│   │Particles│ │Sound│ │Shake │ │DamageNum│          │
│   │ System  │ │Synth│ │System│ │ System │          │
│   └─────────┘ └─────┘ └──────┘ └────────┘          │
└─────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── juice/
│   ├── JuiceManager.ts       # Central coordinator
│   ├── ParticleSystem.ts     # SNES-style particles
│   ├── SoundManager.ts       # Audio abstraction layer
│   ├── SynthSoundProvider.ts # Procedural Web Audio sounds
│   ├── ShakeSystem.ts        # Camera shake
│   ├── DamageNumbers.ts      # Floating damage text
│   └── JuiceConfig.ts        # All tunable parameters
```

---

## Subsystem Details

### 1. Particle System

Renders SNES-style chunky pixels with limited palettes and dithering.

#### Particle Types

| Effect | Shape | Size | Palette | Behavior |
|--------|-------|------|---------|----------|
| **Explosion debris** | Square | 3-5px | Orange → Brown → Black | Burst outward, gravity, dither fade |
| **Explosion flash** | Square burst | 8-12px | White → Yellow | Rapid expand + fade (2-3 frames) |
| **Smoke** | Square cluster | 4-6px | White → Gray → Dark gray | Rise slowly, drift with wind |
| **Dust/landing** | Square | 2-3px | Tan/brown (terrain color) | Puff outward, quick fade |
| **Smoke trail** | Square | 2-3px | Gray, 3-shade dither | Spawn behind projectile, fade |

#### SNES-Style Rendering

- **No alpha transparency** — use dithering patterns (checkerboard fade-out)
- **Color cycling** through fixed palettes rather than smooth gradients
- **Virtual pixel grid** — particles snap to 2x2 or 3x3 screen pixel blocks

#### Quality Scaling

| Quality | Max Particles | Trail Density | Debris Count |
|---------|---------------|---------------|--------------|
| LOW     | 30            | Every 4 frames | 8           |
| MEDIUM  | 60            | Every 2 frames | 16          |
| HIGH    | 100           | Every frame    | 24          |

---

### 2. Sound Synthesizer

Uses Web Audio API for procedural retro sounds, with abstraction layer for future file-based sounds.

#### Architecture

```
┌─────────────────────────────────────────┐
│            SoundManager                 │
│  ┌─────────────────────────────────┐    │
│  │    ISoundProvider (interface)   │    │
│  └──────────────┬──────────────────┘    │
│        ┌────────┴────────┐              │
│        ▼                 ▼              │
│  ┌───────────┐    ┌─────────────┐       │
│  │ SynthSound│    │ FileSound   │       │
│  │ Provider  │    │ Provider    │       │
│  └───────────┘    └─────────────┘       │
│   (default)        (future/optional)    │
└─────────────────────────────────────────┘
```

#### Sound Effects

| Sound | Technique | Character |
|-------|-----------|-----------|
| **Explosion** | White noise burst → bandpass filter → rapid decay | Chunky 16-bit boom |
| **Fire/launch** | Short noise burst + sine wave pitch-up | Satisfying "thwump" |
| **Tank hit** | Square wave + noise, quick pitch drop | Crunchy impact |
| **UI click** | Short square wave blip | Classic menu sound |
| **Wind ambient** | Filtered noise, volume tied to wind strength | Subtle atmosphere |
| **Fall damage** | Low thud (sine wave + noise) | Weighty landing |

#### SNES-Style Characteristics

- **Limited channels** — max 4-6 simultaneous sounds
- **No reverb** — dry, punchy sounds
- **Pitch variation** — ±5% randomization for variety

#### API

```typescript
soundManager.play('explosion', { intensity: 0.8, x: 400 });
soundManager.play('fire');
soundManager.setProvider(new FileSoundProvider(assets)); // swap to files later
```

---

### 3. Screen Shake System

Classic arcade-style random offset with intensity decay.

#### Algorithm

```
Each frame while shaking:
  offset.x = random(-1, 1) * currentIntensity * maxOffset
  offset.y = random(-1, 1) * currentIntensity * maxOffset
  currentIntensity *= decayRate

  Apply offset to camera (respecting world bounds)
```

#### Parameters

| Parameter | LOW | MEDIUM | HIGH | Notes |
|-----------|-----|--------|------|-------|
| **Max offset** | 3px | 5px | 8px | Scaled by quality |
| **Decay rate** | 0.9 per frame | | | Fast falloff, punchy feel |
| **Duration** | 150-300ms | | | Short and snappy |

#### Intensity Mapping

| Event | Intensity | Feel |
|-------|-----------|------|
| Direct hit explosion | 1.0 | Maximum shake |
| Near-miss explosion | 0.5-0.8 | Moderate shake |
| Tank fall/landing | 0.3-0.5 | Light thud |
| Out-of-bounds shot | 0.0 | No shake |

Intensity stacking is additive, capped at 1.0 (multiple hits = bigger shake).

---

### 4. Damage Numbers System

Scaling punch style with SNES-aesthetic rendering.

#### Animation Timeline

```
Frame 0-3:    Scale 2.0 → 1.0 (quick punch, snap between discrete sizes)
Frame 4-20:   Scale 1.0, drift upward at 30px/sec
Frame 21-30:  Scale 1.0, dither fade-out (checkerboard pattern)
```

#### Visual Style

| Property | Value |
|----------|-------|
| **Font** | Bitmap/pixel font, 8x8 characters, bold |
| **Outline** | 1px black outline for readability |
| **Size** | 16-24px base, scales with damage |
| **Lifespan** | 800-1000ms |

#### Color Progression (White → Yellow → Red)

| Damage | Color | Hex | Feel |
|--------|-------|-----|------|
| 1-19 | White | `0xffffff` | Glancing blow, chip damage |
| 20-39 | Yellow | `0xffff00` | Solid hit, good shot |
| 40+ | Red | `0xff4444` | Devastating hit, direct impact |

#### Direct Hit Flair

Direct hits (bonus damage) display red numbers with a brief **white flash** on spawn before settling to red.

---

## Configuration

Extends existing `GAME_CONFIG`:

```typescript
JUICE_CONFIG: {
  // Quality setting
  quality: 'HIGH' as 'LOW' | 'MEDIUM' | 'HIGH',

  // Master toggles (accessibility/preference)
  enableParticles: true,
  enableSound: true,
  enableShake: true,
  enableDamageNumbers: true,

  // Sound
  masterVolume: 0.7,

  // Shake tuning
  shakeMaxOffset: { LOW: 3, MEDIUM: 5, HIGH: 8 },
  shakeDecay: 0.9,

  // Particle counts
  maxParticles: { LOW: 30, MEDIUM: 60, HIGH: 100 },

  // Damage number thresholds
  damageColors: {
    low: 0xffffff,    // white: 1-19
    medium: 0xffff00, // yellow: 20-39
    high: 0xff4444    // red: 40+
  },
  damageThresholds: {
    medium: 20,
    high: 40
  }
}
```

---

## Integration Points

| Location in GameScene | Effects Triggered |
|-----------------------|-------------------|
| `fire()` | Launch sound, muzzle smoke particles |
| `Projectile.update()` | Smoke trail particles (based on quality) |
| `handleImpact()` | Explosion particles, explosion sound, screen shake |
| `applyExplosionDamage()` | Damage numbers per tank hit |
| `updateTankFalling()` | Dust particles on landing, thud sound, light shake |
| Menu interactions | UI click sounds |

---

## Implementation Notes

### JuiceManager API

```typescript
class JuiceManager {
  // High-level effect triggers (coordinates all subsystems)
  explosion(x: number, y: number, intensity: number): void;
  fire(tank: Tank): void;
  tankLanded(tank: Tank, fallDistance: number): void;

  // Damage numbers
  showDamage(x: number, y: number, damage: number, isDirectHit: boolean): void;

  // Per-frame updates
  update(dt: number): void;

  // Settings
  setQuality(quality: 'LOW' | 'MEDIUM' | 'HIGH'): void;
}
```

### Usage in GameScene

```typescript
// In create()
this.juice = new JuiceManager(this);

// In handleImpact()
const intensity = damage / GAME_CONFIG.EXPLOSION_DAMAGE; // 0-1 based on damage dealt
this.juice.explosion(x, y, intensity);

// In applyExplosionDamage(), per tank hit
this.juice.showDamage(tank.x, tank.y - 20, damage, isDirectHit);
```

---

## Future Extensibility

- **FileSoundProvider** — Swap procedural sounds for audio files
- **Additional particle effects** — Water splashes, fire hazards, etc.
- **Combo system** — Chain hits could trigger special effects
- **Settings menu** — Let players adjust quality and toggle effects
