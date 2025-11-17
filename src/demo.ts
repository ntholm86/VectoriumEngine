/**
 * Vectorium Engine - Interactive Demo with Enhanced Performance Monitoring
 * Showcases all engine capabilities with detailed metrics
 */

import { Vectorium, Scene, Entity } from './vectorium/core/Engine';
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
    this.addEntities(1000);
  }
  
  addEntities(count: number): void {
    for (let i = 0; i < count; i++) {
      const entity = new BouncingEntity();
      const x = Math.random() * this.canvasWidth;
      const y = Math.random() * this.canvasHeight;
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
 * Enhanced UI Controls with Detailed Performance Metrics
 */
class UIControls {
  private engine: Vectorium;
  private scene: DemoScene;
  private container: HTMLDivElement;
  
  constructor(engine: Vectorium, scene: DemoScene) {
    this.engine = engine;
    this.scene = scene;
    this.container = this.createUI();
    document.body.appendChild(this.container);
    
    this.updateMetrics();
    setInterval(() => this.updateMetrics(), 100);
  }
  
  private createUI(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.90);
      color: #00FF00;
      padding: 15px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 360px;
      max-height: 95vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 255, 0, 0.4);
      border: 2px solid #00FF00;
      z-index: 1000;
    `;
    
    container.innerHTML = `
      <h2 style="margin: 0 0 12px 0; color: #00FF00; font-size: 16px; text-align: center; text-shadow: 0 0 10px #00FF00;">
        ⚡ VECTORIUM ENGINE ⚡
      </h2>
      
      <div style="margin-bottom: 12px; padding: 10px; background: rgba(0, 255, 0, 0.1); border-radius: 4px; border-left: 3px solid #00FF00;">
        <div style="font-weight: bold; margin-bottom: 6px; color: #FFFF00;">
          🎯 FRAME METRICS
        </div>
        <div style="margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>FPS:</span> <span id="fps" style="color: #FFFF00; font-weight: bold;">60</span>
        </div>
        <div style="margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>Frame Time:</span> <span id="frameTime">0.00</span>ms
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Quality:</span> <span id="quality">HIGH</span>
        </div>
      </div>
      
      <div style="margin-bottom: 12px; padding: 10px; background: rgba(0, 255, 255, 0.1); border-radius: 4px; border-left: 3px solid #00FFFF;">
        <div style="font-weight: bold; margin-bottom: 6px; color: #00FFFF;">
          ⚙️ UPDATE BREAKDOWN
        </div>
        <div style="margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>Total:</span> <span id="updateTotal" style="font-weight: bold;">0.00</span>ms
        </div>
        <div style="margin-bottom: 3px; display: flex; justify-content: space-between; padding-left: 8px; font-size: 11px; opacity: 0.9;">
          <span>├─ Physics:</span> <span id="updatePhysics">0.00</span>ms
        </div>
        <div style="margin-bottom: 3px; display: flex; justify-content: space-between; padding-left: 8px; font-size: 11px; opacity: 0.9;">
          <span>├─ Animation:</span> <span id="updateAnimation">0.00</span>ms
        </div>
        <div style="margin-bottom: 6px; display: flex; justify-content: space-between; padding-left: 8px; font-size: 11px; opacity: 0.9;">
          <span>└─ Entity Sync:</span> <span id="updateEntitySync">0.00</span>ms
        </div>
        <div style="padding-top: 6px; border-top: 1px solid rgba(0,255,255,0.3); font-size: 11px; display: flex; justify-content: space-between;">
          <span>Custom Update Entities:</span> <span id="customUpdateCount">0</span>
        </div>
      </div>
      
      <div style="margin-bottom: 12px; padding: 10px; background: rgba(255, 0, 255, 0.1); border-radius: 4px; border-left: 3px solid #FF00FF;">
        <div style="font-weight: bold; margin-bottom: 6px; color: #FF00FF;">
          🎨 RENDER BREAKDOWN
        </div>
        <div style="margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>Total:</span> <span id="renderTotal" style="font-weight: bold;">0.00</span>ms
        </div>
        <div style="margin-bottom: 3px; display: flex; justify-content: space-between; padding-left: 8px; font-size: 11px; opacity: 0.9;">
          <span>├─ ECS Batch:</span> <span id="renderBatch">0.00</span>ms
        </div>
        <div style="margin-bottom: 6px; display: flex; justify-content: space-between; padding-left: 8px; font-size: 11px; opacity: 0.9;">
          <span>└─ Custom:</span> <span id="renderCustom">0.00</span>ms
        </div>
        <div style="padding-top: 6px; border-top: 1px solid rgba(255,0,255,0.3); font-size: 11px; display: flex; justify-content: space-between;">
          <span>WebGL Draw Calls:</span> <span id="drawCalls">0</span>
        </div>
      </div>
      
      <div style="margin-bottom: 12px; padding: 10px; background: rgba(255, 255, 0, 0.1); border-radius: 4px; border-left: 3px solid #FFFF00;">
        <div style="font-weight: bold; margin-bottom: 6px; color: #FFFF00;">
          📊 ECS METRICS
        </div>
        <div style="margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>Active Entities:</span> <span id="ecsActive" style="font-weight: bold;">0</span>
        </div>
        <div style="margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>Total Entities:</span> <span id="ecsTotal">0</span>
        </div>
        <div style="margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>Memory:</span> <span id="memory">0.0</span>MB
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; opacity: 0.9;">
          <span>Efficiency:</span> <span id="ecsEfficiency">100</span>%
        </div>
      </div>

      <div style="margin-bottom: 12px; padding: 10px; background: rgba(0, 255, 128, 0.1); border-radius: 4px; border-left: 3px solid #00FF80;">
        <div style="font-weight: bold; margin-bottom: 6px; color: #00FF80;">
          🔬 ADVANCED METRICS
        </div>
        <div style="margin-bottom: 3px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>Vertices/Frame:</span> <span id="verticesRendered">0</span>
        </div>
        <div style="margin-bottom: 3px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>Triangles/Frame:</span> <span id="trianglesRendered">0</span>
        </div>
        <div style="margin-bottom: 3px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>Batch Efficiency:</span> <span id="batchEfficiency">0</span>%
        </div>
        <div style="margin-bottom: 3px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>Buffer Upload:</span> <span id="bufferUploadSize">0.00</span>MB
        </div>
        <div style="margin-bottom: 3px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>State Changes:</span> <span id="stateChanges">0</span>
        </div>
        <div style="margin-bottom: 6px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>Time/Entity:</span> <span id="timePerEntity">0.00</span>μs
        </div>
        <div style="padding-top: 6px; border-top: 1px solid rgba(0,255,128,0.3); font-size: 11px; display: flex; justify-content: space-between;">
          <span>Bottleneck:</span> <span id="bottleneck" style="font-weight: bold;">BALANCED</span>
        </div>
        <div style="margin-top: 4px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>Perf Score:</span> <span id="performanceScore" style="font-weight: bold;">100</span>/100
        </div>
      </div>

      <div style="margin-bottom: 12px; padding: 10px; background: rgba(255, 128, 0, 0.1); border-radius: 4px; border-left: 3px solid #FF8000;">
        <div style="font-weight: bold; margin-bottom: 6px; color: #FF8000;">
          📈 FRAME PACING
        </div>
        <div style="margin-bottom: 3px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>1% Low:</span> <span id="frameTimeMin">0.00</span>ms
        </div>
        <div style="margin-bottom: 3px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>Average:</span> <span id="frameTimeAvg">0.00</span>ms
        </div>
        <div style="margin-bottom: 3px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>Worst:</span> <span id="frameTimeMax">0.00</span>ms
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>Variance:</span> <span id="frameTimeVariance">0.00</span>ms
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <h3 style="margin: 0 0 8px 0; color: #00FF00; font-size: 13px; font-weight: bold;">Canvas Resolution</h3>
        <select id="resolutionSelect" style="width: 100%; padding: 8px; background: #000; color: #00FF00; border: 1px solid #00FF00; border-radius: 4px; font-family: inherit; margin-bottom: 8px; font-size: 12px;">
          <option value="800x600">800×600 (4:3)</option>
          <option value="1024x768">1024×768 (4:3)</option>
          <option value="1280x720">1280×720 (16:9)</option>
          <option value="1366x768">1366×768 (16:9)</option>
          <option value="1920x1080" selected>1920×1080 (16:9)</option>
          <option value="2560x1440">2560×1440 (16:9)</option>
        </select>
        <button id="fullscreenBtn" style="width: 100%; padding: 8px; background: #00FF00; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">
          🖥️ Fullscreen
        </button>
      </div>
      
      <div style="margin-bottom: 12px;">
        <h3 style="margin: 0 0 8px 0; color: #00FF00; font-size: 13px; font-weight: bold;">Entity Controls</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 8px;">
          <button id="add100Btn" style="padding: 8px; background: #00FF00; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+100</button>
          <button id="add1000Btn" style="padding: 8px; background: #00FF00; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+1K</button>
          <button id="add10000Btn" style="padding: 8px; background: #00FF00; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+10K</button>
          <button id="add100000Btn" style="padding: 8px; background: #FF00FF; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+100K 🔥</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
          <button id="remove1000Btn" style="padding: 8px; background: #FF0000; color: #FFF; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">-1K</button>
          <button id="clearBtn" style="padding: 8px; background: #FF0000; color: #FFF; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">Clear All</button>
        </div>
      </div>
      
      <div style="font-size: 10px; color: #00AA00; text-align: center; padding-top: 10px; border-top: 1px solid #00FF00;">
        SPACE: Pause | CLICK: Spawn Burst
      </div>
    `;
    
    this.setupEventListeners(container);
    return container;
  }
  
  private setupEventListeners(container: HTMLDivElement): void {
    const resolutionSelect = container.querySelector('#resolutionSelect') as HTMLSelectElement;
    resolutionSelect.addEventListener('change', () => {
      const [width, height] = resolutionSelect.value.split('x').map(Number);
      this.engine.resize(width, height);
      const canvas = this.engine.canvas;
      if (canvas.parentElement) {
        canvas.parentElement.style.width = width + 'px';
        canvas.parentElement.style.height = height + 'px';
      }
    });
    
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
      this.scene.addEntities(100);
    });
    
    container.querySelector('#add1000Btn')?.addEventListener('click', () => {
      this.scene.addEntities(1000);
    });
    
    container.querySelector('#add10000Btn')?.addEventListener('click', () => {
      this.scene.addEntities(10000);
    });
    
    container.querySelector('#add100000Btn')?.addEventListener('click', () => {
      if (confirm('⚠️ Add 100,000 entities? This will stress test the engine!')) {
        this.scene.addEntities(100000);
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
  
  private updateMetrics(): void {
    const perfMonitorMetrics = this.engine.performanceMonitor.getMetrics();
    const scenePerfMetrics = (this.engine as any).currentScene?.perfMetrics;
    
    // Frame Metrics
    document.getElementById('fps')!.textContent = Math.round(perfMonitorMetrics.fps).toString();
    document.getElementById('frameTime')!.textContent = perfMonitorMetrics.frameTime.toFixed(2);
    document.getElementById('quality')!.textContent = perfMonitorMetrics.quality.toUpperCase();
    
    // Update Breakdown (from scene)
    if (scenePerfMetrics) {
      document.getElementById('updateTotal')!.textContent = scenePerfMetrics.updateTotal.toFixed(2);
      document.getElementById('updatePhysics')!.textContent = scenePerfMetrics.updatePhysics.toFixed(2);
      document.getElementById('updateAnimation')!.textContent = scenePerfMetrics.updateAnimation.toFixed(2);
      document.getElementById('updateEntitySync')!.textContent = scenePerfMetrics.updateEntitySync.toFixed(2);
      document.getElementById('customUpdateCount')!.textContent = scenePerfMetrics.customUpdateCount.toString();
    }
    
    // Render Breakdown (from scene)
    if (scenePerfMetrics) {
      document.getElementById('renderTotal')!.textContent = scenePerfMetrics.renderTotal.toFixed(2);
      document.getElementById('renderBatch')!.textContent = scenePerfMetrics.renderBatch.toFixed(2);
      document.getElementById('renderCustom')!.textContent = scenePerfMetrics.renderCustom.toFixed(2);
    }
    document.getElementById('drawCalls')!.textContent = perfMonitorMetrics.drawCalls.toString();
    
    // ECS Metrics (from scene)
    if (scenePerfMetrics) {
      document.getElementById('ecsActive')!.textContent = scenePerfMetrics.ecsActiveEntities.toLocaleString();
      document.getElementById('ecsTotal')!.textContent = scenePerfMetrics.ecsTotalEntities.toLocaleString();
      
      const efficiency = scenePerfMetrics.ecsTotalEntities > 0 
        ? (scenePerfMetrics.ecsActiveEntities / scenePerfMetrics.ecsTotalEntities * 100).toFixed(0)
        : '100';
      document.getElementById('ecsEfficiency')!.textContent = efficiency;
    }
    document.getElementById('memory')!.textContent = perfMonitorMetrics.memory.toFixed(1);
    
    // Advanced Metrics
    document.getElementById('verticesRendered')!.textContent = perfMonitorMetrics.verticesRendered.toLocaleString();
    document.getElementById('trianglesRendered')!.textContent = perfMonitorMetrics.trianglesRendered.toLocaleString();
    document.getElementById('batchEfficiency')!.textContent = (perfMonitorMetrics.batchEfficiency * 100).toFixed(1);
    document.getElementById('bufferUploadSize')!.textContent = perfMonitorMetrics.bufferUploadSize.toFixed(2);
    document.getElementById('stateChanges')!.textContent = perfMonitorMetrics.stateChanges.toString();
    document.getElementById('timePerEntity')!.textContent = perfMonitorMetrics.timePerEntity.toFixed(2);
    document.getElementById('bottleneck')!.textContent = perfMonitorMetrics.bottleneck.toUpperCase();
    document.getElementById('performanceScore')!.textContent = Math.round(perfMonitorMetrics.performanceScore).toString();
    
    // Frame Pacing
    document.getElementById('frameTimeMin')!.textContent = perfMonitorMetrics.frameTimeMin.toFixed(2);
    document.getElementById('frameTimeAvg')!.textContent = perfMonitorMetrics.frameTime.toFixed(2);
    document.getElementById('frameTimeMax')!.textContent = perfMonitorMetrics.frameTimeMax.toFixed(2);
    document.getElementById('frameTimeVariance')!.textContent = perfMonitorMetrics.frameTimeVariance.toFixed(2);
    
    // Color coding for FPS
    const fpsElement = document.getElementById('fps')!;
    if (perfMonitorMetrics.fps >= 58) {
      fpsElement.style.color = '#00FF00';
    } else if (perfMonitorMetrics.fps >= 45) {
      fpsElement.style.color = '#FFFF00';
    } else {
      fpsElement.style.color = '#FF0000';
    }
    
    // Color coding for bottleneck
    const bottleneckElement = document.getElementById('bottleneck')!;
    switch (perfMonitorMetrics.bottleneck) {
      case 'balanced':
        bottleneckElement.style.color = '#00FF00';
        break;
      case 'cpu':
        bottleneckElement.style.color = '#FFFF00';
        break;
      case 'gpu':
        bottleneckElement.style.color = '#FF8000';
        break;
      case 'memory':
        bottleneckElement.style.color = '#FF0000';
        break;
    }
    
    // Color coding for performance score
    const scoreElement = document.getElementById('performanceScore')!;
    const score = perfMonitorMetrics.performanceScore;
    if (score >= 90) {
      scoreElement.style.color = '#00FF00';
    } else if (score >= 70) {
      scoreElement.style.color = '#FFFF00';
    } else if (score >= 50) {
      scoreElement.style.color = '#FF8000';
    } else {
      scoreElement.style.color = '#FF0000';
    }
    
    // Update Total color coding
    const updateElement = document.getElementById('updateTotal')!;
    if (scenePerfMetrics) {
      if (scenePerfMetrics.updateTotal < 5) {
        updateElement.style.color = '#00FF00';
      } else if (scenePerfMetrics.updateTotal < 10) {
        updateElement.style.color = '#FFFF00';
      } else {
        updateElement.style.color = '#FF0000';
      }
    }
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
    border: 3px solid #00FF00;
    box-shadow: 0 0 30px rgba(0, 255, 0, 0.5), 0 0 60px rgba(0, 255, 0, 0.3);
    border-radius: 4px;
  `;
  
  const canvasWrapper = document.createElement('div');
  canvasWrapper.style.cssText = `
    width: 1920px;
    height: 1080px;
    position: relative;
  `;
  canvasWrapper.appendChild(canvas);
  container.appendChild(canvasWrapper);
  
  const engine = new Vectorium({
    canvas,
    width: 1920,
    height: 1080,
    preferWebGL2: true,
    targetFPS: 60,
    enableAdaptiveQuality: true,
    initialQuality: 'high',
    debugMode: false
  });
  
  const scene = new DemoScene('demo');
  engine.registerScene('demo', scene);
  engine.loadScene('demo').then(() => {
    engine.start();
  });
  
  new UIControls(engine, scene);
  
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
