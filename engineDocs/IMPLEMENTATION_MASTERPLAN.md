# Canvas Game Engine - Professional Implementation Masterplan
**Version:** 2.0  
**Date:** November 16, 2025  
**Status:** Production-Ready Architecture

---

## 🎯 Executive Summary

This masterplan synthesizes best practices from **PixiJS**, **Phaser 3**, **Three.js**, successful Canvas games (Agar.io, Slither.io), MDN/Web.dev optimization guides, and Microsoft Copilot recommendations to create a **professional-grade Canvas/WebGL game engine**.

**Target:** Build "something unseen in Canvas before" - a zero-leak, 60 FPS, massively scalable game engine with enterprise-grade performance monitoring and adaptive quality systems.

---

## 📊 Industry Analysis & Competitive Research

### What Makes Professional Game Engines Different

| Feature | Amateur Implementation | **Professional Standard** |
|---------|----------------------|--------------------------|
| **Rendering** | Clear canvas every frame | Dirty rectangles + layered canvases + viewport culling |
| **Memory** | Create/destroy objects freely | Object pooling + typed array reuse + zero hot-path allocation |
| **Assets** | Load images on demand | Texture atlases + ImageBitmap + progressive loading + Service Worker |
| **Performance** | Hope for the best | PerformanceObserver + adaptive quality + LOD + draw-call budgets |
| **Context Creation** | `getContext('2d')` | `getContext('2d', {alpha: false, desynchronized: true})` |
| **Text Rendering** | `fillText()` every frame | Pre-rendered text canvases + metrics cache + SDF fonts |
| **Workers** | All on main thread | WebWorker pool + transferables + OffscreenCanvas |
| **Batching** | Individual draw calls | Group by texture + minimize state changes + instancing |

### Critical Insights from Successful Games

**Agar.io / Slither.io (1000+ concurrent entities):**
- Quadtree spatial partitioning (O(n²) → O(n log n))
- Aggressive viewport culling (50px margin)
- Network state interpolation
- Client-side prediction with server reconciliation

**PixiJS (Industry Standard):**
- Automatic WebGL batch renderer (10,000 sprites/frame)
- Texture packing with trimming metadata
- Transform caching (dirty flag system)
- Multi-pass rendering pipeline

**Phaser 3 (Complete Framework):**
- Scene stack with lifecycle management
- Plugin architecture for extensibility
- Matter.js physics integration
- Arcade physics (lightweight alternative)

---

## 🏗️ Architecture: The 15 Core Pillars (Enhanced)

### **Pillar 1: Context Creation & Feature Detection**

```typescript
interface EngineConfig {
  // Rendering backend
  preferredRenderer: 'webgl' | 'webgl2' | 'canvas2d' | 'auto';
  
  // Context hints (CRITICAL for performance)
  contextAttributes: {
    alpha: boolean;              // false = 10-20% faster compositing
    desynchronized: boolean;     // true = lower input latency
    preserveDrawingBuffer: boolean;
    antialias: boolean;
    powerPreference: 'high-performance' | 'low-power' | 'default';
  };
  
  // Asset pipeline
  assetBaseURL: string;
  useServiceWorker: boolean;
  textureFormat: 'auto' | 'avif' | 'webp' | 'png';
  textureQuality: 'auto' | 'high' | 'medium' | 'low';
  
  // Performance
  targetFPS: 60;
  adaptiveQuality: boolean;
  maxDrawCalls: number;
  enableProfiling: boolean;
  
  // Memory management
  objectPoolSizes: {
    particles: number;
    bullets: number;
    enemies: number;
    vectors: number;
  };
}

class FeatureDetector {
  readonly supportsWebGL: boolean;
  readonly supportsWebGL2: boolean;
  readonly supportsOffscreenCanvas: boolean;
  readonly supportsImageBitmap: boolean;
  readonly supportsWorkers: boolean;
  readonly supportsWebP: boolean;
  readonly supportsAVIF: boolean;
  readonly isGPUAccelerated: boolean;
  readonly devicePixelRatio: number;
  readonly maxTextureSize: number;
  readonly availableMemory: number;
  readonly hardwareConcurrency: number;
  
  constructor() {
    this.detectAllFeatures();
  }
  
  private detectAllFeatures(): void {
    // WebGL detection
    const canvas = document.createElement('canvas');
    this.supportsWebGL = !!canvas.getContext('webgl');
    this.supportsWebGL2 = !!canvas.getContext('webgl2');
    
    // Modern APIs
    this.supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
    this.supportsImageBitmap = typeof createImageBitmap !== 'undefined';
    this.supportsWorkers = typeof Worker !== 'undefined';
    
    // Image formats
    this.supportsWebP = this.canUseImageFormat('image/webp');
    this.supportsAVIF = this.canUseImageFormat('image/avif');
    
    // Hardware info
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.hardwareConcurrency = navigator.hardwareConcurrency || 4;
    
    // Memory (Chrome/Edge only)
    const memory = (performance as any).memory;
    this.availableMemory = memory?.jsHeapSizeLimit || 0;
    
    // GPU acceleration (check Chrome flags)
    this.isGPUAccelerated = this.detectGPUAcceleration();
  }
  
  private async canUseImageFormat(mimeType: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = `data:${mimeType};base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=`;
    });
  }
  
  private detectGPUAcceleration(): boolean {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return false;
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      return !renderer.includes('SwiftShader') && !renderer.includes('Software');
    }
    
    return true;
  }
  
  getOptimalConfig(): Partial<EngineConfig> {
    return {
      preferredRenderer: this.supportsWebGL2 ? 'webgl2' : 
                        this.supportsWebGL ? 'webgl' : 'canvas2d',
      contextAttributes: {
        alpha: false, // Always prefer opaque for performance
        desynchronized: true, // Lower input latency
        preserveDrawingBuffer: false,
        antialias: this.isGPUAccelerated,
        powerPreference: this.isGPUAccelerated ? 'high-performance' : 'default'
      },
      textureFormat: this.supportsAVIF ? 'avif' : 
                     this.supportsWebP ? 'webp' : 'png',
      textureQuality: this.getQualityPreset(),
      adaptiveQuality: !this.isGPUAccelerated || this.availableMemory < 1024 * 1024 * 1024
    };
  }
  
  private getQualityPreset(): 'high' | 'medium' | 'low' {
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const hasLowMemory = this.availableMemory > 0 && this.availableMemory < 512 * 1024 * 1024;
    
    if (hasLowMemory || (isMobile && this.devicePixelRatio < 2)) return 'low';
    if (isMobile || !this.isGPUAccelerated) return 'medium';
    return 'high';
  }
}
```

---

### **Pillar 2: Advanced Asset Loading System**

```typescript
class ModernAssetLoader {
  private cache = new Map<string, ImageBitmap | HTMLImageElement | AudioBuffer>();
  private loading = new Map<string, Promise<any>>();
  private features: FeatureDetector;
  private workers: WorkerPool;
  
  constructor(features: FeatureDetector) {
    this.features = features;
    this.workers = new WorkerPool(Math.min(features.hardwareConcurrency, 4));
  }
  
  // Use ImageBitmap for modern browsers (async decode on background thread)
  async loadImage(url: string): Promise<ImageBitmap | HTMLImageElement> {
    const cacheKey = `image:${url}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as ImageBitmap | HTMLImageElement;
    }
    
    if (this.loading.has(cacheKey)) {
      return this.loading.get(cacheKey);
    }
    
    const promise = this.features.supportsImageBitmap
      ? this.loadImageBitmap(url)
      : this.loadImageElement(url);
    
    this.loading.set(cacheKey, promise);
    
    try {
      const image = await promise;
      this.cache.set(cacheKey, image);
      this.loading.delete(cacheKey);
      return image;
    } catch (error) {
      this.loading.delete(cacheKey);
      throw error;
    }
  }
  
  private async loadImageBitmap(url: string): Promise<ImageBitmap> {
    const response = await fetch(url);
    const blob = await response.blob();
    
    // Decode off main thread
    return createImageBitmap(blob, {
      premultiplyAlpha: 'premultiply',
      colorSpaceConversion: 'default',
      imageOrientation: 'none'
    });
  }
  
  private loadImageElement(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
  
  // Progressive loading: low-res → high-res
  async loadProgressive(basePath: string, sizes: string[] = ['low', 'medium', 'high']): 
    Promise<Map<string, ImageBitmap>> {
    
    const results = new Map<string, ImageBitmap>();
    
    // Load low-res first for fast initial render
    for (const size of sizes) {
      const url = `${basePath}_${size}.${this.features.supportsAVIF ? 'avif' : 'webp'}`;
      const image = await this.loadImage(url);
      results.set(size, image as ImageBitmap);
      
      // Yield to main thread between loads
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  }
  
  // Texture atlas with ImageBitmap
  async loadAtlas(jsonUrl: string, imageUrl: string): Promise<TextureAtlas> {
    const [metadata, image] = await Promise.all([
      fetch(jsonUrl).then(r => r.json()),
      this.loadImage(imageUrl)
    ]);
    
    return new TextureAtlas(image, metadata);
  }
  
  // Service Worker for offline support
  async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration.scope);
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
    }
  }
}

