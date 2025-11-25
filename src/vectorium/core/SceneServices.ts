/**
 * SceneServices - Type-safe service injection container
 * 
 * Provides centralized access to engine services with proper typing.
 * Eliminates manual setters and improves maintainability.
 * 
 * Usage:
 * ```typescript
 * // In Scene
 * const textPool = this.services.textPool;
 * const animationMgr = this.services.animationManager;
 * ```
 */

import type { TextPool } from './TextPool';
import type { AnimationManager } from '../animation/AnimationManager';
import type { AnimationSystem } from '../animation/AnimationSystem';
import type { InputManager } from '../input/InputManager';
import type { TextureManager } from '../rendering/TextureManager';
import type { AssetLoader } from '../assets/AssetLoader';
import type { LoadingManager } from '../assets/LoadingManager';
import type { RuntimeConfig } from './RuntimeConfig';

/**
 * Service container interface
 * All services are guaranteed to be present when scene is active
 */
export interface SceneServices {
  readonly textPool: TextPool;
  readonly animationManager: AnimationManager;
  readonly animationSystem: AnimationSystem;
  readonly inputManager: InputManager;
  readonly textureManager: TextureManager;
  readonly assetLoader: AssetLoader;
  readonly loadingManager: LoadingManager;
  readonly runtimeConfig: RuntimeConfig;
}

/**
 * Service container implementation
 * Populated by Engine during scene initialization
 */
export class SceneServicesContainer implements SceneServices {
  private _textPool: TextPool | null = null;
  private _animationManager: AnimationManager | null = null;
  private _animationSystem: AnimationSystem | null = null;
  private _inputManager: InputManager | null = null;
  private _textureManager: TextureManager | null = null;
  private _assetLoader: AssetLoader | null = null;
  private _loadingManager: LoadingManager | null = null;
  private _runtimeConfig: RuntimeConfig | null = null;
  
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
  
  get assetLoader(): AssetLoader {
    if (!this._assetLoader) throw new Error('AssetLoader not initialized');
    return this._assetLoader;
  }
  
  get loadingManager(): LoadingManager {
    if (!this._loadingManager) throw new Error('LoadingManager not initialized');
    return this._loadingManager;
  }
  
  get runtimeConfig(): RuntimeConfig {
    if (!this._runtimeConfig) throw new Error('RuntimeConfig not initialized');
    return this._runtimeConfig;
  }
  
  /**
   * Initialize all services at once
   * Called by Engine during scene loading
   */
  initialize(services: {
    textPool: TextPool;
    animationManager: AnimationManager;
    animationSystem: AnimationSystem;
    inputManager: InputManager;
    textureManager: TextureManager;
    assetLoader: AssetLoader;
    loadingManager: LoadingManager;
    runtimeConfig: RuntimeConfig;
  }): void {
    this._textPool = services.textPool;
    this._animationManager = services.animationManager;
    this._animationSystem = services.animationSystem;
    this._inputManager = services.inputManager;
    this._textureManager = services.textureManager;
    this._assetLoader = services.assetLoader;
    this._loadingManager = services.loadingManager;
    this._runtimeConfig = services.runtimeConfig;
  }
  
  /**
   * Check if services are initialized
   */
  isInitialized(): boolean {
    return this._textPool !== null &&
           this._animationManager !== null &&
           this._animationSystem !== null &&
           this._inputManager !== null &&
           this._textureManager !== null &&
           this._assetLoader !== null &&
           this._loadingManager !== null &&
           this._runtimeConfig !== null;
  }
}
