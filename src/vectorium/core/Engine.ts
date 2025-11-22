/**
 * Vectorium Engine - Core Engine
 * Main engine class coordinating all systems
 */

import { FeatureDetector, EngineConfig } from './FeatureDetector';
import { RuntimeConfig } from './RuntimeConfig';
import { WebGLBatchRenderer } from '../rendering/WebGLBatchRenderer';
import { TextRenderer, TextStyle } from '../rendering/TextRenderer';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';
import { BufferPool } from '../memory/Pooling';
import { Camera } from './Camera';
import { Viewport } from './Viewport';
import { Scene } from './Scene';
import { DebugPanel } from '../debug/DebugPanel';
import { EntitySpawner } from '../debug/EntitySpawner';
import { CameraControls } from '../debug/CameraControls';

// Re-export for convenience
export { Viewport, Scene };
export type { Entity, EntityId, EntityFlags } from './Entity';

export class Vectorium {
  readonly canvas: HTMLCanvasElement;
  readonly config: EngineConfig;
  readonly featureDetector: FeatureDetector;
  readonly renderer: WebGLBatchRenderer;
  readonly textRenderer: TextRenderer;
  readonly performanceMonitor: PerformanceMonitor;
  readonly bufferPool: BufferPool;
  readonly runtimeConfig: RuntimeConfig;
  
  private scenes = new Map<string, Scene>();
  private currentScene: Scene | null = null;
  private running = false;
  private lastTime = 0;
  private rafId = 0;
  
  // Debug tools (optional)
  private debugPanel?: DebugPanel;
  private entitySpawner?: EntitySpawner;
  private cameraControls?: CameraControls;

  constructor(config: Partial<EngineConfig> = {}) {
    this.featureDetector = new FeatureDetector();
    const optimal = this.featureDetector.getOptimalConfig();
    
    // Use RuntimeConfig defaults as fallback
    this.runtimeConfig = new RuntimeConfig();
    const { width, height } = this.runtimeConfig.rendering.resolution;
    const { targetFPS } = this.runtimeConfig.quality;
    
    this.config = {
      canvas: config.canvas ?? document.createElement('canvas'),
      width: config.width ?? width,
      height: config.height ?? height,
      preferWebGL2: config.preferWebGL2 ?? optimal.preferWebGL2 ?? true,
      useImageBitmap: config.useImageBitmap ?? optimal.useImageBitmap ?? false,
      useWorkers: config.useWorkers ?? optimal.useWorkers ?? false,
      targetFPS: config.targetFPS ?? targetFPS,
      maxTextureSize: config.maxTextureSize ?? optimal.maxTextureSize ?? 2048,
      enableAdaptiveQuality: config.enableAdaptiveQuality ?? this.runtimeConfig.quality.enableAdaptiveQuality,
      initialQuality: config.initialQuality ?? optimal.initialQuality ?? 'high',
      debugMode: config.debugMode ?? this.runtimeConfig.debug.showStats,
      enableDebugTools: config.enableDebugTools ?? false
    };
    
    this.canvas = this.config.canvas;
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    
    // Initialize renderer
    const useWebGL2 = this.config.preferWebGL2 && this.featureDetector.capabilities.hasWebGL2;
    this.renderer = new WebGLBatchRenderer(this.canvas, useWebGL2);
    
    // Initialize text renderer (uses same WebGL context, no overlay canvas)
    this.textRenderer = new TextRenderer(this.config.width, this.config.height);
    this.textRenderer.setGLContext(this.renderer.getContext());
    this.textRenderer.setBatchRenderer(this.renderer);
    
    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor(
      this.config.targetFPS,
      this.config.initialQuality
    );
    this.performanceMonitor.setAdaptiveQuality(this.config.enableAdaptiveQuality);
    
    // Connect performance monitor to renderer for detailed metrics
    this.renderer.setPerformanceMonitor(this.performanceMonitor);
    
    // Initialize buffer pool
    this.bufferPool = new BufferPool();
    
    // Sync RuntimeConfig with actual canvas dimensions (after RuntimeConfig loads from localStorage)
    this.runtimeConfig.rendering.resolution.width = this.canvas.width;
    this.runtimeConfig.rendering.resolution.height = this.canvas.height;
    
    // Setup runtime config change handler
    this.setupRuntimeConfig();
    
    // Initialize debug tools if enabled
    if (this.config.enableDebugTools) {
      this.initializeDebugTools();
    }
    
    // Setup default keyboard shortcuts
    this.setupDefaultKeyboardShortcuts();
    
    console.log(`Vectorium Engine initialized`);
    console.log(`WebGL2: ${useWebGL2}`);
    console.log(`Target FPS: ${this.config.targetFPS}`);
    console.log(`Adaptive Quality: ${this.config.enableAdaptiveQuality}`);
    console.log(`Debug Tools: ${this.config.enableDebugTools ? 'Enabled (Press C, E, V, P)' : 'Disabled'}`);
  }
  