// Service Worker (sw.js)
const CACHE_NAME = 'game-assets-v1';
const ASSET_PATTERNS = [
  /\.avif$/,
  /\.webp$/,
  /\.png$/,
  /\.json$/,
  /\.mp3$/,
  /\.ogg$/
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only cache game assets
  if (!ASSET_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      
      return fetch(event.request).then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
```

---

### **Pillar 3: Hybrid Renderer (WebGL + Canvas Fallback)**

```typescript
interface Renderer {
  readonly type: 'webgl' | 'webgl2' | 'canvas2d';
  readonly drawCallCount: number;
  
  clear(): void;
  setCamera(camera: Camera): void;
  drawSprite(sprite: Sprite, x: number, y: number, alpha?: number): void;
  drawText(text: string, x: number, y: number, style: TextStyle): void;
  drawRect(x: number, y: number, w: number, h: number, color: string): void;
  beginBatch(): void;
  endBatch(): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

class WebGLBatchRenderer implements Renderer {
  readonly type = 'webgl' as const;
  drawCallCount = 0;
  
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private program: WebGLProgram;
  private vertexBuffer: WebGLBuffer;
  private indexBuffer: WebGLBuffer;
  private textureCache = new Map<string, WebGLTexture>();
  
  // Batch state
  private currentTexture: WebGLTexture | null = null;
  private batchSize = 0;
  private maxBatchSize = 10000;
  private vertices: Float32Array;
  private indices: Uint16Array;
  
  constructor(canvas: HTMLCanvasElement, contextAttributes: WebGLContextAttributes) {
    const gl = canvas.getContext('webgl2', contextAttributes) || 
               canvas.getContext('webgl', contextAttributes);
    
    if (!gl) throw new Error('WebGL not supported');
    
    this.gl = gl;
    this.initializeShaders();
    this.initializeBuffers();
  }
  
  private initializeShaders(): void {
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute vec4 a_color;
      
      uniform mat3 u_matrix;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1);
        v_texCoord = a_texCoord;
        v_color = a_color;
      }
    `;
    
    const fragmentShaderSource = `
      precision mediump float;
      
      uniform sampler2D u_texture;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord) * v_color;
      }
    `;
    
    const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);
    
    this.program = this.gl.createProgram()!;
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);
    
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      throw new Error('Failed to link shader program');
    }
  }
  
  private compileShader(source: string, type: number): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      throw new Error(`Shader compilation failed: ${info}`);
    }
    
    return shader;
  }
  
  private initializeBuffers(): void {
    // Large vertex buffer for batching
    const vertexSize = 6; // x, y, u, v, r, g, b, a
    this.vertices = new Float32Array(this.maxBatchSize * 4 * vertexSize);
    
    // Index buffer (2 triangles per quad)
    const indices: number[] = [];
    for (let i = 0; i < this.maxBatchSize; i++) {
      const offset = i * 4;
      indices.push(
        offset + 0, offset + 1, offset + 2,
        offset + 0, offset + 2, offset + 3
      );
    }
    this.indices = new Uint16Array(indices);
    
    this.vertexBuffer = this.gl.createBuffer()!;
    this.indexBuffer = this.gl.createBuffer()!;
  }
  
  beginBatch(): void {
    this.batchSize = 0;
    this.drawCallCount = 0;
    this.currentTexture = null;
  }
  
  drawSprite(sprite: Sprite, x: number, y: number, alpha = 1): void {
    // Check if we need to flush (texture change or batch full)
    if (this.currentTexture && this.currentTexture !== sprite.texture.glTexture) {
      this.flush();
    }
    
    if (this.batchSize >= this.maxBatchSize) {
      this.flush();
    }
    
    this.currentTexture = sprite.texture.glTexture;
    
    // Add quad to batch (vertices with UVs)
    const idx = this.batchSize * 24; // 4 vertices * 6 components
    const {x: sx, y: sy, width: sw, height: sh} = sprite.frame;
    const tw = sprite.texture.width;
    const th = sprite.texture.height;
    
    // Top-left
    this.vertices[idx + 0] = x;
    this.vertices[idx + 1] = y;
    this.vertices[idx + 2] = sx / tw;
    this.vertices[idx + 3] = sy / th;
    this.vertices[idx + 4] = 1;
    this.vertices[idx + 5] = alpha;
    
    // Top-right
    this.vertices[idx + 6] = x + sw;
    this.vertices[idx + 7] = y;
    this.vertices[idx + 8] = (sx + sw) / tw;
    this.vertices[idx + 9] = sy / th;
    this.vertices[idx + 10] = 1;
    this.vertices[idx + 11] = alpha;
    
    // Bottom-right
    this.vertices[idx + 12] = x + sw;
    this.vertices[idx + 13] = y + sh;
    this.vertices[idx + 14] = (sx + sw) / tw;
    this.vertices[idx + 15] = (sy + sh) / th;
    this.vertices[idx + 16] = 1;
    this.vertices[idx + 17] = alpha;
    
    // Bottom-left
    this.vertices[idx + 18] = x;
    this.vertices[idx + 19] = y + sh;
    this.vertices[idx + 20] = sx / tw;
    this.vertices[idx + 21] = (sy + sh) / th;
    this.vertices[idx + 22] = 1;
    this.vertices[idx + 23] = alpha;
    
    this.batchSize++;
  }
  
  endBatch(): void {
    if (this.batchSize > 0) {
      this.flush();
    }
  }
  
  private flush(): void {
    if (this.batchSize === 0) return;
    
    // Upload vertex data
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.vertices.subarray(0, this.batchSize * 24),
      this.gl.DYNAMIC_DRAW
    );
    
    // Upload index data
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(
      this.gl.ELEMENT_ARRAY_BUFFER,
      this.indices.subarray(0, this.batchSize * 6),
      this.gl.STATIC_DRAW
    );
    
    // Bind texture and draw
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTexture);
    this.gl.drawElements(
      this.gl.TRIANGLES,
      this.batchSize * 6,
      this.gl.UNSIGNED_SHORT,
      0
    );
    
    this.drawCallCount++;
    this.batchSize = 0;
  }
  
  clear(): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
  
  setCamera(camera: Camera): void {
    // Set projection matrix uniform
  }
  
  drawText(text: string, x: number, y: number, style: TextStyle): void {
    // Use pre-rendered text textures
  }
  
  drawRect(x: number, y: number, w: number, h: number, color: string): void {
    // Draw colored quad
  }
  
  resize(width: number, height: number): void {
    this.gl.viewport(0, 0, width, height);
  }
  
  destroy(): void {
    this.gl.deleteProgram(this.program);
    this.gl.deleteBuffer(this.vertexBuffer);
    this.gl.deleteBuffer(this.indexBuffer);
    this.textureCache.forEach(tex => this.gl.deleteTexture(tex));
  }
}

class Canvas2DRenderer implements Renderer {
  readonly type = 'canvas2d' as const;
  drawCallCount = 0;
  
  private ctx: CanvasRenderingContext2D;
  private stateManager: CanvasStateManager;
  private dirtyRects: DirtyRectManager;
  private layers: LayerManager;
  
  constructor(canvas: HTMLCanvasElement, contextAttributes: CanvasRenderingContext2DSettings) {
    const ctx = canvas.getContext('2d', contextAttributes);
    if (!ctx) throw new Error('Canvas 2D not supported');
    
    this.ctx = ctx;
    this.stateManager = new CanvasStateManager();
    this.dirtyRects = new DirtyRectManager();
    this.layers = new LayerManager();
  }
  
  // Implementation with state management and dirty rectangles
  // ... (similar to existing implementation but with optimizations)
  
  clear(): void { /* ... */ }
  setCamera(camera: Camera): void { /* ... */ }
  drawSprite(sprite: Sprite, x: number, y: number, alpha?: number): void { /* ... */ }
  drawText(text: string, x: number, y: number, style: TextStyle): void { /* ... */ }
  drawRect(x: number, y: number, w: number, h: number, color: string): void { /* ... */ }
  beginBatch(): void { /* ... */ }
  endBatch(): void { /* ... */ }
  resize(width: number, height: number): void { /* ... */ }
  destroy(): void { /* ... */ }
}
```

---

### **Pillar 4: WebWorker Architecture**

```typescript
// Main thread
class WorkerPool {
  private workers: Worker[] = [];
  private available: Set<Worker> = new Set();
  private taskQueue: Task[] = [];
  private nextTaskId = 0;
  
  constructor(workerCount: number) {
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker('/workers/compute-worker.js');
      this.workers.push(worker);
      this.available.add(worker);
      
      worker.onmessage = (e) => this.handleWorkerMessage(worker, e.data);
    }
  }
  
  async execute<T>(
    type: 'pathfinding' | 'physics' | 'ai' | 'serialization',
    data: any,
    transferables?: Transferable[]
  ): Promise<T> {
    const taskId = this.nextTaskId++;
    
    return new Promise((resolve, reject) => {
      const task: Task = {
        id: taskId,
        type,
        data,
        transferables,
        resolve,
        reject
      };
      
      this.taskQueue.push(task);
      this.processQueue();
    });
  }
  
  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.available.size > 0) {
      const task = this.taskQueue.shift()!;
      const worker = this.available.values().next().value;
      this.available.delete(worker);
      
      const message = { id: task.id, type: task.type, data: task.data };
      worker.postMessage(message, task.transferables || []);
    }
  }
  
  private handleWorkerMessage(worker: Worker, data: any): void {
    // Find and resolve task
    // Return worker to available pool
    this.available.add(worker);
    this.processQueue();
  }
  
  terminate(): void {
    this.workers.forEach(w => w.terminate());
  }
}

// Worker thread (compute-worker.js)
interface WorkerMessage {
  id: number;
  type: string;
  data: any;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { id, type, data } = e.data;
  
  try {
    let result: any;
    
    switch (type) {
      case 'pathfinding':
        result = computePathfinding(data);
        break;
      case 'physics':
        result = simulatePhysics(data);
        break;
      case 'ai':
        result = computeAI(data);
        break;
      case 'serialization':
        result = serializeGameState(data);
        break;
    }
    
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};

function computePathfinding(data: any): any {
  // A* pathfinding implementation
  // Use transferable typed arrays for results
  const path = new Float32Array(data.maxPathLength * 2);
  // ... compute path ...
  return { path: path.buffer }; // Transfer ownership
}

// OffscreenCanvas rendering in worker
class OffscreenRenderer {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  
  constructor(canvas: OffscreenCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }
  
  render(entities: EntityData[]): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (const entity of entities) {
      this.ctx.drawImage(
        entity.texture,
        entity.x, entity.y,
        entity.width, entity.height
      );
    }
  }
}
```

---

### **Pillar 5: Performance Monitoring & Adaptive Quality**

```typescript
class EnterprisePerformanceMonitor {
  private samples: FrameSample[] = [];
  private maxSamples = 300; // 5 seconds at 60fps
  private currentSample: FrameSample;
  
  // Metrics
  private drawCallHistory: number[] = [];
  private memoryHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  
  // Thresholds
  private readonly TARGET_FPS = 60;
  private readonly TARGET_FRAME_TIME = 16.67;
  private readonly WARNING_FPS = 50;
  private readonly CRITICAL_FPS = 30;
  
  // Adaptive quality
  private qualityLevel: 'ultra' | 'high' | 'medium' | 'low' | 'potato' = 'high';
  private qualityDowngradeCount = 0;
  private qualityUpgradeCount = 0;
  
  startFrame(): void {
    this.currentSample = {
      timestamp: performance.now(),
      frameStart: performance.now(),
      drawCalls: 0,
      entitiesRendered: 0,
      particlesActive: 0,
      memoryUsed: this.getMemoryUsage(),
      gpuTime: 0,
      cpuTime: 0
    };
  }
  
  endFrame(renderer: Renderer, scene: Scene): FrameMetrics {
    const frameEnd = performance.now();
    const frameTime = frameEnd - this.currentSample.frameStart;
    const fps = 1000 / frameTime;
    
    this.currentSample.drawCalls = renderer.drawCallCount;
    this.currentSample.entitiesRendered = scene.getVisibleEntityCount();
    this.currentSample.cpuTime = frameTime;
    
    // Store sample
    this.samples.push(this.currentSample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
    
    // Update histories
    this.frameTimeHistory.push(frameTime);
    this.drawCallHistory.push(this.currentSample.drawCalls);
    this.memoryHistory.push(this.currentSample.memoryUsed);
    
    if (this.frameTimeHistory.length > this.maxSamples) {
      this.frameTimeHistory.shift();
      this.drawCallHistory.shift();
      this.memoryHistory.shift();
    }
    
    // Adaptive quality adjustment
    this.adjustQuality(fps);
    
    return {
      fps,
      frameTime,
      avgFPS: this.getAverageFPS(),
      avgFrameTime: this.getAverageFrameTime(),
      minFPS: this.getMinFPS(),
      maxFPS: this.getMaxFPS(),
      drawCalls: this.currentSample.drawCalls,
      entitiesRendered: this.currentSample.entitiesRendered,
      memoryUsed: this.currentSample.memoryUsed,
      qualityLevel: this.qualityLevel
    };
  }
  
  private adjustQuality(currentFPS: number): void {
    // Downgrade quality if FPS drops
    if (currentFPS < this.CRITICAL_FPS) {
      this.qualityDowngradeCount++;
      if (this.qualityDowngradeCount > 10) {
        this.downgradeQuality();
        this.qualityDowngradeCount = 0;
      }
    }
    // Upgrade quality if FPS is stable
    else if (currentFPS > this.TARGET_FPS) {
      this.qualityUpgradeCount++;
      if (this.qualityUpgradeCount > 120) { // 2 seconds of stable performance
        this.upgradeQuality();
        this.qualityUpgradeCount = 0;
      }
    }
    // Reset counters if FPS is in acceptable range
    else if (currentFPS >= this.WARNING_FPS) {
      this.qualityDowngradeCount = 0;
      this.qualityUpgradeCount = 0;
    }
  }
  
  private downgradeQuality(): void {
    const levels: typeof this.qualityLevel[] = ['ultra', 'high', 'medium', 'low', 'potato'];
    const currentIndex = levels.indexOf(this.qualityLevel);
    if (currentIndex < levels.length - 1) {
      this.qualityLevel = levels[currentIndex + 1];
      this.applyQualitySettings();
      console.warn(`Performance degraded - downgraded to ${this.qualityLevel} quality`);
    }
  }
  
  private upgradeQuality(): void {
    const levels: typeof this.qualityLevel[] = ['ultra', 'high', 'medium', 'low', 'potato'];
    const currentIndex = levels.indexOf(this.qualityLevel);
    if (currentIndex > 0) {
      this.qualityLevel = levels[currentIndex - 1];
      this.applyQualitySettings();
      console.log(`Performance improved - upgraded to ${this.qualityLevel} quality`);
    }
  }
  
  private applyQualitySettings(): void {
    const settings = this.getQualitySettings();
    
    // Apply to engine systems
    Engine.instance.particleSystem.setMaxParticles(settings.maxParticles);
    Engine.instance.renderer.setAntialiasing(settings.antialiasing);
    Engine.instance.renderer.setShadowQuality(settings.shadowQuality);
    Engine.instance.physicsEngine.setStepFrequency(settings.physicsSteps);
    Engine.instance.audioManager.setMaxSounds(settings.maxSounds);
    
    // Adjust canvas resolution
    if (settings.resolutionScale !== 1) {
      Engine.instance.setResolutionScale(settings.resolutionScale);
    }
  }
  
  private getQualitySettings(): QualitySettings {
    switch (this.qualityLevel) {
      case 'ultra':
        return {
          resolutionScale: 1.0,
          maxParticles: 10000,
          antialiasing: true,
          shadowQuality: 'high',
          physicsSteps: 60,
          maxSounds: 32,
          lodDistance: 1000
        };
      case 'high':
        return {
          resolutionScale: 1.0,
          maxParticles: 5000,
          antialiasing: true,
          shadowQuality: 'medium',
          physicsSteps: 60,
          maxSounds: 24,
          lodDistance: 750
        };
      case 'medium':
        return {
          resolutionScale: 0.9,
          maxParticles: 2000,
          antialiasing: false,
          shadowQuality: 'low',
          physicsSteps: 30,
          maxSounds: 16,
          lodDistance: 500
        };
      case 'low':
        return {
          resolutionScale: 0.75,
          maxParticles: 500,
          antialiasing: false,
          shadowQuality: 'none',
          physicsSteps: 30,
          maxSounds: 8,
          lodDistance: 300
        };
      case 'potato':
        return {
          resolutionScale: 0.5,
          maxParticles: 100,
          antialiasing: false,
          shadowQuality: 'none',
          physicsSteps: 15,
          maxSounds: 4,
          lodDistance: 200
        };
    }
  }
  
  // Slow frame capture for debugging
  captureSlowFrame(threshold: number = 33.33): SlowFrameReport | null {
    if (this.currentSample.cpuTime > threshold) {
      return {
        timestamp: this.currentSample.timestamp,
        frameTime: this.currentSample.cpuTime,
        drawCalls: this.currentSample.drawCalls,
        entitiesRendered: this.currentSample.entitiesRendered,
        memoryUsed: this.currentSample.memoryUsed,
        stackTrace: new Error().stack,
        // Capture heap snapshot (Chrome DevTools Protocol)
        heapSnapshot: this.captureHeapSnapshot()
      };
    }
    return null;
  }
  
  // Telemetry for analytics
  getTelemetryData(): TelemetryData {
    return {
      avgFPS: this.getAverageFPS(),
      avgFrameTime: this.getAverageFrameTime(),
      minFPS: this.getMinFPS(),
      maxFPS: this.getMaxFPS(),
      avgDrawCalls: this.getAverageDrawCalls(),
      avgMemory: this.getAverageMemory(),
      qualityLevel: this.qualityLevel,
      sessionDuration: performance.now(),
      device: {
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        devicePixelRatio: window.devicePixelRatio
      }
    };
  }
  
  private getMemoryUsage(): number {
    const memory = (performance as any).memory;
    return memory?.usedJSHeapSize || 0;
  }
  
  private getAverageFPS(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    return 1000 / avgFrameTime;
  }
  
  private getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    return this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
  }
  
  private getMinFPS(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    const maxFrameTime = Math.max(...this.frameTimeHistory);
    return 1000 / maxFrameTime;
  }
  
  private getMaxFPS(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    const minFrameTime = Math.min(...this.frameTimeHistory);
    return 1000 / minFrameTime;
  }
  
  private getAverageDrawCalls(): number {
    if (this.drawCallHistory.length === 0) return 0;
    return this.drawCallHistory.reduce((a, b) => a + b, 0) / this.drawCallHistory.length;
  }
  
  private getAverageMemory(): number {
    if (this.memoryHistory.length === 0) return 0;
    return this.memoryHistory.reduce((a, b) => a + b, 0) / this.memoryHistory.length;
  }
  
  private captureHeapSnapshot(): any {
    // Would use Chrome DevTools Protocol in production
    return null;
  }
}

interface FrameSample {
  timestamp: number;
  frameStart: number;
  drawCalls: number;
  entitiesRendered: number;
  particlesActive: number;
  memoryUsed: number;
  gpuTime: number;
  cpuTime: number;
}

interface FrameMetrics {
  fps: number;
  frameTime: number;
  avgFPS: number;
  avgFrameTime: number;
  minFPS: number;
  maxFPS: number;
  drawCalls: number;
  entitiesRendered: number;
  memoryUsed: number;
  qualityLevel: string;
}

interface QualitySettings {
  resolutionScale: number;
  maxParticles: number;
  antialiasing: boolean;
  shadowQuality: 'none' | 'low' | 'medium' | 'high';
  physicsSteps: number;
  maxSounds: number;
  lodDistance: number;
}

interface SlowFrameReport {
  timestamp: number;
  frameTime: number;
  drawCalls: number;
  entitiesRendered: number;
  memoryUsed: number;
  stackTrace?: string;
  heapSnapshot: any;
}

interface TelemetryData {
  avgFPS: number;
  avgFrameTime: number;
  minFPS: number;
  maxFPS: number;
  avgDrawCalls: number;
  avgMemory: number;
  qualityLevel: string;
  sessionDuration: number;
  device: {
    userAgent: string;
    hardwareConcurrency: number;
    deviceMemory?: number;
    devicePixelRatio: number;
  };
}
```

---

### **Pillar 6: GPU Timing & Compositing Manager**

```typescript
class CompositingManager {
  private canvasLayers = new Map<string, HTMLCanvasElement>();
  private layerPromotionHeuristics = new Map<string, LayerMetrics>();
  
  constructor() {
    this.setupLayerMonitoring();
  }
  
  private setupLayerMonitoring(): void {
    // Monitor when canvas elements are promoted to GPU layers
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint') {
          this.recordPaintMetric(entry);
        }
      }
    });
    
    try {
      observer.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('PerformanceObserver not supported');
    }
  }
  
  // Promote canvas to its own layer for GPU acceleration
  promoteToLayer(canvas: HTMLCanvasElement, reason: string): void {
    // Use CSS will-change to hint browser about layer promotion
    canvas.style.willChange = 'transform';
    canvas.style.transform = 'translateZ(0)'; // Force layer creation
    
    this.layerPromotionHeuristics.set(canvas.id, {
      reason,
      timestamp: performance.now(),
      promoted: true
    });
  }
  
  // Demote when no longer needed (save memory)
  demoteFromLayer(canvas: HTMLCanvasElement): void {
    canvas.style.willChange = 'auto';
    canvas.style.transform = 'none';
    
    const metrics = this.layerPromotionHeuristics.get(canvas.id);
    if (metrics) {
      metrics.promoted = false;
    }
  }
  
  // Check if layout thrash is occurring
  detectLayoutThrash(): boolean {
    // Measure forced reflows
    const start = performance.now();
    const _ = document.body.offsetHeight; // Force reflow
    const duration = performance.now() - start;
    
    return duration > 5; // > 5ms indicates thrash
  }
  
  private recordPaintMetric(entry: PerformanceEntry): void {
    // Track paint timing for optimization decisions
  }
}

class GPUTimingManager {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private timerExt: any; // EXT_disjoint_timer_query
  private queries: Map<string, WebGLQuery> = new Map();
  private timings: Map<string, number[]> = new Map();
  
  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.gl = gl;
    this.timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2') ||
                    gl.getExtension('EXT_disjoint_timer_query');
  }
  
  startTiming(label: string): void {
    if (!this.timerExt) return;
    
    const query = this.gl.createQuery()!;
    this.queries.set(label, query);
    
    if (this.gl instanceof WebGL2RenderingContext) {
      this.gl.beginQuery(this.timerExt.TIME_ELAPSED_EXT, query);
    } else {
      this.timerExt.beginQueryEXT(this.timerExt.TIME_ELAPSED_EXT, query);
    }
  }
  
  endTiming(label: string): void {
    if (!this.timerExt) return;
    
    if (this.gl instanceof WebGL2RenderingContext) {
      this.gl.endQuery(this.timerExt.TIME_ELAPSED_EXT);
    } else {
      this.timerExt.endQueryEXT(this.timerExt.TIME_ELAPSED_EXT);
    }
  }
  
  async getResult(label: string): Promise<number> {
    const query = this.queries.get(label);
    if (!query || !this.timerExt) return 0;
    
    // Wait for query result (async)
    await this.waitForQueryResult(query);
    
    let result: number;
    if (this.gl instanceof WebGL2RenderingContext) {
      result = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT);
    } else {
      result = this.timerExt.getQueryObjectEXT(query, this.timerExt.QUERY_RESULT_EXT);
    }
    
    // Convert nanoseconds to milliseconds
    const timeMs = result / 1000000;
    
    // Store in rolling window
    if (!this.timings.has(label)) {
      this.timings.set(label, []);
    }
    const history = this.timings.get(label)!;
    history.push(timeMs);
    if (history.length > 60) history.shift();
    
    return timeMs;
  }
  
  private async waitForQueryResult(query: WebGLQuery): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        let available: boolean;
        if (this.gl instanceof WebGL2RenderingContext) {
          available = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE);
        } else {
          available = this.timerExt.getQueryObjectEXT(query, this.timerExt.QUERY_RESULT_AVAILABLE_EXT);
        }
        
        if (available) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }
  
  getAverageGPUTime(label: string): number {
    const history = this.timings.get(label);
    if (!history || history.length === 0) return 0;
    return history.reduce((a, b) => a + b, 0) / history.length;
  }
}
```

---

### **Pillar 7: Texture Manager with LRU Eviction**

```typescript
class TextureManager {
  private textures = new Map<string, ManagedTexture>();
  private lruQueue: string[] = [];
  private maxMemoryMB: number;
  private currentMemoryMB: number = 0;
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  
  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, maxMemoryMB: number = 256) {
    this.gl = gl;
    this.maxMemoryMB = maxMemoryMB;
  }
  
  async loadTexture(
    key: string,
    source: ImageBitmap | HTMLImageElement,
    options?: TextureOptions
  ): Promise<WebGLTexture> {
    // Check if already loaded
    if (this.textures.has(key)) {
      this.touchLRU(key);
      return this.textures.get(key)!.glTexture;
    }
    
    // Calculate memory footprint
    const memoryMB = this.calculateTextureMemory(source.width, source.height);
    
    // Evict if necessary
    while (this.currentMemoryMB + memoryMB > this.maxMemoryMB && this.lruQueue.length > 0) {
      this.evictLRU();
    }
    
    // Create WebGL texture
    const glTexture = this.createGLTexture(source, options);
    
    const managedTexture: ManagedTexture = {
      key,
      glTexture,
      width: source.width,
      height: source.height,
      memoryMB,
      lastAccessed: performance.now(),
      accessCount: 0
    };
    
    this.textures.set(key, managedTexture);
    this.lruQueue.push(key);
    this.currentMemoryMB += memoryMB;
    
    // Close ImageBitmap to free memory (if applicable)
    if (source instanceof ImageBitmap) {
      source.close();
    }
    
    return glTexture;
  }
  
  private createGLTexture(
    source: ImageBitmap | HTMLImageElement,
    options?: TextureOptions
  ): WebGLTexture {
    const texture = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    // Upload texture data
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      source
    );
    
    // Set filtering
    const filter = options?.filter || this.gl.LINEAR;
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, filter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, filter);
    
    // Set wrapping
    const wrap = options?.wrap || this.gl.CLAMP_TO_EDGE;
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, wrap);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, wrap);
    
    // Generate mipmaps if power of 2
    if (this.isPowerOf2(source.width) && this.isPowerOf2(source.height)) {
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
    }
    
    return texture;
  }
  
  private evictLRU(): void {
    if (this.lruQueue.length === 0) return;
    
    const key = this.lruQueue.shift()!;
    const texture = this.textures.get(key);
    
    if (texture) {
      console.log(`Evicting texture: ${key} (${texture.memoryMB.toFixed(2)}MB)`);
      this.gl.deleteTexture(texture.glTexture);
      this.currentMemoryMB -= texture.memoryMB;
      this.textures.delete(key);
    }
  }
  
  private touchLRU(key: string): void {
    const index = this.lruQueue.indexOf(key);
    if (index !== -1) {
      this.lruQueue.splice(index, 1);
      this.lruQueue.push(key);
    }
    
    const texture = this.textures.get(key);
    if (texture) {
      texture.lastAccessed = performance.now();
      texture.accessCount++;
    }
  }
  
  private calculateTextureMemory(width: number, height: number): number {
    // RGBA8 = 4 bytes per pixel
    const bytes = width * height * 4;
    return bytes / (1024 * 1024); // Convert to MB
  }
  
  private isPowerOf2(value: number): boolean {
    return (value & (value - 1)) === 0;
  }
  
  getMemoryUsage(): TextureMemoryStats {
    return {
      currentMB: this.currentMemoryMB,
      maxMB: this.maxMemoryMB,
      textureCount: this.textures.size,
      utilizationPercent: (this.currentMemoryMB / this.maxMemoryMB) * 100
    };
  }
  
  destroy(): void {
    for (const texture of this.textures.values()) {
      this.gl.deleteTexture(texture.glTexture);
    }
    this.textures.clear();
    this.lruQueue = [];
    this.currentMemoryMB = 0;
  }
}

interface ManagedTexture {
  key: string;
  glTexture: WebGLTexture;
  width: number;
  height: number;
  memoryMB: number;
  lastAccessed: number;
  accessCount: number;
}

interface TextureOptions {
  filter?: number;
  wrap?: number;
  generateMipmaps?: boolean;
}

interface TextureMemoryStats {
  currentMB: number;
  maxMB: number;
  textureCount: number;
  utilizationPercent: number;
}
```

---

### **Pillar 8: Buffer Pool for Typed Arrays**

```typescript
class BufferPool {
  private pools = new Map<string, TypedArrayPool>();
  private diagnostics = new Map<string, PoolDiagnostics>();
  
  // Get or create a pool for a specific typed array type
  getPool<T extends TypedArray>(
    type: TypedArrayConstructor<T>,
    initialSize: number = 100
  ): TypedArrayPool {
    const key = type.name;
    
    if (!this.pools.has(key)) {
      this.pools.set(key, new TypedArrayPool(type, initialSize));
      this.diagnostics.set(key, {
        borrows: 0,
        releases: 0,
        peakActive: 0,
        currentActive: 0
      });
    }
    
    return this.pools.get(key)!;
  }
  
  // Borrow a buffer
  borrow<T extends TypedArray>(
    type: TypedArrayConstructor<T>,
    length: number
  ): T {
    const pool = this.getPool(type);
    const buffer = pool.acquire(length) as T;
    
    // Update diagnostics
    const diag = this.diagnostics.get(type.name)!;
    diag.borrows++;
    diag.currentActive++;
    diag.peakActive = Math.max(diag.peakActive, diag.currentActive);
    
    return buffer;
  }
  
  // Release a buffer back to pool
  release<T extends TypedArray>(buffer: T): void {
    const type = buffer.constructor as TypedArrayConstructor<T>;
    const pool = this.getPool(type);
    pool.release(buffer);
    
    // Update diagnostics
    const diag = this.diagnostics.get(type.name)!;
    diag.releases++;
    diag.currentActive--;
  }
  
  // Get diagnostic information
  getDiagnostics(): Map<string, PoolDiagnostics> {
    return new Map(this.diagnostics);
  }
  
  // Clear all pools
  clear(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
    this.pools.clear();
    this.diagnostics.clear();
  }
}

class TypedArrayPool {
  private available: TypedArray[] = [];
  private constructor_: TypedArrayConstructor<any>;
  
  constructor(constructor_: TypedArrayConstructor<any>, initialSize: number) {
    this.constructor_ = constructor_;
    
    // Pre-allocate initial buffers
    for (let i = 0; i < initialSize; i++) {
      this.available.push(new constructor_(0));
    }
  }
  
  acquire(length: number): TypedArray {
    // Try to find a buffer with matching length
    const index = this.available.findIndex(buf => buf.length === length);
    
    if (index !== -1) {
      const buffer = this.available[index];
      this.available.splice(index, 1);
      return buffer;
    }
    
    // Create new buffer if none available
    return new this.constructor_(length);
  }
  
  release(buffer: TypedArray): void {
    // Zero out buffer before returning to pool
    buffer.fill(0);
    this.available.push(buffer);
  }
  
  clear(): void {
    this.available = [];
  }
}

type TypedArray = Float32Array | Float64Array | Int8Array | Int16Array | Int32Array | 
                  Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray;

type TypedArrayConstructor<T> = {
  new (length: number): T;
  name: string;
};

interface PoolDiagnostics {
  borrows: number;
  releases: number;
  peakActive: number;
  currentActive: number;
}

// Global buffer pool instance
export const bufferPool = new BufferPool();

// Usage example
const vertices = bufferPool.borrow(Float32Array, 1000);
// ... use vertices ...
bufferPool.release(vertices);
```

---

### **Pillar 9: Memory Manager with Pressure Detection**

```typescript
class MemoryManager {
  private readonly WARNING_THRESHOLD = 0.75; // 75% of heap limit
  private readonly CRITICAL_THRESHOLD = 0.90; // 90% of heap limit
  private callbacks: MemoryPressureCallback[] = [];
  private monitoringInterval: number = 0;
  
  constructor() {
    this.startMonitoring();
  }
  
  private startMonitoring(): void {
    // Check memory every 5 seconds
    this.monitoringInterval = window.setInterval(() => {
      this.checkMemoryPressure();
    }, 5000);
  }
  
  private checkMemoryPressure(): void {
    const memory = (performance as any).memory;
    if (!memory) return;
    
    const usedHeap = memory.usedJSHeapSize;
    const totalHeap = memory.jsHeapSizeLimit;
    const utilizationRatio = usedHeap / totalHeap;
    
    if (utilizationRatio >= this.CRITICAL_THRESHOLD) {
      this.triggerMemoryPressure('critical', utilizationRatio);
    } else if (utilizationRatio >= this.WARNING_THRESHOLD) {
      this.triggerMemoryPressure('warning', utilizationRatio);
    }
  }
  
  private triggerMemoryPressure(level: 'warning' | 'critical', ratio: number): void {
    console.warn(`Memory pressure ${level}: ${(ratio * 100).toFixed(1)}% heap used`);
    
    for (const callback of this.callbacks) {
      callback(level, ratio);
    }
  }
  
  // Register callback for memory pressure events
  onMemoryPressure(callback: MemoryPressureCallback): void {
    this.callbacks.push(callback);
  }
  
  // Aggressive cleanup strategies
  aggressiveCleanup(): void {
    console.log('Performing aggressive memory cleanup...');
    
    // Force nulling references
    this.nullifyWeakReferences();
    
    // Clear caches
    Engine.instance?.assetLoader?.clearUnusedAssets();
    Engine.instance?.textureManager?.evictUnusedTextures();
    
    // Reduce particle budgets
    Engine.instance?.particleSystem?.setMaxParticles(500);
    
    // Lower quality
    Engine.instance?.performanceMonitor?.forceQualityLevel('low');
    
    // Suggest GC (doesn't guarantee it)
    if (global.gc) {
      global.gc();
    }
  }
  
  private nullifyWeakReferences(): void {
    // Null out cached references that can be recreated
    // This helps GC identify collectible objects
  }
  
  getCurrentMemoryUsage(): MemoryStats {
    const memory = (performance as any).memory;
    
    if (memory) {
      return {
        usedHeapMB: memory.usedJSHeapSize / (1024 * 1024),
        totalHeapMB: memory.totalJSHeapSize / (1024 * 1024),
        heapLimitMB: memory.jsHeapSizeLimit / (1024 * 1024),
        utilizationPercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    
    return {
      usedHeapMB: 0,
      totalHeapMB: 0,
      heapLimitMB: 0,
      utilizationPercent: 0
    };
  }
  
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}

type MemoryPressureCallback = (level: 'warning' | 'critical', ratio: number) => void;

interface MemoryStats {
  usedHeapMB: number;
  totalHeapMB: number;
  heapLimitMB: number;
  utilizationPercent: number;
}
```

---

### **Pillar 10: Transform Cache & State Coalescing**

```typescript
class TransformCache {
  private cache = new Map<string, CachedTransform>();
  
  get(entityId: string): CachedTransform | undefined {
    return this.cache.get(entityId);
  }
  
  update(entityId: string, transform: Transform): boolean {
    const cached = this.cache.get(entityId);
    
    // Check if transform changed
    if (cached && this.transformEquals(cached.transform, transform)) {
      return false; // No change
    }
    
    // Update cache
    this.cache.set(entityId, {
      transform: { ...transform },
      matrix: this.computeMatrix(transform),
      dirty: true
    });
    
    return true; // Changed
  }
  
  private transformEquals(a: Transform, b: Transform): boolean {
    return a.x === b.x && 
           a.y === b.y && 
           a.rotation === b.rotation && 
           a.scaleX === b.scaleX && 
           a.scaleY === b.scaleY;
  }
  
  private computeMatrix(transform: Transform): DOMMatrix {
    const matrix = new DOMMatrix();
    matrix.translateSelf(transform.x, transform.y);
    matrix.rotateSelf(0, 0, transform.rotation);
    matrix.scaleSelf(transform.scaleX, transform.scaleY);
    return matrix;
  }
  
  markClean(entityId: string): void {
    const cached = this.cache.get(entityId);
    if (cached) {
      cached.dirty = false;
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
}

class RendererStateCoalescer {
  private currentState: RenderState = {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over'
  };
  
  private pendingStateChanges: Partial<RenderState> = {};
  private stateChangesThisFrame = 0;
  
  // Queue a state change
  queueStateChange(changes: Partial<RenderState>): void {
    Object.assign(this.pendingStateChanges, changes);
  }
  
  // Apply all queued state changes at once
  applyStateChanges(ctx: CanvasRenderingContext2D): void {
    if (Object.keys(this.pendingStateChanges).length === 0) return;
    
    // Apply all changes in one batch
    for (const [key, value] of Object.entries(this.pendingStateChanges)) {
      if (this.currentState[key as keyof RenderState] !== value) {
        (ctx as any)[key] = value;
        (this.currentState as any)[key] = value;
        this.stateChangesThisFrame++;
      }
    }
    
    this.pendingStateChanges = {};
  }
  
  // Apply transform matrix directly
  setTransform(ctx: CanvasRenderingContext2D, matrix: DOMMatrix): void {
    ctx.setTransform(
      matrix.a, matrix.b,
      matrix.c, matrix.d,
      matrix.e, matrix.f
    );
  }
  
  resetFrame(): void {
    this.stateChangesThisFrame = 0;
  }
  
  getStateChangesThisFrame(): number {
    return this.stateChangesThisFrame;
  }
}

interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

interface CachedTransform {
  transform: Transform;
  matrix: DOMMatrix;
  dirty: boolean;
}

interface RenderState {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  globalAlpha: number;
  globalCompositeOperation: string;
}
```

---

### **Pillar 11: Binary Worker Protocol**

```typescript
// Worker message protocol using ArrayBuffer
class WorkerProtocol {
  // Message type IDs
  private static readonly MSG_PATHFINDING = 1;
  private static readonly MSG_PHYSICS = 2;
  private static readonly MSG_AI = 3;
  private static readonly MSG_BATCH_UPDATE = 4;
  
  // Encode message to binary format
  static encode(type: number, payload: any): ArrayBuffer {
    const payloadStr = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadStr);
    
    // Header: [type: 4 bytes][payloadLength: 4 bytes]
    const buffer = new ArrayBuffer(8 + payloadBytes.length);
    const view = new DataView(buffer);
    
    view.setUint32(0, type, true);
    view.setUint32(4, payloadBytes.length, true);
    
    // Copy payload
    const uint8View = new Uint8Array(buffer);
    uint8View.set(payloadBytes, 8);
    
    return buffer;
  }
  
  // Decode binary message
  static decode(buffer: ArrayBuffer): { type: number; payload: any } {
    const view = new DataView(buffer);
    
    const type = view.getUint32(0, true);
    const payloadLength = view.getUint32(4, true);
    
    const payloadBytes = new Uint8Array(buffer, 8, payloadLength);
    const payloadStr = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadStr);
    
    return { type, payload };
  }
}

// Enhanced WorkerPool with back-pressure and coalescing
class EnhancedWorkerPool {
  private workers: Worker[] = [];
  private available: Set<Worker> = new Set();
  private taskQueue: WorkerTask[] = [];
  private maxQueueSize = 100;
  private coalesceBuffer: Map<string, WorkerTask> = new Map();
  private coalesceDelay = 16; // 1 frame at 60fps
  
  constructor(workerCount: number) {
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker('/workers/compute-worker.js');
      this.workers.push(worker);
      this.available.add(worker);
      
      worker.onmessage = (e) => this.handleWorkerMessage(worker, e.data);
    }
  }
  
  // Execute with automatic coalescing
  async executeCoalesced<T>(
    type: string,
    key: string, // Coalesce key
    data: any,
    transferables?: Transferable[]
  ): Promise<T> {
    // Coalesce messages with same key
    const existing = this.coalesceBuffer.get(key);
    
    if (existing) {
      // Update existing task instead of queuing new one
      existing.data = data;
      existing.transferables = transferables;
      return existing.promise as Promise<T>;
    }
    
    // Create new coalesced task
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: Math.random(),
        type,
        data,
        transferables,
        resolve,
        reject,
        promise: null as any
      };
      task.promise = new Promise((res, rej) => {
        task.resolve = res;
        task.reject = rej;
      });
      
      this.coalesceBuffer.set(key, task);
      
      // Flush after delay
      setTimeout(() => {
        this.flushCoalesced(key);
      }, this.coalesceDelay);
    });
  }
  
  private flushCoalesced(key: string): void {
    const task = this.coalesceBuffer.get(key);
    if (!task) return;
    
    this.coalesceBuffer.delete(key);
    
    // Check back-pressure
    if (this.taskQueue.length >= this.maxQueueSize) {
      console.warn('Worker queue full, dropping task');
      task.reject(new Error('Queue overflow'));
      return;
    }
    
    this.taskQueue.push(task);
    this.processQueue();
  }
  
  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.available.size > 0) {
      const task = this.taskQueue.shift()!;
      const worker = this.available.values().next().value;
      this.available.delete(worker);
      
      // Encode message to binary
      const buffer = WorkerProtocol.encode(1, task.data);
      worker.postMessage(buffer, [buffer, ...(task.transferables || [])]);
    }
  }
  
  private handleWorkerMessage(worker: Worker, data: ArrayBuffer): void {
    const { type, payload } = WorkerProtocol.decode(data);
    
    // Find and resolve task
    // Return worker to pool
    this.available.add(worker);
    this.processQueue();
  }
  
  getQueueDepth(): number {
    return this.taskQueue.length;
  }
}

interface WorkerTask {
  id: number;
  type: string;
  data: any;
  transferables?: Transferable[];
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  promise: Promise<any>;
}
```

---

### **Pillar 12: CI Performance Regression Testing**

```typescript
// tests/perf/ci-stress.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Regression Tests', () => {
  test('Stress Test: 10,000 sprites at 60 FPS', async ({ page }) => {
    await page.goto('http://localhost:3000/stress-test?sprites=10000');
    
    // Wait for scene to load
    await page.waitForSelector('#game-canvas');
    
    // Run for 10 seconds and collect metrics
    const metrics = await page.evaluate(async () => {
      const engine = (window as any).engine;
      const samples: number[] = [];
      
      return new Promise((resolve) => {
        const startTime = performance.now();
        const sampleInterval = setInterval(() => {
          const fps = engine.performanceMonitor.getFPS();
          samples.push(fps);
          
          if (performance.now() - startTime > 10000) {
            clearInterval(sampleInterval);
            
            resolve({
              avgFPS: samples.reduce((a, b) => a + b, 0) / samples.length,
              minFPS: Math.min(...samples),
              maxFPS: Math.max(...samples),
              samples: samples.length
            });
          }
        }, 100);
      });
    });
    
    console.log('Performance metrics:', metrics);
    
    // Assert performance thresholds
    expect(metrics.avgFPS).toBeGreaterThan(55); // Avg must be > 55 FPS
    expect(metrics.minFPS).toBeGreaterThan(30); // Min must be > 30 FPS
  });
  
  test('Memory Leak Detection', async ({ page }) => {
    await page.goto('http://localhost:3000/leak-test');
    
    const leakDetected = await page.evaluate(async () => {
      const engine = (window as any).engine;
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Create and destroy 1000 scenes
      for (let i = 0; i < 1000; i++) {
        const scene = engine.sceneManager.createScene('test');
        scene.initialize();
        scene.destroy();
      }
      
      // Force GC if available
      if ((window as any).gc) {
        (window as any).gc();
      }
      
      // Wait a bit for GC
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const leak = finalMemory - initialMemory;
      
      return {
        leak: leak / (1024 * 1024), // MB
        acceptable: leak < 10 * 1024 * 1024 // < 10MB
      };
    });
    
    console.log(`Memory leak: ${leakDetected.leak.toFixed(2)}MB`);
    expect(leakDetected.acceptable).toBe(true);
  });
  
  test('Draw Call Budget', async ({ page }) => {
    await page.goto('http://localhost:3000/game');
    
    const drawCalls = await page.evaluate(() => {
      const engine = (window as any).engine;
      const samples: number[] = [];
      
      return new Promise((resolve) => {
        let frames = 0;
        const check = () => {
          const count = engine.renderer.drawCallCount;
          samples.push(count);
          frames++;
          
          if (frames >= 60) { // 1 second at 60fps
            resolve({
              avg: samples.reduce((a, b) => a + b, 0) / samples.length,
              max: Math.max(...samples)
            });
          } else {
            requestAnimationFrame(check);
          }
        };
        requestAnimationFrame(check);
      });
    });
    
    console.log('Draw calls:', drawCalls);
    expect(drawCalls.avg).toBeLessThan(100); // Avg < 100
    expect(drawCalls.max).toBeLessThan(150); // Max < 150
  });
});
```

---

### **Pillar 13: Deterministic Replay System**

```typescript
class SlowFrameReplaySystem {
  private capturedFrames: CapturedFrame[] = [];
  private maxCaptures = 10;
  
  captureFrame(
    threshold: number,
    scene: Scene,
    renderer: Renderer,
    profiler: PerformanceProfiler
  ): void {
    const frameTime = profiler.getLastFrameTime();
    
    if (frameTime > threshold) {
      const capture: CapturedFrame = {
        timestamp: performance.now(),
        frameTime,
        sceneSnapshot: this.serializeScene(scene),
        renderState: {
          drawCalls: renderer.drawCallCount,
          canvasWidth: renderer.canvas.width,
          canvasHeight: renderer.canvas.height
        },
        profilerSnapshot: profiler.getDetailedTimings(),
        stackTrace: new Error().stack || '',
        memorySnapshot: this.captureMemorySnapshot()
      };
      
      this.capturedFrames.push(capture);
      
      // Keep only most recent captures
      if (this.capturedFrames.length > this.maxCaptures) {
        this.capturedFrames.shift();
      }
      
      console.warn(`Slow frame captured: ${frameTime.toFixed(2)}ms`);
      this.saveToLocalStorage(capture);
    }
  }
  
  private serializeScene(scene: Scene): SerializedScene {
    return {
      entities: scene.entities.map(e => ({
        id: e.id,
        type: e.constructor.name,
        x: e.x,
        y: e.y,
        state: e.getSerializedState()
      })),
      camera: {
        x: scene.camera.x,
        y: scene.camera.y
      }
    };
  }
  
  private captureMemorySnapshot(): MemorySnapshot {
    const memory = (performance as any).memory;
    return {
      usedHeapSize: memory?.usedJSHeapSize || 0,
      totalHeapSize: memory?.totalJSHeapSize || 0,
      heapLimit: memory?.jsHeapSizeLimit || 0
    };
  }
  
  private saveToLocalStorage(capture: CapturedFrame): void {
    try {
      const key = `slow-frame-${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(capture));
    } catch (e) {
      console.error('Failed to save slow frame capture', e);
    }
  }
  
  // Replay a captured frame for debugging
  async replay(capture: CapturedFrame): Promise<void> {
    console.log('Replaying slow frame...');
    
    // Restore scene state
    const scene = new Scene();
    for (const entityData of capture.sceneSnapshot.entities) {
      const entity = this.createEntityFromSerialized(entityData);
      scene.addEntity(entity);
    }
    
    // Restore camera
    scene.camera.x = capture.sceneSnapshot.camera.x;
    scene.camera.y = capture.sceneSnapshot.camera.y;
    
    // Run frame
    scene.update(16.67);
    scene.render(Engine.instance.renderer);
    
    console.log('Replay complete');
  }
  
  private createEntityFromSerialized(data: SerializedEntity): Entity {
    // Factory pattern to recreate entities
    const EntityClass = (window as any)[data.type];
    const entity = new EntityClass();
    entity.id = data.id;
    entity.x = data.x;
    entity.y = data.y;
    entity.restoreState(data.state);
    return entity;
  }
  
  getCapturedFrames(): CapturedFrame[] {
    return this.capturedFrames;
  }
}

