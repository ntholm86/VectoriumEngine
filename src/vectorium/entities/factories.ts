/**
 * Entity Factory Functions - Pure ECS Approach
 * 
 * These functions create entities directly in the ECS World without OOP overhead.
 * This matches industry standards (Unity DOTS, Bevy, flecs, EnTT).
 * 
 * Benefits:
 * - Zero object allocation (pure data)
 * - -45% memory usage vs OOP entities
 * - Cleaner mental model
 * - Industry-standard pattern
 */

import { World, EntityId } from '../core/World';
import { hslToRgb } from '../utils/ColorUtils';
import { ShapeType } from '../shapes/ShapeType'; // 🎨 Import shape types
import { TextPool } from '../core/TextPool'; // 🎨 Import text pool

export interface TextStyle {
  font?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  baseline?: 'top' | 'middle' | 'bottom' | 'alphabetic';
  strokeColor?: string;
  strokeWidth?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface EntityFactoryOptions {
  size?: number;
  sizeRange?: [number, number];
  speedRange?: [number, number];
  rainbow?: boolean;
  color?: { r: number; g: number; b: number };
  minSpeed?: number;
  maxSpeed?: number;
  vx?: number;
  vy?: number;
  // Text-specific options
  textStyle?: TextStyle;
  isStatic?: boolean;
}

/**
 * Create a bouncing entity with velocity
 * Pure data - no OOP overhead
 */
export function createBouncingEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  // Calculate velocity
  let vx: number, vy: number;
  if (options.vx !== undefined && options.vy !== undefined) {
    // Use provided velocity
    vx = options.vx;
    vy = options.vy;
  } else {
    // Calculate random velocity
    const angle = Math.random() * Math.PI * 2;
    const [minSpeed, maxSpeed] = options.speedRange ?? [200, 500];
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;
  }
  
  // Calculate size
  let size: number;
  if (options.size !== undefined) {
    size = options.size;
  } else if (options.sizeRange) {
    const [minSize, maxSize] = options.sizeRange;
    size = minSize + Math.random() * (maxSize - minSize);
  } else {
    size = 4 + Math.random() * 8;
  }
  
  // Create entity in ECS
  const id = world.createEntity(x, y, vx, vy);
  
  // Set size
  const sizes = world.getSizes();
  sizes[id] = size;
  
  // Set color
  if (options.color) {
    const colorR = world.getColorR();
    const colorG = world.getColorG();
    const colorB = world.getColorB();
    colorR[id] = Math.floor(options.color.r * 255);
    colorG[id] = Math.floor(options.color.g * 255);
    colorB[id] = Math.floor(options.color.b * 255);
  }
  
  return id;
}

/**
 * Create a burst of entities radiating from a point
 */
export function createBouncingBurst(
  world: World,
  x: number,
  y: number,
  count: number,
  options: EntityFactoryOptions = {}
): EntityId[] {
  const entities: EntityId[] = [];
  const [minSpeed, maxSpeed] = options.speedRange ?? [200, 500];
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    // Calculate size
    let size: number;
    if (options.size !== undefined) {
      size = options.size;
    } else if (options.sizeRange) {
      const [minSize, maxSize] = options.sizeRange;
      size = minSize + Math.random() * (maxSize - minSize);
    } else {
      size = 4 + Math.random() * 8;
    }
    
    // Create entity
    const id = world.createEntity(x, y, vx, vy);
    
    // Set size
    const sizes = world.getSizes();
    sizes[id] = size;
    
    // Set rainbow color if requested
    if (options.rainbow) {
      const h = (i / count) * 360;
      const rgb = hslToRgb(h, 1, 0.5);
      const colorR = world.getColorR();
      const colorG = world.getColorG();
      const colorB = world.getColorB();
      colorR[id] = Math.floor(rgb.r * 255);
      colorG[id] = Math.floor(rgb.g * 255);
      colorB[id] = Math.floor(rgb.b * 255);
    } else if (options.color) {
      const colorR = world.getColorR();
      const colorG = world.getColorG();
      const colorB = world.getColorB();
      colorR[id] = Math.floor(options.color.r * 255);
      colorG[id] = Math.floor(options.color.g * 255);
      colorB[id] = Math.floor(options.color.b * 255);
    }
    
    entities.push(id);
  }
  
  return entities;
}

/**
 * Create a physics entity with gravity enabled
 */
export function createPhysicsEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  // Create base entity
  const id = createBouncingEntity(world, x, y, options);
  
  // Enable gravity
  world.setGravityEnabled(id, true);
  
  return id;
}

/**
 * Create a burst of physics entities with gravity
 */
