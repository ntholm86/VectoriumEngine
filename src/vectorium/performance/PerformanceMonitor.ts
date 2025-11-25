/**
 * Vectorium Engine - Performance Monitoring
 * Adaptive quality system with 5 levels and performance tracking
 */

import { UIPanel, UIPanelConfig } from '../ui/UIPanel';
import type { InputManager } from '../input/InputManager';

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
  timestamp?: number; // For tracking when measurement was taken

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
  
  // Physics metrics
  physicsTime: number; // Total physics time (ms)
  gravityTime: number; // Gravity calculation time (ms)
  collisionBuildTime: number; // Spatial hash build time (ms)
  collisionDetectTime: number; // Collision detection time (ms)
  boundaryTime: number; // Boundary checking time (ms)
  collisionChecks: number; // Number of collision pairs checked
  spatialHashCells: number; // Active spatial hash cells
  spatialHashMaxBucket: number; // Largest bucket size
  
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

export class PerformanceMonitor extends UIPanel {
  private frameTimes: number[] = [];
  private readonly maxSamples = 60;
  private lastFrameTime = 0;
  private currentQuality: QualityLevel = 'ultra';
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
  private updateTimer: number | null = null;
  private frameTimeRingBuffer: number[] = []; // Last 60 frames for sparkline
  private readonly SPARKLINE_SIZE = 60;

  // Physics metrics cache


  constructor(targetFPS: number = 60, initialQuality: QualityLevel = 'ultra') {
    const panelConfig: UIPanelConfig = {
      id: 'performance-monitor',
      title: '⚡ VECTORIUM PROFILER',
      keyboardShortcut: 'p',
      position: 'top-right',
      defaultVisible: true,
      collapsible: true
    };
    // Pass null for deferred initialization
    super(panelConfig, null);
    
    this.targetFPS = targetFPS;
    this.currentQuality = initialQuality;
    this.adaptiveEnabled = false; // Disable adaptive quality by default - it's too aggressive
  }
  
