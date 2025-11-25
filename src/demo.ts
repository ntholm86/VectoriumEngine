import { Vectorium, Scene } from './vectorium/core/Engine';
import { EntitySpawnService } from './vectorium/entities/EntitySpawnService';
import { TextPool } from './vectorium/core/TextPool';
import type { EntityId } from './vectorium/core/World';
import {
  createTextEntity,
  buildTextStyle
} from './vectorium/entities/factories';
import { TextStyle } from './vectorium/rendering/TextRenderer';

/**
 * 🎮 VECTORIUM DEMO - Phase 1 Complete
 * 
 * Features demonstrated:
 * - ✅ GPU-accelerated shapes (circle, star, triangle, hexagon, heart, square, diamond)
 * - ✅ Text rendering with effects (shadow, outline, glow, bold, italic)
 * - ✅ Physics modes (gravity, collision, boundary)
 * - ✅ Input system (mouse, keyboard, touch)
 * - ✅ Camera system (zoom, pan, shake)
 * - ✅ Performance monitoring
 * - 🆕 Texture system (load & render sprites)
 * - 🆕 Animation system (frame animations & tweens)
 * 
 * HOW TO USE TEXTURES:
 * 1. Select "Sprite" from Visual Type dropdown
 * 2. Enter texture URL in "Texture URL" field (e.g., "/assets/sprite.png")
 * 3. Click canvas to spawn textured entities
 * 
 * HOW TO USE ANIMATIONS:
 * Frame Animation:
 * 1. Select "Frame Animation" from Animation dropdown
 * 2. Set FPS (1-60) and toggle Loop
 * 3. Requires sprite atlas with frame data
 * 
 * Tween Animation:
 * 1. Select "Tween Animation" from Animation dropdown
 * 2. Choose property to animate (scale, position, alpha, etc.)
 * 3. Set duration (100-5000ms) and easing function
 * 4. Spawned entities will animate automatically
 * 
 * Note: Texture and animation systems are initialized but require
 * asset loading. See TextureManager.loadTexture() and 
 * AnimationManager.createFrameAnimation() for manual setup.
 */

class DemoScene extends Scene {
  // Reference to engine's text pool
  private textPool: TextPool | null = null;
  
  // Text entity storage (entityId -> text content and style)
  private textEntities: Map<EntityId, { text: string; style: TextStyle }> = new Map();
  
  // Entity spawn service
  public spawnService: EntitySpawnService | null = null;
  
  setTextPool(textPool: TextPool): void {
    this.textPool = textPool;
  }
  
  setSpawnService(service: EntitySpawnService): void {
    this.spawnService = service;
  }
  
  getTextEntities(): Map<EntityId, { text: string; style: TextStyle }> {
    return this.textEntities;
  }
  
  // Override update to add text animations
  override update(dt: number): void {
    // Call parent update first (physics, animations, camera)
    super.update(dt);
    
    // Update text animations via spawn service
    if (this.spawnService) {
      this.spawnService.updateTextAnimations(dt);
    }
  }
  
  // Override clearAll to also clear text animations
  clearAll(): void {
    if (this.spawnService) {
      this.spawnService.clearTextAnimations();
    }
    this.textEntities.clear();
    if (this.textPool) {
      this.textPool.clear();
    }
    super.clear();
  }
  
  // Override clear to also clear text animations
  clear(): void {
    if (this.spawnService) {
      this.spawnService.clearTextAnimations();
    }
    this.textEntities.clear();
    if (this.textPool) {
      this.textPool.clear();
    }
    super.clear();
  }
  