export function createPhysicsBurst(
  world: World,
  x: number,
  y: number,
  count: number,
  options: EntityFactoryOptions = {}
): EntityId[] {
  const entities = createBouncingBurst(world, x, y, count, options);
  
  // Enable gravity for all
  for (const id of entities) {
    world.setGravityEnabled(id, true);
  }
  
  return entities;
}

/**
 * Create a collision entity with collision detection enabled
 */
export function createCollisionEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  // Create base entity
  const id = createBouncingEntity(world, x, y, options);
  
  // Enable collisions
  world.setCollisionsEnabled(id, true);
  
  return id;
}

/**
 * Create a burst of collision entities
 */
export function createCollisionBurst(
  world: World,
  x: number,
  y: number,
  count: number,
  options: EntityFactoryOptions = {}
): EntityId[] {
  const entities = createBouncingBurst(world, x, y, count, options);
  
  // Enable collisions for all
  for (const id of entities) {
    world.setCollisionsEnabled(id, true);
  }
  
  return entities;
}

/**
 * Create an entity with both gravity and collision
 */
export function createFullPhysicsEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  // Create base entity
  const id = createBouncingEntity(world, x, y, options);
  
  // Enable both gravity and collisions
  world.setGravityEnabled(id, true);
  world.setCollisionsEnabled(id, true);
  
  return id;
}

/**
 * Create a burst of entities with full physics
 */
export function createFullPhysicsBurst(
  world: World,
  x: number,
  y: number,
  count: number,
  options: EntityFactoryOptions = {}
): EntityId[] {
  const entities = createBouncingBurst(world, x, y, count, options);
  
  // Enable gravity and collisions for all
  for (const id of entities) {
    world.setGravityEnabled(id, true);
    world.setCollisionsEnabled(id, true);
  }
  
  return entities;
}

// ========================================
// 🎨 SHAPE ENTITY FACTORIES
// ========================================

/**
 * Create a shape entity (circle, star, triangle, etc.)
 * Shape type determines the SDF function used in fragment shader
 */
export function createShapeEntity(
  world: World,
  x: number,
  y: number,
  shapeType: ShapeType,
  options: EntityFactoryOptions = {}
): EntityId {
  // Create base entity
  const id = createBouncingEntity(world, x, y, options);
  
  // Set shape type
  world.setShapeType(id, shapeType);
  
  return id;
}

/**
 * Create a circle entity (GPU-accelerated SDF rendering)
 */
export function createCircleEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.CIRCLE, options);
}

/**
 * Create a triangle entity
 */
export function createTriangleEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.TRIANGLE, options);
}

/**
 * Create a 5-pointed star entity (priority shape per user request)
 */
export function createStar5Entity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.STAR_5, options);
}

/**
 * Create a 6-pointed star entity (Star of David)
 */
export function createStar6Entity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.STAR_6, options);
}

/**
 * Create a hexagon entity
 */
export function createHexagonEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.HEXAGON, options);
}

/**
 * Create a square entity
 */
export function createSquareEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.SQUARE, options);
}

/**
 * Create a pentagon entity
 */
export function createPentagonEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.PENTAGON, options);
}

/**
 * Create an octagon entity
 */
export function createOctagonEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.OCTAGON, options);
}

/**
 * Create a diamond entity (rotated square)
 */
export function createDiamondEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.DIAMOND, options);
}

/**
 * Create a heart entity
 */
export function createHeartEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.HEART, options);
}

/**
 * Create a pentagram entity (5-point outlined star)
 */
export function createPentagramEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.PENTAGRAM, options);
}

/**
 * Create a vesica entity (almond/eye shape)
 */
export function createVesicaEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.VESICA, options);
}

/**
 * Create a moon entity (crescent)
 */
export function createMoonEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.MOON, options);
}

/**
 * Create a cross entity
 */
export function createCrossEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.CROSS, options);
}

/**
 * Create an egg entity
 */
export function createEggEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.EGG, options);
}

/**
 * Create a rounded X entity
 */
export function createRoundedXEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.ROUNDED_X, options);
}

/**
 * Create a pie entity (wedge/slice)
 */
export function createPieEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.PIE, options);
}

/**
 * Create an arc entity
 */
export function createArcEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.ARC, options);
}

/**
 * Create a ring entity (donut)
 */
export function createRingEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.RING, options);
}

/**
 * Create a trapezoid entity
 */
export function createTrapezoidEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.TRAPEZOID, options);
}

/**
 * Create a horseshoe entity
 */
export function createHorseshoeEntity(
  world: World,
  x: number,
  y: number,
  options: EntityFactoryOptions = {}
): EntityId {
  return createShapeEntity(world, x, y, ShapeType.HORSESHOE, options);
}

/**
 * Create a burst of shapes radiating from a point
 */
