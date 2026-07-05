import { World, EntityId } from './World';
import { Viewport } from './Viewport';
import { WebGLBatchRenderer } from '../rendering/WebGLBatchRenderer';
import { TextRenderer } from '../rendering/TextRenderer';
import { DisplayObject } from '../display/DisplayObject';
import { Sprite } from '../display/Sprite';
import { ENGINE_CONFIG } from './EngineConfig';
import type { IEngine } from './IEngine';
import type { AnimationSystem } from '../systems/AnimationSystem';
import type { PerformanceMonitor } from '../tools/PerformanceMonitor';

export class Scene {
  name: string;
  active: boolean = false;
  
  public world: World;
  
  public children: DisplayObject[] = [];
  private _textureManager: any = null;
  
  protected engine: IEngine | null = null;
  protected performanceMonitor: PerformanceMonitor | null = null;
  protected animationSystem: AnimationSystem | null = null;
  
  private viewport: Viewport;
  public cameraX: number = 0;
  public cameraY: number = 0;
  public cameraZoom: number = 1;
  
  private visibleIndices: Uint32Array;
  private scaledSizes: Float32Array;
  
  // Performance metrics
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
  
  // Culling stats (exposed for debug panel)
  public culledCount = 0;
  public visibleCount = 0;
  
  // Text support for EntitySpawnService (accessed directly)
  public textEntities = new Map<EntityId, { text: string; style: any }>();
  public textAnimations = new Map<EntityId, {
    rotationSpeed: number;
    pulseSpeed: number;
    pulsePhase: number;
  }>();

  constructor(name: string, maxEntities: number = ENGINE_CONFIG.maxEntities, worldBoundsMultiplier = 1.0) {
    this.name = name;
    this.world = new World(maxEntities);
    
    this.viewport = new Viewport(1920, 1080, worldBoundsMultiplier);
    
    this.cameraX = 0;
    this.cameraY = 0;
    this.cameraZoom = 1;
    
    this.visibleIndices = new Uint32Array(maxEntities);
    this.scaledSizes = new Float32Array(maxEntities);
  }
  
  add(child: DisplayObject): void {
    this.children.push(child);
    
    // If it's a Sprite, load texture
    if (child instanceof Sprite && this._textureManager) {
      const textureUrl = (child as any)._getTextureUrl();
      this._textureManager.loadTexture(textureUrl).then((texture: any) => {
        (child as any)._setTextureId(texture.id);
      });
    }
  }
  