  /**
   * Initialize UI with InputManager (call after InputManager is created)
   */
  initializeUI(inputManager: InputManager): void {
    this.setInputManager(inputManager);
    this.initSparkline();
    this.startProfilerUpdates();
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

  recordPhysicsMetrics(metrics: any): void {
    (this as any).physicsTime = metrics.totalPhysicsTime || 0;
    (this as any).gravityTime = metrics.gravityTime || 0;
    (this as any).collisionBuildTime = metrics.collisionBuildTime || 0;
    (this as any).collisionDetectTime = metrics.collisionDetectTime || 0;
    (this as any).boundaryTime = metrics.boundaryTime || 0;
    (this as any).collisionChecks = metrics.totalCollisionChecks || 0;
    (this as any).spatialHashCells = metrics.spatialHashStats?.cellsUsed || 0;
    (this as any).spatialHashMaxBucket = metrics.spatialHashStats?.maxBucketSize || 0;
  }

  private adjustQuality(): void {
    const avgFPS = this.getAverageFPS();
    const targetFrame = 1000 / this.targetFPS;
    const avgFrame = this.getAverageFrameTime();

    // More aggressive quality increase: if performance is EXCELLENT, upgrade immediately
    if (avgFPS > this.targetFPS * 3.0 && avgFrame < targetFrame * 0.3) {
      // Performance is 3x better than target - upgrade multiple levels
      this.increaseQuality();
      this.increaseQuality(); // Double upgrade for excellent performance
      this.qualityChangeDelay = 30; // Short delay for next change
      return;
    }
    
    // Drop quality if performance is bad
    if (avgFPS < this.targetFPS * 0.8 && avgFrame > targetFrame * 1.2) {
      this.decreaseQuality();
      this.qualityChangeDelay = 120; // Wait 2 seconds before next change
    }
    // Increase quality if performance is good
    else if (avgFPS > this.targetFPS * 0.95 && avgFrame < targetFrame * 0.8) {
      this.increaseQuality();
      this.qualityChangeDelay = 60; // Reduced delay for upgrades (1 second)
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
      
      // Physics metrics (populated from engine)
      physicsTime: (this as any).physicsTime || 0,
      gravityTime: (this as any).gravityTime || 0,
      collisionBuildTime: (this as any).collisionBuildTime || 0,
      collisionDetectTime: (this as any).collisionDetectTime || 0,
      boundaryTime: (this as any).boundaryTime || 0,
      collisionChecks: (this as any).collisionChecks || 0,
      spatialHashCells: (this as any).spatialHashCells || 0,
      spatialHashMaxBucket: (this as any).spatialHashMaxBucket || 0,

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

  protected createContent(): string {
    return `
      <div class="profiler-content">
        <div class="section-header">🎯 FRAME METRICS</div>
        <div class="ui-section">
          <div class="ui-row">
            <span class="ui-label">FPS</span>
            <span class="ui-value" data-metric="fps">60.0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">└─ Average</span>
            <span class="ui-value" data-metric="fpsavg">60.0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Frame Time</span>
            <span class="ui-value" data-metric="frame">16.67ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Min/Max</span>
            <span class="ui-value" data-metric="minmax">16/17ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Variance</span>
            <span class="ui-value" data-metric="variance">±0.5ms</span>
          </div>
        </div>

        <div class="sparkline-container">
          <canvas class="sparkline-canvas" width="288" height="38"></canvas>
          <div class="sparkline-label">Frame Time History</div>
        </div>

        <div class="section-header">🎨 RENDER PIPELINE</div>
        <div class="ui-section">
          <div class="ui-row">
            <span class="ui-label">Draw Calls</span>
            <span class="ui-value" data-metric="drawcalls">0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">├─ WebGL</span>
            <span class="ui-value" data-metric="webgl">0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">└─ Text</span>
            <span class="ui-value" data-metric="text">0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Vertices</span>
            <span class="ui-value" data-metric="vertices">0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Triangles</span>
            <span class="ui-value" data-metric="triangles">0K</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Batch Eff</span>
            <span class="ui-value" data-metric="batch">0%</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Upload</span>
            <span class="ui-value" data-metric="upload">0MB</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">States</span>
            <span class="ui-value" data-metric="states">0</span>
          </div>
        </div>

        <div class="section-header">⚛️ PHYSICS</div>
        <div class="ui-section">
          <div class="ui-row">
            <span class="ui-label">Total Time</span>
            <span class="ui-value" data-metric="physicstime">0.00ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">├─ Gravity</span>
            <span class="ui-value" data-metric="gravitytime">0.00ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">├─ Hash Build</span>
            <span class="ui-value" data-metric="hashbuild">0.00ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">├─ Collision</span>
            <span class="ui-value" data-metric="collisiontime">0.00ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">└─ Boundary</span>
            <span class="ui-value" data-metric="boundarytime">0.00ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Checks</span>
            <span class="ui-value" data-metric="collisionchecks">0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Cells/Bucket</span>
            <span class="ui-value" data-metric="hashcells">0/0</span>
          </div>
        </div>

        <div class="section-header">⚙️ ECS METRICS</div>
        <div class="ui-section">
          <div class="ui-row">
            <span class="ui-label">Active</span>
            <span class="ui-value" data-metric="active">0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">├─ Shapes</span>
            <span class="ui-value" data-metric="shapes">0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">└─ Text</span>
            <span class="ui-value" data-metric="textentities">0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Rendered</span>
            <span class="ui-value" data-metric="rendered">0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Culled</span>
            <span class="ui-value" data-metric="culled">0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Culling Eff</span>
            <span class="ui-value" data-metric="cullingeff">0%</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Time/Entity</span>
            <span class="ui-value" data-metric="timeperentity">0μs</span>
          </div>
        </div>

        <div class="section-header">⚙️ UPDATE/RENDER</div>
        <div class="ui-section">
          <div class="ui-row">
            <span class="ui-label">Update Total</span>
            <span class="ui-value" data-metric="updatetotal">0.00ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">├─ Physics</span>
            <span class="ui-value" data-metric="updatephysics">0.00ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">├─ Animation</span>
            <span class="ui-value" data-metric="updateanimation">0.00ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">└─ Sync</span>
            <span class="ui-value" data-metric="updateentitysync">0.00ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Render Total</span>
            <span class="ui-value" data-metric="rendertotal">0.00ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">├─ Batch</span>
            <span class="ui-value" data-metric="renderbatch">0.00ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">└─ Custom</span>
            <span class="ui-value" data-metric="rendercustom">0.00ms</span>
          </div>
        </div>

        <div class="section-header">💾 MEMORY</div>
        <div class="ui-section">
          <div class="ui-row">
            <span class="ui-label">JS Heap</span>
            <span class="ui-value" data-metric="memory">0MB</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Vertex Buf</span>
            <span class="ui-value" data-metric="vbuffer">0MB</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Index Buf</span>
            <span class="ui-value" data-metric="ibuffer">0MB</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Text Atlas</span>
            <span class="ui-value" data-metric="textatlas">0MB</span>
          </div>
        </div>

        <div class="section-header">📊 PERFORMANCE</div>
        <div class="ui-section">
          <div class="ui-row">
            <span class="ui-label">Quality</span>
            <span class="ui-value" data-metric="quality">HIGH</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Score</span>
            <span class="ui-value" data-metric="score">100</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Bottleneck</span>
            <span class="ui-value" data-metric="bottleneck">BALANCED</span>
          </div>
          <button class="vectorium-btn full-width" data-action="measure">📊 Measure (2s)</button>
          <button class="vectorium-btn full-width" data-action="export">💾 Export Metrics</button>
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    // Add event listeners for measurement buttons
    const measureBtn = this.container?.querySelector('[data-action="measure"]');
    const exportBtn = this.container?.querySelector('[data-action="export"]');
    
    if (measureBtn) {
      measureBtn.addEventListener('click', () => {
        this.startMeasurement(2000);
      });
    }
    
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportMetrics();
      });
    }
  }

  private initSparkline(): void {
    // Sparkline canvas and context initialization kept for future use
    // this.sparklineCanvas = this.container?.querySelector('.sparkline-canvas') as HTMLCanvasElement;
    // if (this.sparklineCanvas) {
    //   this._sparklineCtx = this.sparklineCanvas.getContext('2d');
    // }
  }

  private startProfilerUpdates(): void {
    this.updateTimer = window.setInterval(() => {
      if (this.visible) {
        this.updateProfilerUI();
      }
    }, 100); // 10Hz updates
  }

  private updateProfilerUI(): void {
    if (!this.container) return;

    const metrics = this.getMetrics();
    const set = (selector: string, value: string, colorClass?: string) => {
      const el = this.container!.querySelector(`[data-metric="${selector}"]`) as HTMLElement;
      if (el) {
        el.textContent = value;
        if (colorClass) {
          el.className = `ui-value ${colorClass}`;
        } else {
          el.className = 'ui-value';
        }
      }
    };

    // Frame Metrics
    const fpsClass = metrics.fps < 30 ? 'critical' : metrics.fps < 50 ? 'warning' : 'good';
    set('fps', metrics.fps.toFixed(1), fpsClass);
    set('fpsavg', this.getAverageFPS().toFixed(1));
    set('frame', `${metrics.frameTime.toFixed(2)}ms`);
    set('minmax', `${metrics.frameTimeMin.toFixed(1)}/${metrics.frameTimeMax.toFixed(1)}ms`);

    // Render Pipeline
    const drawCallClass = metrics.drawCalls > 50 ? 'warning' : metrics.drawCalls > 100 ? 'critical' : '';
    set('drawcalls', metrics.drawCalls.toString(), drawCallClass);
    set('webgl', `${metrics.webglDrawCalls}`);
    set('text', `${metrics.textDrawCalls}`);
    set('vertices', `${(metrics.verticesRendered / 1000).toFixed(1)}K`);
    set('triangles', `${(metrics.trianglesRendered / 1000).toFixed(1)}K`);
    const batchClass = metrics.batchEfficiency < 0.3 ? 'warning' : metrics.batchEfficiency > 0.7 ? 'good' : '';
    set('batch', `${(metrics.batchEfficiency * 100).toFixed(0)}%`, batchClass);
    set('upload', `${metrics.bufferUploadSize.toFixed(2)}MB`);
    set('states', metrics.stateChanges.toString());

    // Physics Metrics
    const physicsClass = metrics.physicsTime > 10 ? 'warning' : metrics.physicsTime > 5 ? '' : 'good';
    set('physicstime', `${metrics.physicsTime.toFixed(2)}ms`, physicsClass);
    set('gravitytime', `${metrics.gravityTime.toFixed(2)}ms`);
    set('hashbuild', `${metrics.collisionBuildTime.toFixed(2)}ms`);
    set('collisiontime', `${metrics.collisionDetectTime.toFixed(2)}ms`);
    set('boundarytime', `${metrics.boundaryTime.toFixed(2)}ms`);
    set('collisionchecks', `${(metrics.collisionChecks / 1000).toFixed(1)}K`);
    set('hashcells', `${metrics.spatialHashCells}/${metrics.spatialHashMaxBucket}`);

    // ECS Metrics
    set('active', `${(metrics.entitiesProcessed / 1000).toFixed(1)}K`);
    
    // Shape and text entity counts (from World)
    const world = (window as any).vectoriumCurrentWorld;
    if (world) {
      const shapeCount = world.getShapeEntityCount();
      const textCount = world.getTextEntityCount();
      set('shapes', shapeCount.toString());
      set('textentities', textCount.toString());
    } else {
      set('shapes', '0');
      set('textentities', '0');
    }
    
    set('rendered', `${(metrics.entitiesRendered / 1000).toFixed(1)}K`);
    set('culled', `${((metrics.entitiesCulled || 0) / 1000).toFixed(1)}K`);
    set('timeperentity', `${metrics.timePerEntity.toFixed(1)}μs`);

    // Update/Render Breakdown (from Scene)
    const scenePerfMetrics = (window as any).vectoriumCurrentScene?.perfMetrics;
    if (scenePerfMetrics) {
      set('updatetotal', `${scenePerfMetrics.updateTotal.toFixed(2)}ms`);
      set('updatephysics', `${scenePerfMetrics.updatePhysics.toFixed(2)}ms`);
      set('updateanimation', `${scenePerfMetrics.updateAnimation.toFixed(2)}ms`);
      set('updateentitysync', `${scenePerfMetrics.updateEntitySync.toFixed(2)}ms`);
      set('rendertotal', `${scenePerfMetrics.renderTotal.toFixed(2)}ms`);
    }

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

  destroy(): void {
    if (this.updateTimer !== null) {
      clearInterval(this.updateTimer);
    }
    super.destroy(); // Call parent cleanup
  }

  /**
   * Export current metrics to JSON file
   * @param additionalData Optional metadata to include
   */
  exportMetrics(additionalData?: any): string {
    const metrics = this.getMetrics();
    metrics.timestamp = Date.now();
    
    const exportData = {
      metrics,
      metadata: {
        exportTime: new Date().toISOString(),
        ...additionalData
      },
      // Include historical data
      frameTimeHistory: {
        samples: this.frameTimeHistory.length,
        min: Math.min(...this.frameTimeHistory),
        max: Math.max(...this.frameTimeHistory),
        avg: this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length,
        recent: this.frameTimeHistory.slice(-60) // Last 60 frames
      }
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Store in window for agent to access
    (window as any).lastMeasurement = exportData;
    (window as any).lastMeasurementJSON = jsonData;
    
    console.log(`📊 Metrics exported - data available in window.lastMeasurement`);
    console.log(`📊 JSON data available in window.lastMeasurementJSON`);
    console.log(jsonData);
    
    return jsonData;
  }

  /**
   * Start automated performance measurement
   * @param durationMs How long to collect samples (default 2000ms)
   * @param callback Called when measurement is complete with results
   */
  startMeasurement(durationMs: number = 2000, callback?: (metrics: PerformanceMetrics, jsonData: string) => void): Promise<{metrics: PerformanceMetrics, jsonData: string}> {
    console.log(`📊 Starting ${durationMs}ms performance measurement...`);
    
    // Clear history for clean measurement
    this.frameTimeHistory = [];
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const metrics = this.getMetrics();
        metrics.timestamp = Date.now();
        
        console.log(`📊 Measurement complete:`);
        console.log(`   FPS: ${metrics.fps.toFixed(1)} (avg: ${this.getAverageFPS().toFixed(1)})`);
        console.log(`   Frame Time: ${metrics.frameTime.toFixed(2)}ms`);
        console.log(`   Draw Calls: ${metrics.drawCalls} (WebGL: ${metrics.webglDrawCalls}, Text: ${metrics.textDrawCalls})`);
        console.log(`   Entities: ${metrics.entitiesProcessed}`);
        console.log(`   Memory: ${metrics.memory.toFixed(0)}MB`);
        
        // Auto-export
        const jsonData = this.exportMetrics({
          measurementDuration: durationMs,
          sampleCount: this.frameTimeHistory.length
        });
        
        const result = { metrics, jsonData };
        if (callback) callback(metrics, jsonData);
        resolve(result);
      }, durationMs);
    });
  }
}
