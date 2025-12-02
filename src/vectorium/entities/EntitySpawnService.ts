/**
 * EntitySpawnService - Generic, high-performance entity creation system
 * 
 * Design Philosophy:
 * - Single responsibility: Create and configure entities
 * - Composable: Configuration through simple objects
 * - Zero allocation: Pre-allocated buffers, object pooling
 * - Batch-first: All operations optimized for bulk creation
 * - Type-safe: Strong typing with sensible defaults
 */

import { Scene } from '../core/Engine';
import { EntityId, World } from '../core/World';
import { ShapeType } from '../utils/ShapeType';
import { TextPool } from '../display/TextPool';
import { BUNNYMARK_CONFIG } from '../core/BunnymarkConfig';

// Type aliases for cleaner API
export type PhysicsMode = 'none' | 'gravity' | 'collision' | 'full';
export type VisualType = 
  | 'sprite' | 'circle' | 'star5' | 'star6' | 'triangle' 
  | 'pentagon' | 'hexagon' | 'octagon' | 'heart' | 'square' | 'diamond' 
  | 'pentagram' | 'vesica' | 'moon' | 'cross' | 'egg' | 'roundedx' 
  | 'pie' | 'arc' | 'ring' | 'trapezoid' | 'horseshoe' | 'text';

export interface SpawnConfig {
  // Position & quantity
  position: { x: number; y: number };
  count: number;
  
  // Spatial distribution
  distribution?: {
    type: 'point' | 'circle' | 'grid' | 'line';
    radius?: number;      // For circle distribution
    spacing?: number;     // For grid distribution
    angle?: number;       // For line distribution
  };
  
  // Visual appearance
  visual: {
    type: 'shape' | 'sprite' | 'text';
    shape?: ShapeType;
    texture?: string;     // URL for sprites
    text?: string;        // Content for text
  };
  
  // Size configuration
  size?: {
    min: number;
    max: number;
  } | number;
  
  // Color configuration
  color?: {
    r: number;
    g: number;
    b: number;
  } | 'random' | 'palette';
  
  // Physics behavior
  physics?: {
    velocity?: { x: number; y: number } | 'random' | 'radial';
    speed?: { min: number; max: number } | number;
    gravity?: boolean;
    collision?: boolean;
  };
  
  // Animation
  animation?: {
    type: 'none' | 'tween' | 'rotate';
    property?: 'x' | 'y' | 'scale' | 'alpha' | 'rotation';
    duration?: number;
    easing?: 'linear' | 'easeInOut' | 'bounce';
  };
}

// ============================================================================
// EntitySpawnService - Main Class
// ============================================================================

export class EntitySpawnService {
  // Core dependencies
  private readonly world: World;
  private readonly textPool: TextPool;
  private readonly textureManager: any;  // TextureManager - direct injection
  private readonly scene: Scene;
  
  // Texture cache for sprites
  private readonly textureCache = new Map<string, number>();
  
  // Pre-calculated color palettes
  private readonly rainbowPalette: Uint8Array;
  
  // Pre-allocated computation buffers
  private readonly maxBatchSize = 100000;
  private readonly computeBuffer: Float32Array;
  
  // Trigonometry lookup tables (360 degrees)
  private readonly sinLUT: Float32Array;
  private readonly cosLUT: Float32Array;
  
  constructor(
    scene: Scene,
    world: World,
    textPool: TextPool,
    textureManager: any  // TextureManager - direct injection
  ) {
    this.scene = scene;
    this.world = world;
    this.textPool = textPool;
    this.textureManager = textureManager;
    
    // Initialize rainbow color palette (7 colors × RGB)
    this.rainbowPalette = new Uint8Array([
      255, 51, 51,    // Red
      255, 153, 51,   // Orange
      255, 255, 51,   // Yellow
      51, 255, 51,    // Green
      51, 153, 255,   // Blue
      153, 51, 255,   // Purple
      255, 51, 153,   // Pink
    ]);
    
    // Pre-allocate computation buffer
    this.computeBuffer = new Float32Array(this.maxBatchSize * 4);
    
    // Build sin/cos lookup tables
    this.sinLUT = new Float32Array(360);
    this.cosLUT = new Float32Array(360);
    for (let deg = 0; deg < 360; deg++) {
      const rad = (deg * Math.PI) / 180;
      this.sinLUT[deg] = Math.sin(rad);
      this.cosLUT[deg] = Math.cos(rad);
    }
  }
  
  // ============================================================================
  // Public API
  // ============================================================================
  
