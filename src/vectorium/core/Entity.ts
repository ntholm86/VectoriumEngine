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
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  size = 8;
  rotation = 0;
  rotationSpeed = 0;
  alpha = 1.0;
  color = { r: 1, g: 1, b: 1 };
  animationType: 'rotate' | 'pulse' | 'wobble' | 'spin' | 'fade' = 'rotate';
  
  spawn(x: number, y: number, vx: number, vy: number, size: number, color: { r: number; g: number; b: number }): void {
    Object.assign(this, { x, y, vx, vy, size, color });
    this.rotation = Math.floor(Math.random() * 360);
    this.rotationSpeed = Math.floor((Math.random() - 0.5) * 360);
    this.alpha = 0.8 + Math.random() * 0.2;
    this.animationType = ['rotate', 'pulse', 'wobble', 'spin', 'fade'][Math.floor(Math.random() * 5)] as any;
  }
  
  update(_dt: number): void {}
  render(_renderer: WebGLBatchRenderer, _textRenderer: TextRenderer): void {}
  destroy(): void {}
}
