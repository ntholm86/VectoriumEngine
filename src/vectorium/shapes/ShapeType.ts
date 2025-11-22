/**
 * 🎨 Shape Type Enumeration
 * 
 * Defines shape types for entity rendering:
 * - 0 (SPRITE): Default textured sprite rendering
 * - 1+ (Shapes): SDF-based procedural shapes for GPU-accelerated rendering
 * 
 * Performance: 1 byte per entity (stored in World.shapeType: Uint8Array)
 * 
 * Architecture: Pure ECS component (no methods, just data)
 */
export enum ShapeType {
  /**
   * Default: Textured sprite rendering (traditional)
   * Uses texture coordinates for rendering
   */
  SPRITE = 0,
  
  /**
   * Circle: SDF-based perfect circle
   * GPU math: length(uv) - radius
   */
  CIRCLE = 1,
  
  /**
   * Triangle: SDF-based equilateral triangle
   * GPU math: Rotated distance field
   */
  TRIANGLE = 2,
  
  /**
   * 5-pointed star: Most common star shape
   * GPU math: Polar coordinate SDF with 5-fold symmetry
   * Priority shape (requested by user)
   */
  STAR_5 = 3,
  
  /**
   * 6-pointed star (Star of David)
   * GPU math: Two overlapping triangles
   */
  STAR_6 = 4,
  
  /**
   * Hexagon: Regular 6-sided polygon
   * GPU math: Distance to 6 edge planes
   */
  HEXAGON = 5,
  
  /**
   * Square: Axis-aligned box
   * GPU math: max(abs(uv.x), abs(uv.y)) - size
   */
  SQUARE = 6,
  
  /**
   * Pentagon: Regular 5-sided polygon
   * GPU math: Distance to 5 edge planes
   */
  PENTAGON = 7,
  
  /**
   * Octagon: Regular 8-sided polygon
   * GPU math: Distance to 8 edge planes
   */
  OCTAGON = 8,
  
  /**
   * Diamond: 45-degree rotated square
   * GPU math: Rotated box SDF
   */
  DIAMOND = 9,
  
  /**
   * Heart: Romantic heart shape
   * GPU math: Parametric curve SDF
   */
  HEART = 10
}

/**
 * Human-readable names for debugging
 */
export const ShapeTypeNames: Record<ShapeType, string> = {
  [ShapeType.SPRITE]: 'Sprite',
  [ShapeType.CIRCLE]: 'Circle',
  [ShapeType.TRIANGLE]: 'Triangle',
  [ShapeType.STAR_5]: '5-Pointed Star',
  [ShapeType.STAR_6]: '6-Pointed Star',
  [ShapeType.HEXAGON]: 'Hexagon',
  [ShapeType.SQUARE]: 'Square',
  [ShapeType.PENTAGON]: 'Pentagon',
  [ShapeType.OCTAGON]: 'Octagon',
  [ShapeType.DIAMOND]: 'Diamond',
  [ShapeType.HEART]: 'Heart'
};
