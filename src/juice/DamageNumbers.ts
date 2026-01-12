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
