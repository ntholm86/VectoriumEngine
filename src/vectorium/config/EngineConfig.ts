/**
 * 🎮 VECTORIUM ENGINE CONFIGURATION
 * Centralized configuration for engine-wide settings
 */

export const ENGINE_CONFIG = {
  /**
   * Maximum entity capacity for the engine
   * This determines memory allocation for:
   * - World entity arrays (positions, velocities, etc.)
   * - Scene visible indices and scaled sizes
   * - WASM physics buffers
   * - Renderer sort buffer
   * - Instanced sprite renderer static buffers
   * 
   * Default: 3M entities (balance between memory and performance)
   * Memory impact: ~180MB for entity arrays at 3M capacity
   */
  maxEntities: 8_000_000,
  
  /**
   * Default batch size for instanced rendering
   * Higher = fewer draw calls but more memory per batch
   * Lower = more draw calls but less memory
   * 
   * Default: 1M (optimal for 3M total entities = 3 draw calls)
   */
  instancedBatchSize: 1_000_000,
  
  /**
   * Maximum sprite batch size for regular batching
   * WebGL ES 2.0 limit: 65535 (Uint16 indices)
   * WebGL 2.0 limit: Much higher (Uint32), but 65K is optimal
   */
  maxBatchSize: 65_000,
} as const;

export type EngineConfig = typeof ENGINE_CONFIG;
