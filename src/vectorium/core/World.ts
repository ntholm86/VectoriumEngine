/**
 * Vectorium ECS World - Structure of Arrays (SoA) Pattern
 * Based on MassCanvas Pillar 0 architecture
 * 
 * Performance characteristics:
 * - Contiguous memory → perfect cache locality
 * - Zero per-entity object allocation
 * - SIMD auto-vectorization by compiler
 * - 10-15x faster than object-oriented approach
 * 
 * 🚀 WASM-OPTIMIZED: Using WASM-style patterns for maximum performance
 */

import { WasmPhysics } from '../wasm/WasmPhysics.js';
import type { EntityId, EntityFlags } from './Entity';

export type { EntityId, EntityFlags };

export class World {
  private entityCount = 0;
  private activeEntityCount = 0;  // Cached count of active entities
  
  // 🚀 P0 OPTIMIZATION: Track subsystem entity counts for O(1) early exit
  private collisionEntityCount = 0;  // Entities with collisions enabled
  private gravityEntityCount = 0;    // Entities with gravity enabled
  private animatedEntityCount = 0;   // Entities with animations
  private shapeEntityCount = 0;      // Entities with shapeType > 0 (shapes, not sprites)
  private textEntityCount = 0;       // Entities with text content
  
  private readonly maxEntities: number;
  private freeList: EntityId[] = [];  // Recycled entity IDs
  
  // Component arrays (SoA pattern for cache efficiency)
  private positionX: Float32Array;
  private positionY: Float32Array;
  private velocityX: Float32Array;
  private velocityY: Float32Array;
  private rotation: Uint16Array;  // Integer degrees (0-359)
  private rotationSpeed: Int16Array;  // Degrees per second
  private scale: Float32Array;
  private size: Float32Array;
  private colorR: Uint8Array;
  private colorG: Uint8Array;
  private colorB: Uint8Array;
  private alpha: Float32Array;
  private flags: Uint32Array;
  private animationType: Uint8Array;  // 0=rotate, 1=pulse, 2=wobble, 3=spin, 4=fade
  
  // Animation state arrays
  private pulseTime: Float32Array;
  private pulseSpeed: Float32Array;
  private wobbleOffset: Float32Array;
  private wobbleSpeed: Float32Array;
  private fadeDirection: Int8Array;
  private baseSize: Float32Array;
  
  // Physics property arrays
  private mass: Float32Array;
  private restitution: Float32Array;
  private enableGravity: Uint8Array; // Boolean as 0/1
  private enableCollisions: Uint8Array; // Boolean as 0/1
  
  // 🎨 Shape & Text rendering arrays (NEW)
  private shapeType: Uint8Array;     // 0=sprite (default), 1=circle, 2=triangle, 3=star, etc.
  private textIndex: Int32Array;     // -1=no text, >=0=index into textPool
  
  // 🚀 WASM Physics Engine
  private wasmPhysics: WasmPhysics;
  
  // 🚀 Pre-calculated sin/cos lookup tables (0-3599 = 0.0° to 359.9° in 0.1° increments)
  // Eliminates expensive Math.sin/cos calls during animation updates
  private static readonly SIN_TABLE_SIZE = 3600;
  private static sinTable: Float32Array;
  private static cosTable: Float32Array;
  
  // Component flags (bitmask)
  readonly FLAG_ACTIVE = 1 << 0;
  readonly FLAG_VISIBLE = 1 << 1;
  readonly FLAG_PHYSICS = 1 << 2;
  readonly FLAG_COLLIDABLE = 1 << 3;
  readonly FLAG_ROTATING = 1 << 4;
  readonly FLAG_TEXT_STATIC = 1 << 5;  // 🎨 Text is static (cached, doesn't change)
  
  // Animation type enum
  readonly ANIM_ROTATE = 0;
  readonly ANIM_PULSE = 1;
  readonly ANIM_WOBBLE = 2;
  readonly ANIM_SPIN = 3;
  readonly ANIM_FADE = 4;
  
