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
  private particles: ParticleSystem;
  private shake: ShakeSystem;
  private damageNumbers: DamageNumbers;
  private sound: SoundManager;

  constructor(scene: Phaser.Scene) {
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
