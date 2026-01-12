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
   * Get the camera this shake system controls.
   */
  getCamera(): Phaser.Cameras.Scene2D.Camera {
    return this.camera;
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
