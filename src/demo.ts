/**
 * Vectorium Engine - Interactive Demo with Enhanced Performance Monitoring
 * Showcases all engine capabilities with detailed metrics
 */

import { Vectorium, Scene, Entity, Viewport } from './vectorium/core/Engine';
import { RuntimeConfig } from './vectorium/core/RuntimeConfig';
import { DebugPanel } from './vectorium/debug/DebugPanel';
import { EntitySpawner } from './vectorium/debug/EntitySpawner';
import { WebGLBatchRenderer } from './vectorium/rendering/WebGLBatchRenderer';
import { TextRenderer } from './vectorium/rendering/TextRenderer';

/**
 * Bouncing Entity - Fully ECS-managed for maximum performance
 */
class BouncingEntity implements Entity {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  size = 8;
  rotation = 0;
  rotationSpeed = 0;
  alpha = 1.0;
  color = { r: 1, g: 1, b: 1 };
  animationType: 'rotate' | 'pulse' | 'wobble' | 'spin' | 'fade' = 'rotate';
  
  spawn(x: number, y: number, vx: number, vy: number, size: number, color: { r: number; g: number; b: number }): void {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.rotation = Math.floor(Math.random() * 360);
    this.rotationSpeed = Math.floor((Math.random() - 0.5) * 360);
    this.alpha = 0.8 + Math.random() * 0.2;
    
    const types: Array<'rotate' | 'pulse' | 'wobble' | 'spin' | 'fade'> = ['rotate', 'pulse', 'wobble', 'spin', 'fade'];
    this.animationType = types[Math.floor(Math.random() * types.length)];
  }
  
  update(_dt: number): void {}
  render(_renderer: WebGLBatchRenderer, _textRenderer: TextRenderer): void {}
  destroy(): void {}
}

/**
 * Demo Scene
 */
class DemoScene extends Scene {
  private entityCount = 0;
  
  async load(): Promise<void> {
    // World bounds ALWAYS match canvas resolution exactly
    this.setWorldBoundsMultiplier(1.0);
    
    this.addEntities(10, true); // Spawn in viewport by default
  }
  
