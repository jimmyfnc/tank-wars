/**
 * Seeded random number generation utilities.
 * Uses mulberry32 PRNG for fast, reproducible randomness.
 */

/**
 * Mulberry32 seeded PRNG - fast, good distribution.
 * Returns a function that produces random numbers in [0, 1).
 */
export function createRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a random seed from current time and Math.random().
 */
export function generateSeed(): number {
  return Date.now() ^ (Math.random() * 0x100000000);
}

/**
 * Seeded random utility class with convenience methods.
 */
export class SeededRandom {
  private rng: () => number;
  public readonly seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? generateSeed();
    this.rng = createRandom(this.seed);
  }

  /** Random float in [0, 1) */
  random(): number {
    return this.rng();
  }

  /** Random float in [min, max) */
  range(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }

  /** Random integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Random boolean with given probability of true */
  chance(probability: number): boolean {
    return this.rng() < probability;
  }

  /** Pick random element from array */
  pick<T>(array: T[]): T {
    return array[Math.floor(this.rng() * array.length)];
  }
}