  /**
   * Initialize service (call after Scene is ready)
   * Returns Promise to ensure textures are loaded before spawning
   */
  async initialize(): Promise<void> {
    console.log('[INIT] EntitySpawnService.initialize() - loading textures...');
    const textureId = await this.loadTexture('/bunny.png');
    console.log(`✅ Default textures preloaded: /bunny.png → ID ${textureId}`);
    console.log(`📦 Texture cache now has: ${Array.from(this.textureCache.entries()).map(([url, id]) => `${url}→${id}`).join(', ')}`);
  }
  
  /**
   * Spawn entities based on configuration
   */
  spawn(config: SpawnConfig): EntityId[] {
    const count = config.count; // No limit - let renderer handle chunking
    const entities: EntityId[] = [];
    
    // Generate spawn positions
    const positions = this.generatePositions(config, count);
    
    // Create entities and apply base configuration
    for (let i = 0; i < count; i++) {
      const id = this.world.createEntity(positions[i * 2], positions[i * 2 + 1], 0, 0);
      entities.push(id);
    }
    
    // Apply visual appearance
    this.applyVisuals(entities, config);
    
    // Apply size
    this.applySizes(entities, config.size);
    
    // Apply color
    this.applyColors(entities, config.color);
    
    // Apply physics
    if (config.physics) {
      this.applyPhysics(entities, config.physics, positions, config.position.x, config.position.y);
    }
    
    // Apply animation
    if (config.animation && config.animation.type !== 'none') {
      this.applyAnimation(entities, config.animation);
    }
    
    return entities;
  }
  

  
  /**
   * Register with EntitySpawner UI panel
   */
  registerWithSpawner(spawner: any): void {
    if (spawner?.registerSpawnCallback) {
      spawner.registerSpawnCallback((x: number, y: number, config: any) => {
        // Convert UI config to SpawnConfig
        console.log(`[SPAWN] visualType=${config.visualType}, physicsMode=${config.physicsMode}`);
        
        const spawnConfig: SpawnConfig = {
          position: { x, y },
          count: config.count || 100,
          distribution: { type: 'circle', radius: 200 },
          visual: {
            type: config.visualType === 'sprite' ? 'sprite' : 'shape',
            shape: this.mapVisualTypeToShape(config.visualType || 'circle'),
            texture: config.visualType === 'sprite' ? (config.textureUrl || '/bunny.png') : undefined,
          },
          size: { min: 20, max: 40 },
          color: 'palette',
          physics: this.mapPhysicsMode(config.physicsMode || 'none'),
        };
        this.spawn(spawnConfig);
      });
    }
  }
  
  // ============================================================================
  // Position Generation
  // ============================================================================
  
  private generatePositions(config: SpawnConfig, count: number): Float32Array {
    const distribution = config.distribution || { type: 'point' };
    const { x, y } = config.position;
    const buffer = this.computeBuffer;
    
    switch (distribution.type) {
      case 'point':
        // All entities at same point
        for (let i = 0; i < count; i++) {
          buffer[i * 2] = x;
          buffer[i * 2 + 1] = y;
        }
        break;
        
      case 'circle':
        // Random positions within circle
        const radius = distribution.radius || 200;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * radius;
          buffer[i * 2] = x + Math.cos(angle) * dist;
          buffer[i * 2 + 1] = y + Math.sin(angle) * dist;
        }
        break;
        
      case 'grid':
        // Grid layout
        const spacing = distribution.spacing || 50;
        const cols = Math.ceil(Math.sqrt(count));
        for (let i = 0; i < count; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          buffer[i * 2] = x + col * spacing;
          buffer[i * 2 + 1] = y + row * spacing;
        }
        break;
        
      case 'line':
        // Line formation
        const angle = distribution.angle || 0;
        const lineSpacing = distribution.spacing || 50;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        for (let i = 0; i < count; i++) {
          const offset = (i - count / 2) * lineSpacing;
          buffer[i * 2] = x + cos * offset;
          buffer[i * 2 + 1] = y + sin * offset;
        }
        break;
    }
    
