/**
 * 🎮 Vectorium Core Engine
 * Minimal, modular game engine with opt-in systems
 * 
 * Philosophy: KISS, YAGNI, DRY, SOLID
 * - Pay only for what you use
 * - No magic injection
 * - Explicit dependencies
 * - Easy to test
 */

import { System } from './System';
import { Scene } from './Scene';

export interface CoreConfig {
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
  targetFPS?: number;
}

/**
 * Minimal engine core - only canvas and game loop
 * Everything else is opt-in via systems
 */
export class VectoriumCore {
  readonly canvas: HTMLCanvasElement;
  readonly config: Required<CoreConfig>;
  
  private systems = new Map<string, System>();
  private scenes = new Map<string, Scene>();
  private currentScene: Scene | null = null;
  private running = false;
  private lastTime = 0;
  private rafId = 0;

  constructor(config: CoreConfig = {}) {
    this.config = {
      canvas: config.canvas ?? document.createElement('canvas'),
      width: config.width ?? 800,
      height: config.height ?? 600,
      targetFPS: config.targetFPS ?? 60
    };
    
    this.canvas = this.config.canvas;
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    
    // Append to body if not already in DOM
    if (!this.canvas.parentElement) {
      document.body.appendChild(this.canvas);
    }
    
    console.log(`VectoriumCore initialized (${this.config.width}×${this.config.height})`);
  }
  
  /**
   * Add a system to the engine (opt-in)
   */
  use(system: System): this {
    if (this.systems.has(system.name)) {
      console.warn(`System "${system.name}" already registered`);
      return this;
    }
    
    this.systems.set(system.name, system);
    system.init(this);
    console.log(`System registered: ${system.name}`);
    return this;
  }
  
  /**
   * Get a registered system by name
   */
  getSystem<T extends System>(name: string): T | undefined {
    return this.systems.get(name) as T | undefined;
  }
  
  /**
   * Check if a system is registered
   */
  hasSystem(name: string): boolean {
    return this.systems.has(name);
  }
  
  /**
   * Register a scene
   */
  registerScene(name: string, scene: Scene): void {
    scene.setCanvasDimensions(this.config.width, this.config.height);
    this.scenes.set(name, scene);
  }
  
  /**
   * Load and activate a scene
   */
  async loadScene(name: string): Promise<void> {
    const scene = this.scenes.get(name);
    if (!scene) {
      throw new Error(`Scene "${name}" not found`);
    }
    
    // Deactivate current scene
    if (this.currentScene) {
      this.currentScene.active = false;
    }
    
    this.currentScene = scene;
    this.currentScene.active = true;
    
    // Let scene load (user implements this)
    await this.currentScene.load();
    
    console.log(`Scene loaded: ${name}`);
  }
  
  /**
   * Start the game loop
   */
  start(): void {
    if (this.running) return;
    
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
    
    console.log('VectoriumCore started');
  }
  
  /**
   * Stop the game loop
   */
  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    console.log('VectoriumCore stopped');
  }
  
  /**
   * Main game loop
   */
  private gameLoop = (): void => {
    if (!this.running) return;
    
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    
    // Update systems
    for (const system of this.systems.values()) {
      if (system.update) {
        system.update(dt);
      }
    }
    
    // Update current scene
    if (this.currentScene && this.currentScene.active) {
      this.currentScene.update(dt);
    }
    
    // Render systems
    for (const system of this.systems.values()) {
      if (system.render) {
        system.render();
      }
    }
    
    // Render current scene
    if (this.currentScene && this.currentScene.active) {
      this.currentScene.render(null as any, null as any);
    }
    
    this.rafId = requestAnimationFrame(this.gameLoop);
  };
  
  /**
   * Resize canvas
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.config.width = width;
    this.config.height = height;
    
    if (this.currentScene) {
      this.currentScene.setCanvasDimensions(width, height);
    }
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    
    // Destroy all systems
    for (const system of this.systems.values()) {
      if (system.destroy) {
        system.destroy();
      }
    }
    this.systems.clear();
    
    // Destroy scenes
    if (this.currentScene) {
      this.currentScene.destroy();
    }
    this.scenes.clear();
  }
}
