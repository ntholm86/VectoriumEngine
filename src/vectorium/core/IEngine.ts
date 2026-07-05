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
import type { InputManager } from '../systems/InputManager';

export interface IEngine {
  readonly canvas: HTMLCanvasElement;
  readonly textureManager: TextureManager;
  readonly config: EngineConfig;
  readonly performanceMonitor: PerformanceMonitor;
  inputManager: InputManager | null;
}