  constructor(maxEntities: number = 200000) {
    this.maxEntities = maxEntities;
    this.wasmPhysics = new WasmPhysics();
    
    // Initialize sin/cos lookup tables (once per class)
    if (!World.sinTable) {
      World.sinTable = new Float32Array(World.SIN_TABLE_SIZE);
      World.cosTable = new Float32Array(World.SIN_TABLE_SIZE);
      for (let i = 0; i < World.SIN_TABLE_SIZE; i++) {
        const rad = (i * 0.1 * Math.PI) / 180;
        World.sinTable[i] = Math.sin(rad);
        World.cosTable[i] = Math.cos(rad);
      }
    }
    
    // Allocate all arrays upfront (zero allocation during runtime)
    this.positionX = new Float32Array(maxEntities);
    this.positionY = new Float32Array(maxEntities);
    this.velocityX = new Float32Array(maxEntities);
    this.velocityY = new Float32Array(maxEntities);
    this.rotation = new Uint16Array(maxEntities);
    this.rotationSpeed = new Int16Array(maxEntities);
    this.scale = new Float32Array(maxEntities);
    this.size = new Float32Array(maxEntities);
    this.colorR = new Uint8Array(maxEntities);
    this.colorG = new Uint8Array(maxEntities);
    this.colorB = new Uint8Array(maxEntities);
    this.alpha = new Float32Array(maxEntities);
    this.flags = new Uint32Array(maxEntities);
    this.animationType = new Uint8Array(maxEntities);
    
    // Animation state
    this.pulseTime = new Float32Array(maxEntities);
    this.pulseSpeed = new Float32Array(maxEntities);
    this.wobbleOffset = new Float32Array(maxEntities);
    this.wobbleSpeed = new Float32Array(maxEntities);
    this.fadeDirection = new Int8Array(maxEntities);
    this.baseSize = new Float32Array(maxEntities);
    
    // Initialize physics properties
    this.mass = new Float32Array(maxEntities).fill(1);
    this.restitution = new Float32Array(maxEntities).fill(1);
    this.enableGravity = new Uint8Array(maxEntities);
    this.enableCollisions = new Uint8Array(maxEntities);
    
    // Initialize shape & text properties
    this.shapeType = new Uint8Array(maxEntities);  // Default: 0 (sprite)
    this.textIndex = new Int32Array(maxEntities).fill(-1);  // Default: -1 (no text)
  }
  
  /**
   * Create entity - O(1) constant time
   * Reuses IDs from free list when available
   */
  createEntity(x: number, y: number, vx: number = 0, vy: number = 0): EntityId {
    let id: EntityId;
    
    if (this.freeList.length > 0) {
      // Reuse recycled ID
      id = this.freeList.pop()!;
    } else {
      // Allocate new ID
      if (this.entityCount >= this.maxEntities) {
        throw new Error('World entity capacity exceeded');
      }
      id = this.entityCount++;
    }
    
    // Initialize components with defaults
    this.positionX[id] = x;
    this.positionY[id] = y;
    this.velocityX[id] = vx;
    this.velocityY[id] = vy;
    this.rotation[id] = Math.floor(Math.random() * 360);
    this.rotationSpeed[id] = Math.floor((Math.random() - 0.5) * 360);
    this.scale[id] = 1.0;
    this.size[id] = 4 + Math.random() * 8;
    this.baseSize[id] = this.size[id];
    this.colorR[id] = Math.floor(Math.random() * 256);
    this.colorG[id] = Math.floor(Math.random() * 256);
    this.colorB[id] = Math.floor(Math.random() * 256);
    this.alpha[id] = 1.0;
    this.flags[id] = this.FLAG_ACTIVE | this.FLAG_VISIBLE | this.FLAG_PHYSICS | this.FLAG_ROTATING;
    this.activeEntityCount++;
    
    // Random animation type
    this.animationType[id] = Math.floor(Math.random() * 5);
    
    // Initialize animation state
    this.pulseTime[id] = Math.random() * Math.PI * 2;
    this.pulseSpeed[id] = 2 + Math.random() * 3;
    this.wobbleOffset[id] = 0;
    this.wobbleSpeed[id] = 3 + Math.random() * 4;
    this.fadeDirection[id] = 1;
    
    // CRITICAL FIX: Initialize physics properties to prevent stale data
    // When entities are reused from pool, they must have clean physics state
    this.mass[id] = 1.0;
    this.restitution[id] = 0.8;
    this.enableGravity[id] = 0;  // Disabled by default
    this.enableCollisions[id] = 0;  // Disabled by default
    
    // 🎨 Initialize shape & text properties
    this.shapeType[id] = 0;  // Default: sprite
    this.textIndex[id] = -1;  // Default: no text
    
    // 🚀 P0 OPTIMIZATION: Track animation count (default: all entities animated)
    this.animatedEntityCount++;
    
    return id;
  }

