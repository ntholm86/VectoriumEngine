/**
 * Debug tools configuration
 */
export interface DebugToolsConfig {
  performanceMonitor?: boolean;  // Press 'P' - Performance profiler
  entitySpawner?: boolean;        // Press 'E' - Entity spawner
}

/**
 * 🎮 Engine Configuration
 */
export class EngineConfig {
  canvas?: HTMLCanvasElement;
  width = 800;
  height = 600;
  backgroundColor = '#000000';
  preferWebGL2 = true;
  maxTextureSize = 2048;
  useImageBitmap = true;
  enableAdaptiveQuality = true;
  initialQuality: 'ultra' | 'high' | 'medium' | 'low' | 'potato' = 'high';
  targetFPS = 60;
  useWorkers = false;
  // Default ALLOCATION SIZE for SoA arrays and static GPU buffers — not a
  // performance cap. Limits are discovered, never declared (destination
  // constraint 2026-07-05): raise/lower per app via config; GpuParticleSystem
  // allocates independently and is not bound by this value.
  maxEntities = 6_500_000;
  maxBatchSize = 65_000;
  debugMode = false;
  exposeGlobals = false;
  
  /** Granular control over which debug tools are enabled */
  debugTools: DebugToolsConfig = {
    performanceMonitor: false,
    entitySpawner: false
  };

  /** Enable debug mode with all tools */
  debug(): this {
    this.debugMode = true;
    this.exposeGlobals = true;
    this.debugTools = {
      performanceMonitor: true,
      entitySpawner: true
    };
    return this;
  }
  
  /** Enable only performance profiler (for benchmarks) */
  profileOnly(): this {
    this.debugMode = true;
    this.debugTools = {
      performanceMonitor: true,
      entitySpawner: false
    };
    return this;
  }
}

export const ENGINE_CONFIG = {
  maxEntities: 6_500_000,
  maxBatchSize: 65_000,
  instancedBatchSize: 2_000_000,
} as const;
