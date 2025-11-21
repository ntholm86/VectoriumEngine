/**
 * Vectorium Engine - Interactive Demo
 */

import { Vectorium, Scene } from './vectorium/core/Engine';
import { BouncingEntity } from './vectorium/core/Entity';

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
    const count = engine.getEntitySpawner()?.getClickSpawnCount() ?? 100;
    
    // Conditional shake based on spawn count
    engine.getCamera()?.shakeIf(count, [
      { min: 100000, intensity: 20, duration: 500 },
      { min: 10000, intensity: 10, duration: 300 }
    ]);
    
    // Spawn burst and add all at once
    const entities = BouncingEntity.createBurst(x, y, count, { rainbow: true });
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
