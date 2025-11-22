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
import { TextStyle } from './vectorium/rendering/TextRenderer';
import { TextPool } from './vectorium/core/TextPool';
import type { EntityId } from './vectorium/core/World';

class DemoScene extends Scene {
  // Reference to engine's text pool
  private textPool: TextPool | null = null;
  
  // Text entity storage (entityId -> text content and style) - kept for canvas-based fallback
  private textEntities: Map<EntityId, { text: string; style: TextStyle }> = new Map();
  
  setTextPool(textPool: TextPool): void {
    this.textPool = textPool;
  }
  
  getTextEntities(): Map<EntityId, { text: string; style: TextStyle }> {
    return this.textEntities;
  }
  
  // Override clearAll to also clear text entities
  clearAll(): void {
    this.textEntities.clear();
    if (this.textPool) {
      this.textPool.clear();
    }
    super.clear();
  }
  
  // Override clear to also clear text entities
  clear(): void {
    this.textEntities.clear();
    if (this.textPool) {
      this.textPool.clear();
    }
    super.clear();
  }
  
  // Override removeLast to also remove from text entities
  removeLast(count: number): void {
    // Get entities that will be removed
    const totalCount = this.world.getActiveCount();
    const toRemove = Math.min(count, totalCount);
    const maxCapacity = this.world.getTotalCount();
    
    let removed = 0;
    for (let i = maxCapacity - 1; i >= 0 && removed < toRemove; i--) {
      if (this.world.isEntityActive(i)) {
        this.textEntities.delete(i); // Remove from text map
        const textIndex = this.world.getTextIndices()[i];
        if (textIndex >= 0 && this.textPool) {
          this.textPool.free(textIndex);
        }
        removed++;
      }
    }
    
    // Call parent to actually destroy entities
    super.removeLast(count);
  }
  
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
  
  // Pass TextPool reference to scene for text entity management
  scene.setTextPool((engine as any).textPool);
  
  engine.registerScene('demo', scene);
  
  // Click to spawn entities with automatic camera shake
  engine.onClick((x, y) => {
    const spawner = engine.getEntitySpawner();
    const count = spawner?.getClickSpawnCount() ?? 100;
    const physicsMode = spawner?.getPhysicsMode() ?? 'none';
    const visualType = spawner?.getVisualType() ?? 'sprite';
    const textConfig = spawner?.getTextConfig();
    
    // Conditional shake based on spawn count
    engine.getCamera()?.shakeIf(count, [
      { min: 100000, intensity: 20, duration: 500 },
      { min: 10000, intensity: 10, duration: 300 }
    ]);
    
    // 🚀 Spawn entities with independent physics and visual settings
    spawnWithPhysicsAndVisual(scene, x, y, count, physicsMode, visualType, textConfig);
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
  visualType: 'sprite' | 'circle' | 'star5' | 'triangle' | 'hexagon' | 'heart' | 'square' | 'diamond' | 'text',
  textConfig?: { mode: string; content: string; bold: boolean; italic: boolean; size: number; align: string; shadow: boolean; outline: boolean; glow: boolean }
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
  
  // Handle text entities separately
  if (visualType === 'text' && textConfig) {
    const textPool = (scene as any).textPool;
    if (!textPool) {
      console.error('TextPool not available in scene');
      return;
    }
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 250;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      // Create entity
      const id = scene.world.createEntity(x, y, vx, vy);
      
      // Set size to 0 to hide sprite quad (text will be rendered separately)
      const sizes = scene.world.getSizes();
      sizes[id] = 0; // Hide the sprite quad
      
      // Set white color for text
      const colorR = scene.world.getColorR();
      const colorG = scene.world.getColorG();
      const colorB = scene.world.getColorB();
      colorR[id] = 255;
      colorG[id] = 255;
      colorB[id] = 255;
      
      // Allocate text in TextPool
      const text = textConfig.mode === 'dynamic' ? `#${i}` : textConfig.content;
      const textIndex = textPool.allocate(text);
      
      // Set text index in ECS
      scene.world.setTextIndex(id, textIndex);
      
      // Store style in textEntities map for canvas fallback
      let font = '';
      if (textConfig.bold) font += 'bold ';
      if (textConfig.italic) font += 'italic ';
      font += `${textConfig.size}px Arial`;
      
      const textStyle: TextStyle = {
        font,
        fontSize: textConfig.size,
        fontFamily: 'Arial',
        color: '#FFFFFF',
        align: textConfig.align as 'left' | 'center' | 'right'
      };
      
      // Add effects
      if (textConfig.outline) {
        textStyle.strokeColor = '#000000';
        textStyle.strokeWidth = 2;
      }
      
      if (textConfig.shadow) {
        textStyle.shadow = {
          color: 'rgba(0, 0, 0, 0.5)',
          blur: 4,
          offsetX: 2,
          offsetY: 2
        };
      }
      
      if (textConfig.glow) {
        textStyle.shadow = {
          color: 'rgba(255, 255, 255, 0.8)',
          blur: 10,
          offsetX: 0,
          offsetY: 0
        };
      }
      
      // Store for canvas fallback
      scene.getTextEntities().set(id, { text, style: textStyle });
      
      // Apply physics
      switch (physicsMode) {
        case 'none':
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
    return; // Exit early for text entities
  }
  
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
