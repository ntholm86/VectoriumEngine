/**
 * Vectorium Engine - Core Engine
 * Main engine class coordinating all systems
 */

import { FeatureDetector, EngineConfig } from './FeatureDetector';
import { WebGLBatchRenderer } from '../rendering/WebGLBatchRenderer';
import { TextRenderer, TextStyle } from '../rendering/TextRenderer';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';
import { BufferPool } from '../memory/Pooling';
import { World, EntityId } from './World';
import { Camera } from './Camera';
import { Viewport } from './Viewport';

// Re-export Viewport for convenience
export { Viewport };

export interface Entity {
  x: number;
  y: number;
  update(dt: number): void;
  render(renderer: WebGLBatchRenderer, textRenderer: TextRenderer): void;
  destroy(): void;
}

export class Scene {
  name: string;
  entities: Entity[] = [];
  active: boolean = false;
  
  // ECS World - transparent performance layer
  private world: World;
  private entityToId: WeakMap<Entity, EntityId> = new WeakMap();
  
  // Track entities with custom update logic (rare!)
  private entitiesWithCustomUpdate: Entity[] = [];
  
  // Track entities with custom render logic (rare!)
  private entitiesWithCustomRender: Entity[] = [];
  
  // Viewport manages all resolution and world bounds
  protected viewport: Viewport = Viewport.FullHD();
  
  // Convenience accessors (delegate to Viewport)
  protected get canvasWidth(): number { return this.viewport.width; }
  protected get canvasHeight(): number { return this.viewport.height; }
  protected get worldWidth(): number { return this.viewport.worldWidth; }
  protected get worldHeight(): number { return this.viewport.worldHeight; }
  
  // Camera for frustum culling
  private camera: Camera;
  private cullingEnabled = true;
  
  // 🚀 PRE-ALLOCATED INDEX BUFFER (zero allocations per frame!)
  private visibleIndices: Uint32Array;
  
  // Performance monitoring
  private enableWarnings = true;
  private updateTimeWarningThreshold = 10; // ms
  private renderTimeWarningThreshold = 16; // ms
  
