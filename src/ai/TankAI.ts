import { Tank } from '../entities/Tank';
import { GAME_CONFIG } from '../config';
import Phaser from 'phaser';

/**
 * AI Personality types
 */
export enum AIPersonality {
  SHARPSHOOTER = 'Sharpshooter',
  ARTILLERY = 'Artillery',
  DRUNK = 'Drunk'
}

/**
 * Personality configuration
 */
interface PersonalityConfig {
  name: string;
  accuracy: number;           // 0-1, how accurate the shot is
  thinkDuration: number;      // ms to "think" before firing
  preferredAngleMin: number;  // preferred angle range
  preferredAngleMax: number;
  powerBias: number;          // -1 to 1, negative = lower power, positive = higher
  erraticAiming: boolean;     // wobble while aiming
}

const PERSONALITIES: Record<AIPersonality, PersonalityConfig> = {
  [AIPersonality.SHARPSHOOTER]: {
    name: 'Sharpshooter',
    accuracy: 0.92,
    thinkDuration: 2000,
    preferredAngleMin: 30,
    preferredAngleMax: 60,
    powerBias: 0,
    erraticAiming: false
  },
  [AIPersonality.ARTILLERY]: {
    name: 'Artillery',
    accuracy: 0.75,
    thinkDuration: 1800,
    preferredAngleMin: 55,
    preferredAngleMax: 80,
    powerBias: 0.3,  // prefers higher power
    erraticAiming: false
  },
  [AIPersonality.DRUNK]: {
    name: 'Drunk',
    accuracy: 0.4,
    thinkDuration: 2500,
    preferredAngleMin: 10,
    preferredAngleMax: 85,
    powerBias: 0,
    erraticAiming: true
  }
};

/**
 * TankAI - AI for computer-controlled tank with different personalities
 * Calculates angle and power to hit the target tank
 */
export class TankAI {
  private tank: Tank;
  private targetTank: Tank;
  private thinkingTime: number = 0;
  private hasDecided: boolean = false;
  private targetAngle: number = 45;
  private targetPower: number = 300;

  // AI personality
  private personality: AIPersonality;
  private config: PersonalityConfig;

  // For drunk wobble effect
  private wobbleOffset: number = 0;
  private wobbleTimer: number = 0;

  // Starting values for interpolation
  private startAngle: number = GAME_CONFIG.DEFAULT_ANGLE;
  private startPower: number = GAME_CONFIG.DEFAULT_POWER;

  constructor(tank: Tank, targetTank: Tank, personality: AIPersonality = AIPersonality.SHARPSHOOTER) {
    this.tank = tank;
    this.targetTank = targetTank;
    this.personality = personality;
    this.config = PERSONALITIES[personality];
  }

  /**
   * Get the personality name for display
   */
  getPersonalityName(): string {
    return this.config.name;
  }

  /**
   * Update the target reference (in case tanks move)
   */
  setTarget(targetTank: Tank): void {
    this.targetTank = targetTank;
  }

  /**
   * Change personality
   */
  setPersonality(personality: AIPersonality): void {
    this.personality = personality;
    this.config = PERSONALITIES[personality];
  }

  /**
   * Start the AI's turn - calculate trajectory
   */
  startTurn(wind: number): void {
    this.thinkingTime = 0;
    this.hasDecided = false;
    this.wobbleTimer = 0;

    // Store starting values for smooth interpolation
    this.startAngle = this.tank.angle;
    this.startPower = this.tank.power;

    // Calculate the shot
    this.calculateShot(wind);
  }

  /**
   * Update AI thinking - returns true when ready to fire
   */
  update(dt: number): boolean {
    if (this.hasDecided) return true;

    this.thinkingTime += dt * 1000;

    // Gradually adjust angle and power toward target
    const progress = Math.min(1, this.thinkingTime / this.config.thinkDuration);

    // Use faster interpolation speed for visible turret movement
    const lerpSpeed = Math.min(1, progress * 1.5);

    let displayAngle = Phaser.Math.Linear(this.startAngle, this.targetAngle, lerpSpeed);
    let displayPower = Phaser.Math.Linear(this.startPower, this.targetPower, lerpSpeed);

    // Drunk wobble effect
    if (this.config.erraticAiming && progress < 0.9) {
      this.wobbleTimer += dt;
      this.wobbleOffset = Math.sin(this.wobbleTimer * 8) * 15 * (1 - progress);
      displayAngle += this.wobbleOffset;

      // Occasional power wobble too
      const powerWobble = Math.sin(this.wobbleTimer * 5 + 1) * 50 * (1 - progress);
      displayPower += powerWobble;
    }

    // Update tank's angle and power
    this.tank.angle = Phaser.Math.Clamp(displayAngle, GAME_CONFIG.MIN_ANGLE, GAME_CONFIG.MAX_ANGLE);
    this.tank.power = Phaser.Math.Clamp(displayPower, GAME_CONFIG.MIN_POWER, GAME_CONFIG.MAX_POWER);

    // Redraw tank to show turret movement
    this.tank.draw();

    // Ready to fire after thinking time
    if (this.thinkingTime >= this.config.thinkDuration) {
      // Set final values (no wobble)
      this.tank.angle = Phaser.Math.Clamp(this.targetAngle, GAME_CONFIG.MIN_ANGLE, GAME_CONFIG.MAX_ANGLE);
      this.tank.power = Phaser.Math.Clamp(this.targetPower, GAME_CONFIG.MIN_POWER, GAME_CONFIG.MAX_POWER);
      this.tank.draw();

      this.hasDecided = true;
      return true;
    }

    return false;
  }