  private setupDefaultKeyboardShortcuts(): void {
    // Spacebar to pause/resume
    this.onKey('Space', (e) => {
      e.preventDefault(); // Prevent page scroll
      this.togglePause();
    });
  }
  
  private setupRuntimeConfig(): void {
    this.runtimeConfig.onChange((cfg) => {
      // Apply batch size
      this.renderer.setBatchSize(cfg.rendering.batchSize);
      
      // Apply clear color
      this.renderer.setClearColor(cfg.rendering.clearColor[0], cfg.rendering.clearColor[1], cfg.rendering.clearColor[2], cfg.rendering.clearColor[3]);
      
      // Apply resolution changes
      const { width, height } = cfg.rendering.resolution;
      if (width !== this.config.width || height !== this.config.height) {
        this.resize(width, height);
      }
      
      // Apply scene settings
      if (this.currentScene) {
        this.currentScene.setCullingEnabled(cfg.rendering.enableFrustumCulling);
        this.currentScene.setWorldBoundsMultiplier(cfg.physics.boundsMultiplier);
      }
      
      // Apply quality settings
      this.performanceMonitor.setAdaptiveQuality(cfg.quality.enableAdaptiveQuality);
      
      // Apply camera settings
      const camera = this.getCamera();
      if (camera) {
        camera.setZoom(cfg.camera.zoom);
        camera.setZoomRange(cfg.camera.minZoom, cfg.camera.maxZoom);
        camera.setSmooth(cfg.camera.smooth, cfg.camera.smoothFactor);
        camera.setFollowSettings(cfg.camera.followLerp, cfg.camera.followDeadzoneX, cfg.camera.followDeadzoneY);
        camera.setCullingMargin(cfg.camera.cullingMargin);
      }
    });
  }
  
  private initializeDebugTools(): void {
    // Initialize debug panel (Press C)
    this.debugPanel = new DebugPanel(this.runtimeConfig);
    
    // Note: Entity spawner and camera controls need a scene/camera
    // They will be initialized in loadScene()
  }

  registerScene(name: string, scene: Scene): void {
    this.scenes.set(name, scene);
  }

  async loadScene(name: string): Promise<void> {
    const scene = this.scenes.get(name);
    if (!scene) {
      throw new Error(`Scene "${name}" not found`);
    }
    
    if (this.currentScene) {
      this.currentScene.active = false;
      this.currentScene.clear();
    }
    
    this.currentScene = scene;
    this.currentScene.active = true;
    
    // Set canvas dimensions for physics bounds
    this.currentScene.setCanvasDimensions(this.canvas.width, this.canvas.height);
    
    await this.currentScene.load();
    
    // Initialize scene-specific debug tools
    if (this.config.enableDebugTools) {
      // Entity spawner (Press E)
      this.entitySpawner = new EntitySpawner(this.currentScene);
      this.entitySpawner.registerCallbacks({
        remove1K: () => {
          // Remove last 1K entities using pure ECS
          this.currentScene?.removeLast(1000);
        },
        clearAll: () => this.currentScene?.clear()
      });
      
      // Camera controls (Press V)
      const camera = this.getCamera();
      if (camera) {
        this.cameraControls = new CameraControls(camera, this.runtimeConfig);
      }
    }
    
    // Apply initial runtime config
    this.runtimeConfig.onChange(this.runtimeConfig as any);
    
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
    
    this.performanceMonitor.beginFrame();
    
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Cap at 100ms
    this.lastTime = now;
    
    // Apply adaptive quality settings to text renderer
    const qualitySettings = this.performanceMonitor.getQualitySettings();
    this.textRenderer.setResolutionScale(qualitySettings.resolutionScale);
    
    // Update scene
    if (this.currentScene && this.currentScene.active) {
      // Expose current scene globally for profiler access
      (window as any).vectoriumCurrentScene = this.currentScene;
      
      this.currentScene.update(dt);
      
      // Record entities processed for performance monitoring
      this.performanceMonitor.recordEntitiesProcessed(this.currentScene.perfMetrics.ecsActiveEntities);
      this.performanceMonitor.recordEntitiesRendered(this.currentScene.perfMetrics.ecsActiveEntities);
    }
    
    // Render WebGL
    this.renderer.begin(this.canvas.width, this.canvas.height);
    
    // Clear and begin text rendering
    this.textRenderer.begin();
    
    if (this.currentScene && this.currentScene.active) {
      this.currentScene.render(this.renderer, this.textRenderer);
      
      // Record culling statistics if available
      const visibleCount = (this.currentScene as any).visibleCount;
      const culledCount = (this.currentScene as any).culledCount;
      if (visibleCount !== undefined && culledCount !== undefined) {
        this.performanceMonitor.recordCulling(visibleCount, culledCount);
      }
    }
    
    this.renderer.end();
    
    // Debug info (rendered as text)
    if (this.config.debugMode) {
      this.renderDebugInfo();
    }
    
    // Record metrics from rendering
    this.performanceMonitor.recordWebGLDrawCalls(this.renderer.getDrawCallCount());
    this.performanceMonitor.recordTextDrawCalls(this.textRenderer.getDrawCallCount());
    this.performanceMonitor.recordTextMemory(this.textRenderer.getMemoryUsage());
    
    // Record physics metrics
    if (this.currentScene) {
      const physicsMetrics = this.currentScene.world.getPhysicsMetrics();
      this.performanceMonitor.recordPhysicsMetrics(physicsMetrics);
    }
    
    // End performance monitoring (includes both WebGL and text rendering)
    this.performanceMonitor.endFrame();
    
    this.rafId = requestAnimationFrame(this.gameLoop);
  };