  // Detailed performance metrics (public for UI access)
  public perfMetrics = {
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

  constructor(name: string, maxEntities = 2000000) { // Increased to 2M for extreme testing
    this.name = name;
    this.maxEntities = maxEntities;
    this.world = new World(maxEntities);
    this.camera = new Camera(this.viewport.width, this.viewport.height); // Use Viewport dimensions
    
    // 🚀 Allocate culling buffers once (reused every frame!)
    this.visibleIndices = new Uint32Array(maxEntities);
    this.visPosX = new Float32Array(maxEntities);
    this.visPosY = new Float32Array(maxEntities);
    this.visRot = new Uint16Array(maxEntities);
    this.visSizes = new Float32Array(maxEntities);
    this.visColorR = new Uint8Array(maxEntities);
    this.visColorG = new Uint8Array(maxEntities);
    this.visColorB = new Uint8Array(maxEntities);
    this.visAlphas = new Float32Array(maxEntities);
    this.visFlags = new Uint32Array(maxEntities);
  }

  async load(): Promise<void> {
    // Override in subclasses
  }

  update(dt: number): void {
    const startTime = performance.now();
    
    // CRITICAL OPTIMIZATION: Run ECS systems ONLY
    // Pure data entities don't need update() calls at all!
    const physicsStart = performance.now();
    this.world.updatePhysics(dt, this.worldWidth, this.worldHeight);
    this.perfMetrics.updatePhysics = performance.now() - physicsStart;
    
    const animStart = performance.now();
    this.world.updateAnimations(dt);
    this.perfMetrics.updateAnimation = performance.now() - animStart;
    
    let entitySyncTime = 0;
    // ONLY update entities with custom logic (typically 0-1% of entities)
    // Most entities are pure data containers managed entirely by ECS
    if (this.entitiesWithCustomUpdate.length > 0) {
      const syncStart = performance.now();
      const posX = this.world.getPositionX();
      const posY = this.world.getPositionY();
      
      for (const entity of this.entitiesWithCustomUpdate) {
        const id = this.entityToId.get(entity);
        if (id === undefined) continue;
        
        // Sync position from ECS
        entity.x = posX[id];
        entity.y = posY[id];
        
        // Call custom update logic
        entity.update(dt);
        
        // Sync back if modified
        if (entity.x !== posX[id] || entity.y !== posY[id]) {
          posX[id] = entity.x;
          posY[id] = entity.y;
        }
      }
      entitySyncTime = performance.now() - syncStart;
    }
    
    this.perfMetrics.updateEntitySync = entitySyncTime;
    this.perfMetrics.updateTotal = performance.now() - startTime;
    this.perfMetrics.customUpdateCount = this.entitiesWithCustomUpdate.length;
    this.perfMetrics.ecsActiveEntities = this.world.getActiveCount();
    this.perfMetrics.ecsTotalEntities = this.world.getTotalCount();
    
    if (this.enableWarnings && this.perfMetrics.updateTotal > this.updateTimeWarningThreshold) {
      console.warn(`⚠️ VECTORIUM UPDATE BREAKDOWN: Total=${this.perfMetrics.updateTotal.toFixed(2)}ms | Physics=${this.perfMetrics.updatePhysics.toFixed(2)}ms | Anim=${this.perfMetrics.updateAnimation.toFixed(2)}ms | EntitySync=${this.perfMetrics.updateEntitySync.toFixed(2)}ms | Entities w/ custom update=${this.entitiesWithCustomUpdate.length}`);
    }
  }

  render(renderer: WebGLBatchRenderer, textRenderer: TextRenderer): void {
    const startTime = performance.now();
    
    // OPTIMIZATION: Batch-render directly from ECS arrays (10-100x faster!)
    const batchStart = performance.now();
    this.renderECSBatch(renderer);
    this.perfMetrics.renderBatch = performance.now() - batchStart;
    
    // Then render ONLY entities with custom rendering (should be near-zero)
    let customRenderTime = 0;
    if (this.entitiesWithCustomRender.length > 0) {
      const customStart = performance.now();
      for (const entity of this.entitiesWithCustomRender) {
        entity.render(renderer, textRenderer);
      }
      customRenderTime = performance.now() - customStart;
    }
    
    this.perfMetrics.renderCustom = customRenderTime;
    this.perfMetrics.renderTotal = performance.now() - startTime;
    this.perfMetrics.customRenderCount = this.entitiesWithCustomRender.length;
    
    if (this.enableWarnings && this.perfMetrics.renderTotal > this.renderTimeWarningThreshold) {
      console.warn(`⚠️ VECTORIUM RENDER BREAKDOWN: Total=${this.perfMetrics.renderTotal.toFixed(2)}ms | Batch=${this.perfMetrics.renderBatch.toFixed(2)}ms | Custom=${this.perfMetrics.renderCustom.toFixed(2)}ms | CustomCount=${this.entitiesWithCustomRender.length}`);
    }
  }
  
  /**
   * CRITICAL OPTIMIZATION: Batch-render all ECS entities in one tight loop
   * WITH FRUSTUM CULLING: Only render visible entities!
   * This is 10-100x faster than calling entity.render() per-entity
   * Uses cached rotation lookups and contiguous array access
   */
  private renderECSBatch(renderer: WebGLBatchRenderer): void {
    const posX = this.world.getPositionX();
    const posY = this.world.getPositionY();
    const rotation = this.world.getRotation();
    const sizes = this.world.getSizes();
    const colorR = this.world.getColorR();
    const colorG = this.world.getColorG();
    const colorB = this.world.getColorB();
    const alphas = this.world.getAlphas();
    const flags = this.world.getFlags();
    
    const totalCount = this.world.getActiveCount();
    
    if (!this.cullingEnabled) {
      // No culling - render all entities using best available method
      if (renderer.isInstancingActive()) {
        renderer.drawInstanced(
          posX, posY, rotation, sizes,
          colorR, colorG, colorB, alphas,
          flags, totalCount, this.world.FLAG_VISIBLE
        );
      } else {
        renderer.drawBulk(
          posX, posY, rotation, sizes,
          colorR, colorG, colorB, alphas,
          flags, totalCount, this.world.FLAG_VISIBLE
        );
      }
      return;
    }
    
    // FRUSTUM CULLING: Only render visible entities
    // 🚀 ULTRA-OPTIMIZED: Use indexed rendering (zero copy!)
    const visibleCount = this.camera.cullEntities(
      posX,
      posY,
      sizes,
      totalCount,
      this.visibleIndices
    );
    
    // 🔥 ZERO COPY: Render directly from source arrays using indices!
    if (renderer.isInstancingActive()) {
      // Use drawInstancedIndexed for optimal instanced rendering with culling
      renderer.drawInstancedIndexed(
        posX, posY, rotation, sizes,
        colorR, colorG, colorB, alphas,
        flags, this.visibleIndices, visibleCount, this.world.FLAG_VISIBLE
      );
    } else {
      // Use indexed batch rendering for non-instanced path
      renderer.drawBulkIndexed(
        posX, posY, rotation, sizes,
        colorR, colorG, colorB, alphas,
        flags, this.visibleIndices, visibleCount, this.world.FLAG_VISIBLE
      );
    }
    
    // Track culling stats (stored on scene for perf monitor access)
    (this as any).culledCount = totalCount - visibleCount;
    (this as any).visibleCount = visibleCount;
  }
  
  setWarningsEnabled(enabled: boolean): void {
    this.enableWarnings = enabled;
  }
  
  /**
   * Enable/disable frustum culling
   */
  setCullingEnabled(enabled: boolean): void {
    this.cullingEnabled = enabled;
  }

  /**
   * Get the camera for manual control
   */
  getCamera(): Camera {
    return this.camera;
  }
  
  /**
   * Update canvas/viewport dimensions
   * Should be called when canvas is resized
   * Preserves current world scale multiplier
   */
  setCanvasDimensions(width: number, height: number): void {
    const worldScale = this.viewport.worldScale;
    this.viewport = this.viewport.resize(width, height);
    if (worldScale !== 1.0) {
      this.viewport = this.viewport.setWorldScale(worldScale);
    }
    this.camera.resize(width, height);
  }
  
  /**
   * Set world bounds multiplier for physics
   * 1.0 = viewport only (entities bounce at screen edges)
   * 10.0 = 10x world (entities can move offscreen, requires frustum culling)
   */
  setWorldBoundsMultiplier(multiplier: number): void {
    this.viewport = this.viewport.setWorldScale(multiplier);
  }
  
  /**
   * Get actual world bounds for physics (canvas * multiplier)
   */
  getWorldWidth(): number {
    return this.worldWidth;
  }
  
  getWorldHeight(): number {
    return this.worldHeight;
  }

  addEntity(entity: Entity): void {
    this.entities.push(entity);
    
    // Check if entity needs custom update calls (opt-in via marker)
    // By default, entities are pure data containers managed by ECS
    const anyEntity = entity as any;
    if (anyEntity.__needsUpdate === true) {
      this.entitiesWithCustomUpdate.push(entity);
    }
    
    // Check if entity needs custom render calls (opt-in via marker)
    if (anyEntity.__customRender === true) {
      this.entitiesWithCustomRender.push(entity);
    }
    
    // Automatically create ECS component for transparent performance boost
    const id = this.world.createEntity(
      entity.x, 
      entity.y,
      anyEntity.vx || 0,  // Use velocity from entity if it has it
      anyEntity.vy || 0
    );
    this.entityToId.set(entity, id);
    
    // Sync initial properties to ECS (if entity has them)
    const posX = this.world.getPositionX();
    const posY = this.world.getPositionY();
    const rotation = this.world.getRotation();
    const sizes = this.world.getSizes();
    const colorR = this.world.getColorR();
    const colorG = this.world.getColorG();
    const colorB = this.world.getColorB();
    const alphas = this.world.getAlphas();
    
    // Position is always synced
    posX[id] = entity.x;
    posY[id] = entity.y;
    
    // Optional rotation (convert to integer degrees if needed)
    if (typeof anyEntity.rotation === 'number') {
      const degrees = Math.round((anyEntity.rotation * 180 / Math.PI)) % 360;
      rotation[id] = degrees < 0 ? degrees + 360 : degrees;
    }
    
    // Optional size
    if (typeof anyEntity.size === 'number') {
      sizes[id] = anyEntity.size;
    } else if (typeof anyEntity.radius === 'number') {
      sizes[id] = anyEntity.radius;
    }
    
    // Optional color (handle object format {r,g,b})
    if (anyEntity.color && typeof anyEntity.color === 'object') {
      colorR[id] = Math.floor(anyEntity.color.r * 255);
      colorG[id] = Math.floor(anyEntity.color.g * 255);
      colorB[id] = Math.floor(anyEntity.color.b * 255);
    } else if (typeof anyEntity.color === 'number') {
      const color = anyEntity.color;
      colorR[id] = (color >> 16) & 0xFF;
      colorG[id] = (color >> 8) & 0xFF;
      colorB[id] = color & 0xFF;
    }
    
    // Optional alpha
    if (typeof anyEntity.alpha === 'number') {
      alphas[id] = anyEntity.alpha;
    }
    
    // Note: Velocity, rotation speed, animation type are set by createEntity()
    // with random values. Override them manually via World arrays if needed.
  }

  removeEntity(entity: Entity): void {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
      
      // Remove from custom update list if present
      const customUpdateIndex = this.entitiesWithCustomUpdate.indexOf(entity);
      if (customUpdateIndex !== -1) {
        this.entitiesWithCustomUpdate.splice(customUpdateIndex, 1);
      }
      
      // Remove from custom render list if present
      const customRenderIndex = this.entitiesWithCustomRender.indexOf(entity);
      if (customRenderIndex !== -1) {
        this.entitiesWithCustomRender.splice(customRenderIndex, 1);
      }
      
      // Remove from ECS
      const id = this.entityToId.get(entity);
      if (id !== undefined) {
        this.world.destroyEntity(id);
        this.entityToId.delete(entity);
      }
      
      entity.destroy();
    }
  }