  addEntities(count: number, inViewportOnly: boolean = true): void {
    // Physics bounds ALWAYS match canvas resolution (1.0x)
    // inViewportOnly only controls WHERE entities spawn, not bounce area
    
    // Get spawn area
    const spawnWidth = inViewportOnly ? this.getWorldWidth() : this.getWorldWidth() * 10;
    const spawnHeight = inViewportOnly ? this.getWorldHeight() : this.getWorldHeight() * 10;
    
    for (let i = 0; i < count; i++) {
      const entity = new BouncingEntity();
      const x = Math.random() * spawnWidth;
      const y = Math.random() * spawnHeight;
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 4 + Math.random() * 12;
      const color = { r: Math.random(), g: Math.random(), b: Math.random() };
      
      entity.spawn(x, y, vx, vy, size, color);
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
  
  clearEntities(): void {
    this.clear();
    this.entityCount = 0;
  }
  
  getEntityCount(): number {
    return this.entityCount;
  }
}

function initDemo() {
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
  `;
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
  document.body.appendChild(container);
  
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    display: block;
    width: 100%;
    height: 100%;
    border: 3px solid #00FF00;
    box-shadow: 0 0 30px rgba(0, 255, 0, 0.5), 0 0 60px rgba(0, 255, 0, 0.3);
    border-radius: 4px;
  `;
  
  // Calculate optimal canvas size based on viewport using Viewport helper
  const maxWidth = window.innerWidth - 450; // Account for UI panel
  const maxHeight = window.innerHeight - 40; // Account for margins
  
  const viewport = Viewport.fromAspectRatio(16 / 9, maxWidth, maxHeight);
  const canvasWidth = viewport.width;
  const canvasHeight = viewport.height;
  
  const canvasWrapper = document.createElement('div');
  canvasWrapper.style.cssText = `
    width: ${canvasWidth}px;
    height: ${canvasHeight}px;
    position: relative;
  `;
  canvasWrapper.appendChild(canvas);
  container.appendChild(canvasWrapper);
  
  const engine = new Vectorium({
    canvas,
    width: canvasWidth,
    height: canvasHeight,
    preferWebGL2: true,
    targetFPS: 60,
    enableAdaptiveQuality: true,
    initialQuality: 'high',
    debugMode: false
  });
  
  const scene = new DemoScene('demo', 2000000); // Support up to 2M entities for extreme stress testing
  engine.registerScene('demo', scene);
  engine.loadScene('demo').then(() => {
    engine.start();
  });
  
  // Initialize RuntimeConfig and DebugPanel
  const runtimeConfig = new RuntimeConfig();
  void new DebugPanel(runtimeConfig); // DebugPanel self-initializes
  
  // Apply config changes to engine
  runtimeConfig.onChange((config) => {
    // Rendering settings
    const renderer = engine.getRenderer();
    if (renderer && 'setBatchSize' in renderer) {
      (renderer as WebGLBatchRenderer).setBatchSize(config.rendering.batchSize);
    }
    
    // Resolution
    const { width, height } = config.rendering.resolution;
    engine.resize(width, height);
    if (canvas.parentElement) {
      canvas.parentElement.style.width = `${width}px`;
      canvas.parentElement.style.height = `${height}px`;
    }
    
    // Culling
    const currentScene = (engine as any).currentScene;
    if (currentScene) {
      currentScene.setCullingEnabled(config.rendering.enableFrustumCulling);
    }
    
    // Quality
    engine.performanceMonitor.setAdaptiveQuality(config.quality.enableAdaptiveQuality);
    
    // Physics
    if (currentScene) {
      currentScene.setWorldBoundsMultiplier(config.physics.boundsMultiplier);
    }
    
    console.log('⚙️ Config updated:', config);
  });
  
  // Apply initial config
  runtimeConfig.onChange(runtimeConfig as any); // Trigger once
  
  // Initialize Entity Spawner with keyboard toggle ('E' key)
  const entitySpawner = new EntitySpawner(scene);
  entitySpawner.registerCallbacks({
    remove1K: () => scene.removeEntities(1000),
    clearAll: () => scene.clearEntities()
  });
  
  let paused = false;
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (paused) {
        engine.start();
        paused = false;
      } else {
        engine.stop();
        paused = true;
      }
    }
    
    // Toggle vertex pulling with 'G' key
    if (e.key.toLowerCase() === 'g') {
      const renderer = (engine as any).renderer;
      const currentlyEnabled = renderer.isVertexPullingActive();
      renderer.setVertexPullingEnabled(!currentlyEnabled);
      console.log(`🚀 Vertex Pulling ${!currentlyEnabled ? 'ENABLED' : 'DISABLED'} - GPU-side vertex generation`);
    }
  });
  
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    const entityCount = entitySpawner.getClickSpawnCount();
    for (let i = 0; i < entityCount; i++) {
      const entity = new BouncingEntity();
      const angle = (i / entityCount) * Math.PI * 2;
      const speed = 200 + Math.random() * 300;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 6 + Math.random() * 8;
      const hue = (i / entityCount) * 360;
      const color = hslToRgb(hue, 1, 0.5);
      
      entity.spawn(x, y, vx, vy, size, color);
      scene.addEntity(entity);
    }
  });
  
  // Info hint
  console.log('🎮 Vectorium Demo Ready!');
  console.log('   P - Toggle Profiler');
  console.log('   C - Toggle Config Panel');
  console.log('   E - Toggle Entity Spawner');
  console.log('   SPACE - Pause/Resume');
  console.log('   CLICK - Spawn burst');
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  return {
    r: hue2rgb(p, q, h + 1/3),
    g: hue2rgb(p, q, h),
    b: hue2rgb(p, q, h - 1/3)
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}
