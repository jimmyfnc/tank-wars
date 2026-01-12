import Phaser from 'phaser';
import {
  GAME_CONFIG,
  TERRAIN_PRESETS,
  type TerrainPreset,
} from '../config';
import { SeededRandom } from '../utils/random';

/** Embedded rock data for rendering */
interface Rock {
  x: number;
  y: number;
  size: number;
}

/**
 * Terrain class - manages heightmap generation, rendering, and collision detection.
 * Uses RenderTexture for destructible terrain with crater carving.
 * Maintains a 1D heightmap array groundY[x] for collision detection.
 *
 * Features:
 * - Seeded procedural generation with midpoint displacement
 * - SNES-style three-layer rendering (grass, dirt, stone)
 * - Embedded rocks in dirt layer
 */
export class Terrain {
  private scene: Phaser.Scene;
  private renderTexture!: Phaser.GameObjects.RenderTexture;
  private craterBrush!: Phaser.GameObjects.Graphics;

  // The heightmap: groundY[x] = y coordinate of ground surface at x
  public groundY: number[];
  public readonly width: number;
  public readonly height: number;

  // Terrain generation state
  private rng: SeededRandom;
  private preset: TerrainPreset;
  public readonly seed: number;

  // Embedded rocks for rendering
  private rocks: Rock[] = [];

  constructor(
    scene: Phaser.Scene,
    preset: TerrainPreset = 'rolling_hills',
    seed?: number
  ) {
    this.scene = scene;
    this.width = GAME_CONFIG.WORLD_WIDTH;
    this.height = GAME_CONFIG.SCREEN_HEIGHT;
    this.groundY = new Array(this.width).fill(0);
    this.preset = preset;

    // Initialize seeded RNG
    this.rng = new SeededRandom(seed);
    this.seed = this.rng.seed;

    // Create RenderTexture for the terrain (allows erasing/drawing)
    this.renderTexture = scene.add.renderTexture(0, 0, this.width, this.height);
    this.renderTexture.setOrigin(0, 0);

    // Crater brush for erasing (a filled circle) - created once, reused
    this.craterBrush = scene.add.graphics();
    this.craterBrush.setVisible(false);

    this.generate();
    this.generateRocks();
    this.draw();
  }

  /**
   * Generate terrain using midpoint displacement algorithm.
   * Creates natural-looking rolling hills with configurable roughness.
   */
  generate(): void {
    const params = TERRAIN_PRESETS[this.preset];
    const { baseHeight, variation, roughness } = params;

    // Start with endpoints
    this.groundY[0] = baseHeight + this.rng.range(-variation * 0.3, variation * 0.3);
    this.groundY[this.width - 1] = baseHeight + this.rng.range(-variation * 0.3, variation * 0.3);

    // Midpoint displacement
    this.midpointDisplace(0, this.width - 1, variation, roughness);

    // Apply preset-specific features
    if (this.preset === 'cratered') {
      this.addCraters();
    }

    // Ensure edges are flat for tank placement
    this.smoothEdges();

    // Clamp to screen bounds
    for (let x = 0; x < this.width; x++) {
      this.groundY[x] = Phaser.Math.Clamp(this.groundY[x], 100, this.height - 50);
    }
  }

  /**
   * Recursive midpoint displacement for terrain generation.
   */
  private midpointDisplace(
    left: number,
    right: number,
    variation: number,
    roughness: number
  ): void {
    if (right - left < 2) return;

    const mid = Math.floor((left + right) / 2);
    const avg = (this.groundY[left] + this.groundY[right]) / 2;

    // Displace midpoint by random amount scaled by current variation
    this.groundY[mid] = avg + this.rng.range(-variation, variation);

    // Reduce variation for next level (roughness controls how fast)
    const newVariation = variation * roughness;

    // Recurse on both halves
    this.midpointDisplace(left, mid, newVariation, roughness);
    this.midpointDisplace(mid, right, newVariation, roughness);
  }