  // Override removeLast to also remove from text animations
  removeLast(count: number): void {
    // Get entities that will be removed
    const totalCount = this.world.getActiveCount();
    const toRemove = Math.min(count, totalCount);
    const maxCapacity = this.world.getTotalCount();
    
    let removed = 0;
    for (let i = maxCapacity - 1; i >= 0 && removed < toRemove; i--) {
      if (this.world.isEntityActive(i)) {
        this.textEntities.delete(i);
        if (this.spawnService) {
          this.spawnService.removeTextAnimation(i);
        }
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
    
    console.log('✅ Scene loaded - Text will be rendered directly via TextRenderer');
  }
  
  // Custom render method to draw debug text
  override render(renderer: any, textRenderer: any, textPool?: any): void {
    // Call parent render first (entities, shapes, etc.)
    super.render(renderer, textRenderer, textPool);
    
    // Now draw our debug text labels directly
    const startX = 100;
    const startY = 100;
    const spacing = 60;
    
    // === DYNAMIC TEXT (Left Column) ===
    // 1. Plain text (no effects)
    textRenderer.drawText('Plain Text', startX, startY, { color: '#00FFFF', align: 'left', fontSize: 32 });
    
    // 2. Bold text
    textRenderer.drawText('Bold Text', startX, startY + spacing, { 
      font: 'bold 32px Arial', color: '#FFFF00', align: 'left', fontSize: 32 
    });
    
    // 3. Italic text
    textRenderer.drawText('Italic Text', startX, startY + spacing * 2, { 
      font: 'italic 32px Arial', color: '#FF00FF', align: 'left', fontSize: 32 
    });
    
    // 4. Shadow effect
    textRenderer.drawText('Shadow Text', startX, startY + spacing * 3, { 
      color: '#FFFFFF', align: 'left', fontSize: 32,
      shadow: { color: 'rgba(255, 0, 0, 1.0)', blur: 6, offsetX: 4, offsetY: 4 }
    });
    
    // 5. Outline effect
    textRenderer.drawText('Outline Text', startX, startY + spacing * 4, { 
      color: '#FFFFFF', align: 'left', fontSize: 32,
      strokeColor: '#00FFFF', strokeWidth: 4
    });
    
    // 6. Glow effect
    textRenderer.drawText('Glow Text', startX, startY + spacing * 5, { 
      color: '#FFFFFF', align: 'left', fontSize: 32,
      shadow: { color: 'rgba(255, 255, 0, 1.0)', blur: 20, offsetX: 0, offsetY: 0 }
    });
    
    // 7. HEAVY EFFECTS
    textRenderer.drawText('HEAVY EFFECTS', startX, startY + spacing * 6, { 
      font: 'bold italic 32px Arial', color: '#FFFFFF', align: 'left', fontSize: 32,
      strokeColor: '#00FFFF', strokeWidth: 4,
      shadow: { color: 'rgba(255, 255, 0, 1.0)', blur: 20, offsetX: 0, offsetY: 0 }
    });
    
    // 8. Letter spacing
    textRenderer.drawText('L e t t e r   S p a c i n g', startX, startY + spacing * 7, { 
      color: '#FFFFFF', align: 'left', fontSize: 32 
    });
    
    // === STATIC TEXT (Right Column) ===
    const staticX = startX + 700;
    
    // 1. Plain text (static)
    textRenderer.drawText('Plain Text [STATIC]', staticX, startY, { 
      color: '#FF8800', align: 'left', fontSize: 32 
    });
    
    // 2. Bold text (static)
    textRenderer.drawText('Bold Text [STATIC]', staticX, startY + spacing, { 
      font: 'bold 32px Arial', color: '#00FF00', align: 'left', fontSize: 32 
    });
    
    // 3. Italic text (static)
    textRenderer.drawText('Italic Text [STATIC]', staticX, startY + spacing * 2, { 
      font: 'italic 32px Arial', color: '#FF69B4', align: 'left', fontSize: 32 
    });
    
    // 4. Shadow effect (static)
    textRenderer.drawText('Shadow Text [STATIC]', staticX, startY + spacing * 3, { 
      color: '#FFFFFF', align: 'left', fontSize: 32,
      shadow: { color: 'rgba(255, 0, 0, 1.0)', blur: 6, offsetX: 4, offsetY: 4 }
    });
    
    // 5. Outline effect (static)
    textRenderer.drawText('Outline Text [STATIC]', staticX, startY + spacing * 4, { 
      color: '#FFFFFF', align: 'left', fontSize: 32,
      strokeColor: '#00FFFF', strokeWidth: 4
    });
    
    // 6. Glow effect (static)
    textRenderer.drawText('Glow Text [STATIC]', staticX, startY + spacing * 5, { 
      color: '#FFFFFF', align: 'left', fontSize: 32,
      shadow: { color: 'rgba(255, 255, 0, 1.0)', blur: 20, offsetX: 0, offsetY: 0 }
    });
    
    // 7. HEAVY EFFECTS (static)
    textRenderer.drawText('HEAVY EFFECTS [STATIC]', staticX, startY + spacing * 6, { 
      font: 'bold italic 32px Arial', color: '#FFFFFF', align: 'left', fontSize: 32,
      strokeColor: '#00FFFF', strokeWidth: 4,
      shadow: { color: 'rgba(255, 255, 0, 1.0)', blur: 20, offsetX: 0, offsetY: 0 }
    });
    
    // 8. Letter spacing (static)
    textRenderer.drawText('L e t t e r   S p a c i n g   [ S T A T I C ]', staticX, startY + spacing * 7, { 
      color: '#FFFFFF', align: 'left', fontSize: 28 
    });
    
    // 9. Bacon ipsum text (static)
    textRenderer.drawText('Bacon ipsum short loin [STATIC]', staticX, startY + spacing * 8, { 
      color: '#FFFFFF', align: 'left', fontSize: 24 
    });
    
    // === ALIGNMENT TESTS (Middle Column) ===
    const alignX = startX + 400;
    textRenderer.drawText('Left Aligned', alignX, startY, { 
      color: '#FFFFFF', align: 'left', fontSize: 32 
    });
    textRenderer.drawText('Center Aligned', alignX, startY + spacing, { 
      color: '#FFFFFF', align: 'center', fontSize: 32 
    });
    textRenderer.drawText('Right Aligned', alignX, startY + spacing * 2, { 
      color: '#FFFFFF', align: 'right', fontSize: 32 
    });
    
    // === ALIGNMENT TESTS (Static variants) ===
    textRenderer.drawText('Left Aligned [STATIC]', alignX, startY + spacing * 4.5, { 
      color: '#FFFFFF', align: 'left', fontSize: 28 
    });
    textRenderer.drawText('Center Aligned [STATIC]', alignX, startY + spacing * 5.5, { 
      color: '#FFFFFF', align: 'center', fontSize: 28 
    });
    textRenderer.drawText('Right Aligned [STATIC]', alignX, startY + spacing * 6.5, { 
      color: '#FFFFFF', align: 'right', fontSize: 28 
    });
    
    // === LINE HEIGHT TEST ===
    textRenderer.drawText('Line 1 of text', alignX, startY + spacing * 3, { 
      color: '#FFFFFF', align: 'left', fontSize: 32 
    });
    textRenderer.drawText('Line 2 of text', alignX, startY + spacing * 3 + 40, { 
      color: '#FFFFFF', align: 'left', fontSize: 32 
    });
    textRenderer.drawText('Line 3 of text', alignX, startY + spacing * 3 + 80, { 
      color: '#FFFFFF', align: 'left', fontSize: 32 
    });
    
    // === PARAGRAPH TESTS ===
    textRenderer.drawText('Bacon ipsum dolor amet short loin pork chop turkey', 100, 580, { 
      color: '#FFFFFF', align: 'left', fontSize: 28 
    });
    
    textRenderer.drawText('Ribeye bresaola ham hock hamburger porchetta', 100, 615, { 
      color: '#FFFFFF', align: 'left', fontSize: 24 
    });
    
    textRenderer.drawText('Tri-tip chuck beef ribs meatloaf shoulder', 100, 645, { 
      font: 'bold 20px Arial', color: '#FFFFFF', align: 'left', fontSize: 20 
    });
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
  (scene as any).animationManager = engine.getAnimationManager();
  
  // Create spawn service (replaces 200+ lines of spawn logic!)
  const spawnService = new EntitySpawnService(
    scene,
    (engine as any).textPool,
    engine.getAnimationManager()
  );
  scene.setSpawnService(spawnService);
  
  engine.registerScene('demo', scene);
  
  // Click to spawn entities - now just one line!
  engine.onClick((x, y) => {
    const spawner = engine.getEntitySpawner();
    if (!spawner) return;
    
    const config = spawner.getSpawnConfig();
    
    // Conditional shake based on spawn count
    engine.getCamera()?.shakeIf(config.count, [
      { min: 100000, intensity: 20, duration: 500 },
      { min: 10000, intensity: 10, duration: 300 }
    ]);
    
    // Spawn entities with service (replaces massive spawn function!)
    spawnService.spawnBatch({ x, y, ...config });
  });
  
  // Start engine
  engine.loadScene('demo').then(() => {
    engine.start();
    
    // Expose engine and scene globally for console access
    (window as any).vectoriumEngine = engine;
    (window as any).vectoriumScene = scene;
    (window as any).vectoriumPerfMonitor = engine.performanceMonitor;
    
    // Add automated performance test function with Promise support
    (window as any).runPerfTest = async (durationMs: number = 2000) => {
      console.log(`🚀 Starting automated performance test...`);
      const perfMonitor = (window as any).vectoriumPerfMonitor;
      if (perfMonitor) {
        const result = await perfMonitor.startMeasurement(durationMs);
        console.log(`✅ Test complete! Metrics available in window.lastMeasurement`);
        return result;
      } else {
        console.error('❌ Performance monitor not available');
        return null;
      }
    };
    
    console.log('💡 TIP: Run await runPerfTest() in console to start automated measurement');
    console.log('💡 TIP: Or click "📊 Measure (2s)" button in profiler panel');
    console.log('💡 TIP: Agent can read window.lastMeasurementJSON for optimization iterations');
  });
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}
