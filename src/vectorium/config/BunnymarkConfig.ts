/**
 * 🐰 BUNNYMARK STANDARD CONFIGURATION
 * Shared configuration for all bunnymark benchmarks
 * Following industry standard (PixiJS, Phaser, etc.)
 */

export const BUNNYMARK_CONFIG = {
  canvas: { width: 800, height: 600 },
  entity: { width: 26, height: 37 },
  physics: {
    gravity: true,
    bounce: true,
    collision: false // Bunnymark standard: NO entity-entity collision
  },
  velocity: {
    min: 400,  // Minimum spawn velocity
    max: 600   // Maximum spawn velocity
  },
  jump: {
    strength: { min: 400, max: 900 },  // Jump velocity range
    threshold: 200  // Velocity threshold to trigger jump (higher = jumps sooner)
  },
  progressive: true,
  spawnIncrement: 500, // Add 800 bunnies per batch
  spawnInterval: 100, // Milliseconds between batches
  targetFPS: 60
} as const;
