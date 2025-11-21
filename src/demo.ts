/**
 * Vectorium Engine - Interactive Demo
 */

import { Vectorium, Scene, Entity } from './vectorium/core/Engine';
import { RuntimeConfig } from './vectorium/core/RuntimeConfig';
import { DebugPanel } from './vectorium/debug/DebugPanel';
import { EntitySpawner } from './vectorium/debug/EntitySpawner';
import { CameraControls } from './vectorium/debug/CameraControls';
import { WebGLBatchRenderer } from './vectorium/rendering/WebGLBatchRenderer';
import { TextRenderer } from './vectorium/rendering/TextRenderer';

class BouncingEntity implements Entity {
  x = 0; y = 0; vx = 0; vy = 0; size = 8; rotation = 0; rotationSpeed = 0; alpha = 1.0;
  color = { r: 1, g: 1, b: 1 };
  animationType: 'rotate' | 'pulse' | 'wobble' | 'spin' | 'fade' = 'rotate';
  
  spawn(x: number, y: number, vx: number, vy: number, size: number, color: { r: number; g: number; b: number }): void {
    Object.assign(this, { x, y, vx, vy, size, color });
    this.rotation = Math.floor(Math.random() * 360);
    this.rotationSpeed = Math.floor((Math.random() - 0.5) * 360);
    this.alpha = 0.8 + Math.random() * 0.2;
    this.animationType = ['rotate', 'pulse', 'wobble', 'spin', 'fade'][Math.floor(Math.random() * 5)] as any;
  }
  
  update(_dt: number): void {}
  render(_renderer: WebGLBatchRenderer, _textRenderer: TextRenderer): void {}
  destroy(): void {}
}

class DemoScene extends Scene {
  private entityCount = 0;
  
  async load(): Promise<void> {
    this.setWorldBoundsMultiplier(1.0);
    this.addEntities(10);
  }
  
  addEntities(count: number, inViewportOnly = true): void {
    const [spawnWidth, spawnHeight] = inViewportOnly 
      ? [this.getWorldWidth(), this.getWorldHeight()]
      : [this.getWorldWidth() * 10, this.getWorldHeight() * 10];
    
    for (let i = 0; i < count; i++) {
      const entity = new BouncingEntity();
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      entity.spawn(
        Math.random() * spawnWidth,
        Math.random() * spawnHeight,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        4 + Math.random() * 12,
        { r: Math.random(), g: Math.random(), b: Math.random() }
      );
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
  
  clearEntities(): void { this.clear(); this.entityCount = 0; }
  getEntityCount(): number { return this.entityCount; }
}

function initDemo() {
  const runtimeConfig = new RuntimeConfig();
  const { width, height } = runtimeConfig.rendering.resolution;
  
  // Setup DOM
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
  
  const container = document.createElement('div');
  container.style.cssText = 'display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#1a1a2e 0%,#0f0f1e 100%)';
  
  const canvasWrapper = document.createElement('div');
  canvasWrapper.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;border:3px solid #00FF00;box-shadow:0 0 30px rgba(0,255,0,0.5),0 0 60px rgba(0,255,0,0.3);border-radius:4px';
  
  canvasWrapper.appendChild(canvas);
  container.appendChild(canvasWrapper);
  document.body.appendChild(container);
  
  // Create engine and scene
  const engine = new Vectorium({ canvas, width, height });
  const scene = new DemoScene('demo', 2000000);
  engine.registerScene('demo', scene);
  
  // Config change handler
  runtimeConfig.onChange((cfg) => {
    const renderer = engine.getRenderer() as WebGLBatchRenderer;
    renderer.setBatchSize(cfg.rendering.batchSize);
    renderer.setClearColor(cfg.rendering.clearColor[0], cfg.rendering.clearColor[1], cfg.rendering.clearColor[2], cfg.rendering.clearColor[3]);
    engine.resize(cfg.rendering.resolution.width, cfg.rendering.resolution.height);
    Object.assign(canvasWrapper.style, { width: `${cfg.rendering.resolution.width}px`, height: `${cfg.rendering.resolution.height}px` });
    
    const currentScene = (engine as any).currentScene;
    if (currentScene) {
      currentScene.setCullingEnabled(cfg.rendering.enableFrustumCulling);
      currentScene.setWorldBoundsMultiplier(cfg.physics.boundsMultiplier);
    }
    
    engine.performanceMonitor.setAdaptiveQuality(cfg.quality.enableAdaptiveQuality);
    const camera = engine.getCamera();
    if (camera) {
      camera.setZoom(cfg.camera.zoom);
      camera.setZoomRange(cfg.camera.minZoom, cfg.camera.maxZoom);
      camera.setSmooth(cfg.camera.smooth, cfg.camera.smoothFactor);
      camera.setFollowSettings(cfg.camera.followLerp, cfg.camera.followDeadzoneX, cfg.camera.followDeadzoneY);
      camera.setCullingMargin(cfg.camera.cullingMargin);
    }
  });
  
  // UI and controls
  new DebugPanel(runtimeConfig);
  const entitySpawner = new EntitySpawner(scene);
  entitySpawner.registerCallbacks({ remove1K: () => scene.removeEntities(1000), clearAll: () => scene.clearEntities() });
  
  let paused = false;
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      paused ? engine.start() : engine.stop();
      paused = !paused;
    }
  });
  
  // Click spawner
  canvas.addEventListener('click', (e) => {
    const camera = engine.getCamera();
    if (!camera) return;
    const rect = canvas.getBoundingClientRect();
    const world = camera.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const count = entitySpawner.getClickSpawnCount();
    
    if (count >= 100000) camera.startShake(20, 500);
    else if (count >= 10000) camera.startShake(10, 300);
    
    for (let i = 0; i < count; i++) {
      const entity = new BouncingEntity();
      const angle = (i / count) * Math.PI * 2;
      const speed = 200 + Math.random() * 300;
      entity.spawn(world.x, world.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 6 + Math.random() * 8, hslToRgb((i / count) * 360, 1, 0.5));
      scene.addEntity(entity);
    }
  });
  
  // Start
  engine.loadScene('demo').then(() => {
    runtimeConfig.onChange(runtimeConfig as any);
    const camera = engine.getCamera();
    if (camera) new CameraControls(camera, runtimeConfig);
    engine.start();
    console.log('🎮 Vectorium Demo Ready | P:Profiler C:Config E:Spawner V:Camera Space:Pause');
  });
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

// Initialize demo when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}
