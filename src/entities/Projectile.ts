import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';

/**
 * Projectile entity - handles custom physics-based projectile motion.
 * Uses manual integration with gravity and wind (no Arcade/Matter physics).
 */
export class Projectile {
  private graphics: Phaser.GameObjects.Graphics;

  // Position
  public x: number;
  public y: number;

  // Previous position (for collision raycast)
  public prevX: number;
  public prevY: number;

  // Velocity (pixels per second)
  public vx: number;
  public vy: number;

  // Is the projectile currently in flight?
  public active: boolean = false;

  // Reference to wind for physics updates
  private wind: number = 0;

  constructor(scene: Phaser.Scene) {
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.vx = 0;
    this.vy = 0;

    this.graphics = scene.add.graphics();
  }

  /**
   * Fire the projectile from a position with initial velocity
   */
  fire(x: number, y: number, vx: number, vy: number, wind: number): void {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = vx;
    this.vy = vy;
    this.wind = wind;
    this.active = true;
    this.draw();
  }

  /**
   * Update projectile physics (called each frame)
   * Uses dt-based integration for frame-rate independence.
   *
   * Physics:
   * - Gravity accelerates vy downward (y+ is down in Phaser)
   * - Wind accelerates vx horizontally
   *
   * @param dt - delta time in seconds
   */
  update(dt: number): void {
    if (!this.active) return;

    // Store previous position for collision raycast
    this.prevX = this.x;
    this.prevY = this.y;

    // Apply gravity (accelerates vy positively since y+ is down)
    this.vy += GAME_CONFIG.GRAVITY * dt;

    // Apply wind (horizontal acceleration)
    this.vx += this.wind * dt;

    // Integrate position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.draw();
  }

  /**
   * Draw the projectile
   */
  draw(): void {
    this.graphics.clear();

    if (!this.active) return;

    // Draw as a filled circle
    this.graphics.fillStyle(GAME_CONFIG.COLORS.PROJECTILE);
    this.graphics.fillCircle(this.x, this.y, GAME_CONFIG.PROJECTILE_RADIUS);
  }

  /**
   * Check if projectile is out of bounds
   */
  isOutOfBounds(): boolean {
    return (
      this.x < -50 ||
      this.x > GAME_CONFIG.WORLD_WIDTH + 50 ||
      this.y > GAME_CONFIG.SCREEN_HEIGHT + 50 ||
      this.y < -500 // Allow high arcs
    );
  }

  /**
   * Deactivate the projectile
   */
  deactivate(): void {
    this.active = false;
    this.graphics.clear();
  }

  /**
   * Reset for next shot
   */
  reset(): void {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.vx = 0;
    this.vy = 0;
    this.graphics.clear();
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.graphics.destroy();
  }
}
