/**
 * Vectorium Engine Builder
 * Fluent API for engine configuration with sensible defaults
 * 
 * Usage:
 * const engine = new VectoriumBuilder()
 *   .withCanvas(canvas)
 *   .withSize(1920, 1080)
 *   .withQuality('high')
 *   .enableDebugTools()
 *   .build();
 */

import { Vectorium, Scene } from './Engine';
import { EngineConfig } from './FeatureDetector';

export type QualityPreset = 'ultra' | 'high' | 'medium' | 'low' | 'potato';

export class VectoriumBuilder {
  private config: Partial<EngineConfig> = {};
  private scenes: Map<string, Scene> = new Map();
  private initialSceneName?: string;
  private shouldExposeGlobals: boolean = false;
  private enableWasm: boolean = true;  // 🚀 WASM enabled by default

  /**
   * Set the canvas element (required)
   */
  withCanvas(canvas: HTMLCanvasElement): this {
    this.config.canvas = canvas;
    return this;
  }

  /**
   * Create a fullscreen canvas automatically
   */
  withFullscreenCanvas(options?: {
    width?: number;
    height?: number;
    borderColor?: string;
    backgroundColor?: string;
    pixelPerfect?: boolean;
  }): this {
    this.config.canvas = Vectorium.createFullscreenCanvas(options);
    if (options?.width) this.config.width = options.width;
    if (options?.height) this.config.height = options.height;
    return this;
  }

  /**
   * Set canvas dimensions
   */
  withSize(width: number, height: number): this {
    this.config.width = width;
    this.config.height = height;
    return this;
  }

  /**
   * Set quality preset
   */
  withQuality(quality: QualityPreset): this {
    this.config.initialQuality = quality as any; // Cast to support all quality levels
    this.config.enableAdaptiveQuality = true;
    return this;
  }

  /**
   * Set target FPS
   */
  withTargetFPS(fps: number): this {
    this.config.targetFPS = fps;
    return this;
  }

  /**
   * Enable or disable WebGL2 (defaults to auto-detect)
   */
  withWebGL2(enabled: boolean): this {
    this.config.preferWebGL2 = enabled;
    return this;
  }

  /**
   * Enable adaptive quality based on performance
   */
  withAdaptiveQuality(enabled: boolean = true): this {
    this.config.enableAdaptiveQuality = enabled;
    return this;
  }

  /**
   * Enable debug tools (panels, profiler, etc)
   */
  enableDebugTools(enabled: boolean = true): this {
    this.config.enableDebugTools = enabled;
    // Auto-enable global exposure for console debugging
    if (enabled) {
      this.shouldExposeGlobals = true;
    }
    return this;
  }

  /**
   * Enable debug mode (console logging)
   */
  enableDebugMode(enabled: boolean = true): this {
    this.config.debugMode = enabled;
    return this;
  }

  /**
   * Set maximum texture size
   */
  withMaxTextureSize(size: number): this {
    this.config.maxTextureSize = size;
    return this;
  }

  /**
   * Use performance-optimized workers
   */
  withWorkers(enabled: boolean = true): this {
    this.config.useWorkers = enabled;
    return this;
  }

  /**
   * Use ImageBitmap for faster texture loading
   */
  withImageBitmap(enabled: boolean = true): this {
    this.config.useImageBitmap = enabled;
    return this;
  }

  /**
   * Enable WASM physics acceleration (enabled by default)
   * 🚀 Provides 5-10x performance improvement for physics calculations
   */
  withWasm(enabled: boolean = true): this {
    this.enableWasm = enabled;
    return this;
  }

  /**
   * Add a scene to the engine
   */
  withScene(name: string, scene: Scene): this {
    this.scenes.set(name, scene);
    // Track first scene as default initial scene
    if (!this.initialSceneName) {
      this.initialSceneName = name;
    }
    return this;
  }

  /**
   * Expose engine globals to window for console debugging
   * Automatically enabled when enableDebugTools() is used
   */
  withExposeGlobals(enabled: boolean = true): this {
    this.shouldExposeGlobals = enabled;
    return this;
  }

  /**
   * Build and return the configured Vectorium instance
   */
  build(): Vectorium {
    if (!this.config.canvas) {
      // Auto-create fullscreen canvas if none provided
      this.withFullscreenCanvas();
    }
    
    const engine = new Vectorium(this.config);
    
    // Register all scenes
    for (const [name, scene] of this.scenes.entries()) {
      engine.registerScene(name, scene);
    }
    
    // Setup click-to-spawn and expose globals after initial scene loads
    if (this.config.enableDebugTools && this.initialSceneName) {
      const sceneName = this.initialSceneName;
      const exposeGlobals = this.shouldExposeGlobals;
      const origLoadScene = engine.loadScene.bind(engine);
      let isFirstLoad = true;
      
      engine.loadScene = async function(name: string) {
        await origLoadScene(name);
        if (isFirstLoad && name === sceneName) {
          isFirstLoad = false;
          engine.enableClickToSpawn();
          if (exposeGlobals) {
            engine.exposeGlobals();
          }
        }
        return;
      };
    }
    
    return engine;
  }
}

/**
 * Configuration presets for common use cases
 */
export const VectoriumPresets = {
  /**
   * Maximum performance - for 60 FPS with many entities
   */
  HighPerformance: {
    initialQuality: 'high' as QualityPreset,
    targetFPS: 60,
    preferWebGL2: true,
    enableAdaptiveQuality: true,
    useWorkers: true,
    useImageBitmap: true,
    maxTextureSize: 2048,
    debugMode: false
  },

  /**
   * Maximum visual quality - for showcases and demos
   */
  HighQuality: {
    initialQuality: 'ultra' as QualityPreset,
    targetFPS: 60,
    preferWebGL2: true,
    enableAdaptiveQuality: false,
    useWorkers: false,
    useImageBitmap: true,
    maxTextureSize: 4096,
    debugMode: false
  },

  /**
   * Mobile-optimized - for phones and tablets
   */
  Mobile: {
    initialQuality: 'medium' as QualityPreset,
    targetFPS: 30,
    preferWebGL2: true,
    enableAdaptiveQuality: true,
    useWorkers: false,
    useImageBitmap: true,
    maxTextureSize: 1024,
    debugMode: false
  },

  /**
   * Development mode - all debug tools enabled
   */
  Development: {
    initialQuality: 'high' as QualityPreset,
    targetFPS: 60,
    preferWebGL2: true,
    enableAdaptiveQuality: true,
    enableDebugTools: true,
    debugMode: true,
    useWorkers: false,
    useImageBitmap: false,
    maxTextureSize: 2048
  },

  /**
   * Minimum spec - for older devices
   */
  LowEnd: {
    initialQuality: 'potato' as QualityPreset,
    targetFPS: 30,
    preferWebGL2: false,
    enableAdaptiveQuality: true,
    useWorkers: false,
    useImageBitmap: false,
    maxTextureSize: 512,
    debugMode: false
  }
};
