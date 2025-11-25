/**
 * Entity Spawn Service
 * 
 * Reusable service for spawning entities with physics, animations, and visual types.
 * Eliminates boilerplate from demo files - spawn entities with one-line calls.
 * 
 * Benefits:
 * - Single source of truth for entity spawning
 * - Reusable across all demos/games
 * - Declarative, config-driven API
 * - Matches industry patterns (Unity DOTS, PixiJS particles)
 */

import { Scene } from '../core/Engine';
import { World, EntityId } from '../core/World';
import { TextPool } from '../core/TextPool';
import { AnimationManager } from '../animation/AnimationManager';
import {
  createCircleEntity,
  createStar5Entity,
  createStar6Entity,
  createTriangleEntity,
  createPentagonEntity,
  createHexagonEntity,
  createOctagonEntity,
  createHeartEntity,
  createSquareEntity,
  createDiamondEntity,
  createPentagramEntity,
  createVesicaEntity,
  createMoonEntity,
  createCrossEntity,
  createEggEntity,
  createRoundedXEntity,
  createPieEntity,
  createArcEntity,
  createRingEntity,
  createTrapezoidEntity,
  createHorseshoeEntity,
  createTextEntity,
  buildTextStyle
} from './factories';

// Type aliases for cleaner API
export type PhysicsMode = 'none' | 'gravity' | 'collision' | 'full';
export type VisualType = 'sprite' | 'circle' | 'star5' | 'star6' | 'triangle' | 
  'pentagon' | 'hexagon' | 'octagon' | 'heart' | 'square' | 'diamond' | 
  'pentagram' | 'vesica' | 'moon' | 'cross' | 'egg' | 'roundedx' | 
  'pie' | 'arc' | 'ring' | 'trapezoid' | 'horseshoe' | 'text';

export interface TextConfig {
  mode: 'static' | 'dynamic';
  content: string;
  bold: boolean;
  italic: boolean;
  size: number;
  align: 'left' | 'center' | 'right';
  shadow: boolean;
  outline: boolean;
  glow: boolean;
}

export interface TextureConfig {
  textureUrl: string;
}

export interface AnimationConfig {
  type: 'none' | 'frame' | 'tween';
  fps: number;
  loop: boolean;
  tweenProperty: 'x' | 'y' | 'scale' | 'size' | 'alpha';
  tweenDuration: number;
  tweenEasing: 'linear' | 'easeInOut' | 'bounce';
}

export interface SpawnConfig {
  x: number;
  y: number;
  count: number;
  physicsMode: PhysicsMode;
  visualType: VisualType;
  textConfig?: TextConfig;
  textureConfig?: TextureConfig;
  animationConfig?: AnimationConfig;
}

type ShapeFactory = (world: World, x: number, y: number, options: any) => EntityId;

/**
 * Entity Spawn Service
 * Handles all entity creation with physics, animations, and visual types
 */
export class EntitySpawnService {
  private shapeRegistry = new Map<VisualType, ShapeFactory | null>();
  private textAnimations = new Map<EntityId, {
    rotationSpeed: number;
    pulseSpeed: number;
    pulsePhase: number;
  }>();
  
  // Rainbow colors for shape spawning
  private readonly colors = [
    { r: 1, g: 0.2, b: 0.2 },   // Red
    { r: 1, g: 0.6, b: 0.2 },   // Orange
    { r: 1, g: 1, b: 0.2 },     // Yellow
    { r: 0.2, g: 1, b: 0.2 },   // Green
    { r: 0.2, g: 0.6, b: 1 },   // Blue
    { r: 0.6, g: 0.2, b: 1 },   // Purple
    { r: 1, g: 0.2, b: 0.6 },   // Pink
  ];
  
  constructor(
    private scene: Scene,
    private textPool?: TextPool,
    private animationManager?: AnimationManager
  ) {
    this.registerShapeFactories();
  }
  
  /**
   * Register all shape factories
   */
  private registerShapeFactories(): void {
    this.shapeRegistry.set('sprite', null);
    this.shapeRegistry.set('circle', createCircleEntity);
    this.shapeRegistry.set('star5', createStar5Entity);
    this.shapeRegistry.set('star6', createStar6Entity);
    this.shapeRegistry.set('triangle', createTriangleEntity);
    this.shapeRegistry.set('pentagon', createPentagonEntity);
    this.shapeRegistry.set('hexagon', createHexagonEntity);
    this.shapeRegistry.set('octagon', createOctagonEntity);
    this.shapeRegistry.set('heart', createHeartEntity);
    this.shapeRegistry.set('square', createSquareEntity);
    this.shapeRegistry.set('diamond', createDiamondEntity);
    this.shapeRegistry.set('pentagram', createPentagramEntity);
    this.shapeRegistry.set('vesica', createVesicaEntity);
    this.shapeRegistry.set('moon', createMoonEntity);
    this.shapeRegistry.set('cross', createCrossEntity);
    this.shapeRegistry.set('egg', createEggEntity);
    this.shapeRegistry.set('roundedx', createRoundedXEntity);
    this.shapeRegistry.set('pie', createPieEntity);
    this.shapeRegistry.set('arc', createArcEntity);
    this.shapeRegistry.set('ring', createRingEntity);
    this.shapeRegistry.set('trapezoid', createTrapezoidEntity);
    this.shapeRegistry.set('horseshoe', createHorseshoeEntity);
  }
  