  private renderDebugInfo(): void {
    const metrics = this.performanceMonitor.getMetrics();
    
    // Draw background for debug text
    this.renderer.drawRect(5, 5, 240, 120, { r: 0, g: 0, b: 0 }, 0.7);
    
    // Draw debug text using text renderer
    const textStyle: TextStyle = {
      fontSize: 14,
      fontFamily: 'monospace',
      color: '#00FF00',
      align: 'left',
      baseline: 'top'
    };
    
    const lineHeight = 18;
    const startX = 10;
    const startY = 10;
    
    this.textRenderer.drawText(`FPS: ${Math.round(metrics.fps)}`, startX, startY, textStyle);
    this.textRenderer.drawText(`Frame: ${metrics.frameTime.toFixed(2)}ms`, startX, startY + lineHeight, textStyle);
    this.textRenderer.drawText(`WebGL Calls: ${metrics.webglDrawCalls}`, startX, startY + lineHeight * 2, textStyle);
    this.textRenderer.drawText(`Text Calls: ${metrics.textDrawCalls}`, startX, startY + lineHeight * 3, textStyle);
    this.textRenderer.drawText(`Memory: ${Math.round(metrics.memory)}MB`, startX, startY + lineHeight * 4, textStyle);
    this.textRenderer.drawText(`Text Mem: ${metrics.textMemory.toFixed(2)}MB`, startX, startY + lineHeight * 5, textStyle);
    this.textRenderer.drawText(`Quality: ${metrics.quality.toUpperCase()}`, startX, startY + lineHeight * 6, textStyle);
  }

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
    this.textRenderer.resize(width, height);
    
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
      drawCalls: this.renderer.getDrawCallCount() + this.textRenderer.getDrawCallCount(),
      webglDrawCalls: this.renderer.getDrawCallCount(),
      textDrawCalls: this.textRenderer.getDrawCallCount(),
      textMemory: this.textRenderer.getMemoryUsage(),
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
    if (this.currentScene) {
      this.currentScene.setWarningsEnabled(enabled);
    }
  }
  
  /**
   * Get the WebGL renderer instance for advanced configuration
   */
  getRenderer(): WebGLBatchRenderer {
    return this.renderer;
  }

  /**
   * Get the current scene's camera
   */
  getCamera(): Camera | null {
    return this.currentScene ? this.currentScene.getCamera() : null;
  }

  /**
   * Get the entity spawner for click spawn count
   */
  getEntitySpawner(): EntitySpawner | undefined {
    return this.entitySpawner;
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
    const camera = this.getCamera();
    if (!camera) return null;
    
    const canvasCoords = this.getCanvasCoordinates(clientX, clientY);
    return camera.screenToWorld(canvasCoords.x, canvasCoords.y);
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
  } = {}): HTMLCanvasElement {
    const {
      width = 1280,
      height = 720,
      borderColor = '#00FF00',
      backgroundColor = 'linear-gradient(135deg,#1a1a2e 0%,#0f0f1e 100%)'
    } = options;

    // Setup DOM
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    
    const container = document.createElement('div');
    container.style.cssText = `display:flex;justify-content:center;align-items:center;min-height:100vh;background:${backgroundColor}`;
    
    const canvasWrapper = document.createElement('div');
    canvasWrapper.style.cssText = `width:${width}px;height:${height}px;position:relative`;
    
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `display:block;width:100%;height:100%;border:3px solid ${borderColor};box-shadow:0 0 30px rgba(0,255,0,0.5),0 0 60px rgba(0,255,0,0.3);border-radius:4px`;
    
    canvasWrapper.appendChild(canvas);
    container.appendChild(canvasWrapper);
    document.body.appendChild(container);
    
    return canvas;
  }

  destroy(): void {
    this.stop();
    
    // Clean up debug tools
    if (this.debugPanel) {
      this.debugPanel.destroy();
    }
    if (this.entitySpawner) {
      this.entitySpawner.destroy();
    }
    if (this.cameraControls) {
      this.cameraControls.destroy();
    }
    
    // Clean up scene and rendering
    if (this.currentScene) {
      this.currentScene.destroy();
    }
    this.renderer.destroy();
    this.textRenderer.destroy();
    this.bufferPool.clear();
  }

  /**
   * Draw text on the screen (convenience method)
   */
  drawText(text: string, x: number, y: number, style?: TextStyle): void {
    this.textRenderer.drawText(text, x, y, style);
  }
}
