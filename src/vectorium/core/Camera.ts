/**
 * Vectorium Engine - Camera
 * 2D camera with frustum culling for optimal rendering
 * Enhanced with zoom, smooth movement, follow, shake, and bounds
 */

export interface CameraBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export class Camera {
  x: number = 0;
  y: number = 0;
  width: number;
  height: number;
  
  // Culling margin (render entities slightly outside viewport)
  private cullingMargin: number = 50;
  
  // Zoom properties (cached world dimensions for performance)
  private zoom: number = 1.0;
  private minZoom: number = 0.1;
  private maxZoom: number = 10.0;
  private worldWidth: number = 0;
  private worldHeight: number = 0;
  
  // Smooth movement properties
  private smooth: boolean = true;
  private smoothFactor: number = 0.1;
  private targetX: number = 0;
  private targetY: number = 0;
  
  // Follow properties (structural typing - any {x, y} works)
  private followEnabled: boolean = false;
  private followOffsetX: number = 0;
  private followOffsetY: number = 0;
  private followDeadzoneX: number = 100;
  private followDeadzoneY: number = 100;
  private targetEntity: { x: number; y: number } | null = null;
  
  // Shake properties
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private shakeDecay: number = 0.95;
  private shakeOffsetX: number = 0;
  private shakeOffsetY: number = 0;
  
