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
    
    // 🎨 DEBUG: Spawn test text entities with different effects
    if (!this.textPool) {
      console.error('TextPool not available');
      return;
    }
    
    const startX = 100;
    const startY = 100;
    const spacing = 60;
    
    // === DYNAMIC TEXT (Left Column) ===
    console.log('🔄 Creating DYNAMIC text examples (regenerated each frame)');
    
    // 1. Plain text (no effects)
    this.spawnDebugText('Plain Text', startX, startY, {}, 'left', 32, false, '#00FFFF');
    
    // 2. Bold text
    this.spawnDebugText('Bold Text', startX, startY + spacing, { bold: true }, 'left', 32, false, '#FFFF00');
    
    // 3. Italic text
    this.spawnDebugText('Italic Text', startX, startY + spacing * 2, { italic: true }, 'left', 32, false, '#FF00FF');
    
    // 4. Shadow effect
    this.spawnDebugText('Shadow Text', startX, startY + spacing * 3, { shadow: true }, 'left', 32, false);
    
    // 5. Outline effect
    this.spawnDebugText('Outline Text', startX, startY + spacing * 4, { outline: true }, 'left', 32, false);
    
    // 6. Glow effect
    this.spawnDebugText('Glow Text', startX, startY + spacing * 5, { glow: true }, 'left', 32, false);
    
    // 7. HEAVY EFFECTS (dynamic)
    this.spawnDebugText('HEAVY EFFECTS', startX, startY + spacing * 6, {
      bold: true,
      italic: true,
      shadow: true,
      outline: true,
      glow: true
    }, 'left', 32, false);
    
    // 8. Letter spacing
    this.spawnDebugText('L e t t e r   S p a c i n g', startX, startY + spacing * 7, {}, 'left', 32, false);
    
    // === STATIC TEXT (Right Column) ===
    console.log('✨ Creating STATIC text examples (cached, optimized)');
    
    const staticX = startX + 700;
    
    // 1. Plain text (static)
    this.spawnDebugText('Plain Text [STATIC]', staticX, startY, {}, 'left', 32, true, '#FF8800');
    
    // 2. Bold text (static)
    this.spawnDebugText('Bold Text [STATIC]', staticX, startY + spacing, { bold: true }, 'left', 32, true, '#00FF00');
    
    // 3. Italic text (static)
    this.spawnDebugText('Italic Text [STATIC]', staticX, startY + spacing * 2, { italic: true }, 'left', 32, true, '#FF69B4');
    
    // 4. Shadow effect (static)
    this.spawnDebugText('Shadow Text [STATIC]', staticX, startY + spacing * 3, { shadow: true }, 'left', 32, true);
    
    // 5. Outline effect (static)
    this.spawnDebugText('Outline Text [STATIC]', staticX, startY + spacing * 4, { outline: true }, 'left', 32, true);
    
    // 6. Glow effect (static)
    this.spawnDebugText('Glow Text [STATIC]', staticX, startY + spacing * 5, { glow: true }, 'left', 32, true);
    
    // 7. HEAVY EFFECTS (static)
    this.spawnDebugText('HEAVY EFFECTS [STATIC]', staticX, startY + spacing * 6, {
      bold: true,
      italic: true,
      shadow: true,
      outline: true,
      glow: true
    }, 'left', 32, true);
    
    // 8. Letter spacing (static)
    this.spawnDebugText('L e t t e r   S p a c i n g   [ S T A T I C ]', staticX, startY + spacing * 7, {}, 'left', 28, true);
    
    // 9. Bacon ipsum text (static)
    this.spawnDebugText('Bacon ipsum short loin [STATIC]', staticX, startY + spacing * 8, {}, 'left', 24, true);
    
    // === ALIGNMENT TESTS (Middle Column - Dynamic) ===
    const alignX = startX + 400;
    this.spawnDebugText('Left Aligned', alignX, startY, {}, 'left', 32, false);
    this.spawnDebugText('Center Aligned', alignX, startY + spacing, {}, 'center', 32, false);
    this.spawnDebugText('Right Aligned', alignX, startY + spacing * 2, {}, 'right', 32, false);
    
    // === ALIGNMENT TESTS (Static variants) ===
    this.spawnDebugText('Left Aligned [STATIC]', alignX, startY + spacing * 4.5, {}, 'left', 28, true);
    this.spawnDebugText('Center Aligned [STATIC]', alignX, startY + spacing * 5.5, {}, 'center', 28, true);
    this.spawnDebugText('Right Aligned [STATIC]', alignX, startY + spacing * 6.5, {}, 'right', 28, true);
    
    // === LINE HEIGHT TEST ===
    this.spawnDebugText('Line 1 of text', alignX, startY + spacing * 3, {}, 'left', 32, true);
    this.spawnDebugText('Line 2 of text', alignX, startY + spacing * 3 + 40, {}, 'left', 32, true);
    this.spawnDebugText('Line 3 of text', alignX, startY + spacing * 3 + 80, {}, 'left', 32, true);
    
    // === PARAGRAPH TESTS ===
    const baconText = 'Bacon ipsum dolor amet short loin pork chop turkey';
    this.spawnDebugText(baconText, 100, 580, {}, 'left', 28, false);
    
    const baconText2 = 'Ribeye bresaola ham hock hamburger porchetta';
    this.spawnDebugText(baconText2, 100, 615, {}, 'left', 24, false);
    
    const baconText3 = 'Tri-tip chuck beef ribs meatloaf shoulder';
    this.spawnDebugText(baconText3, 100, 645, { bold: true }, 'left', 20, false);
    
    console.log(`📊 Text entities: ${this.world.getTextEntityCount()} total`);
  }
  
  private spawnDebugText(
    text: string, 
    x: number, 
    y: number, 
    effects: { bold?: boolean; italic?: boolean; shadow?: boolean; outline?: boolean; glow?: boolean },
    align: 'left' | 'center' | 'right' = 'left',
    fontSize: number = 32,
    isStatic: boolean = false,
    color: string = '#FFFFFF'
  ): void {
    if (!this.textPool) return;
    
    // Build text style using factory helper
    const textStyle = buildTextStyle(
      {
        bold: effects.bold,
        italic: effects.italic,
        size: fontSize,
        align: align,
        shadow: effects.shadow,
        outline: effects.outline,
        glow: effects.glow
      },
      color
    );
    
    // Create text entity using factory (no velocity for demo labels)
    createTextEntity(
      this.world,
      this.textPool,
      x,
      y,
      text,
      {
        vx: 0,
        vy: 0,
        textStyle,
        isStatic
      },
      this.textEntities
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
