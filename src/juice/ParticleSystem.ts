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
  private graphics: Phaser.GameObjects.Graphics;
  private particles: Particle[] = [];
  private frameCount: number = 0;

  constructor(scene: Phaser.Scene) {
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
