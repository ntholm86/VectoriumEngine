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

  constructor(targetFPS: number = 60, initialQuality: QualityLevel = 'high') {
    this.targetFPS = targetFPS;
    this.currentQuality = initialQuality;
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
}