  /**
   * Spawn entities based on configuration (main entry point)
   */
  spawnBatch(config: SpawnConfig): EntityId[] {
    if (config.visualType === 'text') {
      return this.spawnText(config);
    } else {
      return this.spawnShapes(config);
    }
  }
  
  /**
   * Spawn shape entities (circles, stars, etc.)
   */
  private spawnShapes(config: SpawnConfig): EntityId[] {
    const entities: EntityId[] = [];
    const factory = this.shapeRegistry.get(config.visualType);
    const world = this.scene.world;
    
    for (let i = 0; i < config.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 250;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 12 + Math.random() * 24;
      const color = this.colors[i % this.colors.length];
      
      // Create entity (with or without shape)
      let id: EntityId;
      if (factory) {
        // Use shape factory
        id = factory(world, config.x, config.y, { 
          size, 
          color,
          vx,
          vy
        });
      } else {
        // Default sprite entity
        id = world.createEntity(config.x, config.y, vx, vy);
        const sizes = world.getSizes();
        sizes[id] = size;
      }
      
      // Apply color
      const colorR = world.getColorR();
      const colorG = world.getColorG();
      const colorB = world.getColorB();
      colorR[id] = Math.floor(color.r * 255);
      colorG[id] = Math.floor(color.g * 255);
      colorB[id] = Math.floor(color.b * 255);
      
      // Apply physics
      this.applyPhysics(id, config.physicsMode);
      
      // Apply animation
      if (config.animationConfig) {
        this.applyAnimation(id, config.animationConfig);
      }
      
      entities.push(id);
    }
    
    return entities;
  }
  
