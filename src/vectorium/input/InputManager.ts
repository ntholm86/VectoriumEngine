/**
 * Vectorium InputManager - Phase 1
 * Unified input handling (mouse, keyboard, touch)
 * 
 * Features:
 * - Pointer normalization (mouse + touch)
 * - Spatial hash entity picking (O(1))
 * - Keyboard state tracking
 * - Click/hover callbacks
 * 
 * Performance:
 * - Single event listener per type
 * - Spatial hash for fast picking
 * - Zero allocation updates
 */

import type { World, EntityId } from '../core/World';
import type { SpatialHash } from '../physics/SpatialHash';

export interface PointerState {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  isDown: boolean;
  button: number;
  deltaX: number;
  deltaY: number;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private world: World;
  private spatialHash: SpatialHash;
  
  // Pointer state
  private pointer: PointerState = {
    x: 0,
    y: 0,
    worldX: 0,
    worldY: 0,
    isDown: false,
    button: -1,
    deltaX: 0,
    deltaY: 0
  };
  
  private lastPointerX = 0;
  private lastPointerY = 0;
  
  // Keyboard state
  private keysDown = new Set<string>();
  private keysJustPressed = new Set<string>();
  private keysJustReleased = new Set<string>();
  
  // Entity callbacks
  private clickCallbacks = new Map<EntityId, (entity: EntityId, pointer: PointerState) => void>();
  private hoverCallbacks = new Map<EntityId, (entity: EntityId, pointer: PointerState) => void>();
  
  // Keyboard callbacks (for UI panels, debug tools, etc.)
  private keyCallbacks = new Map<string, Array<() => void>>();
  
  // Camera transform (for world coordinates)
  private cameraX = 0;
  private cameraY = 0;
  private cameraZoom = 1;
  