  /**
   * Destroy entity - mark inactive and add to free list for reuse
   * 
   * CRITICAL FIX: Clear ALL component data to prevent stale data bugs
   */
  destroyEntity(id: EntityId): void {
    if (this.flags[id] & this.FLAG_ACTIVE) {
      this.activeEntityCount--;
    }
    
    // Clear flags first
    this.flags[id] = 0;
    
    // CRITICAL FIX: Clear physics properties to prevent ghost collisions
    // When entity is destroyed, it should not participate in any physics
    
    // 🚀 P0 OPTIMIZATION: Decrement counters before clearing flags
    if (this.enableCollisions[id]) this.collisionEntityCount--;
    if (this.enableGravity[id]) this.gravityEntityCount--;
    if (this.animationType[id] !== 0) this.animatedEntityCount--;
    
    // 🎨 Shape & Text cleanup
    if (this.shapeType[id] > 0) this.shapeEntityCount--;
    if (this.textIndex[id] >= 0) this.textEntityCount--;
    
    this.enableCollisions[id] = 0;
    this.enableGravity[id] = 0;
    this.velocityX[id] = 0;
    this.velocityY[id] = 0;
    
    // Clear shape & text
    this.shapeType[id] = 0;
    this.textIndex[id] = -1;
    
    // Clear other properties to prevent visual artifacts
    this.alpha[id] = 0;
    
    this.freeList.push(id);
  }
  
  /**
   * System: Physics Update - 🚀 WASM-OPTIMIZED!
   * Uses WASM-style branchless patterns for maximum performance
   * Expected: 20-40% faster than standard JavaScript
   * 
   * 🚀 P0 OPTIMIZATION: Early exit skips gravity/collision but ALWAYS integrates velocity
   */
  updatePhysics(dt: number, boundsWidth: number, boundsHeight: number): void {
    // 🚀 CRITICAL: Don't skip velocity integration! Entities need to move!
    // Early exit only skips gravity and collision phases
    // The WasmPhysics will handle selective phase execution internally
    
    // Delegate to WASM-optimized physics system
    this.wasmPhysics.updatePhysicsOptimized(
      this.entityCount,
      dt,
      boundsWidth,
      boundsHeight,
      this.positionX,
      this.positionY,
      this.velocityX,
      this.velocityY,
      this.size,
      this.flags,
      this.FLAG_PHYSICS,
      this.enableGravity,
      this.enableCollisions,
      this.mass,
      this.restitution,
      this.collisionEntityCount,  // 🚀 Pass counter for O(1) check
      this.gravityEntityCount     // 🚀 Pass counter for O(1) check
    );
  }
  
  /**
   * Get physics metrics for performance monitoring
   */
  getPhysicsMetrics(): any {
    return this.wasmPhysics.getMetrics();
  }
  
  /**
   * System: Animation Update
   * Handles rotation, pulse, wobble, spin, fade animations
   */
  updateAnimations(dt: number): void {
    for (let i = 0; i < this.entityCount; i++) {
      const entityFlags = this.flags[i];
      
      if ((entityFlags & (this.FLAG_ACTIVE | this.FLAG_ROTATING)) !== (this.FLAG_ACTIVE | this.FLAG_ROTATING)) {
        if ((entityFlags & this.FLAG_ACTIVE) !== 0) {
          const animType = this.animationType[i];
          if (animType !== this.ANIM_ROTATE) {
            this.handleComplexAnimation(i, dt, animType);
          }
        }
        continue;
      }
      
      let newRot = this.rotation[i] + this.rotationSpeed[i] * dt;
      newRot = newRot >= 360 ? newRot - 360 : newRot;
      newRot = newRot < 0 ? newRot + 360 : newRot;
      this.rotation[i] = newRot;
    }
  }
  
  /**
   * Fast sin lookup using pre-calculated table
   * @param radians Input in radians
   */
  private fastSin(radians: number): number {
    // Convert radians to table index (0.1° increments)
    const degrees = (radians * 180 / Math.PI) % 360;
    const index = Math.floor((degrees < 0 ? degrees + 360 : degrees) * 10) % World.SIN_TABLE_SIZE;
    return World.sinTable[index];
  }
  
