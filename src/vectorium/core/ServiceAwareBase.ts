/**
 * ServiceAwareBase - Base class for service-aware components
 * 
 * Similar to Unity's MonoBehaviour or Bevy's System parameters.
 * Provides automatic access to all engine services via protected getters.
 * 
 * Usage:
 * ```typescript
 * class MyService extends ServiceAwareBase {
 *   doWork() {
 *     const world = this.world;  // Auto-injected!
 *     const textPool = this.textPool;
 *     const renderer = this.renderer;
 *   }
 * }
 * 
 * // In setup:
 * myService.services = scene.services;  // Copy service reference
 * ```
 * 
 * @see SceneServicesContainer for the service container implementation
 */

import type { SceneServicesContainer } from './SceneServices';
import type { World } from './World';
import type { WebGLBatchRenderer } from '../rendering/WebGLBatchRenderer';
import type { TextRenderer } from '../rendering/TextRenderer';
import type { TextPool } from '../display/TextPool';
import type { AnimationManager } from '../systems/AnimationManager';
import type { AnimationSystem } from '../systems/AnimationSystem';
import type { InputManager} from '../systems/InputManager';
import type { TextureManager } from '../rendering/TextureManager';

/**
 * Base class for any class that needs access to engine services
 * Similar to Unity's MonoBehaviour or Bevy's System
 */
export abstract class ServiceAwareBase {
  /** @internal Service container (set by subclass or external code) */
  protected services!: SceneServicesContainer;
  
  // ============================================================================
  // 🎯 AUTO-INJECTED SERVICES (Unity MonoBehaviour pattern)
  // ============================================================================
  
  /** Core ECS data structure */
  protected get world(): World {
    return this.services.world;
  }
  
  /** WebGL batch renderer for custom rendering */
  protected get renderer(): WebGLBatchRenderer {
    return this.services.renderer;
  }
  
  /** Text rendering system */
  protected get textRenderer(): TextRenderer {
    return this.services.textRenderer;
  }
  
  /** Canvas element for dimensions/events */
  protected get canvas(): HTMLCanvasElement {
    return this.services.canvas;
  }
  
  /** Text entity management */
  protected get textPool(): TextPool {
    return this.services.textPool;
  }
  
  /** Animation definitions */
  protected get animationManager(): AnimationManager {
    return this.services.animationManager;
  }
  
  /** Animation execution system */
  protected get animationSystem(): AnimationSystem {
    return this.services.animationSystem;
  }
  
  /** Mouse/keyboard/touch input */
  protected get inputManager(): InputManager {
    return this.services.inputManager;
  }
  
  /** Texture loading and caching */
  protected get textureManager(): TextureManager {
    return this.services.textureManager;
  }
}
