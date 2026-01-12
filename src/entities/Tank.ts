import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';

/**
 * Tank entity - represents a player's tank with base, turret, health, and firing capabilities.
 * The turret rotates independently of the base.
 */
export class Tank {
  private graphics: Phaser.GameObjects.Graphics;

  // Position (center of tank base)
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
  public readonly color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, playerId: number) {
    this.x = x;
    this.y = y;
    this.playerId = playerId;

    // Player 1 on left faces right, Player 2 on right faces left
    this.direction = playerId === 1 ? 1 : -1;

    // Set color based on player
    this.color = playerId === 1 ? GAME_CONFIG.COLORS.TANK_P1 : GAME_CONFIG.COLORS.TANK_P2;

    // Initialize firing parameters
    this.angle = GAME_CONFIG.DEFAULT_ANGLE;
    this.power = GAME_CONFIG.DEFAULT_POWER;
    this.hp = GAME_CONFIG.INITIAL_HP;

    // Create graphics object for drawing
    this.graphics = scene.add.graphics();

    this.draw();
  }

  /**
   * Draw the tank (base + turret + health bar)
   */
  draw(): void {
    this.graphics.clear();

    if (!this.alive) {
      // Draw destroyed tank (darker, no turret)
      this.graphics.fillStyle(0x333333);
      this.graphics.fillRect(
        this.x - GAME_CONFIG.TANK_WIDTH / 2,
        this.y - GAME_CONFIG.TANK_HEIGHT,
        GAME_CONFIG.TANK_WIDTH,
        GAME_CONFIG.TANK_HEIGHT
      );
      return;
    }

    // Draw tank base (rectangle)
    this.graphics.fillStyle(this.color);
    this.graphics.fillRect(
      this.x - GAME_CONFIG.TANK_WIDTH / 2,
      this.y - GAME_CONFIG.TANK_HEIGHT,
      GAME_CONFIG.TANK_WIDTH,
      GAME_CONFIG.TANK_HEIGHT
    );

    // Draw turret (line from center-top of tank)
    const turretBaseX = this.x;
    const turretBaseY = this.y - GAME_CONFIG.TANK_HEIGHT;

    // Calculate turret end position based on angle
    // In Phaser, y+ is down, so we negate the sin component
    // Angle 0 = right, 90 = straight up, 180 = left
    const angleRad = Phaser.Math.DegToRad(this.angle);

    // Adjust angle based on direction tank is facing
    const effectiveAngle = this.direction === 1 ? angleRad : Math.PI - angleRad;

    const turretEndX = turretBaseX + Math.cos(effectiveAngle) * GAME_CONFIG.TURRET_LENGTH;
    const turretEndY = turretBaseY - Math.sin(effectiveAngle) * GAME_CONFIG.TURRET_LENGTH;

    // Draw turret as a thick line
    this.graphics.lineStyle(GAME_CONFIG.TURRET_WIDTH, GAME_CONFIG.COLORS.TURRET);
    this.graphics.lineBetween(turretBaseX, turretBaseY, turretEndX, turretEndY);

    // Draw a small circle at turret base for visual appeal
    this.graphics.fillStyle(GAME_CONFIG.COLORS.TURRET);
    this.graphics.fillCircle(turretBaseX, turretBaseY, 5);

    // Draw health bar above tank
    this.drawHealthBar();
  }

  /**
   * Draw health bar above the tank
   */
  private drawHealthBar(): void {
    const barWidth = GAME_CONFIG.TANK_WIDTH + 10;
    const barHeight = 6;
    // Position health bar above the turret's maximum height (when pointing straight up)
    const barY = this.y - GAME_CONFIG.TANK_HEIGHT - GAME_CONFIG.TURRET_LENGTH - 8;
    const barX = this.x - barWidth / 2;

    // Background (dark)
    this.graphics.fillStyle(0x333333);
    this.graphics.fillRect(barX, barY, barWidth, barHeight);

    // Health fill (green to red based on HP)
    const hpPercent = this.hp / GAME_CONFIG.INITIAL_HP;
    const fillWidth = barWidth * hpPercent;

    // Color: green when healthy, yellow when medium, red when low
    let barColor: number;
    if (hpPercent > 0.6) {
      barColor = 0x00ff00; // Green
    } else if (hpPercent > 0.3) {
      barColor = 0xffff00; // Yellow
    } else {
      barColor = 0xff0000; // Red
    }

    this.graphics.fillStyle(barColor);
    this.graphics.fillRect(barX, barY, fillWidth, barHeight);

    // Border
    this.graphics.lineStyle(1, 0x000000);
    this.graphics.strokeRect(barX, barY, barWidth, barHeight);
  }

  /**
   * Get the position where projectiles spawn (tip of turret)
   */
  getTurretTip(): { x: number; y: number } {
    const turretBaseX = this.x;
    const turretBaseY = this.y - GAME_CONFIG.TANK_HEIGHT;

    const angleRad = Phaser.Math.DegToRad(this.angle);
    const effectiveAngle = this.direction === 1 ? angleRad : Math.PI - angleRad;

    return {
      x: turretBaseX + Math.cos(effectiveAngle) * GAME_CONFIG.TURRET_LENGTH,
      y: turretBaseY - Math.sin(effectiveAngle) * GAME_CONFIG.TURRET_LENGTH
    };
  }

  /**
   * Get initial velocity components for a fired projectile
   */
  getFireVelocity(): { vx: number; vy: number } {
    const angleRad = Phaser.Math.DegToRad(this.angle);
    const effectiveAngle = this.direction === 1 ? angleRad : Math.PI - angleRad;

    return {
      vx: Math.cos(effectiveAngle) * this.power,
      vy: -Math.sin(effectiveAngle) * this.power // negative because y+ is down
    };
  }

  /**
   * Adjust turret angle
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
   * Adjust firing power
   */
  adjustPower(delta: number): void {
    this.power = Phaser.Math.Clamp(
      this.power + delta,
      GAME_CONFIG.MIN_POWER,
      GAME_CONFIG.MAX_POWER
    );
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
      this.draw();
    }
  }

  /**
   * Check if a point is within damage range of this tank
   */
  getDistanceFrom(px: number, py: number): number {
    // Use center of tank for distance calculation
    const centerY = this.y - GAME_CONFIG.TANK_HEIGHT / 2;
    return Phaser.Math.Distance.Between(this.x, centerY, px, py);
  }

  /**
   * Set position (for placing on terrain)
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.draw();
  }

  /**
   * Check if tank needs to fall and start falling if so.
   * @param groundY - Current ground level at tank's x position
   * @returns true if tank started falling
   */
  checkFalling(groundY: number): boolean {
    // If tank is above ground (gap beneath), start falling
    if (this.y < groundY && !this.isFalling) {
      this.isFalling = true;
      this.fallVelocity = 0;
      return true;
    }
    return false;
  }

  /**
   * Update falling physics
   * @param dt - Delta time in seconds
   * @param groundY - Current ground level at tank's x position
   * @returns true if tank landed this frame
   */
  updateFalling(dt: number, groundY: number): boolean {
    if (!this.isFalling) return false;

    // Apply gravity to fall velocity
    this.fallVelocity += GAME_CONFIG.GRAVITY * dt;

    // Update position
    this.y += this.fallVelocity * dt;

    // Check if landed
    if (this.y >= groundY) {
      this.y = groundY;
      this.isFalling = false;

      // Apply fall damage based on velocity
      const fallSpeed = Math.abs(this.fallVelocity);
      if (fallSpeed > 200) {
        // Take damage proportional to fall speed
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
   * Reset tank to initial state
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
   * Clean up graphics
   */
  destroy(): void {
    this.graphics.destroy();
  }
}
