/**
 * Graphics - Procedural shape rendering (PixiJS-inspired)
 * 
 * Simple API for creating shapes:
 * const star = Graphics.star(50, 0xFFFF00);
 * star.x = 200;
 * star.y = 200;
 * scene.add(star);
 */

import { DisplayObject } from './DisplayObject';
import { World } from '../core/World';
import { ShapeType } from '../shapes/ShapeType';

export class Graphics extends DisplayObject {
  private _shapeType: ShapeType;
  private _size: number;
  private _fillColor: number;
  
  private constructor(world: World, shapeType: ShapeType, size: number, fillColor: number) {
    const entityId = world.createEntity(0, 0);
    super(world, entityId);
    
    this._shapeType = shapeType;
    this._size = size;
    this._fillColor = fillColor;
    
    // Configure entity for shape rendering
    world.setShapeType(entityId, shapeType);
    world.setSize(entityId, size);
    this.tint = fillColor;
    this.alpha = 1;
  }
  
  // ============================================================================
  // Factory Methods (Static Helpers)
  // ============================================================================
  
  static circle(size: number, fillColor: number, world: World): Graphics {
    return new Graphics(world, ShapeType.CIRCLE, size, fillColor);
  }
  
  static star(size: number, fillColor: number, world: World): Graphics {
    return new Graphics(world, ShapeType.STAR_5, size, fillColor);
  }
  
  static star5(size: number, fillColor: number, world: World): Graphics {
    return new Graphics(world, ShapeType.STAR_5, size, fillColor);
  }
  
  static star6(size: number, fillColor: number, world: World): Graphics {
    return new Graphics(world, ShapeType.STAR_6, size, fillColor);
  }
  
  static triangle(size: number, fillColor: number, world: World): Graphics {
    return new Graphics(world, ShapeType.TRIANGLE, size, fillColor);
  }
  
  static square(size: number, fillColor: number, world: World): Graphics {
    return new Graphics(world, ShapeType.SQUARE, size, fillColor);
  }
  
  static pentagon(size: number, fillColor: number, world: World): Graphics {
    return new Graphics(world, ShapeType.PENTAGON, size, fillColor);
  }
  
  static hexagon(size: number, fillColor: number, world: World): Graphics {
    return new Graphics(world, ShapeType.HEXAGON, size, fillColor);
  }
  
  static octagon(size: number, fillColor: number, world: World): Graphics {
    return new Graphics(world, ShapeType.OCTAGON, size, fillColor);
  }
  
  static diamond(size: number, fillColor: number, world: World): Graphics {
    return new Graphics(world, ShapeType.DIAMOND, size, fillColor);
  }
  
  static heart(size: number, fillColor: number, world: World): Graphics {
    return new Graphics(world, ShapeType.HEART, size, fillColor);
  }
  
  // ============================================================================
  // Properties
  // ============================================================================
  
  get shape(): ShapeType {
    return this._shapeType;
  }
  
  set shape(value: ShapeType) {
    this._shapeType = value;
    this._world.setShapeType(this._entityId, value);
  }
  
  get size(): number {
    return this._size;
  }
  
  set size(value: number) {
    this._size = value;
    this._world.setSize(this._entityId, value);
  }
  
  get fillColor(): number {
    return this._fillColor;
  }
  
  set fillColor(value: number) {
    this._fillColor = value;
    this.tint = value;
  }
}
