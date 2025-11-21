/**
 * Vectorium Engine - Performance Monitoring
 * Adaptive quality system with 5 levels and performance tracking
 */

export type QualityLevel = 'ultra' | 'high' | 'medium' | 'low' | 'potato';

export interface QualitySettings {
  resolutionScale: number;
  maxParticles: number;
  maxEntities: number;
  shadowQuality: number;
  enablePostProcessing: boolean;
  lodDistance: number;
}

export interface PerformanceMetrics {
  // Core metrics
  fps: number;
  frameTime: number;
  drawCalls: number;
  webglDrawCalls: number;
  textDrawCalls: number;
  memory: number;
  textMemory: number;
  quality: QualityLevel;

  // GPU metrics
  gpuFrameTime?: number; // GPU execution time (WebGL2 queries)
  gpuWaitTime?: number; // CPU waiting for GPU
  vertexThroughput?: number; // Vertices per second
  
  // Rendering efficiency
  verticesRendered: number;
  indicesRendered: number;
  trianglesRendered: number;
  batchEfficiency: number; // Average sprites per batch (0-1)
  bufferUploadSize: number; // MB uploaded to GPU this frame
  stateChanges: number; // Texture binds, shader swaps, etc.
  
  // ECS metrics
  entitiesProcessed: number; // Entities updated this frame
  entitiesRendered: number; // Entities rendered (after culling)
  timePerEntity: number; // microseconds per entity
  
  // Culling metrics (when implemented)
  entitiesInFrustum?: number;
  entitiesCulled?: number;
  cullingEfficiency?: number; // Percentage culled
  
  // Memory breakdown
  vertexBufferSize: number; // MB
  indexBufferSize: number; // MB
  textureMemory: number; // MB (when textures implemented)
  
  // Frame pacing
  frameTimeVariance: number; // Standard deviation
  frameTimeMin: number; // Best frame (1% lows)
  frameTimeMax: number; // Worst frame
  
  // Performance score
  performanceScore: number; // 0-100 overall health
  bottleneck: 'cpu' | 'gpu' | 'memory' | 'balanced'; // What's limiting performance
}

const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  ultra: {
    resolutionScale: 1.0,
    maxParticles: 5000,
    maxEntities: 10000,
    shadowQuality: 1.0,
    enablePostProcessing: true,
    lodDistance: 1000
  },
  high: {
    resolutionScale: 1.0,
    maxParticles: 2000,
    maxEntities: 5000,
    shadowQuality: 0.75,
    enablePostProcessing: true,
    lodDistance: 750
  },
  medium: {
    resolutionScale: 0.85,
    maxParticles: 1000,
    maxEntities: 2000,
    shadowQuality: 0.5,
    enablePostProcessing: false,
    lodDistance: 500
  },
  low: {
    resolutionScale: 0.7,
    maxParticles: 500,
    maxEntities: 1000,
    shadowQuality: 0.25,
    enablePostProcessing: false,
    lodDistance: 300
  },
  potato: {
    resolutionScale: 0.5,
    maxParticles: 100,
    maxEntities: 500,
    shadowQuality: 0,
    enablePostProcessing: false,
    lodDistance: 200
  }
};

