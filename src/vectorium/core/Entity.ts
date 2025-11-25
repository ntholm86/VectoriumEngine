/**
 * Entity interface and types
 * Base contract for all game entities
 */

import { WebGLBatchRenderer } from '../rendering/WebGLBatchRenderer';

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
  render(renderer: WebGLBatchRenderer): void;
  destroy(): void;
}