  // Bounds properties
  private clampToBounds: boolean = false;
  private worldBoundsX: number = 0;
  private worldBoundsY: number = 0;
  private worldBoundsW: number = 0;
  private worldBoundsH: number = 0;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.targetX = this.x;
    this.targetY = this.y;
    this.updateWorldDimensions();
  }

  /**
   * Update camera (smooth movement, follow, shake, bounds)
   * Called once per frame from Engine
   */
  update(deltaTime: number): void {
    // 1. Update follow system (sets targetX/targetY)
    if (this.followEnabled && this.targetEntity) {
      this.updateFollow();
    }
    
    // 2. Apply smooth movement
    if (this.smooth) {
      this.x += (this.targetX - this.x) * this.smoothFactor;
      this.y += (this.targetY - this.y) * this.smoothFactor;
    } else {
      // Instant movement
      this.x = this.targetX;
      this.y = this.targetY;
    }
    
    // 3. Apply shake effect
    if (this.shakeIntensity > 0) {
      this.updateShake(deltaTime);
    }
    
    // 4. Clamp to world bounds (last step)
    if (this.clampToBounds && this.worldBoundsW > 0) {
      this.clampPosition();
    }
  }

  /**
   * Get the camera's visible bounds (frustum)
   */
  getBounds(): CameraBounds {
    return {
      left: this.x - this.cullingMargin,
      right: this.x + this.width + this.cullingMargin,
      top: this.y - this.cullingMargin,
      bottom: this.y + this.height + this.cullingMargin
    };
  }

  /**
   * Test if an entity is visible in the camera frustum
   * Uses AABB (Axis-Aligned Bounding Box) test
   */
  isVisible(entityX: number, entityY: number, entitySize: number): boolean {
    const bounds = this.getBounds();
    const halfSize = entitySize * 0.5;
    
    // AABB overlap test
    return !(
      entityX + halfSize < bounds.left ||
      entityX - halfSize > bounds.right ||
      entityY + halfSize < bounds.top ||
      entityY - halfSize > bounds.bottom
    );
  }

  /**
   * Batch visibility test for multiple entities using raw arrays
   * More efficient than calling isVisible() for each entity
   * PERFORMANCE: Uses cached worldWidth/worldHeight (computed on zoom/resize)
   */
  cullEntities(
    posX: Float32Array,
    posY: Float32Array,
    scaleX: Float32Array,
    count: number,
    visibleIndices: Uint32Array
  ): number {
    // Calculate bounds once (inline, no object allocation)
    // Use worldWidth/worldHeight for zoom support
    const left = this.x - this.cullingMargin;
    const right = this.x + this.worldWidth + this.cullingMargin;
    const top = this.y - this.cullingMargin;
    const bottom = this.y + this.worldHeight + this.cullingMargin;
    
    let visibleCount = 0;
    
    for (let i = 0; i < count; i++) {
      const x = posX[i];
      const y = posY[i];
      const size = scaleX[i]; // scaleX already contains the full size
      const halfSize = size * 0.5;
      
      // AABB overlap test - entity is visible if NOT outside all bounds
      if (!(x + halfSize < left || x - halfSize > right || y + halfSize < top || y - halfSize > bottom)) {
        visibleIndices[visibleCount++] = i;
      }
    }
    
    return visibleCount;
  }

  /**
   * Set camera position (uses smooth movement if enabled)
   */
  setPosition(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    if (!this.smooth) {
      this.x = x;
      this.y = y;
    }
  }

  /**
   * Move camera by delta (uses smooth movement if enabled)
   */
  move(dx: number, dy: number): void {
    this.targetX += dx;
    this.targetY += dy;
    if (!this.smooth) {
      this.x += dx;
      this.y += dy;
    }
  }

  /**
   * Resize camera viewport and update cached world dimensions
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.updateWorldDimensions();
  }

  /**
   * Set culling margin (extra pixels around viewport to render)
   */
  setCullingMargin(margin: number): void {
    this.cullingMargin = margin;
  }

  /**
   * Center camera on a point (accounts for zoom)
   */
  centerOn(x: number, y: number): void {
    this.setPosition(
      x - this.worldWidth * 0.5,
      y - this.worldHeight * 0.5
    );
  }
  
  // ========================================
  // ZOOM SYSTEM
  // ========================================
  
  /**
   * Set zoom level (1.0 = normal, <1.0 = zoom out, >1.0 = zoom in)
   */
  setZoom(level: number): void {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));
    this.updateWorldDimensions();
  }
  
  /**
   * Get current zoom level
   */
  getZoom(): number {
    return this.zoom;
  }
  
  /**
   * Set zoom range limits
   */
  setZoomRange(min: number, max: number): void {
    this.minZoom = min;
    this.maxZoom = max;
    if (this.zoom < min) this.setZoom(min);
    if (this.zoom > max) this.setZoom(max);
  }
  
  /**
   * Update cached world dimensions (called on zoom or resize)
   * PERFORMANCE: Avoids division in hot path (cullEntities)
   */
  private updateWorldDimensions(): void {
    this.worldWidth = this.width / this.zoom;
    this.worldHeight = this.height / this.zoom;
  }
  
  // ========================================
  // COORDINATE CONVERSION
  // ========================================
  
  /**
   * Convert world coordinates to screen coordinates
   * Returns object - use for dev/debug code only (allocates)
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: (worldX - this.x) * this.zoom,
      y: (worldY - this.y) * this.zoom
    };
  }
  
  /**
   * Convert screen coordinates to world coordinates
   * Returns object - use for dev/debug code only (allocates)
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX / this.zoom + this.x,
      y: screenY / this.zoom + this.y
    };
  }
  
  /**
   * Convert world to screen coordinates (zero-allocation version)
   * Use in hot paths (render loops)
   */
  worldToScreenInto(
    worldX: number,
    worldY: number,
    out: Float32Array,
    index: number
  ): void {
    out[index] = (worldX - this.x) * this.zoom;
    out[index + 1] = (worldY - this.y) * this.zoom;
  }
  
  /**
   * Convert screen to world coordinates (zero-allocation version)
   * Use in hot paths
   */
  screenToWorldInto(
    screenX: number,
    screenY: number,
    out: Float32Array,
    index: number
  ): void {
    out[index] = screenX / this.zoom + this.x;
    out[index + 1] = screenY / this.zoom + this.y;
  }
  
  // ========================================
  // SMOOTH MOVEMENT
  // ========================================
  
  /**
   * Enable/disable smooth camera movement
   */
  setSmooth(enabled: boolean, factor: number = 0.1): void {
    this.smooth = enabled;
    this.smoothFactor = Math.max(0.01, Math.min(1.0, factor));
  }
  
  /**
   * Move camera smoothly to target position
   */
  smoothMoveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }
  
  // ========================================
  // FOLLOW SYSTEM
  // ========================================
  
  /**
   * Follow a target entity (any object with x, y properties)
   */
  follow(target: { x: number; y: number }, offsetX: number = 0, offsetY: number = 0): void {
    this.targetEntity = target;
    this.followEnabled = true;
    this.followOffsetX = offsetX;
    this.followOffsetY = offsetY;
  }
  
  /**
   * Stop following target
   */
  stopFollow(): void {
    this.followEnabled = false;
    this.targetEntity = null;
  }
  
  /**
   * Configure follow behavior
   * @param _lerp - Reserved for future use (currently uses smoothFactor)
   * @param deadzoneX - Horizontal deadzone in pixels
   * @param deadzoneY - Vertical deadzone in pixels
   */
  setFollowSettings(_lerp: number, deadzoneX: number, deadzoneY: number): void {
    // Note: lerp parameter kept for API compatibility but smooth movement uses smoothFactor
    this.followDeadzoneX = Math.max(0, deadzoneX);
    this.followDeadzoneY = Math.max(0, deadzoneY);
  }
  
  /**
   * Update follow system (called from update())
   */
  private updateFollow(): void {
    if (!this.targetEntity) return;
    
    // Target position in world space (center of screen on entity)
    const targetWorldX = this.targetEntity.x + this.followOffsetX - this.worldWidth * 0.5;
    const targetWorldY = this.targetEntity.y + this.followOffsetY - this.worldHeight * 0.5;
    
    // Deadzone check (only move if target outside deadzone)
    const dx = targetWorldX - this.targetX;
    const dy = targetWorldY - this.targetY;
    
    if (Math.abs(dx) > this.followDeadzoneX) {
      this.targetX = targetWorldX;
    }
    if (Math.abs(dy) > this.followDeadzoneY) {
      this.targetY = targetWorldY;
    }
  }
  
  // ========================================
  // CAMERA SHAKE
  // ========================================
  
  /**
   * Start camera shake effect
   * @param intensity - Shake magnitude in pixels
   * @param duration - Duration in milliseconds
   */
  startShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }
  
  /**
   * Get current shake offset (for renderer)
   */
  getShakeOffset(): { x: number; y: number } {
    return { x: this.shakeOffsetX, y: this.shakeOffsetY };
  }
  
  /**
   * Update shake effect (called from update())
   */
  private updateShake(deltaTime: number): void {
    this.shakeDuration -= deltaTime;
    
    if (this.shakeDuration <= 0) {
      // Shake finished
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      return;
    }
    
    // Random shake (cheap, good enough for most cases)
    this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity;
    this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity;
    
    // Decay intensity over time
    this.shakeIntensity *= this.shakeDecay;
  }
  
  // ========================================
  // BOUNDS CLAMPING
  // ========================================
  
  /**
   * Set world bounds (camera will be clamped to stay within)
   */
  setWorldBounds(x: number, y: number, width: number, height: number): void {
    this.worldBoundsX = x;
    this.worldBoundsY = y;
    this.worldBoundsW = width;
    this.worldBoundsH = height;
    this.clampToBounds = true;
  }
  
  /**
   * Clear world bounds (disable clamping)
   */
  clearWorldBounds(): void {
    this.clampToBounds = false;
    this.worldBoundsW = 0;
    this.worldBoundsH = 0;
  }
  
  /**
   * Clamp camera position to world bounds (called from update())
   */
  private clampPosition(): void {
    // Compute max position (account for camera size)
    const maxX = this.worldBoundsX + this.worldBoundsW - this.worldWidth;
    const maxY = this.worldBoundsY + this.worldBoundsH - this.worldHeight;
    
    // Handle case where world is smaller than camera (center it)
    if (this.worldWidth >= this.worldBoundsW) {
      this.x = this.worldBoundsX + (this.worldBoundsW - this.worldWidth) * 0.5;
    } else {
      this.x = Math.max(this.worldBoundsX, Math.min(this.x, maxX));
    }
    
    if (this.worldHeight >= this.worldBoundsH) {
      this.y = this.worldBoundsY + (this.worldBoundsH - this.worldHeight) * 0.5;
    } else {
      this.y = Math.max(this.worldBoundsY, Math.min(this.y, maxY));
    }
  }
}
