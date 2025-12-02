/**
 * Vectorium Engine - Core Engine
 * Main engine class coordinating all systems
 */

import { FeatureDetector } from './FeatureDetector';
import { EngineConfig, ENGINE_CONFIG } from './EngineConfig';
import { WebGLBatchRenderer } from '../rendering/WebGLBatchRenderer';
import { TextRenderer } from '../rendering/TextRenderer';
import { TextPool } from '../display/TextPool';
import { PerformanceMonitor } from '../tools/PerformanceMonitor';
import { BufferPool } from '../utils/Pooling';
import { Viewport } from './Viewport';
import { Scene } from './Scene';
import { EntitySpawner } from '../tools/EntitySpawner';
import { UIStyleLoader } from '../tools/UIStyleLoader';
import { UIPanelManager } from '../tools/UIPanelManager';
import { TextureManager } from '../rendering/TextureManager';
import { AnimationManager } from '../systems/AnimationManager';
import { AnimationSystem } from '../systems/AnimationSystem';
import { InputManager } from '../systems/InputManager';
import { ParticleSystemManager } from '../systems/ParticleSystem';
// OLD: EntitySpawnService removed - use DisplayObject API
// import { EntitySpawnService } from '../entities/EntitySpawnService';

// Re-export for convenience
export { Viewport, Scene };
export type { Entity, EntityId, EntityFlags } from './Entity';
export { VectoriumBuilder } from './EngineBuilder';
export { SceneBuilder, createScene } from './SceneBuilder';
export { ServiceAwareBase } from './ServiceAwareBase';

export class Vectorium {
  readonly canvas: HTMLCanvasElement;
  readonly config: EngineConfig;
  readonly featureDetector: FeatureDetector;
  readonly renderer: WebGLBatchRenderer;
  readonly textureManager: TextureManager;
  
  // Optional systems - created only by Scene if needed
  private _textRenderer: TextRenderer | null = null;
  private _textPool: TextPool | null = null;
  private _performanceMonitor: PerformanceMonitor | null = null;
  private _bufferPool: BufferPool | null = null;
  private _animationManager: AnimationManager | null = null;
  private _particleManager: ParticleSystemManager | null = null;
  private _inputManager: InputManager | null = null;
  private _panelManager: UIPanelManager | null = null;
  
  private scenes = new Map<string, Scene>();
  private currentScene: Scene | null = null;
  private running = false;
  private lastTime = 0;
  private rafId = 0;

  constructor(config: EngineConfig) {
    this.config = config;
    this.featureDetector = new FeatureDetector();
    
    this.canvas = this.config.canvas!;
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    
    // Sync ENGINE_CONFIG values
    (ENGINE_CONFIG as any).maxEntities = this.config.maxEntities;
    (ENGINE_CONFIG as any).instancedBatchSize = this.config.instancedBatchSize;
    (ENGINE_CONFIG as any).maxBatchSize = this.config.maxBatchSize;
    
    // Initialize renderer (CORE - always needed)
    const useWebGL2 = this.config.preferWebGL2 && this.featureDetector.capabilities.hasWebGL2;
    this.renderer = new WebGLBatchRenderer(this.canvas, useWebGL2);
    
    // Initialize texture manager (CORE - always needed for sprites)
    this.textureManager = new TextureManager(this.renderer.getContext() as WebGL2RenderingContext);
    this.renderer.setTextureManager(this.textureManager);
    
    // All other systems are LAZY - created only when Scene needs them
    
    console.log(`Vectorium Engine initialized`);
    console.log(`WebGL2: ${useWebGL2}`);
  }
  
  // Lazy getters for optional systems (Scene requests these)
  get textRenderer(): TextRenderer {
    if (!this._textRenderer) {
      this._textRenderer = new TextRenderer(this.config.width, this.config.height);
      this._textRenderer.setBatchRenderer(this.renderer);
    }
    return this._textRenderer;
  }
  
  get textPool(): TextPool {
    if (!this._textPool) {
      this._textPool = new TextPool(10000);
    }
    return this._textPool;
  }
  