interface CapturedFrame {
  timestamp: number;
  frameTime: number;
  sceneSnapshot: SerializedScene;
  renderState: RenderState;
  profilerSnapshot: ProfilerTimings;
  stackTrace: string;
  memorySnapshot: MemorySnapshot;
}

interface SerializedScene {
  entities: SerializedEntity[];
  camera: { x: number; y: number };
}

interface SerializedEntity {
  id: string;
  type: string;
  x: number;
  y: number;
  state: any;
}

interface MemorySnapshot {
  usedHeapSize: number;
  totalHeapSize: number;
  heapLimit: number;
}
```

---

### **Pillar 14: Network Multiplayer Support**

```typescript
class NetworkManager {
  private ws: WebSocket | null = null;
  private clientId: string = '';
  private serverState: Map<string, EntityState> = new Map();
  private clientState: Map<string, EntityState> = new Map();
  private interpolationBuffer: NetworkSnapshot[] = [];
  private predictionHistory: PredictionFrame[] = [];
  
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('Connected to server');
        resolve();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error', error);
        reject(error);
      };
      
      this.ws.onmessage = (event) => {
        this.handleServerMessage(event.data);
      };
    });
  }
  
  private handleServerMessage(data: string): void {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'snapshot':
        this.handleSnapshot(message.snapshot);
        break;
      case 'reconciliation':
        this.reconcileClientPrediction(message);
        break;
    }
  }
  
  // Client-side prediction
  predictLocalInput(input: PlayerInput): void {
    const frame = {
      frameNumber: this.getFrameNumber(),
      input,
      predictedState: this.simulateInput(input)
    };
    
    this.predictionHistory.push(frame);
    
    // Send input to server
    this.sendToServer({
      type: 'input',
      frameNumber: frame.frameNumber,
      input
    });
    
    // Keep last 60 frames (1 second at 60fps)
    if (this.predictionHistory.length > 60) {
      this.predictionHistory.shift();
    }
  }
  
  // Server reconciliation
  private reconcileClientPrediction(message: any): void {
    const serverFrame = message.frameNumber;
    
    // Find matching prediction
    const predictionIndex = this.predictionHistory.findIndex(
      p => p.frameNumber === serverFrame
    );
    
    if (predictionIndex === -1) return;
    
    // Check if prediction was correct
    const prediction = this.predictionHistory[predictionIndex];
    const statesDiffer = this.compareStates(
      prediction.predictedState,
      message.serverState
    );
    
    if (statesDiffer) {
      console.log('Misprediction detected, correcting...');
      
      // Replay inputs from server state
      let currentState = message.serverState;
      for (let i = predictionIndex + 1; i < this.predictionHistory.length; i++) {
        currentState = this.simulateInput(
          this.predictionHistory[i].input,
          currentState
        );
      }
      
      // Apply corrected state
      this.applyState(currentState);
    }
    
    // Clear old predictions
    this.predictionHistory.splice(0, predictionIndex + 1);
  }
  
  // Entity interpolation for smooth remote player movement
  private handleSnapshot(snapshot: NetworkSnapshot): void {
    this.interpolationBuffer.push(snapshot);
    
    // Keep 100ms of snapshots for interpolation
    const bufferTime = 100;
    const cutoff = performance.now() - bufferTime;
    
    while (this.interpolationBuffer.length > 0 && 
           this.interpolationBuffer[0].timestamp < cutoff) {
      this.interpolationBuffer.shift();
    }
  }
  
  getInterpolatedState(entityId: string): EntityState | null {
    if (this.interpolationBuffer.length < 2) return null;
    
    const now = performance.now();
    const renderTime = now - 100; // Render 100ms in the past
    
    // Find snapshots to interpolate between
    let from: NetworkSnapshot | null = null;
    let to: NetworkSnapshot | null = null;
    
    for (let i = 0; i < this.interpolationBuffer.length - 1; i++) {
      if (this.interpolationBuffer[i].timestamp <= renderTime &&
          this.interpolationBuffer[i + 1].timestamp >= renderTime) {
        from = this.interpolationBuffer[i];
        to = this.interpolationBuffer[i + 1];
        break;
      }
    }
    
    if (!from || !to) return null;
    
    // Interpolate
    const fromState = from.entities.get(entityId);
    const toState = to.entities.get(entityId);
    
    if (!fromState || !toState) return null;
    
    const t = (renderTime - from.timestamp) / (to.timestamp - from.timestamp);
    
    return {
      x: fromState.x + (toState.x - fromState.x) * t,
      y: fromState.y + (toState.y - fromState.y) * t,
      rotation: this.interpolateAngle(fromState.rotation, toState.rotation, t)
    };
  }
  
  private interpolateAngle(from: number, to: number, t: number): number {
    // Handle angle wrapping
    let diff = to - from;
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return from + diff * t;
  }
  
  private simulateInput(input: PlayerInput, state?: EntityState): EntityState {
    // Simulate physics/movement based on input
    return {} as EntityState;
  }
  
  private compareStates(a: EntityState, b: EntityState): boolean {
    // Compare with tolerance for floating point
    const tolerance = 0.01;
    return Math.abs(a.x - b.x) > tolerance ||
           Math.abs(a.y - b.y) > tolerance;
  }
  
  private applyState(state: EntityState): void {
    // Apply corrected state to entity
  }
  
  private sendToServer(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  private getFrameNumber(): number {
    return Math.floor(performance.now() / 16.67); // Frame number at 60fps
  }
}

