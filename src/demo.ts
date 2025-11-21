/**
 * Vectorium Engine - Interactive Demo with Enhanced Performance Monitoring
 * Showcases all engine capabilities with detailed metrics
 */

import { Vectorium, Scene, Entity, Viewport } from './vectorium/core/Engine';
import { RuntimeConfig } from './vectorium/core/RuntimeConfig';
import { DebugPanel } from './vectorium/debug/DebugPanel';
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

/**
 * Demo Controls - Entity spawning and configuration
 */
class DemoControls {
  private engine: Vectorium;
  private scene: DemoScene;
  private container: HTMLDivElement;
  
  constructor(engine: Vectorium, scene: DemoScene) {
    this.engine = engine;
    this.scene = scene;
    this.container = this.createUI();
    document.body.appendChild(this.container);
  }
  
  private createUI(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.90);
      color: #00FF00;
      padding: 15px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 280px;
      box-shadow: 0 4px 20px rgba(0, 255, 0, 0.4);
      border: 2px solid #00FF00;
      z-index: 1000;
    `;
    
    container.innerHTML = `
      <h2 style="margin: 0 0 12px 0; color: #00FF00; font-size: 16px; text-align: center; text-shadow: 0 0 10px #00FF00;">
        🎮 DEMO CONTROLS
      </h2>
      
      <div style="margin-bottom: 12px;">
        <h3 style="margin: 0 0 8px 0; color: #00FF00; font-size: 13px; font-weight: bold;">🖥️ Fullscreen</h3>
        <button id="fullscreenBtn" style="width: 100%; padding: 8px; background: #00FF00; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">
          Enter Fullscreen
        </button>
      </div>
      
      <div>
        <h3 style="margin: 0 0 8px 0; color: #00FF00; font-size: 13px; font-weight: bold;">➕ Spawn Entities</h3>
        <div style="margin-bottom: 6px; font-size: 10px; color: #FFFF00;">
          🌍 World (10x area):
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 8px;">
          <button id="add100Btn" style="padding: 8px; background: #00FF00; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px;">+100</button>
          <button id="add1000Btn" style="padding: 8px; background: #00FF00; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px;">+1K</button>
          <button id="add10000Btn" style="padding: 8px; background: #00FF00; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px;">+10K</button>
          <button id="add100000Btn" style="padding: 8px; background: #FF00FF; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px;">+100K 🔥</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px;">
          <button id="add500000Btn" style="padding: 8px; background: #FF0000; color: #FFF; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px;">+500K 💥</button>
          <button id="add1000000Btn" style="padding: 8px; background: #FF0000; color: #FFF; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px;">+1M ☢️</button>
        </div>
        <div style="margin-bottom: 6px; font-size: 10px; color: #00FFFF;">
          📺 Viewport (visible):
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 8px;">
          <button id="addViewport100Btn" style="padding: 8px; background: #00FFFF; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px;">+100 👁️</button>
          <button id="addViewport1000Btn" style="padding: 8px; background: #00FFFF; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px;">+1K 👁️</button>
          <button id="addViewport10000Btn" style="padding: 8px; background: #00FFFF; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px;">+10K 👁️</button>
          <button id="addViewport100000Btn" style="padding: 8px; background: #00AAAA; color: #FFF; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px;">+100K 👁️</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 8px;">
          <button id="remove1000Btn" style="padding: 8px; background: #FF0000; color: #FFF; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px;">-1K</button>
          <button id="clearBtn" style="padding: 8px; background: #FF0000; color: #FFF; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px;">Clear All</button>
        </div>
      </div>
      
      <div style="font-size: 10px; color: #00AA00; text-align: center; padding-top: 10px; border-top: 1px solid #00FF00;">
        SPACE: Pause | CLICK: Spawn | P: Profiler
      </div>
    `;
    
    this.setupEventListeners(container);
    return container;
  }
  
  private setupEventListeners(container: HTMLDivElement): void {
    const fullscreenBtn = container.querySelector('#fullscreenBtn') as HTMLButtonElement;
    fullscreenBtn.addEventListener('click', () => {
      const canvas = this.engine.canvas;
      if (canvas.requestFullscreen) {
        canvas.requestFullscreen();
        setTimeout(() => {
          this.engine.resize(window.screen.width, window.screen.height);
        }, 100);
      }
    });
    
    container.querySelector('#add100Btn')?.addEventListener('click', () => {
      this.scene.addEntities(100, false); // World spawning (10x area)
    });
    
    container.querySelector('#add1000Btn')?.addEventListener('click', () => {
      this.scene.addEntities(1000, false); // World spawning (10x area)
    });
    
    container.querySelector('#add10000Btn')?.addEventListener('click', () => {
      this.scene.addEntities(10000, false); // World spawning (10x area)
    });
    
    container.querySelector('#add100000Btn')?.addEventListener('click', () => {
      if (confirm('⚠️ Add 100,000 entities? This will stress test the engine!')) {
        this.scene.addEntities(100000, false); // World spawning (10x area)
      }
    });
    
    container.querySelector('#add500000Btn')?.addEventListener('click', () => {
      if (confirm('💥 Add 500,000 entities?! This will test frustum culling!\n\nOnly visible entities will be rendered.')) {
        this.scene.addEntities(500000, false); // World spawning (10x area)
      }
    });
    
    container.querySelector('#add1000000Btn')?.addEventListener('click', () => {
      if (confirm('☢️ Add 1,000,000 entities?!?!\n\nThis is EXTREME and may take a moment to spawn.\nFrustum culling will only render visible entities.')) {
        console.log('Spawning 1 million entities...');
        this.scene.addEntities(1000000, false); // World spawning (10x area)
        console.log('Spawn complete!');
      }
    });
    
    // Viewport spawning buttons (all visible)
    container.querySelector('#addViewport100Btn')?.addEventListener('click', () => {
      this.scene.addEntities(100, true); // Viewport only
    });
    
    container.querySelector('#addViewport1000Btn')?.addEventListener('click', () => {
      this.scene.addEntities(1000, true); // Viewport only
    });
    
    container.querySelector('#addViewport10000Btn')?.addEventListener('click', () => {
      this.scene.addEntities(10000, true); // Viewport only
    });
    
    container.querySelector('#addViewport100000Btn')?.addEventListener('click', () => {
      if (confirm('⚠️ Add 100,000 visible entities? This will fill the screen!')) {
        this.scene.addEntities(100000, true); // Viewport only
      }
    });
    
    container.querySelector('#remove1000Btn')?.addEventListener('click', () => {
      this.scene.removeEntities(1000);
    });
    
    container.querySelector('#clearBtn')?.addEventListener('click', () => {
      if (confirm('Clear all entities?')) {
        this.scene.clearEntities();
      }
    });
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
  const debugPanel = new DebugPanel(runtimeConfig);
  
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
  
  new DemoControls(engine, scene);
  
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
    
    for (let i = 0; i < 50; i++) {
      const entity = new BouncingEntity();
      const angle = (i / 50) * Math.PI * 2;
      const speed = 200 + Math.random() * 300;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 6 + Math.random() * 8;
      const hue = (i / 50) * 360;
      const color = hslToRgb(hue, 1, 0.5);
      
      entity.spawn(x, y, vx, vy, size, color);
      scene.addEntity(entity);
    }
  });
  
  // Info hint
  console.log('🎮 Vectorium Demo Ready!');
  console.log('   P - Toggle Profiler');
  console.log('   C - Toggle Config Panel');
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