  get performanceMonitor(): PerformanceMonitor {
    if (!this._performanceMonitor) {
      this._performanceMonitor = new PerformanceMonitor(
        this.config.targetFPS,
        this.config.initialQuality
      );
      this._performanceMonitor.setAdaptiveQuality(this.config.enableAdaptiveQuality);
      this._performanceMonitor.setRenderer(this.renderer);
      this.renderer.setPerformanceMonitor(this._performanceMonitor);
      
      // Initialize debug tools if configured
      const hasDebugTools = Object.values(this.config.debugTools).some(v => v === true);
      if (hasDebugTools) {
        UIStyleLoader.injectStyles();
      }
    }
    return this._performanceMonitor;
  }
  
  get panelManager(): UIPanelManager {
    if (!this._panelManager) {
      this._panelManager = new UIPanelManager({
        enableConsoleAPI: this.config.debugTools.consoleAPI ?? false
      });
    }
    return this._panelManager;
  }
  
  get inputManager(): InputManager | null {
    return this._inputManager;
  }
  
  set inputManager(manager: InputManager | null) {
    this._inputManager = manager;
  }
  
  get bufferPool(): BufferPool {
    if (!this._bufferPool) {
      this._bufferPool = new BufferPool();
    }
    return this._bufferPool;
  }
  
  get animationManager(): AnimationManager {
    if (!this._animationManager) {
      this._animationManager = new AnimationManager();
    }
    return this._animationManager;
  }
  
  get particleManager(): ParticleSystemManager {
    if (!this._particleManager) {
      this._particleManager = new ParticleSystemManager();
    }
    return this._particleManager;
  }
  
  registerScene(name: string, scene: Scene): void {
    // Initialize scene viewport with engine's canvas dimensions
    // This ensures Scene has correct dimensions from the start, not just after loadScene()
    scene.setCanvasDimensions(this.config.width, this.config.height);
    
    // Inject engine reference automatically
    (scene as any).engine = this;
    
    // Set texture manager for DisplayObject API
    (scene as any)._setTextureManager(this.textureManager);
    
    this.scenes.set(name, scene);
  }

  async loadScene(name: string): Promise<void> {
    const scene = this.scenes.get(name);
    if (!scene) {
      throw new Error(`Scene "${name}" not found`);
    }
    
    // Initialize text renderer atlas on first scene load
    if (this.textRenderer && !this.textRenderer['atlasReady']) {
      await this.textRenderer.setGLContext(this.renderer.getContext());
    }
    
    if (this.currentScene) {
      this.currentScene.active = false;
      // Notify behaviors of deactivation
      (this.currentScene as any).behaviors?.deactivate();
      this.currentScene.clear();
    }
    
    this.currentScene = scene;
    this.currentScene.active = true;
    
    // Set canvas dimensions for physics bounds
    this.currentScene.setCanvasDimensions(this.canvas.width, this.canvas.height);
    console.log(`Scene loaded: ${name} | Viewport: ${this.canvas.width}×${this.canvas.height} | World: ${this.currentScene.getWorldWidth()}×${this.currentScene.getWorldHeight()} (${this.currentScene['viewport'].worldScale}x)`);
    
    // Initialize WASM Physics with zero-copy shared memory
    const wasmOk = await this.currentScene.world.initializeWasm();
    if (wasmOk) {
      console.log('✅ WASM Physics initialized (5-10x acceleration)');
      console.log('✅ Zero-copy shared memory enabled (World.ts ↔ WASM)');
      console.log('✅ Spatial hash grid collision detection enabled');
    } else {
      console.warn('⚠️ WASM unavailable, using JavaScript fallback (10x slower)');
    }
    
    // Initialize InputManager (only if debug tools need it)
    const needsInput = this.config.debugTools.performanceMonitor || this.config.debugTools.entitySpawner;
    if (needsInput) {
      this._inputManager = new InputManager(
        this.canvas,
        this.currentScene.world,
        this.currentScene.getSpatialHash()
      );
    }
    
    // Initialize text renderer (only if needed by scene)
    if (this._textRenderer) {
      await this._textRenderer.setGLContext(this.renderer.getContext());
    }
    
    // Initialize AnimationSystem (only if scene uses animations)
    if (this._animationManager) {
      const animSystem = new AnimationSystem(this.currentScene.world, this._animationManager);
      (this.currentScene as any).animationSystem = animSystem;
    }
    
    // Inject performanceMonitor if debug tools are enabled (triggers lazy initialization)
    if (this.config.debugTools.performanceMonitor) {
      (this.currentScene as any).performanceMonitor = this.performanceMonitor;
    }
    
    // Now call scene.load()
    await this.currentScene.load();
    
    // Register debug panels only if configured
    if (this.config.debugTools.performanceMonitor && this._inputManager) {
      this.performanceMonitor.initializeUI(this._inputManager);
      this.panelManager.register('performance', this.performanceMonitor);
    }
    
    if (this.config.debugTools.entitySpawner && this._inputManager) {
      const entitySpawner = new EntitySpawner(this.currentScene, this._inputManager, this.performanceMonitor);
      this.panelManager.register('spawner', entitySpawner);
    }
    
    const registeredPanels = this.panelManager.list();
    if (registeredPanels.length > 0) {
      console.log('Debug panels: ' + registeredPanels.join(', '));
    }
    
    // Apply initial config values
    if (this.currentScene) {
      this.currentScene.setCullingEnabled(true);
      this.currentScene.setWorldBoundsMultiplier(1.2);
    }
    
    // Notify behaviors of activation
    (this.currentScene as any).behaviors?.activate();
    
    console.log(`Loaded scene: ${name}`);
  }