  // Dragging
  private dragEntity: EntityId | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  constructor(canvas: HTMLCanvasElement, world: World, spatialHash: SpatialHash) {
    this.canvas = canvas;
    this.world = world;
    this.spatialHash = spatialHash;
    
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousemove', this.onPointerMove);
    this.canvas.addEventListener('mousedown', this.onPointerDown);
    this.canvas.addEventListener('mouseup', this.onPointerUp);
    
    // Touch events
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /**
   * Mouse move handler
   */
  private onPointerMove = (e: MouseEvent): void => {
    this.updatePointer(e.clientX, e.clientY);
    
    // Update drag if active
    if (this.dragEntity !== null) {
      const posX = this.world.getX();
      const posY = this.world.getY();
      posX[this.dragEntity] = this.pointer.worldX - this.dragOffsetX;
      posY[this.dragEntity] = this.pointer.worldY - this.dragOffsetY;
    }
  };

  /**
   * Mouse down handler
   */
  private onPointerDown = (e: MouseEvent): void => {
    this.pointer.isDown = true;
    this.pointer.button = e.button;
    this.updatePointer(e.clientX, e.clientY);
    
    // Pick entity at click position
    const entity = this.pickEntity(this.pointer.worldX, this.pointer.worldY);
    
    if (entity !== null) {
      // Fire click callback
      const callback = this.clickCallbacks.get(entity);
      if (callback) {
        callback(entity, this.pointer);
      }
      
      // Start drag if draggable
      const flags = this.world.getFlags();
      if (flags[entity] & (1 << 6)) {  // Draggable flag (bit 6)
        this.dragEntity = entity;
        const posX = this.world.getX();
        const posY = this.world.getY();
        this.dragOffsetX = this.pointer.worldX - posX[entity];
        this.dragOffsetY = this.pointer.worldY - posY[entity];
      }
    }
  };

  /**
   * Mouse up handler
   */
  private onPointerUp = (_e: MouseEvent): void => {
    this.pointer.isDown = false;
    this.pointer.button = -1;
    this.dragEntity = null;
  };

  /**
   * Touch start handler
   */
  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.pointer.isDown = true;
      this.pointer.button = 0;
      this.updatePointer(touch.clientX, touch.clientY);
      
      // Same logic as mouse down
      const entity = this.pickEntity(this.pointer.worldX, this.pointer.worldY);
      if (entity !== null) {
        const callback = this.clickCallbacks.get(entity);
        if (callback) {
          callback(entity, this.pointer);
        }
      }
    }
  };

  /**
   * Touch move handler
   */
  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.updatePointer(touch.clientX, touch.clientY);
      
      // Update drag if active
      if (this.dragEntity !== null) {
        const posX = this.world.getX();
        const posY = this.world.getY();
        posX[this.dragEntity] = this.pointer.worldX - this.dragOffsetX;
        posY[this.dragEntity] = this.pointer.worldY - this.dragOffsetY;
      }
    }
  };

  /**
   * Touch end handler
   */
  private onTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    this.pointer.isDown = false;
    this.pointer.button = -1;
    this.dragEntity = null;
  };

  /**
   * Key down handler
   */
  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.keysDown.has(e.key)) {
      this.keysJustPressed.add(e.key);
      
      // Trigger registered keyboard callbacks
      const normalizedKey = e.key.toLowerCase();
      const callbacks = this.keyCallbacks.get(normalizedKey);
      if (callbacks) {
        callbacks.forEach(cb => cb());
      }
    }
    this.keysDown.add(e.key);
  };

  /**
   * Key up handler
   */
  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.key);
    this.keysJustReleased.add(e.key);
  };

  /**
   * Register keyboard callback (for UI panels, shortcuts, etc.)
   * @param key - Key name (e.g., 'e', 'p', 'c', 'Escape')
   * @param callback - Function to call when key is pressed
   * @returns Unregister function
   */
  onKey(key: string, callback: () => void): () => void {
    const normalizedKey = key.toLowerCase();
    
    if (!this.keyCallbacks.has(normalizedKey)) {
      this.keyCallbacks.set(normalizedKey, []);
    }
    
    this.keyCallbacks.get(normalizedKey)!.push(callback);
    
    // Return unregister function
    return () => {
      const callbacks = this.keyCallbacks.get(normalizedKey);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * Update pointer position
   */
  private updatePointer(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    // Canvas coordinates
    this.pointer.x = (clientX - rect.left) * scaleX;
    this.pointer.y = (clientY - rect.top) * scaleY;
    
    // World coordinates
    this.pointer.worldX = (this.pointer.x - this.canvas.width / 2) / this.cameraZoom + this.cameraX;
    this.pointer.worldY = (this.pointer.y - this.canvas.height / 2) / this.cameraZoom + this.cameraY;
    
    // Delta
    this.pointer.deltaX = this.pointer.x - this.lastPointerX;
    this.pointer.deltaY = this.pointer.y - this.lastPointerY;
    
    this.lastPointerX = this.pointer.x;
    this.lastPointerY = this.pointer.y;
  }

  /**
   * Pick entity at world position using spatial hash
   */
  pickEntity(worldX: number, worldY: number): EntityId | null {
    const candidates = this.spatialHash.queryPoint(worldX, worldY);
    
    const flags = this.world.getFlags();
    const posX = this.world.getX();
    const posY = this.world.getY();
    const sizes = this.world.getSizes();
    
    // Check candidates (sorted back-to-front by spatial hash)
    for (let i = candidates.length - 1; i >= 0; i--) {
      const entity = candidates[i];
      
      // Skip if not interactive
      if (!(flags[entity] & (1 << 5))) {  // Interactive flag (bit 5)
        continue;
      }
      
      // Check if point is inside entity
      const ex = posX[entity];
      const ey = posY[entity];
      const size = sizes[entity];
      const halfSize = size / 2;
      
      if (
        worldX >= ex - halfSize &&
        worldX <= ex + halfSize &&
        worldY >= ey - halfSize &&
        worldY <= ey + halfSize
      ) {
        return entity;
      }
    }
    
    return null;
  }

  /**
   * Register click callback for entity
   */
  onClick(entity: EntityId, callback: (entity: EntityId, pointer: PointerState) => void): void {
    this.clickCallbacks.set(entity, callback);
    
    // Mark entity as interactive
    const flags = this.world.getFlags();
    flags[entity] |= (1 << 5);  // Set interactive flag
  }

  /**
   * Register hover callback for entity
   */
  onHover(entity: EntityId, callback: (entity: EntityId, pointer: PointerState) => void): void {
    this.hoverCallbacks.set(entity, callback);
    
    // Mark entity as interactive
    const flags = this.world.getFlags();
    flags[entity] |= (1 << 5);  // Set interactive flag
  }

  /**
   * Make entity draggable
   */
  makeDraggable(entity: EntityId): void {
    const flags = this.world.getFlags();
    flags[entity] |= (1 << 5);  // Interactive flag
    flags[entity] |= (1 << 6);  // Draggable flag
  }

  /**
   * Update camera transform for world coordinate conversion
   */
  updateCamera(x: number, y: number, zoom: number): void {
    this.cameraX = x;
    this.cameraY = y;
    this.cameraZoom = zoom;
  }

  /**
   * Update input state (call once per frame)
   */
  update(_dt: number): void {
    // Clear just-pressed/released sets
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
    
    // Check hover
    const hoveredEntity = this.pickEntity(this.pointer.worldX, this.pointer.worldY);
    if (hoveredEntity !== null) {
      const callback = this.hoverCallbacks.get(hoveredEntity);
      if (callback) {
        callback(hoveredEntity, this.pointer);
      }
    }
  }

  /**
   * Get pointer state
   */
  getPointer(): Readonly<PointerState> {
    return this.pointer;
  }

  /**
   * Check if key is down
   */
  isKeyDown(key: string): boolean {
    return this.keysDown.has(key);
  }

  /**
   * Check if key was just pressed this frame
   */
  isKeyJustPressed(key: string): boolean {
    return this.keysJustPressed.has(key);
  }

  /**
   * Check if key was just released this frame
   */
  isKeyJustReleased(key: string): boolean {
    return this.keysJustReleased.has(key);
  }

  /**
   * Destroy input manager
   */
  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.onPointerMove);
    this.canvas.removeEventListener('mousedown', this.onPointerDown);
    this.canvas.removeEventListener('mouseup', this.onPointerUp);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    
    this.clickCallbacks.clear();
    this.hoverCallbacks.clear();
  }
}
