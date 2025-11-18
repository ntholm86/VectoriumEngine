/**
 * Vectorium Engine - Interactive Demo with Enhanced Performance Monitoring
 * Showcases all engine capabilities with detailed metrics
 */

import { Vectorium, Scene, Entity, Viewport } from './vectorium/core/Engine';
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
    
    this.addEntities(1000, true); // Spawn in viewport by default
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
          <span>WebGL Draw Calls:</span> <span id="drawCalls" style="font-weight: bold;">0</span>
        </div>
        <div style="font-size: 11px; display: flex; justify-content: space-between; margin-top: 4px;">
          <span>Rendering Mode:</span> <span id="renderMode" style="font-weight: bold; color: #FF00FF;">Batch</span>
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

      <div style="margin-bottom: 12px; padding: 10px; background: rgba(128, 0, 255, 0.1); border-radius: 4px; border-left: 3px solid #8000FF;">
        <div style="font-weight: bold; margin-bottom: 6px; color: #8000FF;">
          🎯 FRUSTUM CULLING
        </div>
        <div style="margin-bottom: 3px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>Visible Entities:</span> <span id="entitiesInFrustum" style="font-weight: bold;">0</span>
        </div>
        <div style="margin-bottom: 3px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>Culled Entities:</span> <span id="entitiesCulled">0</span>
        </div>
        <div style="margin-bottom: 6px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>Culling Efficiency:</span> <span id="cullingEfficiency" style="font-weight: bold;">0.0</span>%
        </div>
        <div style="padding-top: 6px; border-top: 1px solid rgba(128,0,255,0.3); font-size: 11px;">
          <button id="toggleCullingBtn" style="width: 100%; padding: 6px; background: #8000FF; color: #FFF; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px; margin-bottom: 6px;">
            ✓ Culling ON
          </button>
          <button id="toggleGPURotationBtn" style="width: 100%; padding: 6px; background: #666; color: #FFF; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 11px;" title="Experimental: GPU-side rotation (has rendering artifacts)">
            🧪 GPU Rotation (OFF)
          </button>
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
      
      <div style="margin-bottom: 12px; padding: 10px; background: rgba(255, 165, 0, 0.1); border-radius: 4px; border-left: 3px solid #FFA500;">
        <h3 style="margin: 0 0 8px 0; color: #FFA500; font-size: 13px; font-weight: bold;">🔧 Batch Size Tuning</h3>
        <div style="margin-bottom: 6px; font-size: 10px; color: #FFCC00; line-height: 1.4;">
          Smaller = More draw calls, better GPU pipelining<br>
          Larger = Fewer draw calls, possible stalling
        </div>
        <select id="batchSizeSelect" style="width: 100%; padding: 8px; background: #000; color: #FFA500; border: 1px solid #FFA500; border-radius: 4px; font-family: inherit; margin-bottom: 6px; font-size: 12px;">
          <option value="16000">16K sprites/batch (more calls)</option>
          <option value="32000">32K sprites/batch</option>
          <option value="48000">48K sprites/batch</option>
          <option value="65000" selected>65K sprites/batch (default)</option>
        </select>
        <div style="font-size: 10px; color: #AAA; text-align: center;">
          Current: <span id="currentBatchSize" style="color: #FFA500; font-weight: bold;">65000</span>
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <h3 style="margin: 0 0 8px 0; color: #00FF00; font-size: 13px; font-weight: bold;">Entity Controls</h3>
        <div style="margin-bottom: 6px; font-size: 11px; color: #FFFF00;">
          🌍 World Spawning (10x area):
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 8px;">
          <button id="add100Btn" style="padding: 8px; background: #00FF00; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+100</button>
          <button id="add1000Btn" style="padding: 8px; background: #00FF00; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+1K</button>
          <button id="add10000Btn" style="padding: 8px; background: #00FF00; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+10K</button>
          <button id="add100000Btn" style="padding: 8px; background: #FF00FF; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+100K 🔥</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px;">
          <button id="add500000Btn" style="padding: 8px; background: #FF0000; color: #FFF; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+500K 💥</button>
          <button id="add1000000Btn" style="padding: 8px; background: #FF0000; color: #FFF; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+1M ☢️</button>
        </div>
        <div style="margin-bottom: 6px; font-size: 11px; color: #00FFFF;">
          📺 Viewport Spawning (visible):
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 8px;">
          <button id="addViewport100Btn" style="padding: 8px; background: #00FFFF; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+100 👁️</button>
          <button id="addViewport1000Btn" style="padding: 8px; background: #00FFFF; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+1K 👁️</button>
          <button id="addViewport10000Btn" style="padding: 8px; background: #00FFFF; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+10K 👁️</button>
          <button id="addViewport100000Btn" style="padding: 8px; background: #00AAAA; color: #FFF; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: inherit; font-size: 12px;">+100K 👁️</button>
        </div>
        
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 8px;">
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
      
      // Resize engine (this updates both WebGL canvas AND text overlay canvas)
      this.engine.resize(width, height);
      
      // Update canvas wrapper size to match exactly (no rounding issues)
      const canvas = this.engine.canvas;
      if (canvas.parentElement) {
        canvas.parentElement.style.width = `${width}px`;
        canvas.parentElement.style.height = `${height}px`;
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
    
    const batchSizeSelect = container.querySelector('#batchSizeSelect') as HTMLSelectElement;
    batchSizeSelect.addEventListener('change', () => {
      const batchSize = parseInt(batchSizeSelect.value, 10);
      const renderer = this.engine.getRenderer();
      if (renderer && 'setBatchSize' in renderer) {
        (renderer as WebGLBatchRenderer).setBatchSize(batchSize);
        const currentBatchSizeSpan = container.querySelector('#currentBatchSize');
        if (currentBatchSizeSpan) {
          currentBatchSizeSpan.textContent = batchSize.toString();
        }
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
    
    // Viewport spawning buttons (spawn entities in visible area only)
    container.querySelector('#addViewport100Btn')?.addEventListener('click', () => {
      this.scene.addEntities(100, true); // true = viewport only
    });
    
    container.querySelector('#addViewport1000Btn')?.addEventListener('click', () => {
      this.scene.addEntities(1000, true);
    });
    
    container.querySelector('#addViewport10000Btn')?.addEventListener('click', () => {
      this.scene.addEntities(10000, true);
    });
    
    container.querySelector('#addViewport100000Btn')?.addEventListener('click', () => {
      if (confirm('⚠️ Add 100,000 entities in viewport? Screen will be PACKED!')) {
        this.scene.addEntities(100000, true);
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
    
    // Culling toggle button
    let cullingEnabled = true;
    const toggleCullingBtn = container.querySelector('#toggleCullingBtn') as HTMLButtonElement;
    toggleCullingBtn?.addEventListener('click', () => {
      cullingEnabled = !cullingEnabled;
      const currentScene = (this.engine as any).currentScene;
      if (currentScene) {
        currentScene.setCullingEnabled(cullingEnabled);
      }
      toggleCullingBtn.textContent = cullingEnabled ? '✓ Culling ON' : '✗ Culling OFF';
      toggleCullingBtn.style.background = cullingEnabled ? '#8000FF' : '#666';
    });
    
    // GPU Rotation toggle button (EXPERIMENTAL - has rendering artifacts)
    let gpuRotationEnabled = false;
    const toggleGPURotationBtn = container.querySelector('#toggleGPURotationBtn') as HTMLButtonElement;
    toggleGPURotationBtn?.addEventListener('click', () => {
      gpuRotationEnabled = !gpuRotationEnabled;
      const renderer = (this.engine as any).renderer;
      if (renderer) {
        renderer.setGPURotationEnabled(gpuRotationEnabled);
        console.warn(`🧪 GPU Rotation ${gpuRotationEnabled ? 'ENABLED' : 'DISABLED'} - Experimental feature with known rendering artifacts`);
      }
      toggleGPURotationBtn.textContent = gpuRotationEnabled ? '🧪 GPU Rotation (ON)' : '🧪 GPU Rotation (OFF)';
      toggleGPURotationBtn.style.background = gpuRotationEnabled ? '#FFAA00' : '#666';
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
    
    // Rendering mode indicator
    const renderer = (this.engine as any).renderer;
    const renderModeEl = document.getElementById('renderMode');
    if (renderModeEl) {
      if (renderer.isInstancingActive()) {
        renderModeEl.textContent = '🚀 Instanced';
        renderModeEl.style.color = '#FF00FF';
      } else {
        renderModeEl.textContent = 'Batch';
        renderModeEl.style.color = '#AAA';
      }
    }
    
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
    
    // Culling Metrics (NEW!)
    const inFrustum = perfMonitorMetrics.entitiesInFrustum || 0;
    const culled = perfMonitorMetrics.entitiesCulled || 0;
    const cullingEff = perfMonitorMetrics.cullingEfficiency || 0;
    document.getElementById('entitiesInFrustum')!.textContent = inFrustum.toLocaleString();
    document.getElementById('entitiesCulled')!.textContent = culled.toLocaleString();
    document.getElementById('cullingEfficiency')!.textContent = cullingEff.toFixed(1);
    
    // Color code culling efficiency
    const cullingEffElement = document.getElementById('cullingEfficiency')!;;
    if (cullingEff > 50) {
      cullingEffElement.style.color = '#00FF00'; // Green = great culling
    } else if (cullingEff > 20) {
      cullingEffElement.style.color = '#FFFF00'; // Yellow = moderate
    } else {
      cullingEffElement.style.color = '#FF8000'; // Orange = low culling
    }
    
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
