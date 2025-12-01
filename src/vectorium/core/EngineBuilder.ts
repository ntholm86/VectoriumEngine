/**
 * Vectorium Engine Builder
 * Simplified builder that takes an EngineConfig and adds scenes
 * 
 * Usage:
 * ```typescript
 * const config = new EngineConfig();
 * config.width = 1920;
 * config.height = 1080;
 * 
 * const engine = new VectoriumBuilder(config)
 *   .withScene('main', mainScene)
 *   .build();
 * ```
 */

import { Vectorium, Scene } from './Engine';
import { EngineConfig } from '../config/EngineConfig';

export class VectoriumBuilder {
  private config: EngineConfig;
  private scenes: Map<string, Scene> = new Map();

  constructor(config?: EngineConfig) {
    this.config = config ?? new EngineConfig();
  }

  /**
   * Add a scene to the engine
   */
  withScene(name: string, scene: Scene): this {
    this.scenes.set(name, scene);
    return this;
  }

  /**
   * Build and return the configured Vectorium instance
   */
  build(): Vectorium {
    // Create canvas if not provided
    if (!this.config.canvas) {
      this.config.canvas = document.createElement('canvas');
      document.body.appendChild(this.config.canvas);
      this.config.canvas.style.display = 'block';
      this.config.canvas.style.margin = '0 auto';
    }
    
    const engine = new Vectorium(this.config);
    
    // Register all scenes
    for (const [name, scene] of this.scenes.entries()) {
      engine.registerScene(name, scene);
    }
    
    // Setup debug tools if enabled
    if (this.config.enableDebugTools) {
      engine.enableClickToSpawn();
      if (this.config.exposeGlobals) {
        engine.exposeGlobals();
      }
    }
    
    return engine;
  }
}
