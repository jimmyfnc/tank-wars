import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';

/**
 * Terrain class - manages heightmap generation, rendering, and collision detection.
 * Uses RenderTexture for destructible terrain with crater carving.
 * Maintains a 1D heightmap array groundY[x] for collision detection.
 */
export class Terrain {
  private scene: Phaser.Scene;
  private renderTexture!: Phaser.GameObjects.RenderTexture;
  private craterBrush!: Phaser.GameObjects.Graphics;

  // The heightmap: groundY[x] = y coordinate of ground surface at x
  public groundY: number[];
  public readonly width: number;
  public readonly height: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.width = GAME_CONFIG.WORLD_WIDTH;
    this.height = GAME_CONFIG.SCREEN_HEIGHT;
    this.groundY = new Array(this.width).fill(0);

    // Create RenderTexture for the terrain (allows erasing/drawing)
    // Position at 0,0 with origin at top-left
    this.renderTexture = scene.add.renderTexture(0, 0, this.width, this.height);
    this.renderTexture.setOrigin(0, 0);

    // Crater brush for erasing (a filled circle) - created once, reused
    this.craterBrush = scene.add.graphics();
    this.craterBrush.setVisible(false);

    this.generate();
    this.draw();
  }

  /**
   * Generate terrain using layered sine waves for a natural rolling hills effect.
   */
  generate(): void {
    const baseHeight = GAME_CONFIG.TERRAIN_BASE_HEIGHT;
    const variation = GAME_CONFIG.TERRAIN_VARIATION;

    for (let x = 0; x < this.width; x++) {
      // Layered sine waves for organic-looking terrain
      const wave1 = Math.sin(x * 0.01) * variation * 0.5;
      const wave2 = Math.sin(x * 0.02 + 1.5) * variation * 0.3;
      const wave3 = Math.sin(x * 0.05 + 3.0) * variation * 0.2;

      // Combine waves and add base height
      this.groundY[x] = baseHeight + wave1 + wave2 + wave3;
    }

    // Ensure edges are reasonable for tank placement
    this.smoothEdges();
  }

  /**
   * Smooth the terrain at edges to ensure tanks can be placed properly
   */
  private smoothEdges(): void {
    const flatWidth = 60;

    // Left side
    const leftAvg = this.groundY[flatWidth];
    for (let x = 0; x < flatWidth; x++) {
      const t = x / flatWidth;
      this.groundY[x] = Phaser.Math.Linear(leftAvg, this.groundY[flatWidth], t);
    }

    // Right side
    const rightStart = this.width - flatWidth;
    const rightAvg = this.groundY[rightStart];
    for (let x = rightStart; x < this.width; x++) {
      const t = (x - rightStart) / flatWidth;
      this.groundY[x] = Phaser.Math.Linear(rightAvg, this.groundY[this.width - 1], t);
    }
  }

  /**
   * Draw the terrain to the RenderTexture with gradient effect.
   * Uses beginDraw/endDraw for direct drawing to RenderTexture.
   */
  draw(): void {
    // Clear the render texture
    this.renderTexture.clear();

    // Begin batch drawing directly to the RenderTexture
    this.renderTexture.beginDraw();

    // Create a temporary graphics for drawing
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);

    // Draw terrain as vertical columns for crisp pixel look
    for (let x = 0; x < this.width; x++) {
      const groundTop = this.groundY[x];
      const columnHeight = this.height - groundTop;

      if (columnHeight <= 0) continue;

      // Gradient from green (top) to brown (bottom)
      const gradientSteps = Math.max(1, Math.ceil(columnHeight / 10));
      const stepHeight = columnHeight / gradientSteps;

      for (let i = 0; i < gradientSteps; i++) {
        const t = i / Math.max(1, gradientSteps - 1);
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(GAME_CONFIG.COLORS.TERRAIN_TOP),
          Phaser.Display.Color.ValueToColor(GAME_CONFIG.COLORS.TERRAIN_BOTTOM),
          1,
          t
        );

        g.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
        g.fillRect(x, groundTop + i * stepHeight, 1, stepHeight + 1);
      }
    }

    // Draw the graphics to the render texture at position 0,0
    this.renderTexture.batchDraw(g, 0, 0);

    this.renderTexture.endDraw();

    // Clean up the temporary graphics
    g.destroy();
  }

  /**
   * Check if a point is below ground (collision).
   */
  isUnderground(x: number, y: number): boolean {
    // Out of horizontal bounds - no collision
    if (x < 0 || x >= this.width) {
      return false;
    }

    // Above screen - no collision yet
    if (y < 0) {
      return false;
    }

    // Use heightmap for fast collision
    const groundHeight = this.groundY[Math.floor(x)];

    // Check collision with terrain OR if below screen bottom
    // (screen bottom is always considered "ground" for collision purposes)
    return y >= groundHeight || y >= this.height;
  }

  /**
   * Get the ground height at a specific x position.
   */
  getGroundY(x: number): number {
    if (x < 0 || x >= this.width) {
      return GAME_CONFIG.SCREEN_HEIGHT;
    }
    return this.groundY[Math.floor(x)];
  }

  /**
   * Raycast from start to end point, checking for terrain collision.
   * Used to prevent fast projectiles from tunneling through terrain.
   * @returns Impact point {x, y} if collision found, null otherwise
   */
  raycastCollision(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): { x: number; y: number } | null {
    // Calculate distance and step count
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check every pixel along the path (ensures no tunneling)
    const steps = Math.max(1, Math.ceil(distance));
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 0; i <= steps; i++) {
      const x = startX + stepX * i;
      const y = startY + stepY * i;

      if (this.isUnderground(x, y)) {
        return { x, y };
      }
    }

    return null;
  }

  /**
   * Create a crater at the specified position.
   * Erases terrain from the RenderTexture and updates the heightmap.
   */
  createCrater(cx: number, cy: number, radius: number): void {
    // Prepare the crater brush (filled circle for erasing)
    this.craterBrush.clear();
    this.craterBrush.fillStyle(0xffffff, 1);
    this.craterBrush.fillCircle(radius, radius, radius);

    // Erase the crater from the render texture
    this.renderTexture.erase(this.craterBrush, cx - radius, cy - radius);

    // Update the heightmap for affected columns
    this.updateHeightmapAfterCrater(cx, cy, radius);
  }

  /**
   * Update the heightmap array after a crater is created.
   */
  private updateHeightmapAfterCrater(cx: number, cy: number, radius: number): void {
    const startX = Math.max(0, Math.floor(cx - radius));
    const endX = Math.min(this.width - 1, Math.ceil(cx + radius));

    for (let x = startX; x <= endX; x++) {
      const dx = x - cx;
      const halfChord = Math.sqrt(Math.max(0, radius * radius - dx * dx));

      const craterTop = cy - halfChord;
      const craterBottom = cy + halfChord;
      const currentGround = this.groundY[x];

      // If crater intersects current ground level, update heightmap
      if (craterBottom >= currentGround && craterTop < this.height) {
        if (craterBottom > currentGround) {
          this.groundY[x] = Math.min(this.height, craterBottom);
        }
      }
    }
  }

  /**
   * Reset and regenerate terrain
   */
  reset(): void {
    this.generate();
    this.draw();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.renderTexture.destroy();
    this.craterBrush.destroy();
  }
}
