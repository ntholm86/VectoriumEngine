/**
 * Scene class
 * Manages ECS world, rendering, and physics
 * 
 * 🚀 P0 OPTIMIZATION: Pure ECS - no Entity class instances
 * Memory: 76 bytes/entity (was 140 bytes with OOP overhead)
 */

import { World, EntityId } from './World';
import { Camera } from './Camera';
import { Viewport } from './Viewport';
import { WebGLBatchRenderer } from '../rendering/WebGLBatchRenderer';
import { TextRenderer } from '../rendering/TextRenderer';
import type { EntityBurstFactory } from '../entities/factories';

// 🚀 Service Injection System
import { SceneServicesContainer } from './SceneServices';

// 🚀 Behavior System
import { SceneBehaviorManager, type SceneBehavior } from '../behaviors/SceneBehavior';

export class Scene {
  name: string;
  active: boolean = false;
  
  // 🚀 Pure ECS World - all entity data lives here
  public world: World;
  
  // 🚀 Type-safe service container
  protected readonly services = new SceneServicesContainer();
  
  // 🚀 Behavior system for composition
  protected readonly behaviors = new SceneBehaviorManager(this);
  
  // Viewport manages all resolution and world bounds
  // Initialize with HD resolution (will be updated by Engine.loadScene)
  protected viewport: Viewport = Viewport.HD();
  
  // Convenience accessors (delegate to Viewport)
  protected get canvasWidth(): number { return this.viewport.width; }
  protected get canvasHeight(): number { return this.viewport.height; }
  protected get worldWidth(): number { return this.viewport.worldWidth; }
  protected get worldHeight(): number { return this.viewport.worldHeight; }
  
  // Camera for frustum culling
  private camera: Camera;
  private cullingEnabled = true;
  
  // 🚀 PRE-ALLOCATED BUFFERS (zero allocations per frame!)
  private visibleIndices: Uint32Array;
  
  // Performance monitoring
  private enableWarnings = false; // Disabled - text texture switching causes expected slowness
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
    this.world = new World(maxEntities);
    // Initialize camera centered on viewport
    this.camera = new Camera(
      this.viewport.width, 
      this.viewport.height,
      { x: this.viewport.width / 2, y: this.viewport.height / 2, zoom: 1 }
    );
    