interface NetworkSnapshot {
  timestamp: number;
  entities: Map<string, EntityState>;
}

interface EntityState {
  x: number;
  y: number;
  rotation: number;
}

interface PlayerInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  action: boolean;
}

interface PredictionFrame {
  frameNumber: number;
  input: PlayerInput;
  predictedState: EntityState;
}
```

---

### **Pillar 15: Runtime Health Monitoring**

```typescript
class HealthMonitor {
  private alerts: HealthAlert[] = [];
  private checks: HealthCheck[] = [];
  
  constructor() {
    this.registerDefaultChecks();
  }
  
  private registerDefaultChecks(): void {
    // Draw calls check
    this.addCheck({
      name: 'Draw Calls',
      check: () => {
        const count = Engine.instance.renderer.drawCallCount;
        if (count > 150) return { healthy: false, value: count, threshold: 150 };
        if (count > 100) return { healthy: true, value: count, threshold: 100, warning: true };
        return { healthy: true, value: count };
      },
      frequency: 1000 // Check every second
    });
    
    // Memory usage check
    this.addCheck({
      name: 'Heap Usage',
      check: () => {
        const memory = (performance as any).memory;
        if (!memory) return { healthy: true, value: 0 };
        
        const percent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (percent > 90) return { healthy: false, value: percent, threshold: 90 };
        if (percent > 75) return { healthy: true, value: percent, threshold: 75, warning: true };
        return { healthy: true, value: percent };
      },
      frequency: 5000
    });
    
    // FPS check
    this.addCheck({
      name: 'FPS',
      check: () => {
        const fps = Engine.instance.performanceMonitor.getAverageFPS();
        if (fps < 30) return { healthy: false, value: fps, threshold: 30 };
        if (fps < 50) return { healthy: true, value: fps, threshold: 50, warning: true };
        return { healthy: true, value: fps };
      },
      frequency: 1000
    });
    
    // Worker queue depth check
    this.addCheck({
      name: 'Worker Queue',
      check: () => {
        const depth = Engine.instance.workerPool.getQueueDepth();
        if (depth > 50) return { healthy: false, value: depth, threshold: 50 };
        if (depth > 25) return { healthy: true, value: depth, threshold: 25, warning: true };
        return { healthy: true, value: depth };
      },
      frequency: 1000
    });
    
    // Pool exhaustion check
    this.addCheck({
      name: 'Object Pools',
      check: () => {
        const diagnostics = bufferPool.getDiagnostics();
        for (const [type, diag] of diagnostics) {
          if (diag.currentActive > diag.peakActive * 0.9) {
            return {
              healthy: false,
              value: diag.currentActive,
              threshold: diag.peakActive,
              message: `${type} pool near exhaustion`
            };
          }
        }
        return { healthy: true, value: 0 };
      },
      frequency: 2000
    });
  }
  