  /**
   * Calculate the angle and power needed to hit the target
   * Uses brute-force simulation to find best angle/power combination
   */
  private calculateShot(wind: number): void {
    let bestAngle = 45;
    let bestPower = 300;
    let bestError = Infinity;

    // Angle range based on personality
    const angleMin = this.config.preferredAngleMin;
    const angleMax = this.config.preferredAngleMax;

    // Search through angles
    for (let angle = angleMin; angle <= angleMax; angle += 3) {
      for (let power = GAME_CONFIG.MIN_POWER; power <= GAME_CONFIG.MAX_POWER; power += 15) {
        // Apply power bias
        const biasedPower = power + (GAME_CONFIG.MAX_POWER - GAME_CONFIG.MIN_POWER) * 0.2 * this.config.powerBias;

        // Simulate the shot
        const result = this.simulateShot(angle, biasedPower, wind);

        // Calculate error (how far from target)
        const errorX = Math.abs(result.x - this.targetTank.x);
        const errorY = Math.abs(result.y - this.targetTank.y);
        const totalError = errorX + errorY * 0.5;

        if (totalError < bestError) {
          bestError = totalError;
          bestAngle = angle;
          bestPower = biasedPower;
        }
      }
    }

    // Add inaccuracy based on personality
    const angleError = (Math.random() - 0.5) * 30 * (1 - this.config.accuracy);
    const powerError = (Math.random() - 0.5) * 150 * (1 - this.config.accuracy);

    // Drunk has extra random chance to aim completely wrong
    let drunkMiss = 0;
    if (this.personality === AIPersonality.DRUNK && Math.random() < 0.2) {
      drunkMiss = (Math.random() - 0.5) * 40;
    }

    this.targetAngle = Phaser.Math.Clamp(
      bestAngle + angleError + drunkMiss,
      GAME_CONFIG.MIN_ANGLE,
      GAME_CONFIG.MAX_ANGLE
    );

    this.targetPower = Phaser.Math.Clamp(
      bestPower + powerError,
      GAME_CONFIG.MIN_POWER,
      GAME_CONFIG.MAX_POWER
    );
  }

  /**
   * Simulate a shot and return where it lands
   */
  private simulateShot(angle: number, power: number, wind: number): { x: number; y: number } {
    const angleRad = Phaser.Math.DegToRad(angle);
    const direction = this.tank.direction;
    const effectiveAngle = direction === 1 ? angleRad : Math.PI - angleRad;

    let x = this.tank.x;
    let y = this.tank.y - GAME_CONFIG.TANK_HEIGHT;
    let vx = Math.cos(effectiveAngle) * power;
    let vy = -Math.sin(effectiveAngle) * power;

    const dt = 0.016;
    const maxSteps = 1000;

    for (let i = 0; i < maxSteps; i++) {
      vy += GAME_CONFIG.GRAVITY * dt;
      vx += wind * dt;

      x += vx * dt;
      y += vy * dt;

      // Check if hit ground
      if (y >= GAME_CONFIG.TERRAIN_BASE_HEIGHT - 50) {
        return { x, y };
      }

      // Out of bounds
      if (x < 0 || x > GAME_CONFIG.WORLD_WIDTH || y > GAME_CONFIG.SCREEN_HEIGHT) {
        return { x, y };
      }
    }

    return { x, y };
  }

  /**
   * Reset for new turn
   */
  reset(): void {
    this.thinkingTime = 0;
    this.hasDecided = false;
    this.wobbleTimer = 0;
    this.wobbleOffset = 0;
  }
}
