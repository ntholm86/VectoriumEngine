/**
 * Example Scene Behaviors
 * 
 * Reusable behavior implementations demonstrating the pattern.
 */

import type { Scene } from '../core/Scene';
import type { SceneBehavior } from './SceneBehavior';
import type { EntityId } from '../core/World';

/**
 * Camera Follow Behavior
 * Makes camera smoothly follow an entity
 */
export class CameraFollowBehavior implements SceneBehavior {
  readonly name = 'CameraFollow';
  private targetEntityId: EntityId;
  private lerp: number;
  private offsetX: number;
  private offsetY: number;
  
  constructor(targetEntityId: EntityId, options: { lerp?: number; offsetX?: number; offsetY?: number } = {}) {
    this.targetEntityId = targetEntityId;
    this.lerp = options.lerp ?? 0.1;
    this.offsetX = options.offsetX ?? 0;
    this.offsetY = options.offsetY ?? 0;
  }
  
  onUpdate(scene: Scene, _dt: number): void {
    const world = scene.world;
    const camera = (scene as any).camera;
    
    if (!camera) return;
    
    // Get target entity position
    const x = world.getX()[this.targetEntityId];
    const y = world.getY()[this.targetEntityId];
    
    if (x !== undefined && y !== undefined) {
      const targetX = x + this.offsetX;
      const targetY = y + this.offsetY;
      
      // Smooth follow
      camera.x += (targetX - camera.x) * this.lerp;
      camera.y += (targetY - camera.y) * this.lerp;
    }
  }
}

/**
 * Parallax Background Behavior
 * Creates parallax scrolling effect with multiple layers
 */
export class ParallaxBackgroundBehavior implements SceneBehavior {
  readonly name = 'ParallaxBackground';
  private layers: Array<{ entityIds: EntityId[]; speed: number }> = [];
  
  addLayer(entityIds: EntityId[], speed: number): void {
    this.layers.push({ entityIds, speed });
  }
  
  onUpdate(scene: Scene, _dt: number): void {
    const world = scene.world;
    const camera = (scene as any).camera;
    
    if (!camera) return;
    
    const cameraX = camera.x;
    const cameraY = camera.y;
    
    const xs = world.getX();
    const ys = world.getY();
    
    for (const layer of this.layers) {
      const parallaxX = cameraX * layer.speed;
      const parallaxY = cameraY * layer.speed;
      
      for (const entityId of layer.entityIds) {
        // Apply parallax offset
        xs[entityId] = parallaxX;
        ys[entityId] = parallaxY;
      }
    }
  }
}

/**
 * FPS Display Behavior
 * Shows FPS counter in top-left corner
 */
export class FPSDisplayBehavior implements SceneBehavior {
  readonly name = 'FPSDisplay';
  private fpsElement: HTMLDivElement | null = null;
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  
  onAttach(_scene: Scene): void {
    // Create FPS display element
    this.fpsElement = document.createElement('div');
    this.fpsElement.style.position = 'fixed';
    this.fpsElement.style.top = '10px';
    this.fpsElement.style.left = '10px';
    this.fpsElement.style.color = '#00ff00';
    this.fpsElement.style.fontFamily = 'monospace';
    this.fpsElement.style.fontSize = '16px';
    this.fpsElement.style.zIndex = '10000';
    this.fpsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.fpsElement.style.padding = '5px 10px';
    this.fpsElement.style.borderRadius = '4px';
    document.body.appendChild(this.fpsElement);
  }
  
  onDetach(_scene: Scene): void {
    if (this.fpsElement) {
      this.fpsElement.remove();
      this.fpsElement = null;
    }
  }
  
  onUpdate(_scene: Scene, _dt: number): void {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastTime;
    
    // Update FPS every 500ms
    if (elapsed >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastTime = now;
      
      if (this.fpsElement) {
        this.fpsElement.textContent = `FPS: ${this.fps}`;
        
        // Color code based on FPS
        if (this.fps >= 55) {
          this.fpsElement.style.color = '#00ff00';
        } else if (this.fps >= 30) {
          this.fpsElement.style.color = '#ffff00';
        } else {
          this.fpsElement.style.color = '#ff0000';
        }
      }
    }
  }
}

/**
 * Auto-Spawn Behavior
 * Automatically spawns entities at intervals
 */
export class AutoSpawnBehavior implements SceneBehavior {
  readonly name = 'AutoSpawn';
  private interval: number;
  private spawnFunction: (scene: Scene) => void;
  private elapsed = 0;
  private enabled = true;
  
  constructor(interval: number, spawnFunction: (scene: Scene) => void) {
    this.interval = interval;
    this.spawnFunction = spawnFunction;
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  onUpdate(scene: Scene, dt: number): void {
    if (!this.enabled) return;
    
    this.elapsed += dt;
    
    while (this.elapsed >= this.interval) {
      this.elapsed -= this.interval;
      try {
        this.spawnFunction(scene);
      } catch (error) {
        console.error('AutoSpawnBehavior: Error in spawn function:', error);
      }
    }
  }
}

/**
 * Scene Bounds Behavior
 * Enforces entity bounds within scene limits
 */
export class SceneBoundsBehavior implements SceneBehavior {
  readonly name = 'SceneBounds';
  private minX: number;
  private maxX: number;
  private minY: number;
  private maxY: number;
  private destroyOutOfBounds: boolean;
  
  constructor(bounds: { minX: number; maxX: number; minY: number; maxY: number }, destroyOutOfBounds = false) {
    this.minX = bounds.minX;
    this.maxX = bounds.maxX;
    this.minY = bounds.minY;
    this.maxY = bounds.maxY;
    this.destroyOutOfBounds = destroyOutOfBounds;
  }
  
  onLateUpdate(scene: Scene, _dt: number): void {
    const world = scene.world;
    const xs = world.getX();
    const ys = world.getY();
    const flags = world.getFlags();
    const activeFlag = world.FLAG_ACTIVE;
    
    for (let i = 0; i < world.getTotalCount(); i++) {
      if (!(flags[i] & activeFlag)) continue;
      
      const x = xs[i];
      const y = ys[i];
      
      // Check bounds
      if (x < this.minX || x > this.maxX || y < this.minY || y > this.maxY) {
        if (this.destroyOutOfBounds) {
          flags[i] &= ~activeFlag; // Deactivate entity
        } else {
          // Clamp to bounds
          xs[i] = Math.max(this.minX, Math.min(this.maxX, x));
          ys[i] = Math.max(this.minY, Math.min(this.maxY, y));
        }
      }
    }
  }
}
