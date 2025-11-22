/**
 * Scene class
 * Manages entities, ECS world, rendering, and physics
 */

import { Entity } from './Entity';
import { World, EntityId } from './World';
import { Camera } from './Camera';
import { Viewport } from './Viewport';
import { WebGLBatchRenderer } from '../rendering/WebGLBatchRenderer';
import { TextRenderer } from '../rendering/TextRenderer';

export class Scene {
  name: string;
  entities: Entity[] = [];
  active: boolean = false;
  
  // ECS World - transparent performance layer
  public world: World;
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
  
  // 🚀 PRE-ALLOCATED BUFFERS (zero allocations per frame!)
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
    
    // Update camera (smooth movement, follow, shake, bounds)
    this.camera.update(dt);
    
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
      // No culling - render all entities using batch rendering
      renderer.drawBulk(
        posX, posY, rotation, sizes,
        colorR, colorG, colorB, alphas,
        flags, totalCount, this.world.FLAG_VISIBLE,
        this.camera.x, this.camera.y, this.camera.getZoom()
      );
      
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
      sizes,
      totalCount,
      this.visibleIndices
    );
    
    // 🔥 ZERO COPY: Render directly from source arrays using indices!
    // Batch rendering with frustum culling
    renderer.drawBulkIndexed(
      posX, posY, rotation, sizes,
      colorR, colorG, colorB, alphas,
      flags, this.visibleIndices, visibleCount, this.world.FLAG_VISIBLE,
      this.camera.x, this.camera.y, this.camera.getZoom()
    );
    
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
    
    // Sync physics properties
    const mass = this.world.getMass();
    const restitution = this.world.getRestitution();
    const gravityEnabled = this.world.getGravityEnabled();
    const collisionsEnabled = this.world.getCollisionsEnabled();
    
    if (typeof anyEntity.mass === 'number') {
      mass[id] = anyEntity.mass;
    }
    if (typeof anyEntity.restitution === 'number') {
      restitution[id] = anyEntity.restitution;
    }
    if (typeof anyEntity.enableGravity === 'boolean') {
      gravityEnabled[id] = anyEntity.enableGravity ? 1 : 0;
    }
    if (typeof anyEntity.enableCollisions === 'boolean') {
      collisionsEnabled[id] = anyEntity.enableCollisions ? 1 : 0;
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

  /**
   * Add multiple entities at once
   */
  addBatch(entities: Entity[]): void {
    entities.forEach(entity => this.addEntity(entity));
  }

  /**
   * Remove last N entities
   */
  removeLast(count: number): void {
    const toRemove = Math.min(count, this.entities.length);
    for (let i = 0; i < toRemove; i++) {
      const entity = this.entities[this.entities.length - 1];
      if (entity) {
        this.removeEntity(entity);
      }
    }
  }

  /**
   * Spawn random entities in viewport or world bounds
   */
  spawnRandom<T extends Entity>(
    EntityClass: new (...args: any[]) => T,
    count: number,
    options: {
      inViewportOnly?: boolean;
      minSpeed?: number;
      maxSpeed?: number;
    } = {}
  ): T[] {
    const inViewportOnly = options.inViewportOnly ?? true;
    const [spawnWidth, spawnHeight] = inViewportOnly 
      ? [this.worldWidth, this.worldHeight]
      : [this.worldWidth * 10, this.worldHeight * 10];
    
    const entities: T[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * spawnWidth;
      const y = Math.random() * spawnHeight;
      
      // Use static factory if available, otherwise constructor
      const entity = (EntityClass as any).createAt 
        ? (EntityClass as any).createAt(x, y, { 
            minSpeed: options.minSpeed, 
            maxSpeed: options.maxSpeed 
          })
        : new EntityClass(x, y);
      
      this.addEntity(entity);
      entities.push(entity);
    }
    
    return entities;
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