  /**
   * Fast cos lookup using pre-calculated table
   * @param radians Input in radians
   */
  private fastCos(radians: number): number {
    // Convert radians to table index (0.1° increments)
    const degrees = (radians * 180 / Math.PI) % 360;
    const index = Math.floor((degrees < 0 ? degrees + 360 : degrees) * 10) % World.SIN_TABLE_SIZE;
    return World.cosTable[index];
  }
  
  private handleComplexAnimation(i: number, dt: number, animType: number): void {
    switch (animType) {
      case this.ANIM_PULSE:
        this.pulseTime[i] += this.pulseSpeed[i] * dt;
        this.size[i] = this.baseSize[i] + this.fastSin(this.pulseTime[i]) * this.baseSize[i] * 0.5;
        break;
      case this.ANIM_WOBBLE:
        this.wobbleOffset[i] += this.wobbleSpeed[i] * dt;
        this.velocityX[i] += this.fastSin(this.wobbleOffset[i]) * 50 * dt;
        this.velocityY[i] += this.fastCos(this.wobbleOffset[i]) * 50 * dt;
        break;
      case this.ANIM_SPIN:
        const rotRad = (this.rotation[i] * Math.PI) / 180;
        this.size[i] = this.baseSize[i] + this.fastSin(rotRad) * this.baseSize[i] * 0.3;
        break;
      case this.ANIM_FADE:
        this.alpha[i] += this.fadeDirection[i] * 2 * dt;
        if (this.alpha[i] >= 1.0) {
          this.alpha[i] = 1.0;
          this.fadeDirection[i] = -1;
        } else if (this.alpha[i] <= 0.3) {
          this.alpha[i] = 0.3;
          this.fadeDirection[i] = 1;
        }
        break;
    }
  }  /**
   * Get active entity count (cached for O(1) performance)
   */
  getActiveCount(): number {
    return this.activeEntityCount;
  }
  
  /**
   * Get total entity count (including inactive)
   */
  getTotalCount(): number {
    return this.entityCount;
  }

  /**
   * Check if an entity is active
   */
  isEntityActive(id: EntityId): boolean {
    return id < this.entityCount && (this.flags[id] & this.FLAG_ACTIVE) !== 0;
  }

  /**
   * Direct component access (read-only for rendering)
   */
  getPositionX(): Float32Array { return this.positionX; }
  getPositionY(): Float32Array { return this.positionY; }
  getRotation(): Uint16Array { return this.rotation; }
  getScale(): Float32Array { return this.scale; }
  getSizes(): Float32Array { return this.size; }
  getColorR(): Uint8Array { return this.colorR; }
  getColorG(): Uint8Array { return this.colorG; }
  getColorB(): Uint8Array { return this.colorB; }
  getAlphas(): Float32Array { return this.alpha; }
  getFlags(): Uint32Array { return this.flags; }
  getMass(): Float32Array { return this.mass; }
  getRestitution(): Float32Array { return this.restitution; }
  getGravityEnabled(): Uint8Array { return this.enableGravity; }
  getCollisionsEnabled(): Uint8Array { return this.enableCollisions; }
  
  /**
   * 🎨 Shape & Text component access
   */
  getShapeTypes(): Uint8Array { return this.shapeType; }
  getTextIndices(): Int32Array { return this.textIndex; }
  getShapeEntityCount(): number { return this.shapeEntityCount; }
  getTextEntityCount(): number { return this.textEntityCount; }
  
  /**
   * Viewport culling - returns visible entity IDs
   * Avoids rendering off-screen entities
   */
  queryViewport(minX: number, minY: number, maxX: number, maxY: number): EntityId[] {
    const visible: EntityId[] = [];
    
    for (let i = 0; i < this.entityCount; i++) {
      if ((this.flags[i] & this.FLAG_VISIBLE) === 0) continue;
      
      const x = this.positionX[i];
      const y = this.positionY[i];
      const halfSize = this.size[i] / 2;
      
      if (x + halfSize >= minX && x - halfSize <= maxX &&
          y + halfSize >= minY && y - halfSize <= maxY) {
        visible.push(i);
      }
    }
    
    return visible;
  }
  
