/**
 * Vectorium Engine - Camera
 * 2D camera with frustum culling for optimal rendering
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
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
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
   */
  cullEntities(
    posX: Float32Array,
    posY: Float32Array,
    scaleX: Float32Array,
    count: number,
    visibleIndices: Uint32Array
  ): number {
    const bounds = this.getBounds();
    let visibleCount = 0;
    
    for (let i = 0; i < count; i++) {
      const x = posX[i];
      const y = posY[i];
      const size = scaleX[i] * 8; // Assuming 8px base size
      const halfSize = size * 0.5;
      
      // AABB overlap test
      const isVisible = !(
        x + halfSize < bounds.left ||
        x - halfSize > bounds.right ||
        y + halfSize < bounds.top ||
        y - halfSize > bounds.bottom
      );
      
      if (isVisible) {
        visibleIndices[visibleCount++] = i;
      }
    }
    
    return visibleCount;
  }

  /**
   * Set camera position
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Move camera by delta
   */
  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  /**
   * Resize camera viewport
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /**
   * Set culling margin (extra pixels around viewport to render)
   */
  setCullingMargin(margin: number): void {
    this.cullingMargin = margin;
  }

  /**
   * Center camera on a point
   */
  centerOn(x: number, y: number): void {
    this.x = x - this.width * 0.5;
    this.y = y - this.height * 0.5;
  }
}
