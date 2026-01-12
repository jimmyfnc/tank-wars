import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';

/**
 * Tank entity - represents a player's tank with Metal Slug style pixel art.
 * Features: treads with wheels, hull with 3-tone shading, turret dome, rotating cannon.
 */
export class Tank {
  private graphics: Phaser.GameObjects.Graphics;

  // Position (center-bottom of tank, where it sits on terrain)
  public x: number;
  public y: number;

  // Firing parameters
  public angle: number; // degrees, 0 = right, 90 = up, 180 = left
  public power: number;

  // Tank state
  public hp: number;
  public alive: boolean = true;

  // Falling state (for when terrain is destroyed beneath tank)
  public isFalling: boolean = false;
  public fallVelocity: number = 0;

  // Which direction the tank faces (1 = right, -1 = left)
  public direction: 1 | -1;

  // Player identifier
  public readonly playerId: number;

  // Color palette for this tank
  private colors: {
    light: number;
    base: number;
    dark: number;
  };

  constructor(scene: Phaser.Scene, x: number, y: number, playerId: number) {
    this.x = x;
    this.y = y;
    this.playerId = playerId;

    // Player 1 on left faces right, Player 2 on right faces left
    this.direction = playerId === 1 ? 1 : -1;

    // Set color palette based on player
    const c = GAME_CONFIG.COLORS;
    this.colors =
      playerId === 1
        ? { light: c.TANK_P1_LIGHT, base: c.TANK_P1_BASE, dark: c.TANK_P1_DARK }
        : { light: c.TANK_P2_LIGHT, base: c.TANK_P2_BASE, dark: c.TANK_P2_DARK };

    // Initialize firing parameters
    this.angle = GAME_CONFIG.DEFAULT_ANGLE;
    this.power = GAME_CONFIG.DEFAULT_POWER;
    this.hp = GAME_CONFIG.INITIAL_HP;

    // Create graphics object for drawing
    this.graphics = scene.add.graphics();

    this.draw();
  }

  /**
   * Draw the tank with Metal Slug style pixel art.
   */
  draw(): void {
    this.graphics.clear();

    if (!this.alive) {
      this.drawDestroyed();
      return;
    }

    // Tank dimensions
    const hullWidth = GAME_CONFIG.TANK_WIDTH;
    const hullHeight = 14;
    const trackHeight = 6;
    const totalHeight = hullHeight + trackHeight;

    // Base positions
    const left = this.x - hullWidth / 2;
    const hullTop = this.y - totalHeight;
    const trackTop = this.y - trackHeight;

    // Draw in order: tracks, hull, turret dome, cannon, details
    this.drawTracks(left, trackTop, hullWidth, trackHeight);
    this.drawHull(left, hullTop, hullWidth, hullHeight);
    this.drawTurretDome(this.x, hullTop);
    this.drawCannon(this.x, hullTop);
    this.drawDetails(left, hullTop, hullWidth, hullHeight);
    this.drawHealthBar();
  }

  /**
   * Draw the track assembly (wheels and base).
   */
  private drawTracks(left: number, top: number, width: number, height: number): void {
    const c = GAME_CONFIG.COLORS;

    // Track base (dark rectangle)
    this.graphics.fillStyle(c.TANK_TRACK_DARK);
    this.graphics.fillRect(left + 2, top + height - 3, width - 4, 3);

    // Track body
    this.graphics.fillStyle(c.TANK_TRACK);
    this.graphics.fillRect(left + 1, top + 1, width - 2, height - 2);

    // Draw 3 wheels
    const wheelRadius = 3;
    const wheelY = top + height - wheelRadius;
    const wheelSpacing = (width - 8) / 2;

    for (let i = 0; i < 3; i++) {
      const wheelX = left + 4 + i * wheelSpacing;

      // Wheel shadow
      this.graphics.fillStyle(c.TANK_TRACK_DARK);
      this.graphics.fillCircle(wheelX, wheelY, wheelRadius);

      // Wheel highlight
      this.graphics.fillStyle(c.TANK_TRACK);
      this.graphics.fillCircle(wheelX, wheelY - 1, wheelRadius - 1);

      // Wheel hub
      this.graphics.fillStyle(c.TANK_RIVET);
      this.graphics.fillRect(wheelX - 1, wheelY - 1, 2, 2);
    }
  }

  /**
   * Draw the hull with 3-tone shading.
   */
  private drawHull(left: number, top: number, width: number, height: number): void {
    // Hull shadow (bottom)
    this.graphics.fillStyle(this.colors.dark);
    this.graphics.fillRect(left, top + height - 3, width, 3);

    // Hull body (middle)
    this.graphics.fillStyle(this.colors.base);
    this.graphics.fillRect(left, top + 3, width, height - 6);

    // Hull highlight (top)
    this.graphics.fillStyle(this.colors.light);
    this.graphics.fillRect(left + 2, top, width - 4, 3);

    // Rounded corners (cut off sharp edges)
    this.graphics.fillStyle(0x000000, 0); // Transparent
    // Actually, let's just add corner highlights
    this.graphics.fillStyle(this.colors.light);
    this.graphics.fillRect(left + 1, top + 1, 2, 2);
    this.graphics.fillRect(left + width - 3, top + 1, 2, 2);
  }