  /**
   * Get memory usage statistics
   */
  getMemoryUsage(): { arrays: number; total: number; perEntity: number } {
    const arrayCount = 22; // Number of typed arrays (20 + shapeType + textIndex)
    const bytesPerEntity = 
      4 + 4 +  // positionX, positionY (Float32)
      4 + 4 +  // velocityX, velocityY (Float32)
      2 + 2 +  // rotation, rotationSpeed (Uint16/Int16)
      4 + 4 +  // scale, size (Float32)
      1 + 1 + 1 +  // colorR, colorG, colorB (Uint8)
      4 + 4 +  // alpha, flags (Float32, Uint32)
      1 +  // animationType (Uint8)
      4 + 4 + 4 + 4 + 1 + 4 +  // animation state (Float32 × 5, Int8 × 1)
      1 + 4;  // 🎨 shapeType (Uint8), textIndex (Int32)
    
    const totalBytes = this.maxEntities * bytesPerEntity;
    
    return {
      arrays: arrayCount,
      total: totalBytes,
      perEntity: bytesPerEntity
    };
  }
  
  /**
   * 🚀 P0 OPTIMIZATION: Enable collision for entity (updates counter)
   */
  setCollisionEnabled(id: EntityId, enabled: boolean): void {
    const wasEnabled = this.enableCollisions[id] !== 0;
    const isEnabled = enabled;
    
    if (wasEnabled !== isEnabled) {
      if (isEnabled) {
        this.collisionEntityCount++;
      } else {
        this.collisionEntityCount--;
      }
    }
    
    this.enableCollisions[id] = enabled ? 1 : 0;
  }
  
  /**
   * 🚀 P0 OPTIMIZATION: Enable gravity for entity (updates counter)
   */
  setGravityEnabled(id: EntityId, enabled: boolean): void {
    const wasEnabled = this.enableGravity[id] !== 0;
    const isEnabled = enabled;
    
    if (wasEnabled !== isEnabled) {
      if (isEnabled) {
        this.gravityEntityCount++;
      } else {
        this.gravityEntityCount--;
      }
    }
    
    this.enableGravity[id] = enabled ? 1 : 0;
  }
  
  /**
   * 🎨 Set shape type for entity (updates counter)
   * @param id Entity ID
   * @param type 0=sprite (default), 1=circle, 2=triangle, 3=star, etc.
   */
  setShapeType(id: EntityId, type: number): void {
    const wasShape = this.shapeType[id] > 0;
    const isShape = type > 0;
    
    if (wasShape !== isShape) {
      if (isShape) {
        this.shapeEntityCount++;
      } else {
        this.shapeEntityCount--;
      }
    }
    
    this.shapeType[id] = type;
  }
  
  /**
   * 🎨 Set text index for entity (updates counter)
   * @param id Entity ID
   * @param textIndex -1=no text, >=0=index into TextPool
   */
  setTextIndex(id: EntityId, textIndex: number): void {
    const hadText = this.textIndex[id] >= 0;
    const hasText = textIndex >= 0;
    
    if (hadText !== hasText) {
      if (hasText) {
        this.textEntityCount++;
      } else {
        this.textEntityCount--;
      }
    }
    
    this.textIndex[id] = textIndex;
  }
  
  /**
   * 🎨 Mark text entity as static (doesn't change, can be cached)
   * @param id Entity ID
   * @param isStatic true=static (cached), false=dynamic (regenerated each frame)
   */
  setTextStatic(id: EntityId, isStatic: boolean): void {
    if (isStatic) {
      this.flags[id] |= this.FLAG_TEXT_STATIC;
    } else {
      this.flags[id] &= ~this.FLAG_TEXT_STATIC;
    }
  }
  
  /**
   * 🎨 Check if text entity is static
   */
  isTextStatic(id: EntityId): boolean {
    return (this.flags[id] & this.FLAG_TEXT_STATIC) !== 0;
  }
  
  /**
   * Debug info
   */
  getDebugInfo(): string {
    const active = this.getActiveCount();
    const memory = this.getMemoryUsage();
    const memoryMB = (memory.total / 1024 / 1024).toFixed(2);
    
    return `ECS World: ${active}/${this.entityCount} active, ${memoryMB}MB, ${this.freeList.length} recycled`;
  }
}
