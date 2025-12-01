/**
 * SceneServices - Type-safe service injection container
 * 
 * Provides centralized access to engine services with proper typing.
 * Eliminates manual setters and improves maintainability.
 * 
 * Pattern: Unity MonoBehaviour / Bevy System Parameters
 * All services auto-injected by Engine, accessed via ServiceAwareBase.
 * 
 * @see ServiceAwareBase for the base class that provides service getters
 */

import type { TextPool } from './TextPool';
import type { AnimationManager } from '../animation/AnimationManager';
import type { AnimationSystem } from '../animation/AnimationSystem';
import type { InputManager } from '../input/InputManager';
import type { TextureManager } from '../rendering/TextureManager';
import type { World } from './World';
import type { Camera } from './Camera';
import type { WebGLBatchRenderer } from '../rendering/WebGLBatchRenderer';
import type { TextRenderer } from '../rendering/TextRenderer';

/**
 * Service container interface
 * All services are guaranteed to be present when scene is active
 */
export interface SceneServices {
  // Core ECS & Rendering
  readonly world: World;
  readonly camera: Camera;
  readonly renderer: WebGLBatchRenderer;
  readonly textRenderer: TextRenderer;
  readonly canvas: HTMLCanvasElement;
  
  // Managers & Systems
  readonly textPool: TextPool;
  readonly animationManager: AnimationManager;
  readonly animationSystem: AnimationSystem;
  readonly inputManager: InputManager;
  readonly textureManager: TextureManager;
}

/**
 * Service container implementation
 * Populated by Engine during scene initialization
 */
export class SceneServicesContainer implements SceneServices {
  // Core ECS & Rendering
  private _world: World | null = null;
  private _camera: Camera | null = null;
  private _renderer: WebGLBatchRenderer | null = null;
  private _textRenderer: TextRenderer | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  
  // Managers & Systems
  private _textPool: TextPool | null = null;
  private _animationManager: AnimationManager | null = null;
  private _animationSystem: AnimationSystem | null = null;
  private _inputManager: InputManager | null = null;
  private _textureManager: TextureManager | null = null;
  
  get world(): World {
    if (!this._world) throw new Error('World not initialized');
    return this._world;
  }
  
  get camera(): Camera {
    if (!this._camera) throw new Error('Camera not initialized');
    return this._camera;
  }
  
  get renderer(): WebGLBatchRenderer {
    if (!this._renderer) throw new Error('Renderer not initialized');
    return this._renderer;
  }
  
  get textRenderer(): TextRenderer {
    if (!this._textRenderer) throw new Error('TextRenderer not initialized');
    return this._textRenderer;
  }
  
  get canvas(): HTMLCanvasElement {
    if (!this._canvas) throw new Error('Canvas not initialized');
    return this._canvas;
  }
  
  get textPool(): TextPool {
    if (!this._textPool) throw new Error('TextPool not initialized');
    return this._textPool;
  }
  
  get animationManager(): AnimationManager {
    if (!this._animationManager) throw new Error('AnimationManager not initialized');
    return this._animationManager;
  }
  
  get animationSystem(): AnimationSystem {
    if (!this._animationSystem) throw new Error('AnimationSystem not initialized');
    return this._animationSystem;
  }
  
  get inputManager(): InputManager {
    if (!this._inputManager) throw new Error('InputManager not initialized');
    return this._inputManager;
  }
  
  get textureManager(): TextureManager {
    if (!this._textureManager) throw new Error('TextureManager not initialized');
    return this._textureManager;
  }
  
  /**
   * Initialize all services at once
   * Called by Engine during scene loading
   */
  initialize(services: {
    world: World;
    camera: Camera;
    renderer: WebGLBatchRenderer;
    textRenderer: TextRenderer;
    canvas: HTMLCanvasElement;
    textPool: TextPool;
    animationManager: AnimationManager;
    animationSystem: AnimationSystem;
    inputManager: InputManager;
    textureManager: TextureManager;
  }): void {
    this._world = services.world;
    this._camera = services.camera;
    this._renderer = services.renderer;
    this._textRenderer = services.textRenderer;
    this._canvas = services.canvas;
    this._textPool = services.textPool;
    this._animationManager = services.animationManager;
    this._animationSystem = services.animationSystem;
    this._inputManager = services.inputManager;
    this._textureManager = services.textureManager;
  }
  
  /**
   * Check if services are initialized
   */
  isInitialized(): boolean {
    return this._world !== null &&
           this._camera !== null &&
           this._renderer !== null &&
           this._textRenderer !== null &&
           this._canvas !== null &&
           this._textPool !== null &&
           this._animationManager !== null &&
           this._animationSystem !== null &&
           this._inputManager !== null &&
           this._textureManager !== null;
  }
}