  clear(): void {
    for (const entity of this.entities) {
      const id = this.entityToId.get(entity);
      if (id !== undefined) {
        this.world.destroyEntity(id);
      }
      entity.destroy();
    }
    this.entities = [];
    this.entitiesWithCustomUpdate = [];
    this.entitiesWithCustomRender = [];
    this.entityToId = new WeakMap();
  }

  destroy(): void {
    this.clear();
  }
}

export class Vectorium {
  readonly canvas: HTMLCanvasElement;
  readonly config: EngineConfig;
  readonly featureDetector: FeatureDetector;
  readonly renderer: WebGLBatchRenderer;
  readonly textRenderer: TextRenderer;
  readonly performanceMonitor: PerformanceMonitor;
  readonly bufferPool: BufferPool;
  
  private scenes = new Map<string, Scene>();
  private currentScene: Scene | null = null;
  private running = false;
  private lastTime = 0;
  private rafId = 0;

  constructor(config: Partial<EngineConfig>) {
    this.featureDetector = new FeatureDetector();
    
    const canvas = config.canvas || document.createElement('canvas');
    const optimal = this.featureDetector.getOptimalConfig();
    
    this.config = {
      canvas,
      width: config.width || 800,
      height: config.height || 600,
      preferWebGL2: config.preferWebGL2 ?? optimal.preferWebGL2 ?? false,
      useImageBitmap: config.useImageBitmap ?? optimal.useImageBitmap ?? false,
      useWorkers: config.useWorkers ?? optimal.useWorkers ?? false,
      targetFPS: config.targetFPS ?? optimal.targetFPS ?? 60,
      maxTextureSize: config.maxTextureSize ?? optimal.maxTextureSize ?? 2048,
      enableAdaptiveQuality: config.enableAdaptiveQuality ?? true,
      initialQuality: config.initialQuality ?? optimal.initialQuality ?? 'high',
      debugMode: config.debugMode ?? false
    };
    
    this.canvas = canvas;
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    
    // Initialize renderer
    const useWebGL2 = this.config.preferWebGL2 && this.featureDetector.capabilities.hasWebGL2;
    this.renderer = new WebGLBatchRenderer(this.canvas, useWebGL2);
    
    // Initialize text renderer (uses same WebGL context, no overlay canvas)
    this.textRenderer = new TextRenderer(this.config.width, this.config.height);
    this.textRenderer.setGLContext(this.renderer.getContext());
    
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
    
    console.log(`Vectorium Engine initialized`);
    console.log(`WebGL2: ${useWebGL2}`);
    console.log(`Target FPS: ${this.config.targetFPS}`);
    console.log(`Adaptive Quality: ${this.config.enableAdaptiveQuality}`);
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

  destroy(): void {
    this.stop();
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
