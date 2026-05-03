/**
 * IEngine — minimal interface exposed to Scene subclasses
 *
 * Declared here (not in Engine.ts) to avoid the circular import:
 *   Engine.ts → Scene.ts → Engine.ts
 *
 * Scene.ts imports IEngine; Engine.ts implements IEngine.
 * Subclasses access the engine via the typed `this.engine` property.
 */

import type { TextureManager } from '../rendering/TextureManager';
import type { EngineConfig } from './EngineConfig';
import type { PerformanceMonitor } from '../tools/PerformanceMonitor';

export interface IEngine {
  readonly textureManager: TextureManager;
  readonly config: EngineConfig;
  readonly performanceMonitor: PerformanceMonitor;
}