    // 🚀 Allocate culling buffers once (reused every frame!)
    this.visibleIndices = new Uint32Array(maxEntities);
  }

  async load(): Promise<void> {
    // Override in subclasses
  }

  update(dt: number): void {
    const startTime = performance.now();
    
    // 🚀 Behavior pre-update
    this.behaviors.update(dt);
    
    // 🚀 Pure ECS update - no entity sync overhead!
    const physicsStart = performance.now();
    // CRITICAL: Pass WORLD dimensions for physics boundaries (entities bounce at world edges)
    // When boundsMultiplier = 1.0, world = viewport (bounce at screen edges)
    // When boundsMultiplier > 1.0, world > viewport (camera can scroll, entities off-screen)
    this.world.updatePhysics(dt, this.viewport.worldWidth, this.viewport.worldHeight);
    this.perfMetrics.updatePhysics = performance.now() - physicsStart;
    
    const animStart = performance.now();
    this.world.updateAnimations(dt);
    
    // 🚀 Update frame animations and tweens via service
    if (this.services.isInitialized()) {
      this.services.animationSystem.update(dt);
    }
    
    this.perfMetrics.updateAnimation = performance.now() - animStart;
    
    // 🚀 Behavior late-update
    this.behaviors.lateUpdate(dt);
    
    this.perfMetrics.updateEntitySync = 0; // No sync needed!
    this.perfMetrics.updateTotal = performance.now() - startTime;
    this.perfMetrics.customUpdateCount = 0; // No custom entities
    this.perfMetrics.ecsActiveEntities = this.world.getActiveCount();
    this.perfMetrics.ecsTotalEntities = this.world.getTotalCount();
    
    // Update camera (smooth movement, follow, shake, bounds)
    this.camera.update(dt);
    
    if (this.enableWarnings && this.perfMetrics.updateTotal > this.updateTimeWarningThreshold) {
      console.warn(`⚠️ VECTORIUM UPDATE: ${this.perfMetrics.updateTotal.toFixed(2)}ms | Physics=${this.perfMetrics.updatePhysics.toFixed(2)}ms | Anim=${this.perfMetrics.updateAnimation.toFixed(2)}ms`);
    }
  }

  render(renderer: WebGLBatchRenderer, textRenderer: TextRenderer, _textPool?: any): void {
    const startTime = performance.now();
    
    // 🎨 UNIFIED RENDERING PIPELINE: Sprites → Shapes → Text (all through WebGLBatchRenderer)
    // Pass 1: Render sprites and shapes
    const batchStart = performance.now();
    this.renderECSBatch(renderer);
    this.perfMetrics.renderBatch = performance.now() - batchStart;
    
    // Pass 2: Render text (TextRenderer → creates textures → WebGLBatchRenderer)
    const textStart = performance.now();
    
    // TextRenderer handles ALL text rendering (static, dynamic, effects)
    const textEntities = (this as any).getTextEntities?.();
    if (textRenderer && textEntities && textEntities.size > 0) {
      this.renderTextBatch(textRenderer);
    }
    const textTime = performance.now() - textStart;
    
    this.perfMetrics.renderCustom = textTime; // Track text rendering time
    this.perfMetrics.renderTotal = performance.now() - startTime;
    
    // Count text entities from World.textIndices
    const textIndices = this.world.getTextIndices();
    const flags = this.world.getFlags();
    let textEntityCount = 0;
    for (let i = 0; i < this.world.getTotalCount(); i++) {
      if ((flags[i] & this.world.FLAG_ACTIVE) && textIndices[i] >= 0) {
        textEntityCount++;
      }
    }
    this.perfMetrics.customRenderCount = textEntityCount;
    
    if (this.enableWarnings && this.perfMetrics.renderTotal > this.renderTimeWarningThreshold) {
      console.warn(`⚠️ VECTORIUM RENDER: ${this.perfMetrics.renderTotal.toFixed(2)}ms | Batch=${this.perfMetrics.renderBatch.toFixed(2)}ms | Text=${textTime.toFixed(2)}ms`);
    }
  }
  
  /**
   * 🎨 Render text entities using TextRenderer
   * TextRenderer creates textures and passes them to WebGLBatchRenderer
   */
  private renderTextBatch(textRenderer: TextRenderer): void {
    // Get text entities from DemoScene if available
    const textEntities = (this as any).getTextEntities?.();
    // console.log('🎨 renderTextBatch: textEntities =', textEntities, 'size =', textEntities?.size);
    if (!textEntities || textEntities.size === 0) return;
    
    const textIndices = this.world.getTextIndices();
    const posX = this.world.getPositionX();
    const posY = this.world.getPositionY();
    const rotation = this.world.getRotation();
    const scales = this.world.getScale();
    const flags = this.world.getFlags();
    const count = this.world.getTotalCount();
    
    for (let id = 0; id < count; id++) {
      if (!(flags[id] & this.world.FLAG_ACTIVE)) continue;
      if (textIndices[id] < 0) continue;
      
      const textData = textEntities.get(id);
      if (!textData) continue;
      
      // Get world position
      const worldX = posX[id];
      const worldY = posY[id];
      const rot = rotation[id];
      const scale = scales[id];
      
      // Transform to screen space
      const screenX = (worldX - this.camera.x) * this.camera.getZoom() + this.canvasWidth / 2;
      const screenY = (worldY - this.camera.y) * this.camera.getZoom() + this.canvasHeight / 2;
      
      // Render text at screen position with rotation and scale (TextRenderer → WebGLBatchRenderer)
      textRenderer.drawText(textData.text, screenX, screenY, textData.style, rot, scale);
    }
  }
  
  /**
   * CRITICAL OPTIMIZATION: Batch-render all ECS entities in one tight loop
   * WITH FRUSTUM CULLING: Only render visible entities!
   * 🎨 NEW: Supports shape rendering via drawBulkShapes
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
    const shapeTypes = this.world.getShapeTypes(); // 🎨 Shape types array
    
    const totalCount = this.world.getActiveCount();
    
    // 🎬 Apply scale to sizes (for animation system)
    const scales = this.world.getScale();
    const scaledSizes = new Float32Array(sizes.length);
    for (let i = 0; i < sizes.length; i++) {
      scaledSizes[i] = sizes[i] * scales[i];
    }
    
    // Smart culling: Auto-disable when scene = viewport (all entities always visible)
    // This avoids culling overhead when there's nothing to cull
    const worldScale = this.viewport.worldScale;
    const shouldCull = this.cullingEnabled && worldScale > 1.01; // Allow 1% tolerance
    
    // Track culling state changes for debugging
    const cullingStateChanged = shouldCull !== (this as any)._lastCullingState;
    if (cullingStateChanged) {
      (this as any)._lastCullingState = shouldCull;
      if (this.cullingEnabled) {
        const reason = worldScale <= 1.01 ? '(world = viewport, nothing to cull)' : '(world > viewport)';
        console.log(`🔍 Smart Culling: ${shouldCull ? 'ACTIVE' : 'AUTO-DISABLED'} ${reason} [scale: ${worldScale.toFixed(2)}x]`);
      }
      
      // Notify debug panel of culling state change
      if ((this as any)._debugPanel) {
        (this as any)._debugPanel.updateCullingStatus(shouldCull, worldScale);
      }
    }
    
    if (!shouldCull) {
      // No culling - render all entities
      // 🎨 Unified rendering: drawBulkShapes handles BOTH shapes and sprites
      if (renderer.isGPUAccelerationEnabled()) {
        renderer.drawBulkShapes(
          posX, posY, rotation, scaledSizes,
          colorR, colorG, colorB, alphas, shapeTypes,
          flags, totalCount, this.world.FLAG_VISIBLE,
          this.camera.x, this.camera.y, this.camera.getZoom()
        );
      } else {
        // Fallback: Standard sprite rendering (WebGL1 or GPU disabled)
        renderer.drawBulk(
          posX, posY, rotation, scaledSizes,
          colorR, colorG, colorB, alphas,
          flags, totalCount, this.world.FLAG_VISIBLE,
          this.camera.x, this.camera.y, this.camera.getZoom()
        );
      }
      
      // Track stats: no culling means all entities visible
      (this as any).culledCount = 0;
      (this as any).visibleCount = totalCount;
      return;
    }
    
    // FRUSTUM CULLING: Only render entities inside viewport bounds
    // NOTE: This does NOT do occlusion culling (hiding entities behind others)
    // Entities at the same position will ALL render (last one on top)
    // 🚀 ULTRA-OPTIMIZED: Use indexed rendering (zero copy!)
    const visibleCount = this.camera.cullEntities(
      posX,
      posY,
      scaledSizes,
      totalCount,
      this.visibleIndices
    );
    
    // 🔥 ZERO COPY: Render directly from source arrays using indices!
    // 🎨 Unified rendering: drawBulkShapes handles BOTH shapes and sprites
    if (renderer.isGPUAccelerationEnabled()) {
      // Unified rendering (shapes + sprites in one pass)
      renderer.drawBulkShapes(
        posX, posY, rotation, scaledSizes,
        colorR, colorG, colorB, alphas, shapeTypes,
        flags, totalCount, this.world.FLAG_VISIBLE,
        this.camera.x, this.camera.y, this.camera.getZoom()
      );
    } else {
      // Fallback: Standard indexed rendering
      renderer.drawBulkIndexed(
        posX, posY, rotation, scaledSizes,
        colorR, colorG, colorB, alphas,
        flags, this.visibleIndices, visibleCount, this.world.FLAG_VISIBLE,
        this.camera.x, this.camera.y, this.camera.getZoom()
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
   * Get the spatial hash for entity picking
   */
  getSpatialHash() {
    return this.world.getSpatialHash();
  }

  // ============================================================================
  // 🍭 SYNTAX SUGAR: Convenient service accessors
  // ============================================================================

  /**
   * Get TextPool (automatically injected by engine)
   * Use for text entity creation
   */
  protected getTextPool() {
    return this.services.textPool;
  }

  /**
   * Get AnimationManager (automatically injected by engine)
   * Use for creating and managing animations
   */
  protected getAnimationManager() {
    return this.services.animationManager;
  }

  /**
   * Get InputManager (automatically injected by engine)
   * Use for mouse/keyboard/touch input
   */
  protected getInputManager() {
    return this.services.inputManager;
  }

  /**
   * Get TextureManager (automatically injected by engine)
   * Use for loading and managing textures
   */
  protected getTextureManager() {
    return this.services.textureManager;
  }

  /**
   * Get AssetLoader (automatically injected by engine)
   * Use for loading game assets
   */
  protected getAssetLoader() {
    return this.services.assetLoader;
  }

  /**
   * Get RuntimeConfig (automatically injected by engine)
   * Use for accessing engine configuration
   */
  protected getRuntimeConfig() {
    return this.services.runtimeConfig;
  }
  
  /**
   * Get world instance
   */
  getWorld(): World {
    return this.world;
  }
  
  /**
   * Add a behavior to this scene
   */
  addBehavior(behavior: SceneBehavior): void {
    this.behaviors.add(behavior);
  }
  
  /**
   * Remove a behavior from this scene
   */
  removeBehavior(behavior: SceneBehavior): void {
    this.behaviors.remove(behavior);
  }
  
  /**
   * Get behavior by type
   */
  getBehavior<T extends SceneBehavior>(type: new (...args: any[]) => T): T | undefined {
    return this.behaviors.get(type);
  }
  
  /**
   * Check if behavior exists
   */
  hasBehavior<T extends SceneBehavior>(type: new (...args: any[]) => T): boolean {
    return this.behaviors.has(type);
  }
  
  /**
   * Update canvas/viewport dimensions
   * Should be called when canvas is resized
   * CRITICAL: Preserves world scale multiplier but viewport dimensions = canvas dimensions
   * Also recenters camera to new viewport center
   */
  setCanvasDimensions(width: number, height: number): void {
    const worldScale = this.viewport.worldScale;
    // Viewport dimensions MUST match canvas exactly (for rendering)
    // World scale is reapplied to affect physics bounds only
    this.viewport = new Viewport(width, height, worldScale);
    this.camera.resize(width, height);
    // CRITICAL FIX: Recenter camera to new viewport center
    // Camera position = world coordinates camera is looking at
    this.camera.setPosition(width / 2, height / 2);
  }
  
  /**
   * Set world bounds multiplier for physics
   * 1.0 = viewport only (entities bounce at screen edges)
   * 10.0 = 10x world (entities can move offscreen, requires frustum culling)
   * CRITICAL: Only affects physics world bounds, NOT viewport rendering dimensions
   * Does NOT affect camera position or entity positions
   */
  setWorldBoundsMultiplier(multiplier: number): void {
    // Recreate viewport with same dimensions but new worldScale
    // This ONLY affects worldWidth/worldHeight calculations for physics
    // Viewport width/height (rendering dimensions) remain unchanged
    this.viewport = new Viewport(this.viewport.width, this.viewport.height, multiplier);
    
    // Camera position should NOT change - it's in world coordinates
    // Entities should NOT move - they're in world coordinates
    // Only physics boundaries and culling calculations are affected
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

  // ============================================================================
  // 🚀 PURE ECS ENTITY SPAWNING (Zero OOP overhead!)
  // ============================================================================
  
  /**
   * Spawn a single entity using a factory function
   * @param factory Pure function that creates entity data (createBouncingEntity, etc.)
   * @param x X position
   * @param y Y position
   * @param options Optional configuration for the entity
   * @returns EntityId for the created entity
   */
  spawnEntity(
    factory: (world: World, x: number, y: number, options?: any) => EntityId,
    x: number,
    y: number,
    options?: any
  ): EntityId {
    return factory(this.world, x, y, options);
  }
  
  /**
   * Spawn a burst of entities using a burst factory function
   * @param burstFactory Pure function that creates multiple entities (createBouncingBurst, etc.)
   * @param x Center X position
   * @param y Center Y position
   * @param count Number of entities to create
   * @param options Optional configuration for the entities
   * @returns Array of EntityIds for the created entities
   */
  spawnBurst(
    burstFactory: EntityBurstFactory,
    x: number,
    y: number,
    count: number,
    options?: any
  ): EntityId[] {
    return burstFactory(this.world, x, y, count, options);
  }

  // ============================================================================
  /**
   * Remove last N entities
   * Used by UI for clearing entities
   */
  removeLast(count: number): void {
    // Get active entities and remove the last N
    const totalCount = this.world.getActiveCount();
    const toRemove = Math.min(count, totalCount);
    
    // Destroy entities from the end (highest IDs)
    const maxCapacity = this.world.getTotalCount();
    let removed = 0;
    for (let i = maxCapacity - 1; i >= 0 && removed < toRemove; i--) {
      if (this.world.isEntityActive(i)) {
        this.world.destroyEntity(i);
        removed++;
      }
    }
  }

  clear(): void {
    // Destroy all active entities in the ECS world
    const maxCapacity = this.world.getTotalCount();
    for (let i = 0; i < maxCapacity; i++) {
      if (this.world.isEntityActive(i)) {
        this.world.destroyEntity(i);
      }
    }
  }

  destroy(): void {
    this.clear();
  }
}