  /**
   * Draw the turret dome on top of the hull.
   */
  private drawTurretDome(centerX: number, hullTop: number): void {
    const domeRadius = 8;
    const domeY = hullTop;

    // Dome shadow
    this.graphics.fillStyle(this.colors.dark);
    this.graphics.fillCircle(centerX, domeY, domeRadius);

    // Dome body
    this.graphics.fillStyle(this.colors.base);
    this.graphics.fillCircle(centerX, domeY - 1, domeRadius - 1);

    // Dome highlight
    this.graphics.fillStyle(this.colors.light);
    this.graphics.fillCircle(centerX - 2, domeY - 3, 3);
  }

  /**
   * Draw the cannon barrel that rotates with the angle.
   */
  private drawCannon(centerX: number, hullTop: number): void {
    const c = GAME_CONFIG.COLORS;
    const barrelLength = GAME_CONFIG.TURRET_LENGTH;
    const barrelWidth = 4;

    // Calculate angle
    const angleRad = Phaser.Math.DegToRad(this.angle);
    const effectiveAngle = this.direction === 1 ? angleRad : Math.PI - angleRad;

    // Barrel start position (at dome center)
    const startX = centerX;
    const startY = hullTop;

    // Barrel end position
    const endX = startX + Math.cos(effectiveAngle) * barrelLength;
    const endY = startY - Math.sin(effectiveAngle) * barrelLength;

    // Draw barrel with two lines for thickness
    // Dark underside
    this.graphics.lineStyle(barrelWidth, c.TANK_BARREL_DARK);
    this.graphics.lineBetween(startX, startY + 1, endX, endY + 1);

    // Main barrel
    this.graphics.lineStyle(barrelWidth - 1, c.TANK_BARREL);
    this.graphics.lineBetween(startX, startY, endX, endY);

    // Muzzle (small rectangle at end)
    const muzzleSize = 3;
    this.graphics.fillStyle(c.TANK_BARREL_DARK);
    this.graphics.fillRect(
      endX - muzzleSize / 2,
      endY - muzzleSize / 2,
      muzzleSize,
      muzzleSize
    );
  }

  /**
   * Draw small details like rivets and viewport.
   */
  private drawDetails(
    left: number,
    top: number,
    width: number,
    height: number
  ): void {
    const c = GAME_CONFIG.COLORS;

    // Viewport (small blue rectangle on hull)
    const viewportWidth = 6;
    const viewportHeight = 3;
    const viewportX = this.direction === 1 ? left + 8 : left + width - 8 - viewportWidth;
    const viewportY = top + 5;

    this.graphics.fillStyle(c.TANK_VIEWPORT);
    this.graphics.fillRect(viewportX, viewportY, viewportWidth, viewportHeight);

    // Viewport highlight
    this.graphics.fillStyle(0xaaddff);
    this.graphics.fillRect(viewportX, viewportY, viewportWidth, 1);

    // Rivets (small dots on hull)
    this.graphics.fillStyle(c.TANK_RIVET);

    // Top row of rivets
    for (let i = 0; i < 3; i++) {
      const rivetX = left + 6 + i * 12;
      if (rivetX < left + width - 6) {
        this.graphics.fillRect(rivetX, top + height - 5, 2, 2);
      }
    }
  }

  /**
   * Draw destroyed tank state.
   */
  private drawDestroyed(): void {
    const hullWidth = GAME_CONFIG.TANK_WIDTH;
    const hullHeight = 14;
    const trackHeight = 6;
    const totalHeight = hullHeight + trackHeight;

    const left = this.x - hullWidth / 2;
    const hullTop = this.y - totalHeight;
    const trackTop = this.y - trackHeight;

    // Darkened colors
    const darkGray = 0x333333;
    const darkerGray = 0x222222;

    // Damaged tracks
    this.graphics.fillStyle(darkerGray);
    this.graphics.fillRect(left + 2, trackTop, hullWidth - 4, trackHeight);

    // Damaged hull (slightly tilted effect via offset)
    this.graphics.fillStyle(darkGray);
    this.graphics.fillRect(left + 2, hullTop + 2, hullWidth - 4, hullHeight - 2);

    // Smoke wisps (small dark circles)
    this.graphics.fillStyle(0x555555);
    this.graphics.fillCircle(this.x - 5, hullTop - 3, 3);
    this.graphics.fillCircle(this.x + 3, hullTop - 6, 2);
  }

