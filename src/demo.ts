/**
 * Vectorium Engine - Interactive Demo
 */

import { Vectorium, Scene } from './vectorium/core/Engine';
import { EntityBurstFactories } from './vectorium/entities/factories';

class DemoScene extends Scene {
  async load(): Promise<void> {
    this.setWorldBoundsMultiplier(1.0);
    // Spawn initial entities using factory functions
    this.spawnBurst(EntityBurstFactories.bouncing, 
      this.worldWidth / 2, 
      this.worldHeight / 2, 
      10, 
      { rainbow: false }
    );
  }
}

function initDemo() {
  // Create canvas with default styling (one line!)
  const canvas = Vectorium.createFullscreenCanvas();
  
  // Create engine
  const engine = new Vectorium({ canvas, enableDebugTools: true });
  const scene = new DemoScene('demo', 2000000);
  engine.registerScene('demo', scene);
  
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
    
    // 🚀 Spawn burst using pure ECS factory functions (zero OOP overhead!)
    switch (entityType) {
      case 'bouncing':
        scene.spawnBurst(EntityBurstFactories.bouncing, x, y, count, { rainbow: true });
        break;
      case 'gravity':
        scene.spawnBurst(EntityBurstFactories.physics, x, y, count, { 
          rainbow: true,
          minSpeed: 200,
          maxSpeed: 500,
          minSize: 8,
          maxSize: 16
        });
        break;
      case 'collision':
        scene.spawnBurst(EntityBurstFactories.collision, x, y, count, { rainbow: true });
        break;
      case 'full':
        scene.spawnBurst(EntityBurstFactories.fullPhysics, x, y, count, { 
          rainbow: true, 
          minSpeed: 50, 
          maxSpeed: 200 
        });
        break;
    }
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
