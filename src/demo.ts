/**
 * Vectorium Engine - Interactive Demo
 */

import { Vectorium, Scene } from './vectorium/core/Engine';
import { EntityBurstFactories } from './vectorium/entities/factories';
import { 
  createCircleEntity,
  createStar5Entity,
  createTriangleEntity,
  createHexagonEntity,
  createHeartEntity,
  createSquareEntity,
  createDiamondEntity
} from './vectorium/entities/factories';

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
    const physicsMode = spawner?.getPhysicsMode() ?? 'none';
    const visualType = spawner?.getVisualType() ?? 'sprite';
    
    // Conditional shake based on spawn count
    engine.getCamera()?.shakeIf(count, [
      { min: 100000, intensity: 20, duration: 500 },
      { min: 10000, intensity: 10, duration: 300 }
    ]);
    
    // 🚀 Spawn entities with independent physics and visual settings
    spawnWithPhysicsAndVisual(scene, x, y, count, physicsMode, visualType);
  });
  
  // Start engine
  engine.loadScene('demo').then(() => engine.start());
}

/**
 * Unified spawn function: Physics Mode + Visual Type
 * Separates physics behavior from visual rendering
 */
function spawnWithPhysicsAndVisual(
  scene: DemoScene,
  x: number,
  y: number,
  count: number,
  physicsMode: 'none' | 'gravity' | 'collision' | 'full',
  visualType: 'sprite' | 'circle' | 'star5' | 'triangle' | 'hexagon' | 'heart' | 'square' | 'diamond'
): void {
  const colors = [
    { r: 1, g: 0.2, b: 0.2 },   // Red
    { r: 1, g: 0.6, b: 0.2 },   // Orange
    { r: 1, g: 1, b: 0.2 },     // Yellow
    { r: 0.2, g: 1, b: 0.2 },   // Green
    { r: 0.2, g: 0.6, b: 1 },   // Blue
    { r: 0.6, g: 0.2, b: 1 },   // Purple
    { r: 1, g: 0.2, b: 0.6 },   // Pink
  ];
  
  // Map visual type to shape factory
  const shapeFactories: Record<string, typeof createCircleEntity | null> = {
    sprite: null,
    circle: createCircleEntity,
    star5: createStar5Entity,
    triangle: createTriangleEntity,
    hexagon: createHexagonEntity,
    heart: createHeartEntity,
    square: createSquareEntity,
    diamond: createDiamondEntity,
  };
  
  const shapeFactory = shapeFactories[visualType];
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 150 + Math.random() * 250;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const size = 12 + Math.random() * 24;
    
    // Rainbow color
    const color = colors[i % colors.length];
    
    // Create entity (with or without shape)
    let id: number;
    if (shapeFactory) {
      // Use shape factory (creates entity with shape type)
      id = shapeFactory(scene.world, x, y, { 
        size, 
        color,
        vx,
        vy
      });
    } else {
      // Default sprite entity
      id = scene.world.createEntity(x, y, vx, vy);
      const sizes = scene.world.getSizes();
      sizes[id] = size;
    }
    
    // Apply color
    const colorR = scene.world.getColorR();
    const colorG = scene.world.getColorG();
    const colorB = scene.world.getColorB();
    colorR[id] = Math.floor(color.r * 255);
    colorG[id] = Math.floor(color.g * 255);
    colorB[id] = Math.floor(color.b * 255);
    
    // Apply physics based on mode
    switch (physicsMode) {
      case 'none':
        // No physics (just bouncing)
        break;
      case 'gravity':
        scene.world.setGravityEnabled(id, true);
        break;
      case 'collision':
        scene.world.setCollisionEnabled(id, true);
        break;
      case 'full':
        scene.world.setGravityEnabled(id, true);
        scene.world.setCollisionEnabled(id, true);
        break;
    }
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}