export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private readonly maxSamples = 60;
  private lastFrameTime = 0;
  private currentQuality: QualityLevel = 'high';
  private targetFPS: number = 60;
  private drawCalls = 0;
  private webglDrawCalls = 0;
  private textDrawCalls = 0;
  private textMemory = 0;
  private adaptiveEnabled = true;
  private qualityChangeDelay = 0;

  // Enhanced tracking
  private frameTimeHistory: number[] = []; // For variance calculation
  private verticesThisFrame = 0;
  private indicesThisFrame = 0;
  private trianglesThisFrame = 0;
  private bufferUploadThisFrame = 0;
  private stateChangesThisFrame = 0;
  private entitiesProcessedThisFrame = 0;
  private entitiesRenderedThisFrame = 0;
  private batchSpriteCounts: number[] = []; // Sprites per batch for efficiency calc
  private maxBatchSize = 65000; // Track max for efficiency calculation

  // Profiler UI
  private profilerVisible = false;
  private profilerContainer: HTMLDivElement | null = null;
  private updateTimer: number | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private sparklineCanvas: HTMLCanvasElement | null = null;
  private sparklineCtx: CanvasRenderingContext2D | null = null;
  private frameTimeRingBuffer: number[] = []; // Last 60 frames for sparkline
  private readonly SPARKLINE_SIZE = 60;

  constructor(targetFPS: number = 60, initialQuality: QualityLevel = 'high') {
    this.targetFPS = targetFPS;
    this.currentQuality = initialQuality;
    this.initProfiler();
  }

  beginFrame(): void {
    this.lastFrameTime = performance.now();
    this.drawCalls = 0;
    this.webglDrawCalls = 0;
    this.textDrawCalls = 0;
    this.textMemory = 0;
    
    // Reset per-frame counters
    this.verticesThisFrame = 0;
    this.indicesThisFrame = 0;
    this.trianglesThisFrame = 0;
    this.bufferUploadThisFrame = 0;
    this.stateChangesThisFrame = 0;
    this.entitiesProcessedThisFrame = 0;
    this.entitiesRenderedThisFrame = 0;
    this.batchSpriteCounts = [];
  }

  endFrame(): void {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }

    // Track frame time history for variance
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > 300) { // 5 seconds at 60fps
      this.frameTimeHistory.shift();
    }

    // Update sparkline ring buffer
    this.frameTimeRingBuffer.push(frameTime);
    if (this.frameTimeRingBuffer.length > this.SPARKLINE_SIZE) {
      this.frameTimeRingBuffer.shift();
    }

    // Adaptive quality adjustment
    if (this.adaptiveEnabled && this.qualityChangeDelay <= 0) {
      this.adjustQuality();
    }
    
    if (this.qualityChangeDelay > 0) {
      this.qualityChangeDelay--;
    }
  }

  recordDrawCall(): void {
    this.drawCalls++;
  }

  recordWebGLDrawCalls(count: number): void {
    this.webglDrawCalls = count;
    this.drawCalls = this.webglDrawCalls + this.textDrawCalls;
  }

  recordTextDrawCalls(count: number): void {
    this.textDrawCalls = count;
    this.drawCalls = this.webglDrawCalls + this.textDrawCalls;
  }

  recordTextMemory(memory: number): void {
    this.textMemory = memory;
  }

  // Enhanced recording methods
  recordVertices(count: number): void {
    this.verticesThisFrame += count;
  }

  recordIndices(count: number): void {
    this.indicesThisFrame += count;
    this.trianglesThisFrame += Math.floor(count / 3);
  }

  recordBufferUpload(sizeInBytes: number): void {
    this.bufferUploadThisFrame += sizeInBytes / (1024 * 1024); // Convert to MB
  }

  recordStateChange(): void {
    this.stateChangesThisFrame++;
  }

  recordEntitiesProcessed(count: number): void {
    this.entitiesProcessedThisFrame = count;
  }

  recordEntitiesRendered(count: number): void {
    this.entitiesRenderedThisFrame = count;
  }

  recordBatch(spriteCount: number): void {
    this.batchSpriteCounts.push(spriteCount);
  }

  setMaxBatchSize(size: number): void {
    this.maxBatchSize = size;
  }

  recordCulling(inFrustum: number, culled: number): void {
    // Store culling stats for this frame
    (this as any).cullingInFrustum = inFrustum;
    (this as any).cullingCulled = culled;
  }

  private adjustQuality(): void {
    const avgFPS = this.getAverageFPS();
    const targetFrame = 1000 / this.targetFPS;
    const avgFrame = this.getAverageFrameTime();

    // Drop quality if performance is bad
    if (avgFPS < this.targetFPS * 0.8 && avgFrame > targetFrame * 1.2) {
      this.decreaseQuality();
      this.qualityChangeDelay = 120; // Wait 2 seconds before next change
    }
    // Increase quality if performance is good
    else if (avgFPS > this.targetFPS * 0.95 && avgFrame < targetFrame * 0.8) {
      this.increaseQuality();
      this.qualityChangeDelay = 120;
    }
  }

  private decreaseQuality(): void {
    const levels: QualityLevel[] = ['ultra', 'high', 'medium', 'low', 'potato'];
    const currentIndex = levels.indexOf(this.currentQuality);
    if (currentIndex < levels.length - 1) {
      this.currentQuality = levels[currentIndex + 1];
      console.log(`Vectorium: Quality decreased to ${this.currentQuality}`);
    }
  }

  private increaseQuality(): void {
    const levels: QualityLevel[] = ['ultra', 'high', 'medium', 'low', 'potato'];
    const currentIndex = levels.indexOf(this.currentQuality);
    if (currentIndex > 0) {
      this.currentQuality = levels[currentIndex - 1];
      console.log(`Vectorium: Quality increased to ${this.currentQuality}`);
    }
  }

  getAverageFPS(): number {
    if (this.frameTimes.length === 0) return 60;
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return 1000 / avgFrameTime;
  }

  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 16.67;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  getFPS(): number {
    if (this.frameTimes.length === 0) return 60;
    return 1000 / this.frameTimes[this.frameTimes.length - 1];
  }

  getMetrics(): PerformanceMetrics {
    // Calculate batch efficiency
    let batchEfficiency = 0;
    if (this.batchSpriteCounts.length > 0) {
      const avgSpritesPerBatch = this.batchSpriteCounts.reduce((a, b) => a + b, 0) / this.batchSpriteCounts.length;
      batchEfficiency = avgSpritesPerBatch / this.maxBatchSize;
    }

    // Calculate frame time variance
    let frameTimeVariance = 0;
    let frameTimeMin = 0;
    let frameTimeMax = 0;
    if (this.frameTimeHistory.length > 0) {
      const avg = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
      const squareDiffs = this.frameTimeHistory.map(value => Math.pow(value - avg, 2));
      frameTimeVariance = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length);
      
      // Calculate 1% lows (best 1% frames) and worst
      const sorted = [...this.frameTimeHistory].sort((a, b) => a - b);
      const onePercentIndex = Math.floor(sorted.length * 0.01);
      frameTimeMin = sorted[onePercentIndex] || sorted[0];
      frameTimeMax = sorted[sorted.length - 1];
    }

    // Calculate time per entity
    const timePerEntity = this.entitiesProcessedThisFrame > 0
      ? (this.getAverageFrameTime() * 1000) / this.entitiesProcessedThisFrame // microseconds
      : 0;

    // Calculate performance score (0-100)
    const targetFrameTime = 1000 / this.targetFPS;
    const currentFrameTime = this.getAverageFrameTime();
    const performanceScore = Math.min(100, Math.max(0, 
      100 * (targetFrameTime / currentFrameTime)
    ));

    // Determine bottleneck
    let bottleneck: 'cpu' | 'gpu' | 'memory' | 'balanced' = 'balanced';
    const memory = this.getMemoryUsage();
    if (memory > 1000) { // Over 1GB
      bottleneck = 'memory';
    } else if (this.drawCalls > 100 || this.trianglesThisFrame > 1000000) {
      bottleneck = 'gpu';
    } else if (currentFrameTime > targetFrameTime) {
      bottleneck = 'cpu';
    }

    // Calculate vertex/index buffer sizes (estimate)
    const vertexBufferSize = (this.verticesThisFrame * 8 * 4) / (1024 * 1024); // 8 floats per vertex
    const indexBufferSize = (this.indicesThisFrame * 2) / (1024 * 1024); // Uint16Array

    // Culling metrics
    const cullingInFrustum = (this as any).cullingInFrustum || this.entitiesRenderedThisFrame;
    const cullingCulled = (this as any).cullingCulled || 0;
    const cullingEfficiency = (cullingInFrustum + cullingCulled) > 0
      ? (cullingCulled / (cullingInFrustum + cullingCulled)) * 100
      : 0;

    return {
      // Core metrics
      fps: this.getAverageFPS(),
      frameTime: this.getAverageFrameTime(),
      drawCalls: this.drawCalls,
      webglDrawCalls: this.webglDrawCalls,
      textDrawCalls: this.textDrawCalls,
      memory: memory,
      textMemory: this.textMemory,
      quality: this.currentQuality,

      // Rendering efficiency
      verticesRendered: this.verticesThisFrame,
      indicesRendered: this.indicesThisFrame,
      trianglesRendered: this.trianglesThisFrame,
      batchEfficiency: batchEfficiency,
      bufferUploadSize: this.bufferUploadThisFrame,
      stateChanges: this.stateChangesThisFrame,

      // ECS metrics
      entitiesProcessed: this.entitiesProcessedThisFrame,
      entitiesRendered: this.entitiesRenderedThisFrame,
      timePerEntity: timePerEntity,

      // Culling metrics
      entitiesInFrustum: cullingInFrustum,
      entitiesCulled: cullingCulled,
      cullingEfficiency: cullingEfficiency,

      // Memory breakdown
      vertexBufferSize: vertexBufferSize,
      indexBufferSize: indexBufferSize,
      textureMemory: 0, // Not yet implemented

      // Frame pacing
      frameTimeVariance: frameTimeVariance,
      frameTimeMin: frameTimeMin,
      frameTimeMax: frameTimeMax,

      // Performance score
      performanceScore: performanceScore,
      bottleneck: bottleneck
    };
  }

  getQualitySettings(): QualitySettings {
    return QUALITY_PRESETS[this.currentQuality];
  }

  setQuality(quality: QualityLevel): void {
    this.currentQuality = quality;
    this.qualityChangeDelay = 120;
  }

  setAdaptiveQuality(enabled: boolean): void {
    this.adaptiveEnabled = enabled;
  }

  private getMemoryUsage(): number {
    const memory = (performance as any).memory;
    if (memory) {
      return memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }

  getDrawCallCount(): number {
    return this.drawCalls;
  }

  // ============================================================================
  // PROFILER UI
  // ============================================================================

  private initProfiler(): void {
    this.profilerContainer = this.createProfilerUI();
    document.body.appendChild(this.profilerContainer);
    this.initSparkline();
    this.loadVisibilityState();
    this.setupKeyboardShortcut();
    this.startProfilerUpdates();
  }

  private createProfilerUI(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'vectorium-profiler';
    container.className = 'vectorium-profiler hidden';
    container.innerHTML = `
      <div class="profiler-header">
        <span class="profiler-title">⚡ VECTORIUM PROFILER</span>
        <span class="profiler-hint">Press P to hide</span>
      </div>
      <div class="profiler-content">
        <div class="section-header">🎯 FRAME METRICS</div>
        <div class="metric-group">
          <div class="metric-row">
            <span class="metric-label">FPS</span>
            <span class="metric-value" data-metric="fps">60.0</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">└─ Avg (1s)</span>
            <span class="metric-value" data-metric="fpsavg">60.0</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Frame Time</span>
            <span class="metric-value" data-metric="frame">16.67ms</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Min/Max</span>
            <span class="metric-value" data-metric="minmax">16/17ms</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Variance</span>
            <span class="metric-value" data-metric="variance">±0.5ms</span>
          </div>
        </div>

        <div class="sparkline-container">
          <canvas class="sparkline-canvas" width="296" height="40"></canvas>
          <div class="sparkline-label">Frame Time (last 60 frames)</div>
        </div>

        <div class="section-header">⚙️ UPDATE/RENDER BREAKDOWN</div>
        <div class="metric-group">
          <div class="metric-row">
            <span class="metric-label">Update Total</span>
            <span class="metric-value" data-metric="updatetotal">0.00ms</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">├─ Physics</span>
            <span class="metric-value" data-metric="updatephysics">0.00ms</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">├─ Animation</span>
            <span class="metric-value" data-metric="updateanimation">0.00ms</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">└─ Entity Sync</span>
            <span class="metric-value" data-metric="updateentitysync">0.00ms</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Render Total</span>
            <span class="metric-value" data-metric="rendertotal">0.00ms</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">├─ ECS Batch</span>
            <span class="metric-value" data-metric="renderbatch">0.00ms</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">└─ Custom</span>
            <span class="metric-value" data-metric="rendercustom">0.00ms</span>
          </div>
        </div>

        <div class="section-header">🎨 RENDER PIPELINE</div>
        <div class="metric-group">
          <div class="metric-row">
            <span class="metric-label">Draw Calls</span>
            <span class="metric-value" data-metric="drawcalls">0</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">├─ WebGL</span>
            <span class="metric-value" data-metric="webgl">0</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">└─ Text</span>
            <span class="metric-value" data-metric="text">0</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Vertices</span>
            <span class="metric-value" data-metric="vertices">0</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Triangles</span>
            <span class="metric-value" data-metric="triangles">0</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Batch Efficiency</span>
            <span class="metric-value" data-metric="batch">0%</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Buffer Upload</span>
            <span class="metric-value" data-metric="upload">0MB</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">State Changes</span>
            <span class="metric-value" data-metric="states">0</span>
          </div>
        </div>

        <div class="section-header">⚙️ ECS METRICS</div>
        <div class="metric-group">
          <div class="metric-row">
            <span class="metric-label">Entities Active</span>
            <span class="metric-value" data-metric="active">0</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Rendered</span>
            <span class="metric-value" data-metric="rendered">0</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Culled</span>
            <span class="metric-value" data-metric="culled">0</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Culling Eff</span>
            <span class="metric-value" data-metric="cullingeff">0%</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Time/Entity</span>
            <span class="metric-value" data-metric="timeperentity">0μs</span>
          </div>
        </div>

        <div class="section-header">💾 MEMORY</div>
        <div class="metric-group">
          <div class="metric-row">
            <span class="metric-label">JS Heap</span>
            <span class="metric-value" data-metric="memory">0MB</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Vertex Buffers</span>
            <span class="metric-value" data-metric="vbuffer">0MB</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Index Buffers</span>
            <span class="metric-value" data-metric="ibuffer">0MB</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Text Atlases</span>
            <span class="metric-value" data-metric="textatlas">0MB</span>
          </div>
        </div>

        <div class="section-header">📊 PERFORMANCE</div>
        <div class="metric-group">
          <div class="metric-row">
            <span class="metric-label">Quality</span>
            <span class="metric-value" data-metric="quality">HIGH</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Score</span>
            <span class="metric-value" data-metric="score">100</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Bottleneck</span>
            <span class="metric-value" data-metric="bottleneck">BALANCED</span>
          </div>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .vectorium-profiler {
        position: fixed;
        top: 10px;
        right: 10px;
        width: 320px;
        max-height: 95vh;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.92);
        color: #00FF00;
        border: 2px solid #00FF00;
        border-radius: 6px;
        font-family: 'Courier New', Consolas, monospace;
        font-size: 11px;
        box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
        z-index: 10000;
        transition: opacity 0.3s, transform 0.3s;
      }
      .vectorium-profiler.hidden {
        opacity: 0;
        transform: translateX(360px);
        pointer-events: none;
      }
      .profiler-header {
        display: flex;
        justify-content: space-between;
        padding: 10px 12px;
        border-bottom: 1px solid rgba(0, 255, 0, 0.3);
        background: rgba(0, 255, 0, 0.05);
      }
      .profiler-title {
        font-weight: bold;
        font-size: 13px;
        letter-spacing: 0.5px;
      }
      .profiler-hint {
        color: #888;
        font-size: 10px;
      }
      .profiler-content {
        padding: 0;
      }
      .section-header {
        background: rgba(0, 255, 0, 0.1);
        padding: 6px 12px;
        font-weight: bold;
        font-size: 10px;
        letter-spacing: 0.5px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        color: #4a9eff;
      }
      .metric-group {
        padding: 8px 12px;
      }
      .metric-row {
        display: flex;
        justify-content: space-between;
        padding: 3px 0;
        line-height: 1.4;
      }
      .metric-label {
        color: #00FF00;
      }
      .metric-value {
        color: #FFFF00;
        font-weight: bold;
        text-align: right;
        min-width: 100px;
        transition: color 0.2s;
      }
      .metric-value.warning {
        color: #FFA500;
      }
      .metric-value.critical {
        color: #FF0000;
      }
      .metric-value.good {
        color: #00FF00;
      }
      .vectorium-profiler::-webkit-scrollbar {
        width: 8px;
      }
      .vectorium-profiler::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
      }
      .vectorium-profiler::-webkit-scrollbar-thumb {
        background: rgba(0, 255, 0, 0.3);
        border-radius: 4px;
      }
      .vectorium-profiler::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 255, 0, 0.5);
      }
      .sparkline-container {
        padding: 8px 12px;
        background: rgba(0, 255, 0, 0.03);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }
      .sparkline-canvas {
        width: 100%;
        height: 40px;
        display: block;
        image-rendering: pixelated;
      }
      .sparkline-label {
        font-size: 9px;
        color: #888;
        text-align: center;
        margin-top: 4px;
      }
    `;
    container.appendChild(style);

    return container;
  }

  private initSparkline(): void {
    this.sparklineCanvas = this.profilerContainer?.querySelector('.sparkline-canvas') as HTMLCanvasElement;
    if (this.sparklineCanvas) {
      this.sparklineCtx = this.sparklineCanvas.getContext('2d');
    }
  }

  private drawSparkline(): void {
    if (!this.sparklineCanvas || !this.sparklineCtx || this.frameTimeRingBuffer.length < 2) return;

    const ctx = this.sparklineCtx;
    const width = this.sparklineCanvas.width;
    const height = this.sparklineCanvas.height;
    const targetFrameTime = 1000 / this.targetFPS;

    // Clear
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Draw target line
    const targetY = height - (targetFrameTime / 50) * height;
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(width, targetY);
    ctx.stroke();

    // Draw frame times
    const pointWidth = width / this.SPARKLINE_SIZE;
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < this.frameTimeRingBuffer.length; i++) {
      const frameTime = this.frameTimeRingBuffer[i];
      const x = i * pointWidth;
      const y = height - Math.min((frameTime / 50) * height, height);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      // Color code bad frames
      if (frameTime > targetFrameTime * 2) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x - 1, y - 1, 3, 3);
      } else if (frameTime > targetFrameTime * 1.5) {
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    ctx.stroke();
  }

  private startProfilerUpdates(): void {
    this.updateTimer = window.setInterval(() => {
      if (this.profilerVisible) {
        this.updateProfilerUI();
      }
    }, 100); // 10Hz updates
  }

  private updateProfilerUI(): void {
    if (!this.profilerContainer) return;

    const metrics = this.getMetrics();
    const set = (selector: string, value: string, colorClass?: string) => {
      const el = this.profilerContainer!.querySelector(`[data-metric="${selector}"]`) as HTMLElement;
      if (el) {
        el.textContent = value;
        if (colorClass) {
          el.className = `metric-value ${colorClass}`;
        } else {
          el.className = 'metric-value';
        }
      }
    };

    // Frame Metrics
    const fpsClass = metrics.fps < 30 ? 'critical' : metrics.fps < 50 ? 'warning' : 'good';
    set('fps', metrics.fps.toFixed(1), fpsClass);
    set('fpsavg', this.getAverageFPS().toFixed(1));
    set('frame', `${metrics.frameTime.toFixed(2)}ms`);
    set('minmax', `${metrics.frameTimeMin.toFixed(1)}/${metrics.frameTimeMax.toFixed(1)}ms`);
    set('variance', `±${metrics.frameTimeVariance.toFixed(2)}ms`);

    // Draw sparkline
    this.drawSparkline();

    // Update/Render Breakdown (from Scene)
    const scenePerfMetrics = (window as any).vectoriumCurrentScene?.perfMetrics;
    if (scenePerfMetrics) {
      set('updatetotal', `${scenePerfMetrics.updateTotal.toFixed(2)}ms`);
      set('updatephysics', `${scenePerfMetrics.updatePhysics.toFixed(2)}ms`);
      set('updateanimation', `${scenePerfMetrics.updateAnimation.toFixed(2)}ms`);
      set('updateentitysync', `${scenePerfMetrics.updateEntitySync.toFixed(2)}ms`);
      set('rendertotal', `${scenePerfMetrics.renderTotal.toFixed(2)}ms`);
      set('renderbatch', `${scenePerfMetrics.renderBatch.toFixed(2)}ms`);
      set('rendercustom', `${scenePerfMetrics.renderCustom.toFixed(2)}ms`);
    }

    // Render Pipeline
    const drawCallClass = metrics.drawCalls > 50 ? 'warning' : metrics.drawCalls > 100 ? 'critical' : '';
    set('drawcalls', metrics.drawCalls.toString(), drawCallClass);
    set('webgl', metrics.webglDrawCalls.toString());
    set('text', metrics.textDrawCalls.toString());
    set('vertices', (metrics.verticesRendered / 1000).toFixed(1) + 'K');
    set('triangles', (metrics.trianglesRendered / 1000).toFixed(1) + 'K');
    
    const batchClass = metrics.batchEfficiency < 0.3 ? 'warning' : metrics.batchEfficiency > 0.7 ? 'good' : '';
    set('batch', `${(metrics.batchEfficiency * 100).toFixed(0)}%`, batchClass);
    set('upload', `${metrics.bufferUploadSize.toFixed(2)}MB`);
    set('states', metrics.stateChanges.toString());

    // ECS Metrics
    set('active', metrics.entitiesProcessed.toLocaleString());
    set('rendered', metrics.entitiesRendered.toLocaleString());
    set('culled', (metrics.entitiesCulled || 0).toLocaleString());
    set('cullingeff', `${(metrics.cullingEfficiency || 0).toFixed(0)}%`);
    set('timeperentity', `${metrics.timePerEntity.toFixed(2)}μs`);

    // Memory
    const memClass = metrics.memory > 500 ? 'warning' : metrics.memory > 1000 ? 'critical' : '';
    set('memory', `${metrics.memory.toFixed(0)}MB`, memClass);
    set('vbuffer', `${metrics.vertexBufferSize.toFixed(2)}MB`);
    set('ibuffer', `${metrics.indexBufferSize.toFixed(2)}MB`);
    set('textatlas', `${metrics.textMemory.toFixed(2)}MB`);

    // Performance
    set('quality', metrics.quality.toUpperCase());
    const scoreClass = metrics.performanceScore < 50 ? 'critical' : metrics.performanceScore < 75 ? 'warning' : 'good';
    set('score', metrics.performanceScore.toFixed(0), scoreClass);
    set('bottleneck', metrics.bottleneck.toUpperCase());
  }

  private setupKeyboardShortcut(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if ((e.key === 'p' || e.key === 'P') &&
          !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        this.toggleProfiler();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  toggleProfiler(): void {
    this.profilerVisible = !this.profilerVisible;
    if (this.profilerContainer) {
      if (this.profilerVisible) {
        this.profilerContainer.classList.remove('hidden');
      } else {
        this.profilerContainer.classList.add('hidden');
      }
    }
    this.saveVisibilityState();
  }

  showProfiler(): void {
    this.profilerVisible = true;
    if (this.profilerContainer) {
      this.profilerContainer.classList.remove('hidden');
    }
    this.saveVisibilityState();
  }

  hideProfiler(): void {
    this.profilerVisible = false;
    if (this.profilerContainer) {
      this.profilerContainer.classList.add('hidden');
    }
    this.saveVisibilityState();
  }

  private saveVisibilityState(): void {
    try {
      localStorage.setItem('vectorium-profiler-visible', String(this.profilerVisible));
    } catch (e) {
      // Silently fail if localStorage unavailable
    }
  }

  private loadVisibilityState(): void {
    try {
      const saved = localStorage.getItem('vectorium-profiler-visible');
      if (saved !== null) {
        this.profilerVisible = saved === 'true';
        if (this.profilerContainer) {
          if (this.profilerVisible) {
            this.profilerContainer.classList.remove('hidden');
          } else {
            this.profilerContainer.classList.add('hidden');
          }
        }
      }
    } catch (e) {
      // Silently fail
    }
  }

  destroy(): void {
    if (this.updateTimer !== null) {
      clearInterval(this.updateTimer);
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
    if (this.profilerContainer) {
      this.profilerContainer.remove();
    }
  }
}
