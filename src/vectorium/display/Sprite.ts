/**
 * Sprite - Textured display object (PixiJS-inspired)
 * 
 * Simple API for creating textured sprites:
 * const bunny = Sprite.from('/bunny.png');
 * bunny.x = 100;
 * bunny.y = 100;
 * scene.add(bunny);
 */

import { DisplayObject } from './DisplayObject';
import { World } from '../core/World';

export class Sprite extends DisplayObject {
  private _textureUrl: string = '';
  private _width: number = 64;
  private _height: number = 64;
  
  private constructor(world: World, textureUrl: string) {
    const entityId = world.createEntity(0, 0);
    super(world, entityId);
    this._textureUrl = textureUrl;
    
    // Default: white tint, full alpha
    this.tint = 0xFFFFFF;
    this.alpha = 1;
  }
  
  // ============================================================================
  // Factory Methods (PixiJS-style)
  // ============================================================================
  
  /**
   * Create sprite from texture URL
   * Texture is loaded asynchronously by TextureManager
   */
  static from(textureUrl: string, world: World): Sprite {
    return new Sprite(world, textureUrl);
  }
  
  /**
   * Create sprite from texture atlas frame
   */
  static fromAtlas(textureUrl: string, frameName: string, world: World): Sprite {
    const sprite = new Sprite(world, textureUrl);
    sprite._setAtlasFrame(frameName);
    return sprite;
  }
  
  // ============================================================================
  // Sprite Properties
  // ============================================================================
  
  get width(): number {
    return this._width;
  }
  
  set width(value: number) {
    this._width = value;
    this.scale = value; // Use scale for now (size in world)
  }
  
  get height(): number {
    return this._height;
  }
  
  set height(value: number) {
    this._height = value;
    this.scale = value; // Use scale for now
  }
  
  get texture(): string {
    return this._textureUrl;
  }
  
  // ============================================================================
  // Internal Methods
  // ============================================================================
  
  /**
   * Set texture ID (called by Scene after texture loads)
   */
  _setTextureId(textureId: number): void {
    this._world.setTexture(this._entityId, textureId);
  }
  
  /**
   * Set atlas frame UVs
   */
  private _setAtlasFrame(_frameName: string): void {
    // TODO: Implement atlas frame lookup
    console.warn('Atlas frames not yet implemented');
  }
  
  /**
   * Get texture URL for loading
   */
  _getTextureUrl(): string {
    return this._textureUrl;
  }
}