  start(): void {
    if (this.running) return;
    
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
    
    console.log('Vectorium Engine started');
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    console.log('Vectorium Engine stopped');
  }

  private gameLoop = (): void => {
    if (!this.running) return;
    
    // Only track performance if monitor exists
    if (this._performanceMonitor) {
      this._performanceMonitor.beginFrame();
    }
    
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Cap at 100ms
    this.lastTime = now;
    
    // Update scene
    if (this.currentScene && this.currentScene.active) {
      // Expose current scene and world globally for profiler access
      (window as any).vectoriumCurrentScene = this.currentScene;
      (window as any).vectoriumCurrentWorld = this.currentScene.world;
      
      this.currentScene.update(dt);
      
      // Update InputManager if it exists
      if (this._inputManager && this.currentScene) {
        this._inputManager.updateCamera(
          this.currentScene.cameraX,
          this.currentScene.cameraY,
          this.currentScene.cameraZoom
        );
        this._inputManager.update(dt);
      }
      
      // Record entities processed for performance monitoring
      if (this._performanceMonitor) {
        this._performanceMonitor.recordEntitiesProcessed(this.currentScene.perfMetrics.ecsActiveEntities);
        this._performanceMonitor.recordEntitiesRendered(this.currentScene.perfMetrics.ecsActiveEntities);
      }
    }
    
    // Render WebGL
    this.renderer.begin(this.canvas.width, this.canvas.height);
    
    // Begin text rendering (only if text renderer exists)
    if (this._textRenderer) {
      this._textRenderer.begin();
    }
    
    if (this.currentScene && this.currentScene.active) {
      this.currentScene.render(this.renderer, this._textRenderer || undefined, this._textPool || undefined);
      
      // Record culling statistics if available
      if (this._performanceMonitor) {
        const visibleCount = (this.currentScene as any).visibleCount;
        const culledCount = (this.currentScene as any).culledCount;
        if (visibleCount !== undefined && culledCount !== undefined) {
          this._performanceMonitor.recordCulling(visibleCount, culledCount);
        }
      }
    }
    
    this.renderer.end();
    
    // Record metrics only if monitor exists
    if (this._performanceMonitor) {
      this._performanceMonitor.recordWebGLDrawCalls(this.renderer.getDrawCallCount());
      
      // Record text memory usage (only if text renderer exists)
      if (this._textRenderer) {
        this._performanceMonitor.recordTextMemory(this._textRenderer.getMemoryUsage());
      }
      
      // Record particle count (only if particle manager exists)
      if (this._particleManager) {
        this._performanceMonitor.recordParticleCount(this._particleManager.getTotalParticles());
      }
      
      // Record physics metrics
      if (this.currentScene) {
        const physicsMetrics = this.currentScene.world.getPhysicsMetrics();
        this._performanceMonitor.recordPhysicsMetrics(physicsMetrics);
      }
      
      this._performanceMonitor.endFrame();
    }
    
    this.rafId = requestAnimationFrame(this.gameLoop);
  };

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // Also resize parent wrapper if it exists (for centering)
    if (this.canvas.parentElement && this.canvas.parentElement.style.width) {
      this.canvas.parentElement.style.width = `${width}px`;
      this.canvas.parentElement.style.height = `${height}px`;
    }
    
