import { Vectorium, Scene } from './vectorium/core/Engine';
import { 
  createCircleEntity,
  createStar5Entity,
  createStar6Entity,
  createTriangleEntity,
  createPentagonEntity,
  createHexagonEntity,
  createOctagonEntity,
  createHeartEntity,
  createSquareEntity,
  createDiamondEntity,
  createPentagramEntity,
  createVesicaEntity,
  createMoonEntity,
  createCrossEntity,
  createEggEntity,
  createRoundedXEntity,
  createPieEntity,
  createArcEntity,
  createRingEntity,
  createTrapezoidEntity,
  createHorseshoeEntity,
  createTextEntity,
  buildTextStyle
} from './vectorium/entities/factories';
import { TextStyle } from './vectorium/rendering/TextRenderer';
import { TextPool } from './vectorium/core/TextPool';
import type { EntityId } from './vectorium/core/World';

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
  
  // Text entity storage (entityId -> text content and style) - kept for canvas-based fallback
  private textEntities: Map<EntityId, { text: string; style: TextStyle }> = new Map();
  
  // Animation data for dynamic text entities
  textAnimations: Map<number, {
    rotationSpeed: number;
    pulseSpeed: number;
    pulsePhase: number;
  }> = new Map();
  
  setTextPool(textPool: TextPool): void {
    this.textPool = textPool;
  }
  
  getTextEntities(): Map<EntityId, { text: string; style: TextStyle }> {
    return this.textEntities;
  }
  
  // Override update to add text animations
  override update(dt: number): void {
    // Call parent update first (physics, animations, camera)
    super.update(dt);
    
    // Update dynamic text animations
    if (this.textAnimations.size > 0) {
      const rotations = this.world.getRotation();
      const scales = this.world.getScale();
      const time = performance.now() / 1000; // seconds
      
      this.textAnimations.forEach((animData, entityId) => {
        // Rotation animation
        rotations[entityId] = (rotations[entityId] + animData.rotationSpeed * dt) % 360;
        if (rotations[entityId] < 0) rotations[entityId] += 360;
        
        // Pulse animation (scale oscillation)
        const pulseValue = Math.sin(time * animData.pulseSpeed + animData.pulsePhase);
        scales[entityId] = 1.0 + pulseValue * 0.3; // Scale between 0.7 and 1.3
      });
    }
  }
  
  // Override clearAll to also clear text entities and animations
  clearAll(): void {
    this.textEntities.clear();
    this.textAnimations.clear();
    if (this.textPool) {
      this.textPool.clear();
    }
    super.clear();
  }
  
  // Override clear to also clear text entities and animations
  clear(): void {
    this.textEntities.clear();
    this.textAnimations.clear();
    if (this.textPool) {
      this.textPool.clear();
    }
    super.clear();
  }
  
  // Override removeLast to also remove from text entities and animations
  removeLast(count: number): void {
    // Get entities that will be removed
    const totalCount = this.world.getActiveCount();
    const toRemove = Math.min(count, totalCount);
    const maxCapacity = this.world.getTotalCount();
    
    let removed = 0;
    for (let i = maxCapacity - 1; i >= 0 && removed < toRemove; i--) {
      if (this.world.isEntityActive(i)) {
        this.textEntities.delete(i); // Remove from text map
        this.textAnimations.delete(i); // Remove from animations
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
  
  engine.registerScene('demo', scene);
  
  // Click to spawn entities with automatic camera shake
  engine.onClick((x, y) => {
    const spawner = engine.getEntitySpawner();
    const count = spawner?.getClickSpawnCount() ?? 100;
    const physicsMode = spawner?.getPhysicsMode() ?? 'none';
    const visualType = spawner?.getVisualType() ?? 'sprite';
    const textConfig = spawner?.getTextConfig();
    const textureConfig = spawner?.getTextureConfig();
    const animationConfig = spawner?.getAnimationConfig();
    
    // Conditional shake based on spawn count
    engine.getCamera()?.shakeIf(count, [
      { min: 100000, intensity: 20, duration: 500 },
      { min: 10000, intensity: 10, duration: 300 }
    ]);
    
    // 🚀 Spawn entities with independent physics and visual settings
    spawnWithPhysicsAndVisual(scene, x, y, count, physicsMode, visualType, textConfig, textureConfig, animationConfig);
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

/**
 * Unified spawn function: Physics Mode + Visual Type + Texture + Animation
 * Separates physics behavior from visual rendering
 */
function spawnWithPhysicsAndVisual(
  scene: DemoScene,
  x: number,
  y: number,
  count: number,
  physicsMode: 'none' | 'gravity' | 'collision' | 'full',
  visualType: 'sprite' | 'circle' | 'star5' | 'star6' | 'triangle' | 'pentagon' | 'hexagon' | 'octagon' | 'heart' | 'square' | 'diamond' | 'pentagram' | 'vesica' | 'moon' | 'cross' | 'egg' | 'roundedx' | 'pie' | 'arc' | 'ring' | 'trapezoid' | 'horseshoe' | 'text',
  textConfig?: { mode: string; content: string; bold: boolean; italic: boolean; size: number; align: string; shadow: boolean; outline: boolean; glow: boolean },
  textureConfig?: { textureUrl: string },
  animationConfig?: { type: 'none' | 'frame' | 'tween'; fps: number; loop: boolean; tweenProperty: string; tweenDuration: number; tweenEasing: string }
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
    star6: createStar6Entity,
    triangle: createTriangleEntity,
    pentagon: createPentagonEntity,
    hexagon: createHexagonEntity,
    octagon: createOctagonEntity,
    heart: createHeartEntity,
    square: createSquareEntity,
    diamond: createDiamondEntity,
    pentagram: createPentagramEntity,
    vesica: createVesicaEntity,
    moon: createMoonEntity,
    cross: createCrossEntity,
    egg: createEggEntity,
    roundedx: createRoundedXEntity,
    pie: createPieEntity,
    arc: createArcEntity,
    ring: createRingEntity,
    trapezoid: createTrapezoidEntity,
    horseshoe: createHorseshoeEntity,
  };
  
  const shapeFactory = shapeFactories[visualType];
  
  // Handle text entities using factory pattern
  if (visualType === 'text' && textConfig) {
    const textPool = (scene as any).textPool;
    if (!textPool) {
      console.error('TextPool not available in scene');
      return;
    }
    
    // Build text style from config
    const textStyle = buildTextStyle({
      ...textConfig,
      align: textConfig.align as 'left' | 'center' | 'right'
    });
    
    // Static text spawns in a grid pattern with no velocity
    // Dynamic text spawns with velocity and animations
    const isStaticMode = textConfig.mode === 'static';
    
    for (let i = 0; i < count; i++) {
      let spawnX = x;
      let spawnY = y;
      let vx = 0;
      let vy = 0;
      
      if (isStaticMode) {
        // Static: Grid pattern, no velocity
        const cols = Math.ceil(Math.sqrt(count));
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        // For static text, adjust spawn X so all alignments start at same visual position
        // This makes it easy to compare alignment modes side-by-side
        const align = textConfig.align as 'left' | 'center' | 'right';
        let baseX = x;
        
        // Estimate text width (rough approximation for positioning)
        const estimatedTextWidth = textConfig.content.length * textConfig.size * 0.6;
        
        if (align === 'center') {
          // Center-aligned: offset right by half width so left edge aligns with click point
          baseX = x + estimatedTextWidth / 2;
        } else if (align === 'right') {
          // Right-aligned: offset right by full width so left edge aligns with click point
          baseX = x + estimatedTextWidth;
        }
        // Left-aligned: no offset needed
        
        spawnX = baseX + col * 150;
        spawnY = y + row * 60;
      } else {
        // Dynamic: Radial explosion with velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = 150 + Math.random() * 250;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      }
      
      // Get text content
      const text = textConfig.mode === 'dynamic' ? `#${i}` : textConfig.content;
      
      // Create text entity using factory
      const id = createTextEntity(
        scene.world,
        textPool,
        spawnX,
        spawnY,
        text,
        {
          vx,
          vy,
          textStyle,
          isStatic: isStaticMode
        },
        scene.getTextEntities()
      );
      
      // Add animations to dynamic text
      if (!isStaticMode) {
        // Random rotation animation
        const rotations = scene.world.getRotation();
        rotations[id] = Math.floor(Math.random() * 360);
        
        // Store animation data for update loop
        const animData = {
          rotationSpeed: (Math.random() - 0.5) * 180, // -90 to +90 degrees per second
          pulseSpeed: 1 + Math.random() * 2, // 1-3 Hz
          pulsePhase: Math.random() * Math.PI * 2
        };
        
        // Store in scene for animation updates
        (scene as DemoScene).textAnimations.set(id, animData);
      }
      
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
    
    // Apply tween animation if configured
    if (animationConfig && animationConfig.type === 'tween') {
      applyTweenToEntity(scene, id, animationConfig);
    }
    
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

/**
 * Apply tween animation to an entity
 */
function applyTweenToEntity(
  scene: DemoScene,
  entityId: number,
  config: { tweenProperty: string; tweenDuration: number; tweenEasing: string }
): void {
  const animManager = (scene as any).animationManager;
  if (!animManager) {
    console.warn('AnimationManager not available');
    return;
  }
  
  // Map property name to index (x=0, y=1, scale=2, size=3, alpha=4)
  const propertyMap: Record<string, number> = {
    x: 0,
    y: 1,
    scale: 2,
    size: 3,
    alpha: 4
  };
  
  const propertyIndex = propertyMap[config.tweenProperty];
  if (propertyIndex === undefined) {
    console.warn(`Unknown tween property: ${config.tweenProperty}`);
    return;
  }
  
  // Map easing name to function
  const easingMap: Record<string, (t: number) => number> = {
    linear: (t) => t,
    easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    bounce: (t) => {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) {
        return n1 * t * t;
      } else if (t < 2 / d1) {
        return n1 * (t -= 1.5 / d1) * t + 0.75;
      } else if (t < 2.5 / d1) {
        return n1 * (t -= 2.25 / d1) * t + 0.9375;
      } else {
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
      }
    }
  };
  
  const easingFn = easingMap[config.tweenEasing] || easingMap.linear;
  
  // Get current value as start
  let startValue = 0;
  let endValue = 0;
  
  const world = scene.world;
  const posX = world.getX();
  const posY = world.getY();
  const scales = world.getScale();
  const sizes = world.getSizes();
  const alphas = world.getAlpha();
  
  switch (propertyIndex) {
    case 0: // x
      startValue = posX[entityId];
      endValue = startValue + (Math.random() - 0.5) * 600; // Much larger movement
      break;
    case 1: // y
      startValue = posY[entityId];
      endValue = startValue + (Math.random() - 0.5) * 600; // Much larger movement
      break;
    case 2: // scale
      startValue = scales[entityId];
      endValue = 0.1 + Math.random() * 2.5; // Scale from 0.1x to 2.6x (dramatic!)
      break;
    case 3: // size
      startValue = sizes[entityId];
      endValue = startValue * (0.2 + Math.random() * 2); // 0.2x to 2.2x (very visible)
      break;
    case 4: // alpha
      startValue = alphas[entityId];
      endValue = Math.random() * 0.5; // Fade to 0-50% (more visible)
      break;
  }
  
  // Create or get tween definition
  const tweenName = `${config.tweenProperty}_${config.tweenDuration}_${config.tweenEasing}`;
  let tween = animManager.getTween(tweenName);
  
  if (!tween) {
    tween = animManager.createTween({
      name: tweenName,
      properties: [propertyIndex],
      duration: config.tweenDuration,
      easing: easingFn
    });
  }
  
  // Apply tween to entity
  const tweenIds = world.getTweenIds();
  const tweenTimes = world.getTweenTimes();
  const tweenActive = world.getTweenActive();
  const tweenStartValues = world.getTweenStartValues();
  const tweenEndValues = world.getTweenEndValues();
  
  tweenIds[entityId] = tween.id;
  tweenTimes[entityId] = 0;
  tweenActive[entityId] = 1;
  
  const baseIndex = entityId * 4;
  tweenStartValues[baseIndex] = startValue;
  tweenEndValues[baseIndex] = endValue;
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}
