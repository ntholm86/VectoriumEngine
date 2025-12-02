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
  HEART = 10,
  
  /**
   * Pentagram: 5-pointed outlined star
   * GPU math: Star outline with inner pentagon
   */
  PENTAGRAM = 11,
  
  /**
   * Vesica: Almond/eye shape (lens intersection)
   * GPU math: Two overlapping circles
   */
  VESICA = 12,
  
  /**
   * Moon: Crescent moon shape
   * GPU math: Circle subtracted from circle
   */
  MOON = 13,
  
  /**
   * Cross: Plus/cross shape
   * GPU math: Two intersecting rectangles
   */
  CROSS = 14,
  
  /**
   * Egg: Oval egg shape
   * GPU math: Parametric egg curve
   */
  EGG = 15,
  
  /**
   * Rounded X: X shape with rounded corners
   * GPU math: Diagonal cross with smoothing
   */
  ROUNDED_X = 16,
  
  /**
   * Pie: Pie slice/wedge shape
   * GPU math: Angular sector of circle
   */
  PIE = 17,
  
  /**
   * Arc: Curved arc segment
   * GPU math: Ring segment with angular bounds
   */
  ARC = 18,
  
  /**
   * Ring: Donut/ring shape
   * GPU math: Annular region between two circles
   */
  RING = 19,
  
  /**
   * Trapezoid: Isosceles trapezoid
   * GPU math: Four-sided polygon with parallel sides
   */
  TRAPEZOID = 20,
  
  /**
   * Horseshoe: U-shaped curve
   * GPU math: Partial ring with open ends
   */
  HORSESHOE = 21
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
  [ShapeType.HEART]: 'Heart',
  [ShapeType.PENTAGRAM]: 'Pentagram',
  [ShapeType.VESICA]: 'Vesica',
  [ShapeType.MOON]: 'Moon',
  [ShapeType.CROSS]: 'Cross',
  [ShapeType.EGG]: 'Egg',
  [ShapeType.ROUNDED_X]: 'Rounded X',
  [ShapeType.PIE]: 'Pie',
  [ShapeType.ARC]: 'Arc',
  [ShapeType.RING]: 'Ring',
  [ShapeType.TRAPEZOID]: 'Trapezoid',
  [ShapeType.HORSESHOE]: 'Horseshoe'
};