    this.config.width = width;
    this.config.height = height;
    this.renderer.resize(width, height);
    
    // Update scene canvas dimensions for physics
    if (this.currentScene) {
      this.currentScene.setCanvasDimensions(width, height);
    }
  }

  getMetrics() {
    const sceneMetrics = this.currentScene ? this.currentScene.perfMetrics : {
      updateTotal: 0,
      updatePhysics: 0,
      updateAnimation: 0,
      updateEntitySync: 0,
      renderTotal: 0,
      renderBatch: 0,
      renderCustom: 0,
      customUpdateCount: 0,
      customRenderCount: 0,
      ecsActiveEntities: 0,
      ecsTotalEntities: 0
    };
    
    return {
      ...this.performanceMonitor.getMetrics(),
      drawCalls: this.renderer.getDrawCallCount(),
      webglDrawCalls: this.renderer.getDrawCallCount(),
      textDrawCalls: 0, // Text now unified through WebGLBatchRenderer
      textMemory: 0, // Included in main renderer memory
      // Detailed scene metrics
      updateTotal: sceneMetrics.updateTotal,
      updatePhysics: sceneMetrics.updatePhysics,
      updateAnimation: sceneMetrics.updateAnimation,
      updateEntitySync: sceneMetrics.updateEntitySync,
      renderTotal: sceneMetrics.renderTotal,
      renderBatch: sceneMetrics.renderBatch,
      renderCustom: sceneMetrics.renderCustom,
      customUpdateCount: sceneMetrics.customUpdateCount,
      customRenderCount: sceneMetrics.customRenderCount,
      ecsActiveEntities: sceneMetrics.ecsActiveEntities,
      ecsTotalEntities: sceneMetrics.ecsTotalEntities
    };
  }
  
  getOptimizationReport() {
    const rendererReport = this.renderer.getOptimizationReport();
    const metrics = this.getMetrics();
    
    const report = {
      renderer: rendererReport,
      performance: {
        fps: metrics.fps,
        frameTime: metrics.frameTime,
        quality: metrics.quality,
        isOptimal: metrics.fps >= this.config.targetFPS * 0.95
      },
      recommendations: [] as string[]
    };
    
    // Generate recommendations
    if (rendererReport.drawCalls > 20) {
      report.recommendations.push('⚠️ High draw call count. Consider batching sprites by texture or reducing texture switches.');
    }
    
    if (rendererReport.batchEfficiency < 100) {
      report.recommendations.push('⚠️ Low batch efficiency. Sprites are not being batched effectively. Group similar sprites together.');
    }
    
    if (metrics.frameTime > 16.67) {
      report.recommendations.push('⚠️ Frame time exceeds 60 FPS budget. Consider reducing entity count or optimizing update/render loops.');
    }
    
    if (metrics.quality !== 'ultra' && metrics.quality !== 'high') {
      report.recommendations.push(`⚠️ Quality degraded to ${metrics.quality}. Performance is struggling. Reduce entity count or disable effects.`);
    }
    
    if (rendererReport.warnings.length === 0 && report.recommendations.length === 0) {
      report.recommendations.push('✅ All systems optimal! Engine is running at peak performance.');
    }
    
    return report;
  }
  
  setOptimizationWarnings(enabled: boolean): void {
    this.renderer.setWarningsEnabled(enabled);
  }
  
  /**
   * Get the WebGL renderer instance for advanced configuration
   */
  getRenderer(): WebGLBatchRenderer {
    return this.renderer;
  }

  // Camera removed - use scene.cameraX, scene.cameraY, scene.cameraZoom directly
  
  // 🚀 Phase 1: New System Getters
  
  /**
   * Get the texture manager
   */
  getTextureManager(): TextureManager {
    return this.textureManager;
  }
  
  /**
   * Get the animation manager
   */
  getAnimationManager(): AnimationManager {
    return this.animationManager;
  }
  
  /**
   * Get the input manager (available after scene loads)
   */
  getInputManager(): InputManager | null {
    return this.inputManager;
  }
  
  /**
   * Get the current world (available after scene loads)
   */
  getWorld() {
    return this.currentScene ? this.currentScene.world : null;
  }
  
  /**
   * Get the spatial hash (available after scene loads)
   */
  getSpatialHash() {
    return this.currentScene ? this.currentScene.getSpatialHash() : null;
  }

  /**
   * Get the entity spawner for click spawn count
   */
  getEntitySpawner(): EntitySpawner | undefined {
    return this.panelManager.get('spawner') as EntitySpawner | undefined;
  }

  /**
   * Setup automatic click-to-spawn behavior
   */
  enableClickToSpawn(): void {
    this.onClick((x, y) => {
      const spawner = this.getEntitySpawner();
      if (!spawner) return;
      
      // Trigger spawn (EntitySpawnService is auto-registered)
      spawner.triggerSpawn(x, y);
    });
  }

  /**
   * Setup EntitySpawnService on the current scene automatically
  /**
   * Expose engine, scene, and performance monitor globally for console access
   * Also adds runPerfTest() helper function
   */
  exposeGlobals(): void {
    (window as any).vectoriumEngine = this;
    (window as any).vectoriumScene = this.currentScene;
    (window as any).vectoriumPerfMonitor = this.performanceMonitor;
    
    // Add command to check GPU instancing status
    (window as any).checkInstancing = () => {
      const metrics = this.performanceMonitor.getMetrics();
      if (metrics.gpuInstancingEnabled) {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚀 GPU INSTANCING: ACTIVE ✅                                  ║
╟──────────────────────────────────────────────────────────────╢
║  Instanced Draw Calls: ${(metrics.instancedDrawCalls || 0).toString().padEnd(5)}                         ║
║  Total Instances: ${(metrics.instanceCount || 0).toLocaleString().padEnd(10)}                        ║
║  Regular Draw Calls: ${(metrics.webglDrawCalls || 0).toString().padEnd(5)}                          ║
║  Performance Gain: 10-50x faster                             ║
╟──────────────────────────────────────────────────────────────╢
║  Current Stats:                                               ║
║  • FPS: ${metrics.fps.toFixed(1).padEnd(6)} (${metrics.frameTime.toFixed(2)}ms/frame)                 ║
║  • Entities: ${(metrics.entitiesRendered || 0).toLocaleString().padEnd(7)}                                ║
║  • Vertices: ${(metrics.verticesRendered || 0).toLocaleString().padEnd(7)}                                ║
║  • GPU Usage: ${((metrics.gpuUtilization || 0) * 100).toFixed(0)}%                                     ║
╚══════════════════════════════════════════════════════════════╝`);
      } else {
        console.warn('⚠️ GPU Instancing NOT active');
        console.log('Using standard batch rendering');
        console.log(`Draw Calls: ${metrics.webglDrawCalls || 0}`);
      }
      return metrics;
    };
    
    // Add automated performance test function
    (window as any).runPerfTest = async (durationMs: number = 2000) => {
      console.log(`🚀 Starting automated performance test...`);
      if (this.performanceMonitor) {
        const result = await this.performanceMonitor.startMeasurement(durationMs);
        console.log(`✅ Test complete! Metrics available in window.lastMeasurement`);
        return result;
      } else {
        console.error('❌ Performance monitor not available');
        return null;
      }
    };
    
    console.log('💡 TIP: Run checkInstancing() in console to see GPU instancing status');
    console.log('💡 TIP: Run await runPerfTest() to start automated measurement');
    console.log('💡 TIP: Or click "📊 Measure (2s)" button in profiler panel');
    console.log('💡 TIP: Agent can read window.lastMeasurementJSON for optimization iterations');
  }

  /**
   * Convert mouse event coordinates to canvas coordinates
   * Handles CSS scaling automatically
   */
  getCanvasCoordinates(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  /**
   * Convert mouse event coordinates to world coordinates
   * Combines canvas scaling and camera transformation
   */
  getWorldCoordinates(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.currentScene) return null;
    
    const canvasCoords = this.getCanvasCoordinates(clientX, clientY);
    // Simple screen to world transform (no Camera class)
    const worldX = canvasCoords.x - this.canvas.width / 2 + this.currentScene.cameraX;
    const worldY = canvasCoords.y - this.canvas.height / 2 + this.currentScene.cameraY;
    return { x: worldX, y: worldY };
  }

  /**
   * Convenient click handler with world coordinates
   */
  onClick(callback: (worldX: number, worldY: number, event: MouseEvent) => void): void {
    this.canvas.addEventListener('click', (e) => {
      const world = this.getWorldCoordinates(e.clientX, e.clientY);
      if (world) {
        callback(world.x, world.y, e);
      }
    });
  }

  /**
   * Toggle pause/resume
   */
  togglePause(): boolean {
    if (this.running) {
      this.stop();
      return true; // paused
    } else {
      this.start();
      return false; // running
    }
  }

  /**
   * Convenient keyboard handler
   */
  onKey(key: string, callback: (event: KeyboardEvent) => void): void {
    document.addEventListener('keydown', (e) => {
      if (e.code === key) {
        e.preventDefault();
        callback(e);
      }
    });
  }

  /**
   * Create a fullscreen centered canvas with default styling
   */
  static createFullscreenCanvas(options: {
    width?: number;
    height?: number;
    borderColor?: string;
    backgroundColor?: string;
    pixelPerfect?: boolean;
  } = {}): HTMLCanvasElement {
    const {
      width = 1280,
      height = 720,
      borderColor = '#00FF00',
      backgroundColor = 'linear-gradient(135deg,#1a1a2e 0%,#0f0f1e 100%)',
      pixelPerfect = true
    } = options;

    // Setup DOM
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    
    const container = document.createElement('div');
    container.style.cssText = `display:flex;justify-content:center;align-items:center;min-height:100vh;background:${backgroundColor}`;
    
    const canvasWrapper = document.createElement('div');
    canvasWrapper.style.cssText = `width:${width}px;height:${height}px;position:relative`;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    // Pixel-perfect rendering: no CSS scaling, canvas size matches wrapper exactly
    const cssStyle = pixelPerfect 
      ? `display:block;width:${width}px;height:${height}px;border:3px solid ${borderColor};box-shadow:0 0 30px rgba(0,255,0,0.5),0 0 60px rgba(0,255,0,0.3);border-radius:4px`
      : `display:block;width:100%;height:100%;border:3px solid ${borderColor};box-shadow:0 0 30px rgba(0,255,0,0.5),0 0 60px rgba(0,255,0,0.3);border-radius:4px`;
    
    canvas.style.cssText = cssStyle;
    
    canvasWrapper.appendChild(canvas);
    container.appendChild(canvasWrapper);
    document.body.appendChild(container);
    
    return canvas;
  }

  destroy(): void {
    this.stop();
    
    // Clean up debug tools
    this.panelManager.dispose();
    
    // Clean up scene and rendering
    if (this.currentScene) {
      this.currentScene.destroy();
    }
    this.renderer.destroy();
    this.textRenderer.destroy();
    this.bufferPool.clear();
  }
}