    return buffer;
  }
  
  // ============================================================================
  // Visual Appearance
  // ============================================================================
  
  private applyVisuals(entities: EntityId[], config: SpawnConfig): void {
    const { visual } = config;
    
    if (visual.type === 'sprite' && visual.texture) {
      this.applySpriteTexture(entities, visual.texture);
    } else if (visual.type === 'shape' && visual.shape !== undefined) {
      this.applyShape(entities, visual.shape);
    } else if (visual.type === 'text' && visual.text) {
      this.applyText(entities, visual.text);
    }
  }
  
  private applySpriteTexture(entities: EntityId[], textureUrl: string): void {
    const textureId = this.textureCache.get(textureUrl) ?? -1;
    const shapeTypes = this.world.getShapeTypes();
    
    console.log(`[APPLY TEXTURE] url="${textureUrl}", textureId=${textureId}, cached=${this.textureCache.has(textureUrl)}, entities=${entities.length}`);
    
    if (textureId >= 0) {
      for (const id of entities) {
        this.world.setTexture(id, textureId);
        shapeTypes[id] = 0; // SPRITE mode
      }
      console.log(`✅ Applied texture ${textureId} to ${entities.length} entities`);
    } else {
      console.warn(`❌ Texture ${textureUrl} not loaded yet - rendering as squares`);
      // Render as squares until texture loads
      for (const id of entities) {
        shapeTypes[id] = ShapeType.SQUARE;
      }
    }
  }
  
  private applyShape(entities: EntityId[], shapeType: ShapeType): void {
    const shapeTypes = this.world.getShapeTypes();
    const textureIds = this.world.getTextureIds();
    
    for (const id of entities) {
      shapeTypes[id] = shapeType;
      textureIds[id] = 0;  // Clear texture ID for shapes
    }
  }
  
  private applyText(entities: EntityId[], text: string): void {
    const textIndices = this.world.getTextIndices();
    const sizes = this.world.getSizes();
    const sceneTextEntities = this.scene.textEntities;
    
    for (let i = 0; i < entities.length; i++) {
      const id = entities[i];
      const content = text.includes('#') ? text.replace('#', String(i)) : text;
      const textIndex = this.textPool.allocate(content);
      textIndices[id] = textIndex;
      sizes[id] = 0; // Hide sprite quad
      
      if (sceneTextEntities) {
        sceneTextEntities.set(id, {
          text: content,
          style: { font: '24px Arial', color: '#FFFFFF' }
        });
      }
    }
  }
  
  // ============================================================================
  // Size Configuration
  // ============================================================================
  
  private applySizes(entities: EntityId[], sizeConfig: SpawnConfig['size']): void {
    const sizes = this.world.getSizes();
    
    if (typeof sizeConfig === 'number') {
      // Fixed size
      for (const id of entities) {
        sizes[id] = sizeConfig;
      }
    } else if (sizeConfig) {
      // Random range
      const { min, max } = sizeConfig;
      const range = max - min;
      for (const id of entities) {
        sizes[id] = min + Math.random() * range;
      }
    } else {
      // Default size range
      for (const id of entities) {
        sizes[id] = 20 + Math.random() * 20;
      }
    }
  }
  
  // ============================================================================
  // Color Configuration
  // ============================================================================
  
  private applyColors(entities: EntityId[], colorConfig: SpawnConfig['color']): void {
    const colorR = this.world.getColorR();
    const colorG = this.world.getColorG();
    const colorB = this.world.getColorB();
    
    if (!colorConfig || colorConfig === 'palette') {
      // Rainbow palette
      const paletteSize = this.rainbowPalette.length / 3;
      for (let i = 0; i < entities.length; i++) {
        const id = entities[i];
        const idx = (i % paletteSize) * 3;
        colorR[id] = this.rainbowPalette[idx];
        colorG[id] = this.rainbowPalette[idx + 1];
        colorB[id] = this.rainbowPalette[idx + 2];
      }
    } else if (colorConfig === 'random') {
      // Random colors
      for (const id of entities) {
        colorR[id] = Math.random() * 255;
        colorG[id] = Math.random() * 255;
        colorB[id] = Math.random() * 255;
      }
    } else {
      // Fixed color
      const { r, g, b } = colorConfig;
      for (const id of entities) {
        colorR[id] = r;
        colorG[id] = g;
        colorB[id] = b;
      }
    }
  }
  
  // ============================================================================
  // Physics Configuration
  // ============================================================================
  
  private applyPhysics(
    entities: EntityId[],
    physics: NonNullable<SpawnConfig['physics']>,
    positions: Float32Array,
    centerX: number,
    centerY: number
  ): void {
    const velX = this.world.velocities.x;
    const velY = this.world.velocities.y;
    
    // Apply velocity
    if (physics.velocity === 'random') {
      // Random velocity
      const speedConfig = physics.speed || 200;
      const minSpeed = typeof speedConfig === 'number' ? speedConfig * 0.75 : speedConfig.min;
      const maxSpeed = typeof speedConfig === 'number' ? speedConfig * 1.25 : speedConfig.max;
      const speedRange = maxSpeed - minSpeed;
      
      for (const id of entities) {
        const angle = Math.random() * Math.PI * 2;
        const speed = minSpeed + Math.random() * speedRange;
        const angleDeg = Math.floor((angle * 180 / Math.PI)) % 360;
        velX[id] = this.cosLUT[angleDeg] * speed;
        velY[id] = this.sinLUT[angleDeg] * speed;
      }
    } else if (physics.velocity === 'radial') {
      // Radial outward from spawn point
      const speedConfig = physics.speed || 200;
      const minSpeed = typeof speedConfig === 'number' ? speedConfig * 0.75 : speedConfig.min;
      const maxSpeed = typeof speedConfig === 'number' ? speedConfig * 1.25 : speedConfig.max;
      const speedRange = maxSpeed - minSpeed;
      
      for (let i = 0; i < entities.length; i++) {
        const id = entities[i];
        const ex = positions[i * 2];
        const ey = positions[i * 2 + 1];
        const dx = ex - centerX;
        const dy = ey - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = minSpeed + Math.random() * speedRange;
        velX[id] = (dx / dist) * speed;
        velY[id] = (dy / dist) * speed;
      }
    } else if (physics.velocity) {
      // Fixed velocity
      const { x: vx, y: vy } = physics.velocity;
      for (const id of entities) {
        velX[id] = vx;
        velY[id] = vy;
      }
    }
    
    // Apply gravity/collision settings
    console.log(`[PHYSICS] Applying physics: gravity=${physics.gravity}, collision=${physics.collision}, entities=${entities.length}`);
    
    if (physics.gravity) {
      for (const id of entities) {
        this.world.setGravityEnabled(id, true);
      }
    }
    
    if (physics.collision) {
      for (const id of entities) {
        this.world.setCollisionsEnabled(id, true);
      }
    }
  }
  
  // ============================================================================
  // Animation Configuration
  // ============================================================================
  
  private applyAnimation(entities: EntityId[], animation: NonNullable<SpawnConfig['animation']>): void {
    if (animation.type === 'rotate') {
      const rotation = this.world.getRotation();
      const textAnimations = this.scene.textAnimations;
      for (const id of entities) {
        rotation[id] = Math.random() * 360;
        if (textAnimations) {
          textAnimations.set(id, {
            rotationSpeed: (Math.random() - 0.5) * 180,
            pulseSpeed: 1 + Math.random() * 2,
            pulsePhase: Math.random() * Math.PI * 2
          });
        }
      }
    } else if (animation.type === 'tween') {
      // Apply tween animation (simplified)
      const property = animation.property || 'scale';
      const duration = animation.duration || 1000;
      
      // TODO: Implement full tween system
      console.log(`Tween animation on ${property} for ${duration}ms`);
    }
  }
  
  // ============================================================================
  // Texture Management
  // ============================================================================
  
  private async loadTexture(url: string): Promise<number> {
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }
    
    if (!this.textureManager) {
      throw new Error('TextureManager not available - was EntitySpawnService constructed correctly?');
    }
    
    const texture = await this.textureManager.loadTexture(url);
    this.textureCache.set(url, texture.id);
    console.log(`✅ Texture loaded and cached: ${url} → ID ${texture.id}`);
    return texture.id;
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================
  
  private mapVisualTypeToShape(visualType: string): ShapeType {
    const mapping: Record<string, ShapeType> = {
      circle: ShapeType.CIRCLE,
      star5: ShapeType.STAR_5,
      star6: ShapeType.STAR_6,
      triangle: ShapeType.TRIANGLE,
      pentagon: ShapeType.PENTAGON,
      hexagon: ShapeType.HEXAGON,
      square: ShapeType.SQUARE,
      diamond: ShapeType.DIAMOND,
    };
    return mapping[visualType] || ShapeType.CIRCLE;
  }
  
  private mapPhysicsMode(mode: string): SpawnConfig['physics'] {
    // 🐰 BUNNYMARK STANDARD: Use shared velocity configuration
    switch (mode) {
      case 'none':
        return { velocity: 'random', speed: BUNNYMARK_CONFIG.velocity, gravity: false, collision: false };
      case 'gravity':
        return { velocity: 'random', speed: BUNNYMARK_CONFIG.velocity, gravity: true, collision: false };
      case 'collision':
        return { velocity: 'random', speed: BUNNYMARK_CONFIG.velocity, gravity: false, collision: true };
      case 'full':
      default:
        return { velocity: 'random', speed: BUNNYMARK_CONFIG.velocity, gravity: true, collision: true };
    }
  }
}
