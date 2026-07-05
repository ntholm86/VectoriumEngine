/**
 * DisplayObject - Base class for all renderable objects (PixiJS-inspired)
 * 
 * Design: Thin wrapper over ECS entity ID
 * - Properties map to World array indices
 * - Familiar OOP API (sprite.x = 100)
 * - Zero overhead (just getters/setters)
 */

import { EntityId, World } from '../core/World';

export class DisplayObject {
  protected _entityId: EntityId;
  protected _world: World;
  protected _destroyed: boolean = false;
  
  constructor(world: World, entityId: EntityId) {
    this._world = world;
    this._entityId = entityId;
  }
  
  // ============================================================================
  // Transform Properties
  // ============================================================================
  
  get x(): number {
    return this._world.getPositionX()[this._entityId];
  }
  
  set x(value: number) {
    this._world.getPositionX()[this._entityId] = value;
  }
  
  get y(): number {
    return this._world.getPositionY()[this._entityId];
  }
  
  set y(value: number) {
    this._world.getPositionY()[this._entityId] = value;
  }
  
  get rotation(): number {
    return this._world.getRotation()[this._entityId];
  }
  
  set rotation(value: number) {
    this._world.getRotation()[this._entityId] = World.normalizeRotation(value);
  }
  
  get scale(): number {
    return this._world.getSizes()[this._entityId];
  }
  
  set scale(value: number) {
    this._world.getSizes()[this._entityId] = value;
  }
  
  get alpha(): number {
    return this._world.getAlpha()[this._entityId];
  }
  
  set alpha(value: number) {
    this._world.getAlpha()[this._entityId] = value;
  }
  
  get visible(): boolean {
    return this._world.getAlpha()[this._entityId] > 0;
  }
  
  set visible(value: boolean) {
    this._world.getAlpha()[this._entityId] = value ? 1 : 0;
  }
  
  // ============================================================================
  // Visual Properties
  // ============================================================================
  
  get tint(): number {
    const r = this._world.getColorR()[this._entityId];
    const g = this._world.getColorG()[this._entityId];
    const b = this._world.getColorB()[this._entityId];
    return (r << 16) | (g << 8) | b;
  }
  
  set tint(value: number) {
    const r = (value >> 16) & 0xFF;
    const g = (value >> 8) & 0xFF;
    const b = value & 0xFF;
    this._world.getColorR()[this._entityId] = r;
    this._world.getColorG()[this._entityId] = g;
    this._world.getColorB()[this._entityId] = b;
  }
  
  // ============================================================================
  // Physics Properties
  // ============================================================================
  
  get vx(): number {
    return this._world.getVelocityX()[this._entityId];
  }
  
  set vx(value: number) {
    this._world.getVelocityX()[this._entityId] = value;
  }
  
  get vy(): number {
    return this._world.getVelocityY()[this._entityId];
  }
  
  set vy(value: number) {
    this._world.getVelocityY()[this._entityId] = value;
  }
  
  get physics(): boolean {
    // Check if physics is enabled (velocity updates)
    return this._world.getVelocityX()[this._entityId] !== 0 || this._world.getVelocityY()[this._entityId] !== 0;
  }
  
  set physics(value: boolean) {
    this._world.setPhysicsEnabled(this._entityId, value);
  }
  
  get bounce(): boolean {
    return this._world.getRestitution()[this._entityId] > 0;
  }
  
  set bounce(value: boolean) {
    // Use standard Bunnymark restitution (0.8 = 80% bounce)
    this._world.setRestitution(this._entityId, value ? 0.8 : 0);
  }
  
  get gravity(): boolean {
    // Check enable gravity flag
    const flags = this._world.getEnableGravity();
    return flags[this._entityId] === 1;
  }
  
  set gravity(value: boolean) {
    this._world.setGravityEnabled(this._entityId, value);
  }
  
  // ============================================================================
  // Internal API
  // ============================================================================
  
  get entityId(): EntityId {
    return this._entityId;
  }
  
  get destroyed(): boolean {
    return this._destroyed;
  }
  
  // ============================================================================
  // Lifecycle
  // ============================================================================
  
  destroy(): void {
    if (this._destroyed) return;
    this._world.destroyEntity(this._entityId);
    this._destroyed = true;
  }
}
