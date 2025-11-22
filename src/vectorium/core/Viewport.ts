/**
 * Vectorium Engine - Viewport
 * Centralized resolution and world bounds management
 * 
 * SOLID: Single Responsibility - manages all dimension concerns
 * KISS: Simple value object with computed properties
 * YAGNI: Only what's needed - no over-engineering
 */

export class Viewport {
  // Canvas resolution (pixels)
  readonly width: number;
  readonly height: number;
  
  // World bounds multiplier (1.0 = viewport only, >1.0 = larger world for culling)
  readonly worldScale: number;
  
  // Computed properties
  readonly aspectRatio: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  
  constructor(width: number, height: number, worldScale: number = 1.0) {
    // Viewport dimensions = canvas dimensions (for rendering)
    this.width = width;
    this.height = height;
    this.worldScale = worldScale;
    
    // Computed once on creation (immutable)
    this.aspectRatio = width / height;
    
    // World dimensions = viewport * scale (for physics)
    // When worldScale = 1.0, world = viewport (entities bounce at screen edges)
    // When worldScale > 1.0, world > viewport (larger physics space, needs culling)
    this.worldWidth = width * worldScale;
    this.worldHeight = height * worldScale;
  }
  
  /**
   * Create new viewport with different resolution
   */
  resize(width: number, height: number): Viewport {
    return new Viewport(width, height, this.worldScale);
  }
  
  /**
   * Create new viewport with different world scale
   */
  setWorldScale(scale: number): Viewport {
    return new Viewport(this.width, this.height, scale);
  }
  
  /**
   * Check if entity is within world bounds
   */
  isInWorldBounds(x: number, y: number, radius: number = 0): boolean {
    return x - radius >= 0 && x + radius <= this.worldWidth &&
           y - radius >= 0 && y + radius <= this.worldHeight;
  }
  
  /**
   * Check if entity is visible in viewport (camera at 0,0)
   */
  isInViewport(x: number, y: number, radius: number = 0): boolean {
    return x - radius >= 0 && x + radius <= this.width &&
           y - radius >= 0 && y + radius <= this.height;
  }
  
  /**
   * Clamp position to world bounds
   */
  clampToWorld(x: number, y: number, radius: number): { x: number; y: number } {
    return {
      x: Math.max(radius, Math.min(this.worldWidth - radius, x)),
      y: Math.max(radius, Math.min(this.worldHeight - radius, y))
    };
  }
  
  /**
   * Get center point of viewport
   */
  getCenter(): { x: number; y: number } {
    return {
      x: this.width * 0.5,
      y: this.height * 0.5
    };
  }
  
  /**
   * Standard resolutions as factory methods
   */
  static HD(): Viewport {
    return new Viewport(1280, 720, 1.0);
  }
  
  static FullHD(): Viewport {
    return new Viewport(1920, 1080, 1.0);
  }
  
  static QHD(): Viewport {
    return new Viewport(2560, 1440, 1.0);
  }
  
  static UHD(): Viewport {
    return new Viewport(3840, 2160, 1.0);
  }
  
  /**
   * Create from aspect ratio with max constraints
   */
  static fromAspectRatio(
    aspectRatio: number,
    maxWidth: number,
    maxHeight: number
  ): Viewport {
    let width = maxWidth;
    let height = maxWidth / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspectRatio;
    }
    
    return new Viewport(Math.floor(width), Math.floor(height), 1.0);
  }
}
