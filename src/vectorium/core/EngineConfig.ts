/**
 * Debug tools configuration
 */
export interface DebugToolsConfig {
  performanceMonitor?: boolean;  // Press 'P' - Performance profiler
  entitySpawner?: boolean;        // Press 'E' - Entity spawner
  consoleAPI?: boolean;           // Expose window.vectoriumPanels API
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
  maxEntities = 6_500_000;
  maxBatchSize = 65_000;
  debugMode = false;
  exposeGlobals = false;
  
  /** Granular control over which debug tools are enabled */
  debugTools: DebugToolsConfig = {
    performanceMonitor: false,
    entitySpawner: false,
    consoleAPI: false
  };

  /** Enable debug mode with all tools */
  debug(): this {
    this.debugMode = true;
    this.exposeGlobals = true;
    this.debugTools = {
      performanceMonitor: true,
      entitySpawner: true,
      consoleAPI: true
    };
    return this;
  }
  
  /** Enable only performance profiler (for benchmarks) */
  profileOnly(): this {
    this.debugMode = true;
    this.debugTools = {
      performanceMonitor: true,
      entitySpawner: false,
      consoleAPI: true
    };
    return this;
  }
}

export const ENGINE_CONFIG = {
  maxEntities: 8_000_000,
  maxBatchSize: 65_000,
  instancedBatchSize: 2_000_000,
} as const;