  /**
   * Spawn text entities
   */
  private spawnText(config: SpawnConfig): EntityId[] {
    if (!this.textPool || !config.textConfig) {
      console.error('TextPool or TextConfig not available');
      return [];
    }
    
    const entities: EntityId[] = [];
    const world = this.scene.world;
    const textCfg = config.textConfig;
    const isStaticMode = textCfg.mode === 'static';
    
    // Build text style
    const textStyle = buildTextStyle({
      bold: textCfg.bold,
      italic: textCfg.italic,
      size: textCfg.size,
      align: textCfg.align,
      shadow: textCfg.shadow,
      outline: textCfg.outline,
      glow: textCfg.glow
    });
    
    // Get scene's text entities map (required for rendering)
    const sceneTextEntities = (this.scene as any).getTextEntities?.();
    if (!sceneTextEntities) {
      console.error('Scene does not have getTextEntities() method - text rendering will not work');
      return [];
    }
    
    for (let i = 0; i < config.count; i++) {
      let spawnX = config.x;
      let spawnY = config.y;
      let vx = 0;
      let vy = 0;
      
      if (isStaticMode) {
        // Static: Grid pattern, no velocity
        const cols = Math.ceil(Math.sqrt(config.count));
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        // Adjust spawn X based on alignment
        const estimatedTextWidth = textCfg.content.length * textCfg.size * 0.6;
        let baseX = config.x;
        
        if (textCfg.align === 'center') {
          baseX = config.x + estimatedTextWidth / 2;
        } else if (textCfg.align === 'right') {
          baseX = config.x + estimatedTextWidth;
        }
        
        spawnX = baseX + col * 150;
        spawnY = config.y + row * 60;
      } else {
        // Dynamic: Radial explosion with velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = 150 + Math.random() * 250;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      }
      
      // Get text content
      const text = textCfg.mode === 'dynamic' ? `#${i}` : textCfg.content;
      
      // Create text entity
      const id = createTextEntity(
        world,
        this.textPool,
        spawnX,
        spawnY,
        text,
        {
          vx,
          vy,
          textStyle,
          isStatic: isStaticMode
        },
        sceneTextEntities  // Pass scene's map directly
      );
      
      // Add animations to dynamic text
      if (!isStaticMode) {
        const rotations = world.getRotation();
        rotations[id] = Math.floor(Math.random() * 360);
        
        this.textAnimations.set(id, {
          rotationSpeed: (Math.random() - 0.5) * 180,
          pulseSpeed: 1 + Math.random() * 2,
          pulsePhase: Math.random() * Math.PI * 2
        });
      }
      
      // Apply physics
      this.applyPhysics(id, config.physicsMode);
      
      entities.push(id);
    }
    
    return entities;
  }
  
  /**
   * Apply physics mode to entity
   */
  private applyPhysics(entityId: EntityId, mode: PhysicsMode): void {
    const world = this.scene.world;
    
    switch (mode) {
      case 'none':
        // No physics (just bouncing)
        break;
      case 'gravity':
        world.setGravityEnabled(entityId, true);
        break;
      case 'collision':
        world.setCollisionEnabled(entityId, true);
        break;
      case 'full':
        world.setGravityEnabled(entityId, true);
        world.setCollisionEnabled(entityId, true);
        break;
    }
  }
  
  /**
   * Apply animation to entity
   */
  private applyAnimation(entityId: EntityId, config: AnimationConfig): void {
    if (config.type !== 'tween' || !this.animationManager) return;
    
    const world = this.scene.world;
    
    // Map property name to index
    const propertyMap: Record<string, number> = {
      x: 0,
      y: 1,
      scale: 2,
      size: 3,
      alpha: 4
    };
    
    const propertyIndex = propertyMap[config.tweenProperty];
    if (propertyIndex === undefined) return;
    
    // Map easing name to function
    const easingMap: Record<string, (t: number) => number> = {
      linear: (t) => t,
      easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      bounce: (t) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
          return n1 * t * t;
        } else if (t < 2 / d1) {
          return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
          return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
          return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
      }
    };
    
    const easingFn = easingMap[config.tweenEasing] || easingMap.linear;
    
    // Get current and target values
    const posX = world.getX();
    const posY = world.getY();
    const scales = world.getScale();
    const sizes = world.getSizes();
    const alphas = world.getAlpha();
    
    let startValue = 0;
    let endValue = 0;
    
    switch (propertyIndex) {
      case 0: // x
        startValue = posX[entityId];
        endValue = startValue + (Math.random() - 0.5) * 600;
        break;
      case 1: // y
        startValue = posY[entityId];
        endValue = startValue + (Math.random() - 0.5) * 600;
        break;
      case 2: // scale
        startValue = scales[entityId];
        endValue = 0.1 + Math.random() * 2.5;
        break;
      case 3: // size
        startValue = sizes[entityId];
        endValue = startValue * (0.2 + Math.random() * 2);
        break;
      case 4: // alpha
        startValue = alphas[entityId];
        endValue = Math.random() * 0.5;
        break;
    }
    
    // Create or get tween definition
    const tweenName = `${config.tweenProperty}_${config.tweenDuration}_${config.tweenEasing}`;
    let tween = this.animationManager.getTween(tweenName);
    
    if (!tween) {
      tween = this.animationManager.createTween({
        name: tweenName,
        properties: [propertyIndex],
        duration: config.tweenDuration,
        easing: easingFn
      });
    }
    
    // Apply tween to entity
    const tweenIds = world.getTweenIds();
    const tweenTimes = world.getTweenTimes();
    const tweenActive = world.getTweenActive();
    const tweenStartValues = world.getTweenStartValues();
    const tweenEndValues = world.getTweenEndValues();
    
    tweenIds[entityId] = tween.id;
    tweenTimes[entityId] = 0;
    tweenActive[entityId] = 1;
    
    const baseIndex = entityId * 4;
    tweenStartValues[baseIndex] = startValue;
    tweenEndValues[baseIndex] = endValue;
  }
  
  /**
   * Update text animations (call from scene.update)
   */
  updateTextAnimations(dt: number): void {
    if (this.textAnimations.size === 0) return;
    
    const world = this.scene.world;
    const rotations = world.getRotation();
    const scales = world.getScale();
    const time = performance.now() / 1000;
    
    this.textAnimations.forEach((animData, entityId) => {
      // Rotation animation
      rotations[entityId] = (rotations[entityId] + animData.rotationSpeed * dt) % 360;
      if (rotations[entityId] < 0) rotations[entityId] += 360;
      
      // Pulse animation
      const pulseValue = Math.sin(time * animData.pulseSpeed + animData.pulsePhase);
      scales[entityId] = 1.0 + pulseValue * 0.3;
    });
  }
  
  /**
   * Clear all text animations
   */
  clearTextAnimations(): void {
    this.textAnimations.clear();
  }
  
  /**
   * Remove text animation for specific entity
   */
  removeTextAnimation(entityId: EntityId): void {
    this.textAnimations.delete(entityId);
  }
  
  /**
   * Get text animation count
   */
  getTextAnimationCount(): number {
    return this.textAnimations.size;
  }
}