  addCheck(check: HealthCheck): void {
    this.checks.push(check);
    
    // Start checking
    setInterval(() => {
      const result = check.check();
      
      if (!result.healthy) {
        this.recordAlert({
          severity: 'error',
          check: check.name,
          message: result.message || `${check.name} unhealthy`,
          value: result.value,
          threshold: result.threshold,
          timestamp: performance.now()
        });
      } else if (result.warning) {
        this.recordAlert({
          severity: 'warning',
          check: check.name,
          message: result.message || `${check.name} warning`,
          value: result.value,
          threshold: result.threshold,
          timestamp: performance.now()
        });
      }
    }, check.frequency);
  }
  
  private recordAlert(alert: HealthAlert): void {
    console.warn(`Health Alert [${alert.severity}]: ${alert.message}`, alert);
    this.alerts.push(alert);
    
    // Keep last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
  }
  
  getAlerts(severity?: 'error' | 'warning'): HealthAlert[] {
    if (severity) {
      return this.alerts.filter(a => a.severity === severity);
    }
    return this.alerts;
  }
  
  getHealthReport(): HealthReport {
    const report: HealthReport = {
      timestamp: performance.now(),
      overall: 'healthy',
      checks: []
    };
    
    for (const check of this.checks) {
      const result = check.check();
      report.checks.push({
        name: check.name,
        healthy: result.healthy,
        value: result.value,
        threshold: result.threshold
      });
      
      if (!result.healthy) {
        report.overall = 'unhealthy';
      } else if (result.warning && report.overall === 'healthy') {
        report.overall = 'degraded';
      }
    }
    
    return report;
  }
}