  /**
   * Add crater-like depressions for the 'cratered' preset.
   */
  private addCraters(): void {
    const craterCount = this.rng.int(3, 6);

    for (let i = 0; i < craterCount; i++) {
      const cx = this.rng.int(100, this.width - 100);
      const radius = this.rng.int(30, 60);
      const depth = this.rng.range(20, 40);

      // Create smooth crater depression
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x < 0 || x >= this.width) continue;

        const dx = x - cx;
        const t = 1 - (dx * dx) / (radius * radius);
        if (t > 0) {
          this.groundY[x] += depth * Math.sqrt(t);
        }
      }
    }
  }

  /**
   * Smooth the terrain at edges to ensure tanks can be placed properly.
   */
  private smoothEdges(): void {
    const flatWidth = 60;

    // Left side - flatten to a consistent height
    const leftTarget = this.groundY[flatWidth];
    for (let x = 0; x < flatWidth; x++) {
      const t = x / flatWidth;
      // Ease in to the target height
      this.groundY[x] = Phaser.Math.Linear(leftTarget, this.groundY[flatWidth], t * t);
    }

    // Right side - flatten to a consistent height
    const rightStart = this.width - flatWidth;
    const rightTarget = this.groundY[rightStart];
    for (let x = rightStart; x < this.width; x++) {
      const t = (x - rightStart) / flatWidth;
      // Ease out from the terrain height
      this.groundY[x] = Phaser.Math.Linear(rightTarget, rightTarget, 1 - (1 - t) * (1 - t));
    }
  }

  /**
   * Generate embedded rocks in the dirt layer.
   */
  private generateRocks(): void {
    this.rocks = [];

    const { ROCK_MIN_SIZE, ROCK_MAX_SIZE, ROCK_DENSITY, GRASS_DEPTH, DIRT_DEPTH } =
      GAME_CONFIG.TERRAIN;

    // Generate rocks throughout the terrain
    for (let x = 0; x < this.width; x += 4) {
      const groundTop = this.groundY[x];

      // Only place rocks in dirt layer (below grass, above stone)
      const dirtStart = groundTop + GRASS_DEPTH;
      const dirtEnd = groundTop + DIRT_DEPTH;

      for (let y = dirtStart; y < dirtEnd && y < this.height; y += 4) {
        // Density increases with depth (more rocks near stone layer)
        const depthFactor = (y - dirtStart) / (dirtEnd - dirtStart);
        const adjustedDensity = ROCK_DENSITY * (0.5 + depthFactor);

        if (this.rng.chance(adjustedDensity)) {
          this.rocks.push({
            x: x + this.rng.int(-1, 1),
            y: y + this.rng.int(-1, 1),
            size: this.rng.int(ROCK_MIN_SIZE, ROCK_MAX_SIZE),
          });
        }
      }
    }
  }

  /**
   * Draw the terrain to the RenderTexture with SNES-style layered rendering.
   */
  draw(): void {
    this.renderTexture.clear();
    this.renderTexture.beginDraw();

    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    const { GRASS_DEPTH, DIRT_DEPTH } = GAME_CONFIG.TERRAIN;
    const colors = GAME_CONFIG.COLORS;

    // Draw terrain column by column
    for (let x = 0; x < this.width; x++) {
      const groundTop = this.groundY[x];
      const columnHeight = this.height - groundTop;

      if (columnHeight <= 0) continue;

      // Layer 1: Grass (top 3 pixels)
      const grassEnd = Math.min(groundTop + GRASS_DEPTH, this.height);
      if (grassEnd > groundTop) {
        // Bright grass top
        g.fillStyle(colors.TERRAIN_GRASS_LIGHT);
        g.fillRect(x, groundTop, 1, 1);

        // Darker grass edge
        if (grassEnd - groundTop > 1) {
          g.fillStyle(colors.TERRAIN_GRASS_DARK);
          g.fillRect(x, groundTop + 1, 1, grassEnd - groundTop - 1);
        }
      }

      // Layer 2: Dirt (next ~77 pixels)
      const dirtStart = grassEnd;
      const dirtEnd = Math.min(groundTop + DIRT_DEPTH, this.height);
      if (dirtEnd > dirtStart) {
        // Draw dirt with subtle vertical variation
        for (let y = dirtStart; y < dirtEnd; y++) {
          const depth = y - groundTop;
          const depthRatio = depth / DIRT_DEPTH;

          // Transition from light to dark dirt
          let dirtColor: number;
          if (depthRatio < 0.3) {
            dirtColor = colors.TERRAIN_DIRT_LIGHT;
          } else if (depthRatio < 0.7) {
            dirtColor = colors.TERRAIN_DIRT_MID;
          } else {
            dirtColor = colors.TERRAIN_DIRT_DARK;
          }

          g.fillStyle(dirtColor);
          g.fillRect(x, y, 1, 1);
        }
      }

      // Layer 3: Stone (everything below dirt)
      const stoneStart = dirtEnd;
      if (stoneStart < this.height) {
        // Draw stone with depth-based shading
        for (let y = stoneStart; y < this.height; y++) {
          const stoneDepth = y - stoneStart;
          let stoneColor: number;

          if (stoneDepth < 20) {
            stoneColor = colors.TERRAIN_STONE_LIGHT;
          } else if (stoneDepth < 50) {
            stoneColor = colors.TERRAIN_STONE_MID;
          } else {
            stoneColor = colors.TERRAIN_STONE_DARK;
          }

          g.fillStyle(stoneColor);
          g.fillRect(x, y, 1, 1);
        }
      }
    }

    // Draw embedded rocks
    this.drawRocks(g);

    this.renderTexture.batchDraw(g, 0, 0);
    this.renderTexture.endDraw();
    g.destroy();
  }

  /**
   * Draw embedded rocks with highlight/shadow effect.
   */
  private drawRocks(g: Phaser.GameObjects.Graphics): void {
    const colors = GAME_CONFIG.COLORS;

    for (const rock of this.rocks) {
      // Only draw rocks that are within current terrain
      if (rock.y < this.groundY[Math.floor(rock.x)]) continue;
      if (rock.y > this.height) continue;

      const { x, y, size } = rock;

      // Rock body (mid gray)
      g.fillStyle(colors.TERRAIN_ROCK_MID);
      g.fillRect(x, y, size, size);

      // Highlight (top-left pixel)
      g.fillStyle(colors.TERRAIN_ROCK_LIGHT);
      g.fillRect(x, y, 1, 1);

      // Shadow (bottom-right)
      if (size > 2) {
        g.fillStyle(colors.TERRAIN_ROCK_DARK);
        g.fillRect(x + size - 1, y + size - 1, 1, 1);
      }
    }
  }

  /**
   * Check if a point is below ground (collision).
   */
  isUnderground(x: number, y: number): boolean {
    if (x < 0 || x >= this.width) return false;
    if (y < 0) return false;

    const groundHeight = this.groundY[Math.floor(x)];
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
   * @returns Impact point {x, y} if collision found, null otherwise
   */
  raycastCollision(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): { x: number; y: number } | null {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
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
   */
  createCrater(cx: number, cy: number, radius: number): void {
    this.craterBrush.clear();
    this.craterBrush.fillStyle(0xffffff, 1);
    this.craterBrush.fillCircle(radius, radius, radius);

    this.renderTexture.erase(this.craterBrush, cx - radius, cy - radius);
    this.updateHeightmapAfterCrater(cx, cy, radius);

    // Remove rocks that were in the crater
    this.rocks = this.rocks.filter((rock) => {
      const dx = rock.x - cx;
      const dy = rock.y - cy;
      return dx * dx + dy * dy > radius * radius;
    });
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

      if (craterBottom >= currentGround && craterTop < this.height) {
        if (craterBottom > currentGround) {
          this.groundY[x] = Math.min(this.height, craterBottom);
        }
      }
    }
  }

  /**
   * Reset and regenerate terrain with a new seed.
   */
  reset(newSeed?: number): void {
    this.rng = new SeededRandom(newSeed);
    this.generate();
    this.generateRocks();
    this.draw();
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.renderTexture.destroy();
    this.craterBrush.destroy();
  }
}