  /**
   * Remove display object from scene
   */
  remove(child: DisplayObject): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.destroy();
    }
  }
  
  /**
   * Remove all display objects
   */
  removeAll(): void {
    for (const child of this.children) {
      child.destroy();
    }
    this.children = [];
  }
  
  /**
   * Set texture manager (called by Engine)
   */
  _setTextureManager(textureManager: any): void {
    this._textureManager = textureManager;
  }

  /** @internal Called by Engine during scene registration */
  _setEngine(engine: IEngine): void {
    this.engine = engine;
  }

  /** @internal Called by Engine during scene loading */
  _setAnimationSystem(animSystem: AnimationSystem | null): void {
    this.animationSystem = animSystem;
  }

  /** @internal Called by Engine during scene loading */
  _setPerformanceMonitor(monitor: PerformanceMonitor | null): void {
    this.performanceMonitor = monitor;
  }

  async load(): Promise<void> {
  }
  
  update(dt: number): void {
    const startTime = performance.now();
    
    const physicsStart = performance.now();
    
    const worldWidth = this.viewport.worldWidth;
    const worldHeight = this.viewport.worldHeight;
    const cullingMargin = 50;
    
    const result = this.world.updateFrame(
      dt,
      this.viewport.worldWidth,
      this.viewport.worldHeight,
      this.cameraX,
      this.cameraY,
      worldWidth,
      worldHeight,
      cullingMargin,
      this.visibleIndices
    );
    this.perfMetrics.updatePhysics = performance.now() - physicsStart;
    
    this.visibleCount = result;
    this.culledCount = this.world.getActiveCount() - this.visibleCount;
    
    const animStart = performance.now();
    if (this.animationSystem) {
      this.animationSystem.update(dt);
    }
    this.perfMetrics.updateAnimation = performance.now() - animStart;
    
    this.perfMetrics.updateEntitySync = 0;
    this.perfMetrics.updateTotal = performance.now() - startTime;
    this.perfMetrics.customUpdateCount = 0;
    this.perfMetrics.ecsActiveEntities = this.world.getActiveCount();
    this.perfMetrics.ecsTotalEntities = this.world.getTotalCount();
  }

  render(renderer: WebGLBatchRenderer, _textRenderer?: TextRenderer, _textPool?: any): void {
    const startTime = performance.now();
    
    const batchStart = performance.now();
    this.renderECSBatch(renderer);
    this.perfMetrics.renderBatch = performance.now() - batchStart;
    
    this.perfMetrics.renderCustom = 0;
    this.perfMetrics.renderTotal = performance.now() - startTime;
    this.perfMetrics.customRenderCount = 0;
  }
  
  private renderECSBatch(renderer: WebGLBatchRenderer): void {
    const posX = this.world.getPositionX();
    const posY = this.world.getPositionY();
    const rotation = this.world.getRotation();
    const sizes = this.world.getSizes();
    const scales = this.world.getScale();
    const colorR = this.world.getColorR();
    const colorG = this.world.getColorG();
    const colorB = this.world.getColorB();
    const alphas = this.world.getAlphas();
    const flags = this.world.getFlags();
    const shapeTypes = this.world.getShapeTypes();
    const textureIds = this.world.getTextureIds();
    
    // CRITICAL: iterate the allocated ID range (high-water mark), NEVER an entity
    // *count*. IDs are sparse after free-list recycling: with 50 allocated and 30
    // active, live entities can have IDs >= 30 — bounding a loop by a count skips
    // them (invisible-but-colliding bug, fixed 2026-07-05). Inactive IDs carry
    // flags = 0 and are skipped by the FLAG_VISIBLE check in the renderer.
    const idRange = this.world.getTotalCount();
    const activeCount = this.world.getActiveCount();
    
    const simdCount = idRange & ~3;
    let i = 0;
    
    for (; i < simdCount; i += 4) {
      this.scaledSizes[i] = sizes[i] * scales[i];
      this.scaledSizes[i + 1] = sizes[i + 1] * scales[i + 1];
      this.scaledSizes[i + 2] = sizes[i + 2] * scales[i + 2];
      this.scaledSizes[i + 3] = sizes[i + 3] * scales[i + 3];
    }
    
    for (; i < idRange; i++) {
      this.scaledSizes[i] = sizes[i] * scales[i];
    }
    
    let hasTextures = false;
    for (let j = 0; j < idRange; j++) {
      if (textureIds[j] > 0) {
        hasTextures = true;
        break;
      }
    }
    
    for (let j = 0; j < idRange; j++) {
      this.visibleIndices[j] = j;
    }
    
    if (hasTextures && typeof (renderer as any).drawBulkSpritesIndexed === 'function') {
      const textureManager = (renderer as any).textureManager || null;
      (renderer as any).drawBulkSpritesIndexed(
        posX, posY, rotation, this.scaledSizes,
        colorR, colorG, colorB, alphas,
        textureIds,
        this.world.getUVU0(), this.world.getUVV0(),
        this.world.getUVU1(), this.world.getUVV1(),
        flags, this.visibleIndices, idRange, this.world.FLAG_VISIBLE,
        this.cameraX, this.cameraY, this.cameraZoom,
        textureManager
      );
    } else {
      renderer.drawBulkShapesIndexed(
        posX, posY, rotation, this.scaledSizes,
        colorR, colorG, colorB, alphas, shapeTypes,
        flags, this.visibleIndices, idRange, this.world.FLAG_VISIBLE,
        this.cameraX, this.cameraY, this.cameraZoom
      );
    }
    
    this.culledCount = 0;
    this.visibleCount = activeCount;
  }
  
  getWorld(): World {
    return this.world;
  }
  
  getSpatialHash() {
    return this.world.getSpatialHash();
  }
  
  setCanvasDimensions(width: number, height: number): void {
    const worldScale = this.viewport.worldScale;
    this.viewport = new Viewport(width, height, worldScale);
    this.cameraX = 0;
    this.cameraY = 0;
    this.cameraZoom = 1;
  }
  
  setWorldBoundsMultiplier(multiplier: number): void {
    this.viewport = new Viewport(this.viewport.width, this.viewport.height, multiplier);
  }
  
  getWorldWidth(): number {
    return this.viewport.worldWidth;
  }
  
  getWorldHeight(): number {
    return this.viewport.worldHeight;
  }
  
  spawnEntity(
    factory: (world: World, x: number, y: number, options?: any) => EntityId,
    x: number,
    y: number,
    options?: any
  ): EntityId {
    return factory(this.world, x, y, options);
  }
  
  spawnBurst(
    burstFactory: any,
    x: number,
    y: number,
    count: number,
    options?: any
  ): EntityId[] {
    return burstFactory(this.world, x, y, count, options);
  }
  
  /**
   * Remove last N entities
   */
  removeLast(count: number): void {
    const totalCount = this.world.getActiveCount();
    const toRemove = Math.min(count, totalCount);
    
    const maxCapacity = this.world.getTotalCount();
    let removed = 0;
    for (let i = maxCapacity - 1; i >= 0 && removed < toRemove; i--) {
      if (this.world.isEntityActive(i)) {
        this.world.destroyEntity(i);
        removed++;
      }
    }
  }
  
  /**
   * Clear all entities
   */
  clear(): void {
    const maxCapacity = this.world.getTotalCount();
    for (let i = 0; i < maxCapacity; i++) {
      if (this.world.isEntityActive(i)) {
        this.world.destroyEntity(i);
      }
    }
  }
  
  /**
   * Destroy scene
   */
  destroy(): void {
    this.clear();
  }
}