export function createShapeBurst(
  world: World,
  x: number,
  y: number,
  count: number,
  shapeType: ShapeType,
  options: EntityFactoryOptions = {}
): EntityId[] {
  const entities = createBouncingBurst(world, x, y, count, options);
  
  // Set shape type for all entities
  for (const id of entities) {
    world.setShapeType(id, shapeType);
  }
  
  return entities;
}

// ========================================
// 🎨 TEXT ENTITY FACTORIES
// ========================================

/**
 * Create a text entity (requires TextPool)
 * Text is rendered using WebGL texture with optional effects
 */
export function createTextEntity(
  world: World,
  textPool: TextPool,
  x: number,
  y: number,
  text: string,
  options: EntityFactoryOptions = {},
  textEntitiesMap?: Map<EntityId, { text: string; style: TextStyle }>
): EntityId {
  // Create base entity
  const id = createBouncingEntity(world, x, y, options);
  
  // Hide sprite quad (text renders separately)
  const sizes = world.getSizes();
  sizes[id] = 0;
  
  // Set white color for text rendering
  const colorR = world.getColorR();
  const colorG = world.getColorG();
  const colorB = world.getColorB();
  colorR[id] = 255;
  colorG[id] = 255;
  colorB[id] = 255;
  
  // Allocate text in pool
  const textIndex = textPool.allocate(text);
  world.setTextIndex(id, textIndex);
  
  // Mark as static if requested
  if (options.isStatic) {
    world.setTextStatic(id, true);
  }
  
  // Store text style if provided
  if (options.textStyle && textEntitiesMap) {
    textEntitiesMap.set(id, { text, style: options.textStyle });
  }
  
  return id;
}

/**
 * Create a static label entity (no velocity, larger size)
 */
export function createLabelEntity(
  world: World,
  textPool: TextPool,
  x: number,
  y: number,
  text: string,
  options: EntityFactoryOptions = {},
  textEntitiesMap?: Map<EntityId, { text: string; style: TextStyle }>
): EntityId {
  // Create entity with no velocity
  const id = world.createEntity(x, y, 0, 0);
  
  // Hide sprite quad
  const sizes = world.getSizes();
  sizes[id] = 0;
  
  // Set white color for text rendering
  const colorR = world.getColorR();
  const colorG = world.getColorG();
  const colorB = world.getColorB();
  colorR[id] = 255;
  colorG[id] = 255;
  colorB[id] = 255;
  
  // Allocate text
  const textIndex = textPool.allocate(text);
  world.setTextIndex(id, textIndex);
  
  // Mark as static
  world.setTextStatic(id, true);
  
  // Store text style if provided
  if (options.textStyle && textEntitiesMap) {
    textEntitiesMap.set(id, { text, style: options.textStyle });
  }
  
  return id;
}

/**
 * Create a counter entity (dynamic text that updates frequently)
 * Useful for scores, FPS counters, etc.
 */
export function createCounterEntity(
  world: World,
  textPool: TextPool,
  x: number,
  y: number,
  initialValue: number = 0,
  options: EntityFactoryOptions = {}
): EntityId {
  const text = initialValue.toString();
  return createLabelEntity(world, textPool, x, y, text, options);
}

/**
 * Update counter entity with new value
 */
export function updateCounterEntity(
  world: World,
  textPool: TextPool,
  entityId: EntityId,
  value: number
): void {
  const textIndices = world.getTextIndices();
  const textIndex = textIndices[entityId];
  
  if (textIndex >= 0) {
    textPool.update(textIndex, value.toString());
  }
}

/**
 * Factory type for dynamic entity creation
 */
export type EntityFactory = (world: World, x: number, y: number, options?: EntityFactoryOptions) => EntityId;
export type EntityBurstFactory = (world: World, x: number, y: number, count: number, options?: EntityFactoryOptions) => EntityId[];

/**
 * Build TextStyle from text configuration (used by EntitySpawner)
 */
export function buildTextStyle(
  config: {
    bold?: boolean;
    italic?: boolean;
    size?: number;
    align?: 'left' | 'center' | 'right';
    shadow?: boolean;
    outline?: boolean;
    glow?: boolean;
  },
  color: string = '#FFFFFF'
): TextStyle {
  // Build font string
  let font = '';
  if (config.bold) font += 'bold ';
  if (config.italic) font += 'italic ';
  font += `${config.size || 24}px Arial`;
  
  const style: TextStyle = {
    font,
    fontSize: config.size || 24,
    fontFamily: 'Arial',
    color: color,
    align: config.align || 'left'  // Default to left alignment (standard text behavior)
  };
  
  // Add effects
  if (config.outline) {
    style.strokeColor = '#00FFFF';
    style.strokeWidth = 4;
  }
  
  if (config.shadow) {
    style.shadow = {
      color: 'rgba(255, 0, 0, 1.0)',
      blur: 6,
      offsetX: 4,
      offsetY: 4
    };
  }
  
  if (config.glow) {
    style.shadow = {
      color: 'rgba(255, 255, 0, 1.0)',
      blur: 20,
      offsetX: 0,
      offsetY: 0
    };
  }
  
  return style;
}