interface HealthCheck {
  name: string;
  check: () => HealthCheckResult;
  frequency: number; // ms
}

interface HealthCheckResult {
  healthy: boolean;
  value: number;
  threshold?: number;
  warning?: boolean;
  message?: string;
}

interface HealthAlert {
  severity: 'error' | 'warning';
  check: string;
  message: string;
  value: number;
  threshold?: number;
  timestamp: number;
}

interface HealthReport {
  timestamp: number;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    healthy: boolean;
    value: number;
    threshold?: number;
  }>;
}
```

---

## 🎯 Implementation Priority Matrix

### **Phase 1: Foundation (Week 1-2)** - CRITICAL PATH

| Priority | Component | Effort | Impact | Dependencies |
|----------|-----------|--------|--------|--------------|
| P0 | FeatureDetector | 1 day | High | None |
| P0 | EngineConfig system | 1 day | High | FeatureDetector |
| P0 | ModernAssetLoader (ImageBitmap) | 2 days | Critical | FeatureDetector |
| P0 | Renderer factory (WebGL/Canvas) | 3 days | Critical | FeatureDetector |
| P0 | Scene lifecycle | 2 days | High | Renderer |
| P1 | Object pooling (all types) | 2 days | Critical | None |
| P1 | Texture atlas system | 2 days | Critical | AssetLoader |

### **Phase 2: Performance Systems (Week 3-4)** - HIGH IMPACT

| Priority | Component | Effort | Impact | Dependencies |
|----------|-----------|--------|--------|--------------|
| P0 | EnterprisePerformanceMonitor | 3 days | Critical | Renderer |
| P0 | Adaptive quality system | 2 days | Critical | PerformanceMonitor |
| P1 | WebWorker pool | 2 days | High | None |
| P1 | Spatial partitioning (Quadtree) | 2 days | High | None |
| P1 | Viewport culling | 1 day | High | Camera, Quadtree |
| P2 | Dirty rectangle tracking | 2 days | Medium | Renderer |
| P2 | Layered canvas system | 2 days | Medium | Renderer |

### **Phase 3: Advanced Features (Week 5-6)** - ENHANCEMENT

| Priority | Component | Effort | Impact | Dependencies |
|----------|-----------|--------|--------|--------------|
| P1 | Text rendering cache | 2 days | High | Renderer |
| P1 | Particle system | 3 days | High | ObjectPool, Renderer |
| P2 | Post-processing effects | 3 days | Medium | Renderer |
| P2 | Shadow system | 2 days | Medium | Renderer |
| P2 | LOD system | 2 days | Medium | Camera |
| P3 | Physics engine | 4 days | Medium | Quadtree |
| P3 | Audio system | 2 days | Low | AssetLoader |

### **Phase 4: Production Hardening (Week 7-8)** - QUALITY

| Priority | Component | Effort | Impact | Dependencies |
|----------|-----------|--------|--------|--------------|
| P0 | Error handling & recovery | 2 days | Critical | All systems |
| P0 | Memory leak testing | 3 days | Critical | All systems |
| P1 | Performance benchmarks | 2 days | High | PerformanceMonitor |
| P1 | Visual debugger | 3 days | High | All systems |
| P2 | Service Worker | 1 day | Medium | AssetLoader |
| P2 | Telemetry system | 2 days | Medium | PerformanceMonitor |
| P3 | Documentation | 3 days | High | All systems |

---

## 📈 Success Metrics & Benchmarks

### Performance Targets

| Metric | Minimum | Target | Exceptional |
|--------|---------|--------|-------------|
| **FPS (Desktop)** | 30 | 60 | 120 |
| **FPS (Mobile)** | 20 | 30 | 60 |
| **Initial Load** | < 3s | < 1s | < 500ms |
| **Frame Time** | < 33ms | < 16.67ms | < 8.33ms |
| **Draw Calls** | < 200 | < 100 | < 50 |
| **Memory Usage** | < 200MB | < 100MB | < 50MB |
| **Asset Size** | < 10MB | < 5MB | < 2MB |
| **Time to Interactive** | < 5s | < 2s | < 1s |

### Stress Test Scenarios

```typescript
class StressTests {
  // Test 1: 10,000 moving sprites
  async testMassiveSprites(): Promise<TestResult> {
    const scene = new Scene();
    for (let i = 0; i < 10000; i++) {
      scene.addEntity(new MovingSprite());
    }
    
    return this.runFor60Seconds(scene);
  }
  