  /**
   * Draw health bar above the tank.
   */
  private drawHealthBar(): void {
    const barWidth = GAME_CONFIG.TANK_WIDTH + 10;
    const barHeight = 5;
    // Position above turret's maximum height
    const barY = this.y - GAME_CONFIG.TANK_HEIGHT - GAME_CONFIG.TURRET_LENGTH - 12;
    const barX = this.x - barWidth / 2;

    // Background (dark)
    this.graphics.fillStyle(0x222222);
    this.graphics.fillRect(barX, barY, barWidth, barHeight);

    // Health fill
    const hpPercent = this.hp / GAME_CONFIG.INITIAL_HP;
    const fillWidth = Math.max(0, (barWidth - 2) * hpPercent);

    // Color based on health
    let barColor: number;
    if (hpPercent > 0.6) {
      barColor = 0x44dd44; // Green
    } else if (hpPercent > 0.3) {
      barColor = 0xdddd44; // Yellow
    } else {
      barColor = 0xdd4444; // Red
    }

    this.graphics.fillStyle(barColor);
    this.graphics.fillRect(barX + 1, barY + 1, fillWidth, barHeight - 2);

    // Border
    this.graphics.lineStyle(1, 0x000000);
    this.graphics.strokeRect(barX, barY, barWidth, barHeight);
  }

  /**
   * Get the position where projectiles spawn (tip of cannon).
   */
  getTurretTip(): { x: number; y: number } {
    const hullHeight = 14;
    const trackHeight = 6;
    const totalHeight = hullHeight + trackHeight;
    const turretBaseY = this.y - totalHeight;

    const angleRad = Phaser.Math.DegToRad(this.angle);
    const effectiveAngle = this.direction === 1 ? angleRad : Math.PI - angleRad;

    return {
      x: this.x + Math.cos(effectiveAngle) * GAME_CONFIG.TURRET_LENGTH,
      y: turretBaseY - Math.sin(effectiveAngle) * GAME_CONFIG.TURRET_LENGTH,
    };
  }

  /**
   * Get initial velocity components for a fired projectile.
   */
  getFireVelocity(): { vx: number; vy: number } {
    const angleRad = Phaser.Math.DegToRad(this.angle);
    const effectiveAngle = this.direction === 1 ? angleRad : Math.PI - angleRad;

    return {
      vx: Math.cos(effectiveAngle) * this.power,
      vy: -Math.sin(effectiveAngle) * this.power,
    };
  }

  /**
   * Adjust turret angle.
   */
  adjustAngle(delta: number): void {
    this.angle = Phaser.Math.Clamp(
      this.angle + delta,
      GAME_CONFIG.MIN_ANGLE,
      GAME_CONFIG.MAX_ANGLE
    );
    this.draw();
  }

  /**
   * Adjust firing power.
   */
  adjustPower(delta: number): void {
    this.power = Phaser.Math.Clamp(
      this.power + delta,
      GAME_CONFIG.MIN_POWER,
      GAME_CONFIG.MAX_POWER
    );
  }

  /**
   * Take damage.
   */
  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
    }
    this.draw();
  }

  /**
   * Get distance from a point to tank center.
   */
  getDistanceFrom(px: number, py: number): number {
    const centerY = this.y - GAME_CONFIG.TANK_HEIGHT / 2;
    return Phaser.Math.Distance.Between(this.x, centerY, px, py);
  }

  /**
   * Set position.
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.draw();
  }

  /**
   * Check if tank needs to fall.
   */
  checkFalling(groundY: number): boolean {
    if (this.y < groundY && !this.isFalling) {
      this.isFalling = true;
      this.fallVelocity = 0;
      return true;
    }
    return false;
  }

  /**
   * Update falling physics.
   */
  updateFalling(dt: number, groundY: number): boolean {
    if (!this.isFalling) return false;

    this.fallVelocity += GAME_CONFIG.GRAVITY * dt;
    this.y += this.fallVelocity * dt;

    if (this.y >= groundY) {
      this.y = groundY;
      this.isFalling = false;

      const fallSpeed = Math.abs(this.fallVelocity);
      if (fallSpeed > 200) {
        const fallDamage = Math.floor((fallSpeed - 200) / 20);
        if (fallDamage > 0) {
          this.takeDamage(fallDamage);
        }
      }

      this.fallVelocity = 0;
      this.draw();
      return true;
    }

    this.draw();
    return false;
  }

  /**
   * Reset tank to initial state.
   */
  reset(): void {
    this.hp = GAME_CONFIG.INITIAL_HP;
    this.alive = true;
    this.angle = GAME_CONFIG.DEFAULT_ANGLE;
    this.power = GAME_CONFIG.DEFAULT_POWER;
    this.isFalling = false;
    this.fallVelocity = 0;
    this.draw();
  }

  /**
   * Clean up graphics.
   */
  destroy(): void {
    this.graphics.destroy();
  }
}
