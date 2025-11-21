/**
 * Vectorium Engine - Interactive Demo
 */

import { Vectorium, Scene } from './vectorium/core/Engine';
import { BouncingEntity, PhysicsEntity, CollisionEntity, GravityCollisionEntity } from './vectorium/core/Entity';
import { hslToRgb } from './vectorium/utils/ColorUtils';

class DemoScene extends Scene {
  async load(): Promise<void> {
    this.setWorldBoundsMultiplier(1.0);
    this.spawnRandom(BouncingEntity, 10);
  }
}

function initDemo() {
  // Create canvas with default styling (one line!)
  const canvas = Vectorium.createFullscreenCanvas();
  
  // Create engine
  const engine = new Vectorium({ canvas, enableDebugTools: true });
  const scene = new DemoScene('demo', 2000000);
  engine.registerScene('demo', scene);
  
  // Pause/resume with spacebar
  engine.onKey('Space', () => engine.togglePause());
  
  // Click to spawn entities with automatic camera shake
  engine.onClick((x, y) => {
    const spawner = engine.getEntitySpawner();
    const count = spawner?.getClickSpawnCount() ?? 100;
    const entityType = spawner?.getEntityType() ?? 'bouncing';
    
    // Conditional shake based on spawn count
    engine.getCamera()?.shakeIf(count, [
      { min: 100000, intensity: 20, duration: 500 },
      { min: 10000, intensity: 10, duration: 300 }
    ]);
    
    // Spawn burst based on selected entity type
    let entities;
    switch (entityType) {
      case 'bouncing':
        entities = BouncingEntity.createBurst(x, y, count, { rainbow: true });
        break;
      case 'gravity':
        entities = Array.from({ length: count }, (_, i) => {
          const angle = (i / count) * Math.PI * 2;
          const speed = 200 + Math.random() * 300;
          const hue = (i / count) * 360;
          const color = hslToRgb(hue, 1, 0.5);
          const entity = new PhysicsEntity({ x, y, size: 8 + Math.random() * 8, color });
          entity.setVelocityAngle(angle, speed);
          return entity;
        });
        break;
      case 'collision':
        entities = CollisionEntity.createBurst(x, y, count, { rainbow: true });
        break;
      case 'full':
        entities = GravityCollisionEntity.createBurst(x, y, count, { rainbow: true, minSpeed: 50, maxSpeed: 200 });
        break;
    }
    
    scene.addBatch(entities);
  });
  
  // Start engine
  engine.loadScene('demo').then(() => engine.start());
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}