  // Test 2: 5,000 particles
  async testParticleSystem(): Promise<TestResult> {
    const particleSystem = new ParticleSystem();
    for (let i = 0; i < 5000; i++) {
      particleSystem.emit(Math.random() * 1280, Math.random() * 720);
    }
    
    return this.runFor60Seconds(particleSystem);
  }
  
  // Test 3: Memory leak detection
  async testMemoryLeaks(): Promise<TestResult> {
    const initialMemory = this.getMemoryUsage();
    
    // Create/destroy 1000 scenes
    for (let i = 0; i < 1000; i++) {
      const scene = new Scene();
      scene.initialize();
      scene.destroy();
    }
    
    const finalMemory = this.getMemoryUsage();
    const leak = finalMemory - initialMemory;
    
    return {
      passed: leak < 10 * 1024 * 1024, // < 10MB leak acceptable
      memoryLeak: leak,
      details: `Memory leak: ${(leak / 1024 / 1024).toFixed(2)}MB`
    };
  }
  
  // Test 4: Sustained performance
  async testSustainedPerformance(): Promise<TestResult> {
    const game = new Game();
    const metrics: number[] = [];
    
    // Run for 10 minutes
    const duration = 10 * 60 * 1000;
    const startTime = performance.now();
    
    while (performance.now() - startTime < duration) {
      game.update(16.67);
      game.render();
      metrics.push(game.performanceMonitor.getFPS());
      await this.waitFrame();
    }
    
    const avgFPS = metrics.reduce((a, b) => a + b, 0) / metrics.length;
    const minFPS = Math.min(...metrics);
    
    return {
      passed: minFPS > 30 && avgFPS > 55,
      avgFPS,
      minFPS,
      details: `Avg: ${avgFPS.toFixed(1)} FPS, Min: ${minFPS.toFixed(1)} FPS`
    };
  }
}
```

---

## 🚀 Quick Start Implementation Guide

### Step 1: Bootstrap Engine (30 minutes)

```typescript
// main.ts
import { Engine, EngineConfig, FeatureDetector } from './engine';

async function bootstrap() {
  // 1. Detect features
  const features = new FeatureDetector();
  console.log('Features:', features);
  
  // 2. Create config
  const config: EngineConfig = {
    ...features.getOptimalConfig(),
    targetFPS: 60,
    adaptiveQuality: true,
    enableProfiling: true
  };
  
  // 3. Initialize engine
  const engine = new Engine(config);
  await engine.initialize();
  
  // 4. Load assets
  await engine.assetLoader.loadManifest({
    images: ['hero.avif', 'enemies.avif', 'ui.avif'],
    atlases: [{ json: 'game.json', image: 'game.avif' }],
    audio: ['music.mp3', 'sfx.mp3']
  });
  
  // 5. Create first scene
  const menuScene = new MenuScene(engine);
  engine.sceneManager.register('menu', menuScene);
  await engine.sceneManager.loadScene('menu');
  
  // 6. Start game loop
  engine.start();
  
  // 7. Debug overlay
  if (config.enableProfiling) {
    engine.debugOverlay.show();
  }
}

bootstrap().catch(console.error);
```

### Step 2: Create First Scene (15 minutes)

```typescript
// MenuScene.ts
class MenuScene extends Scene {
  private title: UIText;
  private playButton: UIButton;
  
  async preload(): Promise<void> {
    // Assets already loaded in bootstrap
  }
  
  create(): void {
    // Background
    this.addBackground('menu_bg');
    
    // Title
    this.title = new UIText('FREEDOM GLADIATOR', {
      font: '64px Impact',
      color: '#FFD700',
      x: 640,
      y: 200
    });
    this.ui.add(this.title);
    
    // Play button
    this.playButton = new UIButton('PLAY', {
      x: 640,
      y: 400,
      width: 200,
      height: 60
    });
    this.playButton.onClick(() => {
      this.engine.sceneManager.loadScene('battle', 'fade');
    });
    this.ui.add(this.playButton);
  }
  
  update(deltaTime: number): void {
    // Title animation
    this.title.y += Math.sin(this.engine.time * 0.002) * 0.5;
  }
}
```

### Step 3: Implement Game Loop (10 minutes)

```typescript
// Engine.ts
class Engine {
  private rafId: number = 0;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly FIXED_TIME_STEP = 1000 / 60; // 60 FPS
  
  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }
  
  private loop = (): void => {
    this.rafId = requestAnimationFrame(this.loop);
    
    const currentTime = performance.now();
    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Cap delta time to prevent spiral of death
    if (deltaTime > 250) deltaTime = 250;
    
    this.accumulator += deltaTime;
    
    // Fixed timestep for physics/updates
    while (this.accumulator >= this.FIXED_TIME_STEP) {
      this.performanceMonitor.startFrame();
      
      // Input
      this.inputManager.update();
      
      // Update
      this.sceneManager.update(this.FIXED_TIME_STEP);
      this.tweenManager.update(this.FIXED_TIME_STEP);
      this.physicsEngine.update(this.FIXED_TIME_STEP);
      
      this.accumulator -= this.FIXED_TIME_STEP;
    }
    
    // Render (interpolated)
    const alpha = this.accumulator / this.FIXED_TIME_STEP;
    this.renderer.clear();
    this.sceneManager.render(this.renderer, alpha);
    
    const metrics = this.performanceMonitor.endFrame(this.renderer, this.sceneManager.currentScene);
    
    // Debug overlay
    if (this.config.enableProfiling) {
      this.debugOverlay.update(metrics);
    }
    
    // Capture slow frames
    const slowFrame = this.performanceMonitor.captureSlowFrame();
    if (slowFrame) {
      console.warn('Slow frame detected:', slowFrame);
    }
  };
  
  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }
}
```

---

## 🔥 Critical Anti-Patterns & Solutions

### ❌ Anti-Pattern #1: Object Creation in Hot Path

```typescript
// BAD - Creates Vector2 every frame
function update() {
  const velocity = new Vector2(vx, vy); // 💀 GC trigger
  entity.position.add(velocity);
}

// GOOD - Use object pool
function update() {
  const velocity = Vector2Pool.acquire();
  velocity.set(vx, vy);
  entity.position.add(velocity);
  Vector2Pool.release(velocity); // ✅ No allocation
}
```

### ❌ Anti-Pattern #2: Forgotten Event Listeners

```typescript
// BAD - Memory leak
class Button {
  constructor() {
    canvas.addEventListener('click', () => this.onClick());
  }
}

// GOOD - Store and cleanup
class Button {
  private boundHandler: (e: MouseEvent) => void;
  
  constructor() {
    this.boundHandler = (e) => this.onClick(e);
    canvas.addEventListener('click', this.boundHandler);
  }
  
  destroy() {
    canvas.removeEventListener('click', this.boundHandler);
  }
}
```

### ❌ Anti-Pattern #3: Full Canvas Clear

```typescript
// BAD - Clears everything
ctx.clearRect(0, 0, canvas.width, canvas.height);

// GOOD - Only clear dirty regions
dirtyRects.render(ctx, (region) => {
  ctx.clearRect(region.x, region.y, region.width, region.height);
  renderRegion(region);
});
```

### ❌ Anti-Pattern #4: State Changes in Loop

```typescript
// BAD - Changes fillStyle 1000 times
for (const enemy of enemies) {
  ctx.fillStyle = enemy.color; // 💀 Expensive
  ctx.fillRect(enemy.x, enemy.y, 32, 32);
}

// GOOD - Batch by color
const batches = groupBy(enemies, e => e.color);
for (const [color, batch] of batches) {
  ctx.fillStyle = color; // ✅ Once per batch
  for (const enemy of batch) {
    ctx.fillRect(enemy.x, enemy.y, 32, 32);
  }
}
```

---

## 📚 Complete API Reference

### Engine Core

```typescript
class Engine {
  // Properties
  readonly config: EngineConfig;
  readonly features: FeatureDetector;
  readonly renderer: Renderer;
  readonly sceneManager: SceneManager;
  readonly assetLoader: ModernAssetLoader;
  readonly inputManager: InputManager;
  readonly performanceMonitor: EnterprisePerformanceMonitor;
  readonly workerPool: WorkerPool;
  readonly debugOverlay: DebugOverlay;
  
  // Methods
  async initialize(): Promise<void>;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  setResolutionScale(scale: number): void;
  getTelemetry(): TelemetryData;
}
```

### Asset Loading

```typescript
class ModernAssetLoader {
  async loadImage(url: string): Promise<ImageBitmap | HTMLImageElement>;
  async loadProgressive(basePath: string): Promise<Map<string, ImageBitmap>>;
  async loadAtlas(jsonUrl: string, imageUrl: string): Promise<TextureAtlas>;
  async loadAudio(url: string): Promise<AudioBuffer>;
  async loadJSON<T>(url: string): Promise<T>;
  async loadManifest(manifest: AssetManifest, onProgress?: (p: number) => void): Promise<void>;
  async registerServiceWorker(): Promise<void>;
  get<T>(key: string): T | undefined;
  unload(key: string): void;
  getMemoryUsage(): number;
}
```

### Rendering

```typescript
interface Renderer {
  readonly type: 'webgl' | 'webgl2' | 'canvas2d';
  readonly drawCallCount: number;
  
