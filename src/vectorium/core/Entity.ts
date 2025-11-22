/**
 * Entity interface and types
 * Base contract for all game entities
 */

import { WebGLBatchRenderer } from '../rendering/WebGLBatchRenderer';
import { TextRenderer } from '../rendering/TextRenderer';

export type EntityId = number;

export interface EntityFlags {
  ACTIVE: number;
  VISIBLE: number;
  PHYSICS: number;
  COLLIDABLE: number;
  ROTATING: number;
}

export interface Entity {
  x: number;
  y: number;
  update(dt: number): void;
  render(renderer: WebGLBatchRenderer, textRenderer: TextRenderer): void;
  destroy(): void;
}

/**
 * BouncingEntity - Simple entity with physics and animations
 * Used for demos and testing
 */
export class BouncingEntity implements Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  color: { r: number; g: number; b: number };
  animationType: 'rotate' | 'pulse' | 'wobble' | 'spin' | 'fade';
  
  // Physics properties
  mass: number = 1;
  restitution: number = 1; // Bounciness (0-1)
  enableGravity: boolean = false;
  enableCollisions: boolean = false;
  
  constructor(options: {
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    size?: number;
    color?: { r: number; g: number; b: number };
    rotation?: number;
    rotationSpeed?: number;
    alpha?: number;
    animationType?: 'rotate' | 'pulse' | 'wobble' | 'spin' | 'fade';
  } = {}) {
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.vx = options.vx ?? 0;
    this.vy = options.vy ?? 0;
    this.size = options.size ?? 8;
    this.rotation = options.rotation ?? Math.random() * 360;
    this.rotationSpeed = options.rotationSpeed ?? (Math.random() - 0.5) * 360;
    this.alpha = options.alpha ?? (0.8 + Math.random() * 0.2);
    this.color = options.color ?? { r: Math.random(), g: Math.random(), b: Math.random() };
    this.animationType = options.animationType ?? (['rotate', 'pulse', 'wobble', 'spin', 'fade'][Math.floor(Math.random() * 5)] as any);
  }
  
  /**
   * Set velocity from angle and speed
   */
  setVelocityAngle(angle: number, speed: number): this {
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    return this;
  }
  
  /**
   * Set random velocity with given speed range
   */
  setRandomVelocity(minSpeed: number = 100, maxSpeed: number = 300): this {
    const angle = Math.random() * Math.PI * 2;
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    return this.setVelocityAngle(angle, speed);
  }
  
  /**
   * Set velocity to radiate from a point (explosion effect)
   */
  setRadialVelocity(centerX: number, centerY: number, speed: number): this {
    const angle = Math.atan2(this.y - centerY, this.x - centerX);
    return this.setVelocityAngle(angle, speed);
  }
  
  /**
   * Create entity with burst velocity and rainbow color based on index
   * Syntactic sugar for common burst pattern
   */
  static createBurstEntity(
    x: number, 
    y: number, 
    index: number, 
    totalCount: number, 
    options: {
      size?: number;
      sizeRange?: [number, number]; // [min, max] - random size in range
      speedRange?: [number, number]; // [min, max]
      rainbow?: boolean;
      color?: { r: number; g: number; b: number };
    } = {}
  ): BouncingEntity {
    const angle = (index / totalCount) * Math.PI * 2;
    const [minSpeed, maxSpeed] = options.speedRange ?? [200, 500];
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    
    // Calculate size: either fixed or random in range
    let size: number;
    if (options.size !== undefined) {
      size = options.size;
    } else if (options.sizeRange) {
      const [minSize, maxSize] = options.sizeRange;
      size = minSize + Math.random() * (maxSize - minSize);
    } else {
      size = 8; // default
    }
    
    let color: { r: number; g: number; b: number };
    if (options.rainbow) {
      const h = (index / totalCount) * 360;
      const s = 1, l = 0.5;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = l - c / 2;
      let r = 0, g = 0, b = 0;
      if (h < 60) { r = c; g = x; }
      else if (h < 120) { r = x; g = c; }
      else if (h < 180) { g = c; b = x; }
      else if (h < 240) { g = x; b = c; }
      else if (h < 300) { r = x; b = c; }
      else { r = c; b = x; }
      color = { r: r + m, g: g + m, b: b + m };
    } else {
      color = options.color ?? { r: Math.random(), g: Math.random(), b: Math.random() };
    }
    
    const entity = new BouncingEntity({ x, y, size, color });
    entity.setVelocityAngle(angle, speed);
    return entity;
  }
  
  /**
   * Create entity at position with random velocity
   */
  static createAt(x: number, y: number, options: {
    size?: number;
    minSpeed?: number;
    maxSpeed?: number;
    color?: { r: number; g: number; b: number };
  } = {}): BouncingEntity {
    const entity = new BouncingEntity({ x, y, size: options.size, color: options.color });
    entity.setRandomVelocity(options.minSpeed ?? 100, options.maxSpeed ?? 300);
    return entity;
  }
  
  /**
   * Create multiple entities in a radial burst pattern
   */
  static createBurst(x: number, y: number, count: number, options: {
    size?: number;
    minSpeed?: number;
    maxSpeed?: number;
    rainbow?: boolean;
  } = {}): BouncingEntity[] {
    const entities: BouncingEntity[] = [];
    const minSpeed = options.minSpeed ?? 200;
    const maxSpeed = options.maxSpeed ?? 500;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      
      let color: { r: number; g: number; b: number };
      if (options.rainbow) {
        // Import hslToRgb inline to avoid circular dependency
        const h = (i / count) * 360;
        const s = 1, l = 0.5;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else { r = c; b = x; }
        color = { r: r + m, g: g + m, b: b + m };
      } else {
        color = { r: Math.random(), g: Math.random(), b: Math.random() };
      }
      
      const entity = new BouncingEntity({ 
        x, 
        y, 
        size: options.size ?? (6 + Math.random() * 8),
        color 
      });
      entity.setVelocityAngle(angle, speed);
      entities.push(entity);
    }
    
    return entities;
  }
  
  update(_dt: number): void {}
  render(_renderer: WebGLBatchRenderer, _textRenderer: TextRenderer): void {}
  destroy(): void {}
}