/**
 * Registry of available entity types
 */
export const EntityFactories = {
  bouncing: createBouncingEntity,
  physics: createPhysicsEntity,
  collision: createCollisionEntity,
  fullPhysics: createFullPhysicsEntity,
  // 🎨 Shape factories
  shape: createShapeEntity,
  circle: createCircleEntity,
  triangle: createTriangleEntity,
  star5: createStar5Entity,
  star6: createStar6Entity,
  hexagon: createHexagonEntity,
  square: createSquareEntity,
  pentagon: createPentagonEntity,
  octagon: createOctagonEntity,
  diamond: createDiamondEntity,
  heart: createHeartEntity,
} as const;

export const EntityBurstFactories = {
  bouncing: createBouncingBurst,
  physics: createPhysicsBurst,
  collision: createCollisionBurst,
  fullPhysics: createFullPhysicsBurst,
  // 🎨 Shape burst factory
  shape: createShapeBurst,
} as const;

export type EntityType = keyof typeof EntityFactories;

// ==================== Phase 1: Textured Sprite Factories ====================

/**
 * Create a textured sprite entity
 * @param world ECS World
 * @param textureManager TextureManager instance
 * @param x World X position
 * @param y World Y position
 * @param textureUrl Texture URL or path
 * @param size Sprite size (width/height)
 * @param options Optional settings
 */
export async function createSprite(
  world: World,
  textureManager: any, // TextureManager
  x: number,
  y: number,
  textureUrl: string,
  size: number = 64,
  options: {
    vx?: number;
    vy?: number;
    frame?: string;  // Optional atlas frame name
    interactive?: boolean;
  } = {}
): Promise<EntityId> {
  // Load texture if not cached
  const texture = await textureManager.loadTexture(textureUrl);
  
  // Create entity
  const id = world.createEntity(x, y, options.vx || 0, options.vy || 0);
  
  // Set size
  world.setSize(id, size);
  
  // Set texture (full texture by default)
  if (options.frame) {
    // Use atlas frame
    const frame = textureManager.getFrame(textureUrl, options.frame);
    if (frame) {
      const uvs = textureManager.frameToUV(frame, texture.width, texture.height);
      world.setTexture(id, texture.id, uvs.u0, uvs.v0, uvs.u1, uvs.v1);
    } else {
      world.setTexture(id, texture.id);
    }
  } else {
    // Use full texture
    world.setTexture(id, texture.id);
  }
  
  // Mark as interactive if requested
  if (options.interactive) {
    world.setInteractive(id);
  }
  
  return id;
}

/**
 * Create an animated sprite entity
 * @param world ECS World
 * @param animManager AnimationManager instance
 * @param textureManager TextureManager instance
 * @param x World X position
 * @param y World Y position
 * @param textureUrl Texture URL
 * @param animationName Animation name
 * @param size Sprite size
 */
export function createAnimatedSprite(
  world: World,
  animManager: any, // AnimationManager
  textureManager: any, // TextureManager
  x: number,
  y: number,
  textureUrl: string,
  animationName: string,
  size: number = 64,
  options: {
    vx?: number;
    vy?: number;
    loop?: boolean;
    interactive?: boolean;
  } = {}
): EntityId {
  // Get texture (must be pre-loaded)
  const texture = textureManager.getTexture(textureUrl);
  if (!texture) {
    throw new Error(`Texture not loaded: ${textureUrl}`);
  }
  
  // Get animation
  const anim = animManager.getFrameAnimation(animationName);
  if (!anim) {
    throw new Error(`Animation not found: ${animationName}`);
  }
  
  // Create entity
  const id = world.createEntity(x, y, options.vx || 0, options.vy || 0);
  
  // Set size
  world.setSize(id, size);
  
  // Set initial texture
  world.setTexture(id, texture.id);
  
  // Start animation
  world.playAnimation(id, anim.id, options.loop !== false);
  
  // Mark as interactive if requested
  if (options.interactive) {
    world.setInteractive(id);
  }
  
  return id;
}

/**
 * Create a button entity (textured sprite with click callback)
 */
export async function createButton(
  world: World,
  textureManager: any,
  inputManager: any,
  x: number,
  y: number,
  textureUrl: string,
  size: number,
  onClick: () => void
): Promise<EntityId> {
  // Create sprite
  const id = await createSprite(world, textureManager, x, y, textureUrl, size, {
    interactive: true
  });
  
  // Register click callback
  inputManager.onClick(id, onClick);
  
  return id;
}

