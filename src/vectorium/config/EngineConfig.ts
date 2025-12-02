/**
 * 🎮 Engine Configuration
 */
export class EngineConfig {
  canvas?: HTMLCanvasElement;
  width = 1280;
  height = 720;
  backgroundColor = '#000000';
  preferWebGL2 = true;
  maxTextureSize = 2048;
  useImageBitmap = true;
  enableAdaptiveQuality = true;
  initialQuality: 'ultra' | 'high' | 'medium' | 'low' | 'potato' = 'high';
  targetFPS = 60;
  useWorkers = false;
  maxEntities = 8_000_000;
  instancedBatchSize = 1_000_000;
  maxBatchSize = 65_000;
  debugMode = false;
  enableDebugTools = false;
  exposeGlobals = false;

  /** Enable debug mode with tools */
  debug(): this {
    this.debugMode = true;
    this.enableDebugTools = true;
    this.exposeGlobals = true;
    return this;
  }
}

export const ENGINE_CONFIG = {
  maxEntities: 8_000_000,
  instancedBatchSize: 1_000_000,
  maxBatchSize: 65_000,
} as const;
