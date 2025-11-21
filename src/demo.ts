/**
 * Vectorium Engine - Interactive Demo
 */

import { Vectorium, Scene } from './vectorium/core/Engine';
import { BouncingEntity } from './vectorium/core/Entity';
import { hslToRgb } from './vectorium/utils/ColorUtils';

class DemoScene extends Scene {
  private entityCount = 0;
  
  async load(): Promise<void> {
    this.setWorldBoundsMultiplier(1.0);
    this.addEntities(10);
  }
  
  addEntities(count: number, inViewportOnly = true): void {
    const [spawnWidth, spawnHeight] = inViewportOnly 
      ? [this.getWorldWidth(), this.getWorldHeight()]
      : [this.getWorldWidth() * 10, this.getWorldHeight() * 10];
    
    for (let i = 0; i < count; i++) {
      const entity = new BouncingEntity();
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      entity.spawn(
        Math.random() * spawnWidth,
        Math.random() * spawnHeight,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        4 + Math.random() * 12,
        { r: Math.random(), g: Math.random(), b: Math.random() }
      );
      this.addEntity(entity);
      this.entityCount++;
    }
  }
  
  removeEntities(count: number): void {
    const toRemove = Math.min(count, this.entities.length);
    for (let i = 0; i < toRemove; i++) {
      const entity = this.entities[this.entities.length - 1];
      if (entity) {
        this.removeEntity(entity);
        this.entityCount--;
      }
    }
  }
  
  clearEntities(): void { this.clear(); this.entityCount = 0; }
  getEntityCount(): number { return this.entityCount; }
}

function initDemo() {
  // Setup DOM
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
  
  const container = document.createElement('div');
  container.style.cssText = 'display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#1a1a2e 0%,#0f0f1e 100%)';
  
  const canvasWrapper = document.createElement('div');
  canvasWrapper.style.cssText = 'width:auto;height:auto;position:relative';
  
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;border:3px solid #00FF00;box-shadow:0 0 30px rgba(0,255,0,0.5),0 0 60px rgba(0,255,0,0.3);border-radius:4px';
  
  canvasWrapper.appendChild(canvas);
  container.appendChild(canvasWrapper);
  document.body.appendChild(container);
  
  // Create engine with debug tools enabled
  const engine = new Vectorium({ 
    canvas, 
    enableDebugTools: true 
  });
  
  const scene = new DemoScene('demo', 2000000);
  engine.registerScene('demo', scene);
  
  let paused = false;
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      paused ? engine.start() : engine.stop();
      paused = !paused;
    }
  });
  
  // Click spawner
  canvas.addEventListener('click', (e) => {
    const world = engine.getWorldCoordinates(e.clientX, e.clientY);
    if (!world) return;
    
    const camera = engine.getCamera();
    const entitySpawner = engine.getEntitySpawner();
    const count = entitySpawner ? entitySpawner.getClickSpawnCount() : 100;
    
    if (camera) {
      if (count >= 100000) camera.startShake(20, 500);
      else if (count >= 10000) camera.startShake(10, 300);
    }
    
    for (let i = 0; i < count; i++) {
      const entity = new BouncingEntity();
      const angle = (i / count) * Math.PI * 2;
      const speed = 200 + Math.random() * 300;
      entity.spawn(world.x, world.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 6 + Math.random() * 8, hslToRgb((i / count) * 360, 1, 0.5));
      scene.addEntity(entity);
    }
  });
  
  // Start
  engine.loadScene('demo').then(() => {
    engine.start();
  });
}

// Initialize demo when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}
