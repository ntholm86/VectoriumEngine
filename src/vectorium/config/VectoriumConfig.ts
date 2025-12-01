/**
 * 🎮 VECTORIUM ENGINE - UNIFIED CONFIGURATION
 * 
 * Single source of truth for all engine configuration.
 * Industry-standard approach inspired by PixiJS, Three.js, and Phaser.
 * 
 * Usage:
 * ```typescript
 * const config = new EngineConfig();
 * config.width = 1920;
 * config.height = 1080;
 * config.preferWebGL2 = true;
 * 
 * const engine = new VectoriumBuilder(config)
 *   .withScene('main', scene)
 *   .build();
 * ```
 */

export class EngineConfig {
  // Canvas settings
  canvas?: HTMLCanvasElement;
  width: number = 1280;
  height: number = 720;
  backgroundColor: string = '#000000';
  
  // Rendering settings
  preferWebGL2: boolean = true;
  maxTextureSize: number = 2048;
  useImageBitmap: boolean = true;
  enableAdaptiveQuality: boolean = true;
  initialQuality: 'ultra' | 'high' | 'medium' | 'low' | 'potato' = 'high';
  
  // Performance settings
  targetFPS: number = 60;
  useWorkers: boolean = false;
  maxEntities: number = 8_000_000;
  instancedBatchSize: number = 1_000_000;
  maxBatchSize: number = 65_000;
  
  // Debug settings
  debugMode: boolean = false;
  enableDebugTools: boolean = false;
  exposeGlobals: boolean = false;

  /**
   * Apply high-performance preset
   */
  applyHighPerformance(): this {
    this.initialQuality = 'high';
    this.enableAdaptiveQuality = true;
    this.preferWebGL2 = true;
    this.useImageBitmap = true;
    this.targetFPS = 60;
    this.useWorkers = true;
    return this;
  }

  /**
   * Apply high-quality preset
   */
  applyHighQuality(): this {
    this.initialQuality = 'ultra';
    this.enableAdaptiveQuality = false;
    this.preferWebGL2 = true;
    this.maxTextureSize = 4096;
    this.targetFPS = 60;
    this.useWorkers = false;
    return this;
  }

  /**
   * Apply mobile preset
   */
  applyMobile(): this {
    this.initialQuality = 'medium';
    this.enableAdaptiveQuality = true;
    this.maxTextureSize = 1024;
    this.targetFPS = 30;
    this.useWorkers = false;
    this.maxEntities = 1_000_000;
    return this;
  }

  /**
   * Apply development preset
   */
  applyDevelopment(): this {
    this.debugMode = true;
    this.enableDebugTools = true;
    this.exposeGlobals = true;
    this.initialQuality = 'high';
    this.useWorkers = false;
    return this;
  }

  /**
   * Apply low-end preset
   */
  applyLowEnd(): this {
    this.initialQuality = 'potato';
    this.enableAdaptiveQuality = true;
    this.preferWebGL2 = false;
    this.maxTextureSize = 512;
    this.targetFPS = 30;
    this.maxEntities = 500_000;
    return this;
  }

  /**
   * Apply bunnymark benchmark preset
   */
  applyBunnymark(): this {
    this.width = 800;
    this.height = 600;
    this.preferWebGL2 = true;
    this.initialQuality = 'high';
    this.targetFPS = 60;
    this.maxEntities = 8_000_000;
    this.instancedBatchSize = 2_000_000;
    return this;
  }
}