/**
 * PhysicsEntity - Entity with gravity
 */
export class PhysicsEntity extends BouncingEntity {
  constructor(options: ConstructorParameters<typeof BouncingEntity>[0] = {}) {
    super(options);
    this.enableGravity = true;
    this.restitution = 0.8; // 80% energy retained on bounce
  }
  
  /**
   * Create entity with burst velocity and rainbow color based on index
   */
  static createBurstEntity(
    x: number, 
    y: number, 
    index: number, 
    totalCount: number, 
    options: Parameters<typeof BouncingEntity.createBurstEntity>[4] = {}
  ): PhysicsEntity {
    const baseEntity = BouncingEntity.createBurstEntity(x, y, index, totalCount, options);
    const entity = new PhysicsEntity({ 
      x: baseEntity.x, 
      y: baseEntity.y, 
      size: baseEntity.size, 
      color: baseEntity.color 
    });
    entity.vx = baseEntity.vx;
    entity.vy = baseEntity.vy;
    return entity;
  }
  
  static createAt(x: number, y: number, options: Parameters<typeof BouncingEntity.createAt>[2] = {}): PhysicsEntity {
    const entity = new PhysicsEntity({ x, y, size: options.size, color: options.color });
    entity.setRandomVelocity(options.minSpeed ?? 100, options.maxSpeed ?? 300);
    return entity;
  }
}

/**
 * CollisionEntity - Entity with entity-to-entity collisions
 */
export class CollisionEntity extends BouncingEntity {
  constructor(options: ConstructorParameters<typeof BouncingEntity>[0] = {}) {
    super(options);
    this.enableCollisions = true;
    this.restitution = 0.3; // Realistic collision (30% energy retained, 70% lost)
  }
  
  static createAt(x: number, y: number, options: Parameters<typeof BouncingEntity.createAt>[2] = {}): CollisionEntity {
    const entity = new CollisionEntity({ x, y, size: options.size, color: options.color });
    entity.setRandomVelocity(options.minSpeed ?? 100, options.maxSpeed ?? 300);
    return entity;
  }
  
  static createBurst(x: number, y: number, count: number, options: Parameters<typeof BouncingEntity.createBurst>[3] = {}): CollisionEntity[] {
    const entities: CollisionEntity[] = [];
    const minSpeed = options.minSpeed ?? 200;
    const maxSpeed = options.maxSpeed ?? 500;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      
      let color: { r: number; g: number; b: number };
      if (options.rainbow) {
        const h = (i / count) * 360;
        const s = 1, l = 0.5;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else { r = c; b = x; }
        color = { r: r + m, g: g + m, b: b + m };
      } else {
        color = { r: Math.random(), g: Math.random(), b: Math.random() };
      }
      
      const entity = new CollisionEntity({ 
        x, 
        y, 
        size: options.size ?? (6 + Math.random() * 8),
        color 
      });
      entity.setVelocityAngle(angle, speed);
      entities.push(entity);
    }
    
    return entities;
  }
}

/**
 * GravityCollisionEntity - Entity with both gravity AND collisions
 */
export class GravityCollisionEntity extends BouncingEntity {
  constructor(options: ConstructorParameters<typeof BouncingEntity>[0] = {}) {
    super(options);
    this.enableGravity = true;
    this.enableCollisions = true;
    this.restitution = 0.3; // 30% energy retained (more realistic)
    this.mass = 1 + Math.random() * 2; // Variable mass (1-3)
  }
  
  static createAt(x: number, y: number, options: Parameters<typeof BouncingEntity.createAt>[2] = {}): GravityCollisionEntity {
    const entity = new GravityCollisionEntity({ x, y, size: options.size, color: options.color });
    if (options.minSpeed !== undefined || options.maxSpeed !== undefined) {
      entity.setRandomVelocity(options.minSpeed ?? 100, options.maxSpeed ?? 300);
    }
    return entity;
  }
  
  static createBurst(x: number, y: number, count: number, options: Parameters<typeof BouncingEntity.createBurst>[3] = {}): GravityCollisionEntity[] {
    const entities: GravityCollisionEntity[] = [];
    const minSpeed = options.minSpeed ?? 50;
    const maxSpeed = options.maxSpeed ?? 200;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      
      let color: { r: number; g: number; b: number };
      if (options.rainbow) {
        const h = (i / count) * 360;
        const s = 1, l = 0.5;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else { r = c; b = x; }
        color = { r: r + m, g: g + m, b: b + m };
      } else {
        color = { r: Math.random(), g: Math.random(), b: Math.random() };
      }
      
      const entity = new GravityCollisionEntity({ 
        x, 
        y, 
        size: options.size ?? (8 + Math.random() * 12), // Slightly larger
        color 
      });
      entity.setVelocityAngle(angle, speed);
      entities.push(entity);
    }
    
    return entities;
  }
}