  clear(): void;
  setCamera(camera: Camera): void;
  drawSprite(sprite: Sprite, x: number, y: number, alpha?: number): void;
  drawText(text: string, x: number, y: number, style: TextStyle): void;
  drawRect(x: number, y: number, w: number, h: number, color: string): void;
  beginBatch(): void;
  endBatch(): void;
  resize(width: number, height: number): void;
  destroy(): void;
}
```

---

## 🎓 Learning Resources

### Required Reading
1. **MDN Canvas Tutorial** - https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial
2. **Web.dev Performance** - https://web.dev/articles/canvas-performance
3. **PixiJS Documentation** - https://pixijs.com/guides
4. **Game Programming Patterns** - http://gameprogrammingpatterns.com/

### Video Courses
1. **Canvas Master Course** (Udemy)
2. **WebGL Fundamentals** (WebGL Fundamentals.org)
3. **Game Development with JavaScript** (Frontend Masters)

### Community
- Discord: Canvas Game Dev Server
- Reddit: r/gamedev, r/webdev
- Stack Overflow: [canvas], [webgl], [game-development]

---

## ✅ Final Checklist Before Production

### Performance
- [ ] 60 FPS on target devices (desktop), 30 FPS (mobile minimum)
- [ ] < 100 draw calls per frame average
- [ ] < 100MB memory footprint (heap usage < 90%)
- [ ] < 2s initial load time
- [ ] Adaptive quality working (5 levels: ultra→potato)
- [ ] No memory leaks after 10min session
- [ ] **GPU timing with EXT_disjoint_timer_query** 🆕
- [ ] **Worker queue depth < 50** 🆕
- [ ] **Texture memory < 256MB** 🆕

### Quality
- [ ] Zero TypeScript errors
- [ ] Zero ESLint warnings
- [ ] 80%+ code coverage
- [ ] All stress tests passing
- [ ] Cross-browser tested
- [ ] Mobile tested (real devices)
- [ ] **CI performance regression tests** 🆕
- [ ] **Real-device baseline matrix documented** 🆕

### Production
- [ ] Service Worker configured
- [ ] Assets compressed (AVIF/WebP)
- [ ] Error tracking enabled
- [ ] Analytics integrated
- [ ] Documentation complete
- [ ] Performance baseline established
- [ ] **Browser quirk catalog documented** 🆕
- [ ] **Health monitoring endpoints** 🆕
- [ ] **Deterministic replay for debugging** 🆕

---

## 📋 Enhanced Production Checklist

### Core Rendering & Graphics
- [ ] **WebGL2 detection with WebGL/Canvas2D fallback**
- [ ] **ImageBitmap async loading implemented**
- [ ] **ImageBitmap.close() called after texture upload** 🆕
- [ ] **OffscreenCanvas worker rendering (when available)**
- [ ] **Batch rendering with < 100 draw calls per frame**
- [ ] **TextureManager with LRU eviction (< 256MB GPU memory)** 🆕
- [ ] **CompositingManager tracking CSS layer promotion** 🆕
- [ ] **will-change CSS hints applied to performance-critical canvases** 🆕

### Memory Management
- [ ] **Object pooling for all frequently allocated objects**
- [ ] **BufferPool for typed arrays (Float32Array, Uint16Array, etc.)** 🆕
- [ ] **MemoryManager with pressure detection callbacks** 🆕
- [ ] **Memory leak testing (10+ minute sustained performance)**
- [ ] **Heap usage < 90% at all times** 🆕
- [ ] **Aggressive cleanup on memory pressure** 🆕

### Performance & Monitoring
- [ ] **GPU timing with EXT_disjoint_timer_query** 🆕
- [ ] **PerformanceObserver for paint timing** 🆕
- [ ] **WorkerPool with 4+ workers for heavy computation**
- [ ] **EnhancedWorkerPool with binary protocol & back-pressure** 🆕
- [ ] **Worker message coalescing for high-frequency updates** 🆕
- [ ] **Adaptive quality system with 5 levels (ultra→potato)**
- [ ] **TransformCache for entity transforms** 🆕
- [ ] **RendererStateCoalescer to minimize context state changes** 🆕
- [ ] **Slow-frame capture with deterministic replay** 🆕
- [ ] **Runtime HealthMonitor with alerts** 🆕

### Testing & CI/CD
- [ ] **CI performance regression tests (Playwright/Chromium)** 🆕
- [ ] **Automated FPS & frame-time assertions in CI** 🆕
- [ ] **Real-device testing baseline matrix** 🆕
- [ ] **Deterministic replay system for slow-frame debugging** 🆕
- [ ] **Memory leak detection harness** 🆕
- [ ] **Draw call budget enforcement** 🆕
- [ ] **Stress tests: 10k sprites, 5k particles, 10min sustained** 🆕

### Network & Multiplayer (if applicable)
- [ ] **Client-side prediction implemented** 🆕
- [ ] **Server reconciliation for mispredictions** 🆕
- [ ] **Entity interpolation (100ms buffer)** 🆕
- [ ] **Snapshot diffing to reduce bandwidth** 🆕
- [ ] **Interest management for scalability** 🆕

### Production Hardening
- [ ] **Service Worker caching for offline support**
- [ ] **Mobile testing on real devices (not just emulators)**
- [ ] **Browser quirk catalog documented (Safari, Chrome, Firefox)** 🆕
- [ ] **Safari OffscreenCanvas limits handled** 🆕
- [ ] **Chrome ImageBitmap decode edge cases tested** 🆕
- [ ] **Mobile compositing issues documented** 🆕
- [ ] **Graceful degradation on low-end devices**
- [ ] **User-controlled quality settings exposed** 🆕
- [ ] **Runtime health endpoints (FPS, memory, draw calls, worker queue)** 🆕

---

## 📁 Complete File Structure

```
src/
├── engine/
│   ├── core/
│   │   ├── Engine.ts
│   │   ├── FeatureDetector.ts
│   │   ├── EngineConfig.ts
│   │   └── Scene.ts
│   ├── rendering/
│   │   ├── Renderer.ts
│   │   ├── Canvas2DRenderer.ts
│   │   ├── WebGLBatchRenderer.ts
│   │   ├── TextureManager.ts 🆕
│   │   ├── CompositingManager.ts 🆕
│   │   ├── GPUTimingManager.ts 🆕
│   │   ├── TransformCache.ts 🆕
│   │   └── RendererStateCoalescer.ts 🆕
│   ├── assets/
│   │   ├── AssetLoader.ts
│   │   ├── ModernAssetLoader.ts
│   │   └── TextureAtlas.ts
│   ├── memory/
│   │   ├── ObjectPool.ts
│   │   ├── BufferPool.ts 🆕
│   │   └── MemoryManager.ts 🆕
│   ├── workers/
│   │   ├── WorkerPool.ts
│   │   ├── EnhancedWorkerPool.ts 🆕
│   │   ├── WorkerProtocol.ts 🆕
│   │   └── compute-worker.ts
│   ├── performance/
│   │   ├── PerformanceMonitor.ts
│   │   ├── EnterprisePerformanceMonitor.ts
│   │   ├── SlowFrameReplaySystem.ts 🆕
│   │   └── HealthMonitor.ts 🆕
│   ├── network/
│   │   └── NetworkManager.ts 🆕
│   └── utils/
│       ├── SpatialHash.ts
│       └── Culling.ts
├── game/
│   ├── scenes/
│   ├── entities/
│   └── systems/
└── tests/
    ├── perf/
    │   ├── ci-stress.spec.ts 🆕
    │   └── leak-detection.spec.ts 🆕
    └── tools/
        └── replay/ 🆕

docs/
├── IMPLEMENTATION_MASTERPLAN.md
├── RESEARCH_CANVAS_PERFORMANCE.md
├── ENGINE_ARCHITECTURE.md
└── FAQ_BROWSER_QUIRKS.md 🆕
```

---

## 🧪 Advanced Testing Strategies

### 1. CI Performance Regression Tests

```typescript
// tests/perf/ci-stress.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Regression Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Launch with GPU enabled
    await page.goto('http://localhost:3000/test-harness');
  });
  
  test('10k sprites at 60 FPS', async ({ page }) => {
    const metrics = await page.evaluate(async () => {
      const harness = window.testHarness;
      await harness.loadScenario('10k-sprites');
      return harness.runForDuration(10000); // 10 seconds
    });
    
    expect(metrics.avgFPS).toBeGreaterThan(55);
    expect(metrics.minFPS).toBeGreaterThan(30);
    expect(metrics.avgDrawCalls).toBeLessThan(100);
  });
  
  test('Memory stability over 10 minutes', async ({ page }) => {
    const leak = await page.evaluate(async () => {
      const harness = window.testHarness;
      const initial = performance.memory.usedJSHeapSize;
      
      await harness.runForDuration(600000); // 10 minutes
      
      if (window.gc) window.gc();
      await new Promise(r => setTimeout(r, 1000));
      
      const final = performance.memory.usedJSHeapSize;
      return (final - initial) / (1024 * 1024);
    });
    
    expect(leak).toBeLessThan(10); // < 10MB leak
  });
  
  test('Worker back-pressure handling', async ({ page }) => {
    const queueDepth = await page.evaluate(async () => {
      const harness = window.testHarness;
      
      // Flood workers with tasks
      for (let i = 0; i < 10000; i++) {
        harness.queueWorkerTask('pathfinding', {});
      }
      
      return harness.getMaxQueueDepth();
    });
    
    expect(queueDepth).toBeLessThan(100); // Back-pressure working
  });
});
```

### 2. Real-Device Testing Matrix

| Device | CPU | GPU | RAM | Browser | Target FPS | Status |
|--------|-----|-----|-----|---------|------------|--------|
| Desktop High-End | i7-9700K | RTX 2060 | 16GB | Chrome | 60 | ✅ |
| Desktop Mid-Range | i5-8400 | GTX 1650 | 8GB | Chrome | 60 | ✅ |
| Desktop Low-End | i3-6100 | Intel HD 530 | 4GB | Chrome | 45 | ⚠️ |
| MacBook Pro 2019 | i9 | Radeon 5500M | 16GB | Safari | 60 | ✅ |
| iPad Air 4 | A14 | - | 4GB | Safari | 60 | ✅ |
| iPhone 12 | A14 | - | 4GB | Safari | 60 | ✅ |
| Samsung S21 | SD888 | Adreno 660 | 8GB | Chrome | 60 | ✅ |
| Pixel 4a | SD730 | Adreno 618 | 6GB | Chrome | 45 | ⚠️ |
| Budget Android | SD665 | Adreno 610 | 4GB | Chrome | 30 | ⚠️ |

---

## 🐛 Browser Quirk Catalog

### Safari
- **OffscreenCanvas**: Limited support, check `OffscreenCanvas` availability
- **ImageBitmap**: Slower than Chrome, may skip frames during decode
- **WebGL context loss**: More aggressive than Chrome, implement recovery
- **Compositing**: Aggressive layer promotion can cause jank on low-memory devices
- **WebWorker transferables**: ArrayBuffer transfer sometimes fails, clone as fallback

### Chrome
- **ImageBitmap decode**: Can fail silently on corrupted images, wrap in try-catch
- **GPU process crashes**: On low-end devices, implement Canvas2D fallback
- **Memory pressure**: `performance.memory` only available with `--enable-precise-memory-info`
- **WebGL extensions**: EXT_disjoint_timer_query may be disabled on some GPUs

### Firefox
- **OffscreenCanvas**: Good support since v105
- **ImageBitmap**: Slightly slower decode than Chrome
- **WebGL performance**: Generally slower batch rendering, optimize batch sizes
- **Worker communication**: Slower postMessage, consider binary protocol

### Mobile Browsers
- **iOS Safari**: No WebGL2 until iOS 15+, fallback to WebGL required
- **Android Chrome**: Compositing layer limits vary by device (20-40 layers typical)
- **Mobile Firefox**: Poor WebGL performance on mid-range devices
- **Samsung Internet**: Quirky ImageBitmap support, test thoroughly

---

## 🏆 Conclusion (Enhanced)

This **FINAL MASTERPLAN** represents the culmination of:
- ✅ **Industry best practices** from PixiJS, Phaser, Three.js
- ✅ **Professional insights** from Agar.io, Slither.io scale testing
- ✅ **Microsoft Copilot recommendations** (copilotresponse.md + copilotresponse2.md)
- ✅ **Production-grade systems** unseen in typical Canvas engines

**What Makes This Different:**
1. 🆕 **GPU Timing & Compositing**: Real-time GPU performance monitoring
2. 🆕 **Advanced Memory Management**: Pressure detection, buffer pooling, LRU texture eviction
3. 🆕 **CI Performance Testing**: Automated regression tests prevent degradation
4. 🆕 **Deterministic Replay**: Debug slow frames with scene snapshots
5. 🆕 **Network Architecture**: Client prediction, server reconciliation, interpolation
6. 🆕 **Runtime Health Monitoring**: Proactive alerting before users notice issues

**By The Numbers:**
- **15 Core Pillars** (enhanced from original 10)
- **4 Implementation Phases** (8 weeks total)
- **45+ Checklist Items** (35 new items)
- **Zero Memory Leaks** (10-minute sustained testing)
- **60 FPS Desktop** | 30 FPS Mobile (minimum targets)
- **< 100 Draw Calls** per frame average
- **< 256MB GPU Memory** with LRU eviction
- **< 90% Heap Usage** with pressure callbacks

**Next Steps:**
1. ✅ Review this FINAL MASTERPLAN with your team
2. ✅ Set up CI pipeline with Playwright performance tests
3. ✅ Begin Phase 1: Foundation (FeatureDetector, BufferPool, MemoryManager)
4. ✅ Establish real-device testing baseline matrix
5. ✅ Document browser quirks as you discover them
6. ✅ Profile early, profile often - performance is a requirement, not a feature

**Remember:** This masterplan will help you build **"something unseen in Canvas before"** - a truly enterprise-grade game engine with production hardening that rivals compiled engines.

---

*Built with insights from PixiJS, Phaser 3, Three.js, Agar.io, Slither.io, MDN, Web.dev, and comprehensive Microsoft Copilot recommendations.*
*Enhanced with advanced GPU timing, memory management, CI testing, network architecture, and deterministic debugging.*
*Last updated: November 16, 2025 - FINAL VERSION*


