/**
 * Vectorium Engine - Performance Monitoring
 * Adaptive quality system with 5 levels and performance tracking
 */

import { UIPanel, UIPanelConfig } from './UIPanel';
import type { InputManager } from '../systems/InputManager';
import {
  InputMetricsCollector,
  FrameSpikeCollector,
  AssetMetricsCollector,
  GPUMetricsCollector,
  NetworkMetricsCollector,
  TextureMetricsCollector,
  EventListenerCollector,
  LongTaskCollector,
  ShaderMetricsCollector
} from './MetricsCollector';
import {
  GPUTimingCollector,
  BatchBreakCollector,
  AllocationTracker,
  RenderStatCollector,
  FunctionProfiler,
  PlatformMetricsCollector,
  PhysicsDeepCollector
} from './AdvancedCollectors';

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
  particleCount?: number;
  quality: QualityLevel;
  timestamp?: number; // For tracking when measurement was taken

  // GPU metrics
  gpuFrameTime?: number; // GPU execution time (WebGL2 queries)
  gpuWaitTime?: number; // CPU waiting for GPU
  vertexThroughput?: number; // Vertices per second
  gpuInstancingEnabled?: boolean; // GPU instancing available
  instancedDrawCalls?: number; // Number of instanced draw calls
  instanceCount?: number; // Total instances rendered
  
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
  
  // Input metrics
  inputLag: number; // ms from input event to frame render
  inputLagP95: number; // 95th percentile input lag
  
  // Frame spike metrics
  minorSpikes: number; // 16-20ms frames
  majorSpikes: number; // 20-33ms frames
  severeSpikes: number; // >33ms frames
  totalSpikes: number; // all spikes
  
  // Asset metrics
  assetsLoaded: number;
  assetsFailed: number;
  cacheHitRate: number; // 0-1
  avgLoadTime: number; // ms
  
  // GPU metrics
  gpuUtilization: number; // 0-1 estimated
  gpuBottleneck: boolean;
  
  // Network metrics (optional)
  bytesSent?: number;
  bytesReceived?: number;
  avgRTT?: number; // ms
  packetLoss?: number; // 0-1
  
  // Texture metrics
  textureAtlasFragmentation?: number; // 0-1
  textureUploads?: number; // count
  
  // Diagnostic metrics
  domElementCount?: number;
  domGrowthRate?: number; // elements/second
  longTaskCount?: number;
  longestTask?: number; // ms
  shaderCompileTime?: number; // ms
  
  // GPU timing (WebGL2)
  gpuDrawTime?: number; // ms
  gpuTextTime?: number; // ms
  cpuGPUGap?: number; // CPU waiting for GPU
  usingGPUTimingFallback?: boolean;
  
  // Batch breaks
  totalBatches?: number;
  textureSwaps?: number;
  shaderSwaps?: number;
  bufferFullBreaks?: number;
  avgSpritesPerBatch?: number;
  
  // Memory allocation
  totalAllocatedObjects?: number;
  totalAllocatedBytes?: number;
  potentialLeaks?: number;
  
  // Render stats
  fillRate?: number; // 1.0 = filled once, 2.0 = double fill
  overdrawPercentage?: number;
  pixelsPerFrame?: number;
  
  // Function profiling
  totalFunctionCalls?: number;
  uniqueFunctions?: number;
  hottestFunction?: string;
  
  // Platform
  batteryPercentage?: number;
  isCharging?: boolean;
  vsyncMisses?: number;
  displayRefreshRate?: number;
  
  // Physics deep dive
  broadPhaseTime?: number;
  narrowPhaseTime?: number;
  contactCount?: number;
  islandCount?: number;
  sleepingBodies?: number;
  awakeBodies?: number;
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
  private instancedDrawCalls = 0;
  private instanceCount = 0;
  private gpuInstancingEnabled = false;
  private textMemory = 0;
  private particleCount = 0;
  private adaptiveEnabled = true;
  private qualityChangeDelay = 0;
  private lightweightMode = false; // 🚀 Reduce overhead when DevTools open
  private devToolsOpen = false;
  private devToolsCheckInterval = 0;

  // Enhanced tracking
  private frameTimeHistory: number[] = []; // For variance calculation
  private frameTimeHistoryIndex = 0; // Circular buffer index
  private frameTimeHistorySize = 0; // Current fill level
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
  
  // Renderer reference for buffer sizes
  private renderer: any = null;
  
  // GC activity tracking
  private lastHeapSize = 0;
  private heapGrowth = 0;
  private gcEventCount = 0;
  private lastGCTime = 0;
  private heapHistory: number[] = [];
  private heapHistoryIndex = 0; // Circular buffer index
  private heapHistorySize = 0; // Current fill level
  private maxHeapHistorySize = 120; // 2 seconds at 60fps
  
  // Modular metric collectors
  private inputCollector: InputMetricsCollector;
  private spikeCollector: FrameSpikeCollector;
  private assetCollector: AssetMetricsCollector;
  private gpuCollector: GPUMetricsCollector;
  private networkCollector: NetworkMetricsCollector;
  private textureCollector: TextureMetricsCollector;
  private listenerCollector: EventListenerCollector;
  private longTaskCollector: LongTaskCollector;
  private shaderCollector: ShaderMetricsCollector;
  
  // Advanced collectors
  private gpuTimingCollector: GPUTimingCollector;
  private batchBreakCollector: BatchBreakCollector;
  private allocationTracker: AllocationTracker;
  private renderStatCollector: RenderStatCollector;
  private functionProfiler: FunctionProfiler;
  private platformCollector: PlatformMetricsCollector;
  private physicsDeepCollector: PhysicsDeepCollector;

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
    
    // 🚀 Detect DevTools (causes 30-50% performance drop)
    this.detectDevTools();
    this.adaptiveEnabled = false; // Disable adaptive quality by default - it's too aggressive
    
    // Initialize metric collectors
    this.inputCollector = new InputMetricsCollector();
    this.spikeCollector = new FrameSpikeCollector();
    this.assetCollector = new AssetMetricsCollector();
    this.gpuCollector = new GPUMetricsCollector();
    this.networkCollector = new NetworkMetricsCollector();
    this.textureCollector = new TextureMetricsCollector();
    this.listenerCollector = new EventListenerCollector();
    this.longTaskCollector = new LongTaskCollector();
    this.shaderCollector = new ShaderMetricsCollector();
    
    // Initialize advanced collectors
    this.gpuTimingCollector = new GPUTimingCollector();
    this.batchBreakCollector = new BatchBreakCollector();
    this.allocationTracker = new AllocationTracker();
    this.renderStatCollector = new RenderStatCollector();
    this.functionProfiler = new FunctionProfiler();
    this.platformCollector = new PlatformMetricsCollector();
    this.physicsDeepCollector = new PhysicsDeepCollector();
    
    // Initialize platform metrics
    this.platformCollector.initBatteryAPI();
  }
  
  /**
   * Set renderer reference for buffer size tracking
   */
  setRenderer(renderer: any): void {
    this.renderer = renderer;
    
    // Initialize GPU timing if WebGL2
    const gl = renderer.getContext();
    if (gl && 'WebGL2RenderingContext' in window && gl instanceof WebGL2RenderingContext) {
      const success = this.gpuTimingCollector.initializeGL(gl);
      if (success) {
        console.log('✅ GPU timing enabled');
      }
    }
    
    // Set screen resolution for render stats
    const canvas = gl.canvas as HTMLCanvasElement;
    this.renderStatCollector.setScreenResolution(canvas.width, canvas.height);
  }
  
  /**
   * Initialize UI with InputManager (call after InputManager is created)
   */
  initializeUI(inputManager: InputManager): void {
    this.setInputManager(inputManager);
    this.startProfilerUpdates();
  }

  beginFrame(): void {
    this.lastFrameTime = performance.now();
    this.drawCalls = 0;
    this.webglDrawCalls = 0;
    this.textDrawCalls = 0;
    this.instancedDrawCalls = 0;
    this.instanceCount = 0;
    this.textMemory = 0;
    
    // Reset per-frame counters
    this.verticesThisFrame = 0;
    this.indicesThisFrame = 0;
    this.trianglesThisFrame = 0;
    this.bufferUploadThisFrame = 0;
    this.stateChangesThisFrame = 0;
    this.entitiesProcessedThisFrame = 0;
    this.entitiesRenderedThisFrame = 0;
    this.batchSpriteCounts.length = 0; // Reuse array instead of allocating new one
    
    // Reset batch break tracking each frame
    this.batchBreakCollector.reset();
    
    // Start GPU timing for draw calls
    this.gpuTimingCollector.startTiming('draw');
    this.gpuTimingCollector.startTiming('text');
    
    // Periodic scans (every 60 frames)
    if (this.frameTimes.length % 60 === 0) {
      this.listenerCollector.scan();
      // 🚀 Skip leak scanning in lightweight mode (expensive!)
      if (!this.lightweightMode) {
        this.allocationTracker.scanForLeaks();
      }
    }
  }

  endFrame(): void {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
    
    // End GPU timing
    this.gpuTimingCollector.endTiming('draw');
    this.gpuTimingCollector.endTiming('text');
    this.gpuTimingCollector.pollResults();
    
    // Get GPU draw time for utilization calculation
    const gpuTiming = this.gpuTimingCollector.collect();
    const gpuDrawTime = gpuTiming.timings['draw']?.avg || 0;
    
    // Track frame spikes and GPU metrics
    this.spikeCollector.recordFrame(frameTime);
    this.gpuCollector.recordFrame(frameTime, gpuDrawTime);
    
    // 🚀 Skip expensive profiling in lightweight mode (DevTools open)
    if (!this.lightweightMode) {
      this.platformCollector.recordFrame(frameTime);
      
      // Track long tasks
      if (frameTime > 16.67) {
        this.longTaskCollector.recordTask(frameTime);
      }
      
      // Track input lag
      this.inputCollector.recordFrameRender();
    }
    
    // Track GC activity
    const memory = (performance as any).memory;
    if (memory) {
      const currentHeap = memory.usedJSHeapSize;
      // Circular buffer write (no shift needed!)
      this.heapHistory[this.heapHistoryIndex] = currentHeap;
      this.heapHistoryIndex = (this.heapHistoryIndex + 1) % this.maxHeapHistorySize;
      if (this.heapHistorySize < this.maxHeapHistorySize) {
        this.heapHistorySize++;
      }
      
      // Detect GC event (heap size suddenly drops)
      if (currentHeap < this.lastHeapSize - 1048576) { // 1MB drop
        this.gcEventCount++;
        this.lastGCTime = now;
      }
      
      this.heapGrowth = currentHeap - this.lastHeapSize;
      this.lastHeapSize = currentHeap;
    }

    // Track frame time history for variance (circular buffer)
    this.frameTimeHistory[this.frameTimeHistoryIndex] = frameTime;
    this.frameTimeHistoryIndex = (this.frameTimeHistoryIndex + 1) % 300; // 5 seconds at 60fps
    if (this.frameTimeHistorySize < 300) {
      this.frameTimeHistorySize++;
    }

    // Adaptive quality adjustment
    if (this.adaptiveEnabled && this.qualityChangeDelay <= 0) {
      this.adjustQuality();
    }
    
    // 🚀 Periodic DevTools detection (every 2 seconds)
    this.detectDevTools();
    
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

  setGPUInstancingEnabled(enabled: boolean): void {
    this.gpuInstancingEnabled = enabled;
  }

  recordInstancedDrawCall(instanceCount: number): void {
    this.instancedDrawCalls++;
    this.instanceCount += instanceCount;
  }

  recordTextMemory(memory: number): void {
    this.textMemory = memory;
  }

  recordParticleCount(count: number): void {
    this.particleCount = count;
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

  // New collector-based recording methods
  recordAssetLoad(assetId: string, loadTime: number, fromCache: boolean): void {
    this.assetCollector.recordAssetLoad(assetId, loadTime, fromCache);
  }

  recordShaderCompile(shaderId: string, compileTime: number): void {
    this.shaderCollector.recordCompile(shaderId, compileTime);
  }

  recordNetworkSend(bytes: number): void {
    this.networkCollector.recordSend(bytes);
  }

  recordNetworkReceive(bytes: number): void {
    this.networkCollector.recordReceive(bytes);
  }

  recordNetworkRTT(rtt: number): void {
    this.networkCollector.recordRoundTrip(rtt);
  }

  recordTextureUpload(bytes: number): void {
    this.textureCollector.recordTextureUpload(bytes);
  }

  recordTextureAtlasFragmentation(_fragmentation: number): void {
    // TextureCollector doesn't have a direct recordFragmentation method
    // It calculates fragmentation from atlas size/usage
    // This is a no-op for now
  }

  // Advanced collector recording methods
  
  recordBatchBreak(reason: 'texture' | 'shader' | 'buffer' | 'state' | 'manual'): void {
    switch (reason) {
      case 'texture':
        this.batchBreakCollector.recordTextureSwap();
        break;
      case 'shader':
        this.batchBreakCollector.recordShaderSwap();
        break;
      case 'buffer':
        this.batchBreakCollector.recordBufferFull();
        break;
      case 'state':
        this.batchBreakCollector.recordStateChange();
        break;
      case 'manual':
        this.batchBreakCollector.recordManualFlush();
        break;
    }
  }
  
  recordBatchComplete(spriteCount: number): void {
    this.batchBreakCollector.recordBatch(spriteCount);
    this.recordBatch(spriteCount); // Keep existing tracking
  }
  
  trackAllocation(obj: object, type: string, size: number = 0): void {
    if (this.lightweightMode) return; // 🚀 Skip in lightweight mode
    this.allocationTracker.trackAllocation(obj, type, size);
  }
  
  recordDrawPixels(triangles: number): void {
    this.renderStatCollector.recordDrawCall(triangles);
  }
  
  startFunctionProfile(name: string): void {
    if (this.lightweightMode) return; // 🚀 Skip in lightweight mode
    this.functionProfiler.startFunction(name);
  }
  
  endFunctionProfile(name: string): void {
    if (this.lightweightMode) return; // 🚀 Skip in lightweight mode
    this.functionProfiler.endFunction(name);
  }
  
  recordPhysicsDeep(metrics: {
    broadPhase?: number;
    narrowPhase?: number;
    contacts?: number;
    islands?: number;
    sleeping?: number;
    awake?: number;
    iterations?: number;
  }): void {
    if (metrics.broadPhase !== undefined) this.physicsDeepCollector.recordBroadPhase(metrics.broadPhase);
    if (metrics.narrowPhase !== undefined) this.physicsDeepCollector.recordNarrowPhase(metrics.narrowPhase);
    if (metrics.contacts !== undefined) this.physicsDeepCollector.recordContacts(metrics.contacts);
    if (metrics.islands !== undefined) this.physicsDeepCollector.recordIslands(metrics.islands);
    if (metrics.sleeping !== undefined && metrics.awake !== undefined) {
      this.physicsDeepCollector.recordBodyStates(metrics.sleeping, metrics.awake);
    }
    if (metrics.iterations !== undefined) this.physicsDeepCollector.recordConstraintIterations(metrics.iterations);
  }

  /**
   * 🚀 Detect DevTools (causes 30-50% performance drop)
   * Uses threshold detection + periodic checks
   */
  private detectDevTools(): void {
    // Check window.outerWidth/innerWidth difference (DevTools docked)
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    
    // Check for debugger breakpoints (DevTools open)
    const devToolsDetected = widthThreshold || heightThreshold;
    
    if (devToolsDetected !== this.devToolsOpen) {
      this.devToolsOpen = devToolsDetected;
      this.lightweightMode = devToolsDetected;
      
      if (devToolsDetected) {
        console.log('🔧 DevTools detected - enabling lightweight profiling mode');
      } else {
        console.log('✅ DevTools closed - full profiling restored');
      }
    }
    
    // Periodic check every 2 seconds
    this.devToolsCheckInterval++;
    if (this.devToolsCheckInterval >= 120) { // 2 seconds at 60fps
      this.devToolsCheckInterval = 0;
      // Will check again next time
    }
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
    // Calculate batch efficiency from batch collector
    const batchMetrics = this.batchBreakCollector.collect();
    const batchEfficiency = this.maxBatchSize > 0 && batchMetrics.avgSpritesPerBatch > 0
      ? batchMetrics.avgSpritesPerBatch / this.maxBatchSize
      : 0;

    // Calculate frame time variance (using actual filled size)
    let frameTimeVariance = 0;
    let frameTimeMin = 0;
    let frameTimeMax = 0;
    if (this.frameTimeHistorySize > 0) {
      // Use only filled portion of circular buffer
      const filled = this.frameTimeHistory.slice(0, this.frameTimeHistorySize);
      const avg = filled.reduce((a, b) => a + b, 0) / this.frameTimeHistorySize;
      const squareDiffs = filled.map(value => Math.pow(value - avg, 2));
      frameTimeVariance = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / this.frameTimeHistorySize);
      
      // Calculate 1% lows (best 1% frames) and worst
      const sorted = [...filled].sort((a, b) => a - b);
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

    // Get actual buffer sizes from renderer (if available)
    let vertexBufferSize = 0;
    let indexBufferSize = 0;
    if (this.renderer && typeof this.renderer.getBufferMemoryUsage === 'function') {
      const bufferUsage = this.renderer.getBufferMemoryUsage();
      vertexBufferSize = bufferUsage.vertex;
      indexBufferSize = bufferUsage.index;
    } else {
      // Fallback to estimate
      vertexBufferSize = (this.verticesThisFrame * 8 * 4) / (1024 * 1024); // 8 floats per vertex
      indexBufferSize = (this.indicesThisFrame * 2) / (1024 * 1024); // Uint16Array
    }

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
      particleCount: this.particleCount,
      quality: this.currentQuality,

      // GPU instancing metrics
      gpuInstancingEnabled: this.gpuInstancingEnabled,
      instancedDrawCalls: this.instancedDrawCalls,
      instanceCount: this.instanceCount,

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
      bottleneck: bottleneck,
      
      // Collect from specialized collectors
      ...this.inputCollector.collect(),
      ...this.spikeCollector.collect(),
      ...this.assetCollector.collect(),
      ...this.gpuCollector.collect(),
      ...this.networkCollector.collect(),
      ...this.textureCollector.collect(),
      ...this.listenerCollector.collect(),
      ...this.longTaskCollector.collect(),
      ...this.shaderCollector.collect(),
      
      // Collect from advanced collectors
      ...this.collectGPUTimingMetrics(),
      ...this.batchBreakCollector.collect(),
      ...this.collectAllocationMetrics(),
      ...this.renderStatCollector.collect(),
      ...this.collectFunctionProfileMetrics(),
      ...this.platformCollector.collect(),
      ...this.physicsDeepCollector.collect()
    };
  }
  
  private collectGPUTimingMetrics(): any {
    const gpuTiming = this.gpuTimingCollector.collect();
    return {
      gpuDrawTime: gpuTiming.timings['draw']?.avg || 0,
      gpuTextTime: gpuTiming.timings['text']?.avg || 0,
      usingGPUTimingFallback: gpuTiming.usingCPUFallback
    };
  }
  
  private collectAllocationMetrics(): any {
    const alloc = this.allocationTracker.collect();
    return {
      totalAllocatedObjects: alloc.totalObjects,
      totalAllocatedBytes: alloc.totalSize,
      potentialLeaks: Object.keys(alloc.leakCandidates).length
    };
  }
  
  private collectFunctionProfileMetrics(): any {
    const prof = this.functionProfiler.collect();
    return {
      totalFunctionCalls: prof.totalCalls,
      uniqueFunctions: prof.totalFunctions,
      hottestFunction: prof.hotPaths[0]?.name || 'none'
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
        <div class="section-header">📊 PERFORMANCE</div>
        <div class="ui-section">
          <div class="ui-row">
            <span class="ui-label">FPS</span>
            <span class="ui-value" data-metric="fps" style="font-size: 24px; font-weight: bold; color: #00ff00;">60.0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Entities</span>
            <span class="ui-value" data-metric="active" style="font-size: 20px; font-weight: bold; color: #00ccff;">0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Frame Time</span>
            <span class="ui-value" data-metric="frame">16.67ms</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Frame Budget</span>
            <span class="ui-value" data-metric="framebudget">0.0/16.67ms</span>
          </div>
          <div class="frame-budget-bar">
            <div class="frame-budget-fill" data-metric="framebudgetbar" style="width: 0%"></div>
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
                <span class="ui-label">Particles</span>
                <span class="ui-value" data-metric="particles">0</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Rendered</span>
                <span class="ui-value" data-metric="rendered">0</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Culled</span>
                <span class="ui-value" data-metric="culled">0</span>
              </div>
            </div>

            <div class="section-header">🎯 FRAME TIMING</div>
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
                <span class="ui-label">Min/Max</span>
                <span class="ui-value" data-metric="minmax">16/17ms</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Variance</span>
                <span class="ui-value" data-metric="variance">±0.5ms</span>
              </div>
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
              <div class="ui-stat">
                <span class="ui-label">Batch Eff</span>
                <span class="ui-value" data-metric="batch">0%</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Upload</span>
                <span class="ui-value" data-metric="upload">0MB</span>
              </div>
            </div>

            <div class="section-header">🚀 GPU INSTANCING</div>
            <div class="ui-section">
              <div class="ui-row">
                <span class="ui-label">Status</span>
                <span class="ui-value" data-metric="instancingstatus">OFF</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Draw Calls</span>
                <span class="ui-value" data-metric="instanceddrawcalls">0</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Instances</span>
                <span class="ui-value" data-metric="instancecount">0</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Speedup</span>
                <span class="ui-value" data-metric="instancingspeedup">N/A</span>
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
              <div class="ui-row">
                <span class="ui-label">Sleeping</span>
                <span class="ui-value" data-metric="sleeping">0</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Active Pairs</span>
                <span class="ui-value" data-metric="activepairs">0</span>
              </div>
            </div>

            <div class="section-header">⚛️ PHYSICS DEEP</div>
            <div class="ui-section">
              <div class="ui-row">
                <span class="ui-label">Broad Phase</span>
                <span class="ui-value" data-metric="broadphase">0.00ms</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Narrow Phase</span>
                <span class="ui-value" data-metric="narrowphase">0.00ms</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Contacts</span>
                <span class="ui-value" data-metric="contacts">0</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Islands</span>
                <span class="ui-value" data-metric="islands">0</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Sleep Ratio</span>
                <span class="ui-value" data-metric="sleepratio">0%</span>
              </div>
            </div>

            <div class="section-header">💾 MEMORY</div>
            <div class="ui-hint">JS HEAP (RAM)</div>
            <div class="ui-section">
              <div class="ui-row">
                <span class="ui-label">Used</span>
                <span class="ui-value" data-metric="memory">0MB</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Limit</span>
                <span class="ui-value" data-metric="heaplimit">0MB</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">GC Pressure</span>
                <span class="ui-value" data-metric="gcpressure">0%</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">GC Events</span>
                <span class="ui-value" data-metric="gcevents">0</span>
              </div>
              <div class="ui-row">
                <span class="ui-label">Heap Trend</span>
                <span class="ui-value" data-metric="heaptrend">—</span>
              </div>
              <div class="ui-hint">Includes: V8 engine, page code, Vectorium lib, DevTools, DOM, all JS objects</div>
            </div>
            <div class="ui-hint">GPU MEMORY (VRAM)</div>
            <div class="ui-section">
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
              <div class="ui-row">
                <span class="ui-label">Total VRAM</span>
                <span class="ui-value" data-metric="totalvram">0MB</span>
              </div>
            </div>

        <div class="section-header">🧠 MEMORY TRACKING</div>
        <div class="ui-section">
          <div class="ui-row">
            <span class="ui-label">Allocated Objs</span>
            <span class="ui-value" data-metric="allocatedobjects">0</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Allocated Bytes</span>
            <span class="ui-value" data-metric="allocatedbytes">0KB</span>
          </div>
          <div class="ui-row">
            <span class="ui-label">Potential Leaks</span>
            <span class="ui-value" data-metric="potentialleaks">0</span>
          </div>
        </div>

        <div class="section-header">⚙️ ACTIONS</div>
        <div class="ui-section">
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
    
    // Helper: Color classification based on thresholds (green → yellow → orange → red)
    const getColorClass = (value: number, thresholds: {excellent?: number, good?: number, ok?: number, warning: number, critical: number, severe?: number}, inverted = false) => {
      if (inverted) {
        // For metrics where higher is better (FPS, batch efficiency, etc)
        if (thresholds.excellent && value >= thresholds.excellent) return 'excellent';
        if (thresholds.good && value >= thresholds.good) return 'good';
        if (thresholds.ok && value >= thresholds.ok) return 'ok';
        if (value >= thresholds.warning) return 'warning';
        if (thresholds.severe && value < thresholds.severe) return 'severe';
        return 'critical';
      } else {
        // For metrics where lower is better (frame time, memory, etc)
        if (thresholds.excellent && value <= thresholds.excellent) return 'excellent';
        if (thresholds.good && value <= thresholds.good) return 'good';
        if (thresholds.ok && value <= thresholds.ok) return 'ok';
        if (value <= thresholds.warning) return 'warning';
        if (thresholds.severe && value >= thresholds.severe) return 'severe';
        return 'critical';
      }
    };

    // Performance section (top of UI)
    set('quality', metrics.quality.toUpperCase());
    const scoreClass = getColorClass(metrics.performanceScore, {excellent: 90, good: 75, ok: 60, warning: 50, critical: 25}, true);
    set('score', metrics.performanceScore.toFixed(0), scoreClass);
    set('bottleneck', metrics.bottleneck.toUpperCase());
    
    // Frame budget (16.67ms for 60 FPS)
    const budgetUsage = (metrics.frameTime / 16.67) * 100;
    const budgetClass = getColorClass(budgetUsage, {excellent: 50, good: 70, ok: 80, warning: 90, critical: 95, severe: 110}, false);
    set('framebudget', `${metrics.frameTime.toFixed(2)}/16.67ms`, budgetClass);
    
    // Update frame budget bar with gradient
    const budgetBar = this.container!.querySelector('[data-metric="framebudgetbar"]') as HTMLElement;
    if (budgetBar) {
      budgetBar.style.width = `${Math.min(budgetUsage, 100)}%`;
      // Gradient: green → yellow → orange → red
      if (budgetUsage <= 50) budgetBar.style.backgroundColor = '#00ff88';
      else if (budgetUsage <= 70) budgetBar.style.backgroundColor = '#a6e22e';
      else if (budgetUsage <= 80) budgetBar.style.backgroundColor = '#e6db74';
      else if (budgetUsage <= 90) budgetBar.style.backgroundColor = '#fd971f';
      else if (budgetUsage <= 100) budgetBar.style.backgroundColor = '#f92672';
      else budgetBar.style.backgroundColor = '#ff0066';
    }

    // Frame Metrics
    const fpsClass = getColorClass(metrics.fps, {excellent: 60, good: 50, ok: 40, warning: 30, critical: 20, severe: 15}, true);
    set('fps', metrics.fps.toFixed(1), fpsClass);
    set('fpsavg', this.getAverageFPS().toFixed(1));
    
    const frameTimeClass = getColorClass(metrics.frameTime, {excellent: 8, good: 13, ok: 16.67, warning: 20, critical: 33, severe: 50}, false);
    set('frame', `${metrics.frameTime.toFixed(2)}ms`, frameTimeClass);
    set('minmax', `${metrics.frameTimeMin.toFixed(1)}/${metrics.frameTimeMax.toFixed(1)}ms`);
    
    const varianceClass = getColorClass(metrics.frameTimeVariance, {excellent: 0.5, good: 1.0, ok: 2.0, warning: 3.0, critical: 5.0, severe: 8.0}, false);
    set('variance', `±${metrics.frameTimeVariance.toFixed(1)}ms`, varianceClass);

    // Render Pipeline
    const drawCallClass = getColorClass(metrics.drawCalls, {excellent: 50, good: 100, ok: 200, warning: 500, critical: 1000, severe: 2000}, false);
    set('drawcalls', metrics.drawCalls.toString(), drawCallClass);
    
    const webglCallClass = getColorClass(metrics.webglDrawCalls, {excellent: 10, good: 25, ok: 50, warning: 100, critical: 200, severe: 500}, false);
    set('webgl', `${metrics.webglDrawCalls}`, webglCallClass);
    
    const textCallClass = getColorClass(metrics.textDrawCalls, {excellent: 10, good: 25, ok: 50, warning: 100, critical: 250, severe: 500}, false);
    set('text', `${metrics.textDrawCalls}`, textCallClass);
    
    const vertexCount = metrics.verticesRendered / 1000;
    const vertexClass = getColorClass(vertexCount, {excellent: 50, good: 200, ok: 500, warning: 1000, critical: 2000, severe: 5000}, false);
    set('vertices', `${vertexCount.toFixed(1)}K`, vertexClass);
    
    const triangleCount = metrics.trianglesRendered / 1000;
    const triangleClass = getColorClass(triangleCount, {excellent: 50, good: 200, ok: 500, warning: 1000, critical: 2000, severe: 5000}, false);
    set('triangles', `${triangleCount.toFixed(1)}K`, triangleClass);
    
    const batchEffPct = metrics.batchEfficiency * 100;
    const batchClass = getColorClass(batchEffPct, {excellent: 80, good: 60, ok: 40, warning: 25, critical: 10}, true);
    set('batch', `${batchEffPct.toFixed(0)}%`, batchClass);
    
    const uploadClass = getColorClass(metrics.bufferUploadSize, {excellent: 1, good: 5, ok: 10, warning: 20, critical: 50, severe: 100}, false);
    set('upload', `${metrics.bufferUploadSize.toFixed(2)}MB`, uploadClass);
    
    const stateClass = getColorClass(metrics.stateChanges, {excellent: 10, good: 30, ok: 60, warning: 120, critical: 250, severe: 500}, false);
    set('states', metrics.stateChanges.toString(), stateClass);

    // Physics Metrics
    const physicsTimeClass = getColorClass(metrics.physicsTime, {excellent: 2, good: 5, ok: 10, warning: 13, critical: 16, severe: 20}, false);
    set('physicstime', `${metrics.physicsTime.toFixed(2)}ms`, physicsTimeClass);
    
    const gravityTimeClass = getColorClass(metrics.gravityTime, {excellent: 0.5, good: 1, ok: 2, warning: 3, critical: 5, severe: 10}, false);
    set('gravitytime', `${metrics.gravityTime.toFixed(2)}ms`, gravityTimeClass);
    
    const hashBuildClass = getColorClass(metrics.collisionBuildTime, {excellent: 0.5, good: 1, ok: 2, warning: 3, critical: 5, severe: 10}, false);
    set('hashbuild', `${metrics.collisionBuildTime.toFixed(2)}ms`, hashBuildClass);
    
    const collisionTimeClass = getColorClass(metrics.collisionDetectTime, {excellent: 1, good: 3, ok: 5, warning: 8, critical: 12, severe: 20}, false);
    set('collisiontime', `${metrics.collisionDetectTime.toFixed(2)}ms`, collisionTimeClass);
    
    const boundaryTimeClass = getColorClass(metrics.boundaryTime, {excellent: 0.3, good: 0.5, ok: 1, warning: 2, critical: 3, severe: 5}, false);
    set('boundarytime', `${metrics.boundaryTime.toFixed(2)}ms`, boundaryTimeClass);
    
    const collisionChecksClass = getColorClass(metrics.collisionChecks, {excellent: 1000, good: 5000, ok: 10000, warning: 25000, critical: 50000, severe: 100000}, false);
    const collisionChecksK = metrics.collisionChecks / 1000;
    set('collisionchecks', metrics.collisionChecks > 1000 ? `${collisionChecksK.toFixed(1)}K` : metrics.collisionChecks.toString(), collisionChecksClass);
    
    set('hashcells', `${metrics.spatialHashCells}/${metrics.spatialHashMaxBucket}`);
    
    // New physics metrics - sleeping entities and active collision pairs
    const sleepingCount = (metrics as any).sleepingBodies || 0;
    const awakeCount = (metrics as any).awakeBodies || 0;
    set('sleeping', sleepingCount.toString());
    set('activepairs', awakeCount.toString());

    // ECS Metrics
    const activeCount = metrics.entitiesProcessed / 1000;
    const activeClass = getColorClass(activeCount, {excellent: 5, good: 10, ok: 25, warning: 50, critical: 100, severe: 200}, false);
    set('active', `${activeCount.toFixed(1)}K`, activeClass);
    
    // Shape and text entity counts (from World)
    const world = (window as any).vectoriumCurrentWorld;
    if (world) {
      const shapeCount = world.getShapeEntityCount();
      const textCount = world.getTextEntityCount();
      
      const shapeCountK = shapeCount / 1000;
      const shapeClass = getColorClass(shapeCountK, {excellent: 2, good: 5, ok: 10, warning: 25, critical: 50, severe: 100}, false);
      set('shapes', shapeCountK > 1 ? `${shapeCountK.toFixed(1)}K` : shapeCount.toString(), shapeClass);
      
      const textCountK = textCount / 1000;
      const textClass = getColorClass(textCountK, {excellent: 0.5, good: 1, ok: 2.5, warning: 5, critical: 10, severe: 25}, false);
      set('textentities', textCountK > 1 ? `${textCountK.toFixed(1)}K` : textCount.toString(), textClass);
    } else {
      set('shapes', '0');
      set('textentities', '0');
    }
    
    // Particle count
    const particleCountVal = metrics.particleCount || 0;
    const particleCountK = particleCountVal / 1000;
    const particleClass = getColorClass(particleCountK, {excellent: 10, good: 25, ok: 50, warning: 75, critical: 100, severe: 150}, false);
    set('particles', particleCountK > 1 ? `${particleCountK.toFixed(1)}K` : particleCountVal.toString(), particleClass);
    
    const renderedCount = metrics.entitiesRendered / 1000;
    const renderedClass = getColorClass(renderedCount, {excellent: 5, good: 10, ok: 25, warning: 50, critical: 100, severe: 200}, false);
    set('rendered', `${renderedCount.toFixed(1)}K`, renderedClass);
    
    const culledCount = (metrics.entitiesCulled || 0) / 1000;
    set('culled', `${culledCount.toFixed(1)}K`);
    
    // Culling efficiency display
    if (metrics.cullingEfficiency !== undefined) {
      const cullingEffPct = metrics.cullingEfficiency * 100;
      const cullingEffClass = getColorClass(cullingEffPct, {excellent: 70, good: 50, ok: 30, warning: 15, critical: 5}, true);
      set('cullingeff', `${cullingEffPct.toFixed(0)}%`, cullingEffClass);
    } else {
      set('cullingeff', '0%');
    }
    
    const timePerEntityClass = getColorClass(metrics.timePerEntity, {excellent: 1, good: 2, ok: 5, warning: 10, critical: 20, severe: 50}, false);
    set('timeperentity', `${metrics.timePerEntity.toFixed(1)}μs`, timePerEntityClass);

    // Update/Render Breakdown (from Scene)
    const scenePerfMetrics = (window as any).vectoriumCurrentScene?.perfMetrics;
    if (scenePerfMetrics) {
      const updateTotalClass = getColorClass(scenePerfMetrics.updateTotal, {excellent: 2, good: 5, ok: 8, warning: 12, critical: 15, severe: 20}, false);
      set('updatetotal', `${scenePerfMetrics.updateTotal.toFixed(2)}ms`, updateTotalClass);
      
      const updatePhysicsClass = getColorClass(scenePerfMetrics.updatePhysics, {excellent: 1, good: 3, ok: 5, warning: 8, critical: 12, severe: 16}, false);
      set('updatephysics', `${scenePerfMetrics.updatePhysics.toFixed(2)}ms`, updatePhysicsClass);
      
      const updateAnimClass = getColorClass(scenePerfMetrics.updateAnimation, {excellent: 0.5, good: 1, ok: 2, warning: 3, critical: 5, severe: 8}, false);
      set('updateanimation', `${scenePerfMetrics.updateAnimation.toFixed(2)}ms`, updateAnimClass);
      
      const updateSyncClass = getColorClass(scenePerfMetrics.updateEntitySync, {excellent: 0.3, good: 0.5, ok: 1, warning: 2, critical: 3, severe: 5}, false);
      set('updateentitysync', `${scenePerfMetrics.updateEntitySync.toFixed(2)}ms`, updateSyncClass);
      
      const renderTotalClass = getColorClass(scenePerfMetrics.renderTotal, {excellent: 2, good: 5, ok: 8, warning: 12, critical: 15, severe: 20}, false);
      set('rendertotal', `${scenePerfMetrics.renderTotal.toFixed(2)}ms`, renderTotalClass);
      
      const renderBatchClass = getColorClass(scenePerfMetrics.renderBatch, {excellent: 1, good: 3, ok: 5, warning: 8, critical: 12, severe: 16}, false);
      set('renderbatch', `${scenePerfMetrics.renderBatch.toFixed(2)}ms`, renderBatchClass);
      
      const renderCustomClass = getColorClass(scenePerfMetrics.renderCustom, {excellent: 0.5, good: 1, ok: 2, warning: 3, critical: 5, severe: 8}, false);
      set('rendercustom', `${scenePerfMetrics.renderCustom.toFixed(2)}ms`, renderCustomClass);
    } else {
      set('updatetotal', '0.00ms');
      set('updatephysics', '0.00ms');
      set('updateanimation', '0.00ms');
      set('updateentitysync', '0.00ms');
      set('rendertotal', '0.00ms');
      set('renderbatch', '0.00ms');
      set('rendercustom', '0.00ms');
    }

    // Memory
    const memClass = getColorClass(metrics.memory, {excellent: 100, good: 250, ok: 500, warning: 750, critical: 1000, severe: 1500}, false);
    set('memory', `${metrics.memory.toFixed(0)}MB`, memClass);
    
    const vBufferClass = getColorClass(metrics.vertexBufferSize, {excellent: 5, good: 10, ok: 20, warning: 50, critical: 100, severe: 200}, false);
    set('vbuffer', `${metrics.vertexBufferSize.toFixed(2)}MB`, vBufferClass);
    
    const iBufferClass = getColorClass(metrics.indexBufferSize, {excellent: 2, good: 5, ok: 10, warning: 20, critical: 50, severe: 100}, false);
    set('ibuffer', `${metrics.indexBufferSize.toFixed(2)}MB`, iBufferClass);
    
    const textAtlasClass = getColorClass(metrics.textMemory, {excellent: 2, good: 5, ok: 10, warning: 20, critical: 50, severe: 100}, false);
    set('textatlas', `${metrics.textMemory.toFixed(2)}MB`, textAtlasClass);
    
    // Total VRAM
    const totalVRAM = metrics.vertexBufferSize + metrics.indexBufferSize + metrics.textMemory;
    const vramClass = getColorClass(totalVRAM, {excellent: 10, good: 25, ok: 50, warning: 100, critical: 200, severe: 500}, false);
    set('totalvram', `${totalVRAM.toFixed(2)}MB`, vramClass);
    
    // New memory metrics - heap limit and GC pressure
    const memory = (performance as any).memory;
    if (memory) {
      const heapLimit = memory.jsHeapSizeLimit / (1024 * 1024);
      set('heaplimit', `${heapLimit.toFixed(0)}MB`);
      
      const gcPressure = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      const gcClass = getColorClass(gcPressure, {excellent: 40, good: 60, ok: 75, warning: 85, critical: 90, severe: 95}, false);
      set('gcpressure', `${gcPressure.toFixed(0)}%`, gcClass);
      
      // GC activity tracking
      set('gcevents', this.gcEventCount.toString());
      
      // Heap trend analysis (over last 2 seconds)
      if (this.heapHistory.length >= 60) {
        const recentHeap = this.heapHistory.slice(-60);
        const oldestHeap = recentHeap[0];
        const newestHeap = recentHeap[recentHeap.length - 1];
        const heapChange = (newestHeap - oldestHeap) / (1024 * 1024); // MB
        
        let trendText = '';
        let trendClass = '';
        if (Math.abs(heapChange) < 5) {
          trendText = 'Stable ✓';
          trendClass = 'good';
        } else if (heapChange > 0) {
          trendText = `+${heapChange.toFixed(1)}MB ⚠`;
          trendClass = heapChange > 20 ? 'critical' : 'warning';
        } else {
          trendText = `${heapChange.toFixed(1)}MB`;
          trendClass = 'good';
        }
        
        set('heaptrend', trendText, trendClass);
      } else {
        set('heaptrend', 'Measuring...');
      }
    } else {
      set('heaplimit', 'N/A');
      set('gcpressure', 'N/A');
      set('gcevents', 'N/A');
      set('heaptrend', 'N/A');
    }

    // Input Responsiveness
    const inputLagClass = getColorClass(metrics.inputLag, {excellent: 8, good: 16, ok: 25, warning: 33, critical: 50, severe: 80}, false);
    set('inputlag', `${metrics.inputLag.toFixed(1)}ms`, inputLagClass);
    
    const inputLagP95Class = getColorClass(metrics.inputLagP95, {excellent: 16, good: 25, ok: 33, warning: 50, critical: 80, severe: 120}, false);
    set('inputlagp95', `${metrics.inputLagP95.toFixed(1)}ms`, inputLagP95Class);

    // Frame Spikes
    const minorSpikesClass = getColorClass(metrics.minorSpikes, {excellent: 0, good: 5, ok: 15, warning: 30, critical: 60, severe: 120}, false);
    set('minorspikes', metrics.minorSpikes.toString(), minorSpikesClass);
    
    const majorSpikesClass = getColorClass(metrics.majorSpikes, {excellent: 0, good: 2, ok: 5, warning: 10, critical: 20, severe: 40}, false);
    set('majorspikes', metrics.majorSpikes.toString(), majorSpikesClass);
    
    const severeSpikesClass = getColorClass(metrics.severeSpikes, {excellent: 0, good: 0, ok: 1, warning: 3, critical: 8, severe: 15}, false);
    set('severespikes', metrics.severeSpikes.toString(), severeSpikesClass);
    
    const totalSpikesClass = getColorClass(metrics.totalSpikes, {excellent: 0, good: 5, ok: 20, warning: 40, critical: 80, severe: 150}, false);
    set('totalspikes', metrics.totalSpikes.toString(), totalSpikesClass);

    // Assets
    set('assetsloaded', metrics.assetsLoaded.toString());
    
    const assetsFailedClass = metrics.assetsFailed > 0 ? 'critical' : 'good';
    set('assetsfailed', metrics.assetsFailed.toString(), assetsFailedClass);
    
    const cacheHitPct = metrics.cacheHitRate * 100;
    const cacheHitClass = getColorClass(cacheHitPct, {excellent: 95, good: 85, ok: 70, warning: 50, critical: 30, severe: 10}, true);
    set('cachehitrate', `${cacheHitPct.toFixed(0)}%`, cacheHitClass);
    
    const avgLoadTimeClass = getColorClass(metrics.avgLoadTime, {excellent: 10, good: 30, ok: 50, warning: 100, critical: 250, severe: 500}, false);
    set('avgloadtime', `${metrics.avgLoadTime.toFixed(1)}ms`, avgLoadTimeClass);

    // GPU Utilization
    const gpuUtilPct = metrics.gpuUtilization * 100;
    const gpuUtilClass = getColorClass(gpuUtilPct, {excellent: 50, good: 70, ok: 85, warning: 90, critical: 95, severe: 98}, false);
    set('gpuutilization', `${gpuUtilPct.toFixed(0)}%`, gpuUtilClass);
    
    set('gpubottleneck', metrics.gpuBottleneck ? 'Yes' : 'No', metrics.gpuBottleneck ? 'warning' : 'good');

    // Diagnostics
    const longTasksClass = getColorClass(metrics.longTaskCount || 0, {excellent: 0, good: 2, ok: 5, warning: 10, critical: 20, severe: 40}, false);
    set('longtasks', (metrics.longTaskCount || 0).toString(), longTasksClass);
    
    const longestTaskClass = getColorClass(metrics.longestTask || 0, {excellent: 17, good: 20, ok: 30, warning: 50, critical: 80, severe: 120}, false);
    set('longesttask', `${(metrics.longestTask || 0).toFixed(1)}ms`, longestTaskClass);
    
    const domElementsClass = getColorClass(metrics.domElementCount || 0, {excellent: 100, good: 500, ok: 1000, warning: 2500, critical: 5000, severe: 10000}, false);
    set('domelements', (metrics.domElementCount || 0).toString(), domElementsClass);
    
    const domGrowthClass = getColorClass(metrics.domGrowthRate || 0, {excellent: 0, good: 1, ok: 5, warning: 10, critical: 25, severe: 50}, false);
    set('domgrowth', `${(metrics.domGrowthRate || 0).toFixed(1)}/s`, domGrowthClass);

    // GPU Timing section
    const gpuDrawTimeClass = getColorClass(metrics.gpuDrawTime || 0, {excellent: 2, good: 5, ok: 10, warning: 15, critical: 20, severe: 30}, false);
    set('gputimedraw', `${(metrics.gpuDrawTime || 0).toFixed(2)}ms`, gpuDrawTimeClass);
    
    const gpuTextTimeClass = getColorClass(metrics.gpuTextTime || 0, {excellent: 1, good: 3, ok: 5, warning: 8, critical: 12, severe: 20}, false);
    set('gputimetext', `${(metrics.gpuTextTime || 0).toFixed(2)}ms`, gpuTextTimeClass);
    
    set('gputimefallback', metrics.usingGPUTimingFallback ? 'Yes' : 'No', metrics.usingGPUTimingFallback ? 'critical' : 'excellent');

    // GPU Instancing section
    const instancingEnabled = metrics.gpuInstancingEnabled || false;
    set('instancingstatus', instancingEnabled ? '✅ ACTIVE' : '⚠️ OFF', instancingEnabled ? 'excellent' : 'warning');
    
    const instancedDrawCalls = metrics.instancedDrawCalls || 0;
    const instancedCallsClass = getColorClass(instancedDrawCalls, {excellent: 5, good: 10, ok: 20, warning: 50, critical: 100}, false);
    set('instanceddrawcalls', instancedDrawCalls.toString(), instancedCallsClass);
    
    const instanceCount = metrics.instanceCount || 0;
    const instanceCountK = instanceCount / 1000;
    const instanceCountClass = getColorClass(instanceCountK, {excellent: 2, good: 5, ok: 10, warning: 25, critical: 50}, false);
    set('instancecount', instanceCount > 1000 ? `${instanceCountK.toFixed(1)}K` : instanceCount.toString(), instanceCountClass);
    
    // Calculate estimated speedup (instances per draw call)
    if (instancingEnabled && instancedDrawCalls > 0 && instanceCount > 0) {
      const avgInstancesPerCall = instanceCount / instancedDrawCalls;
      const speedup = avgInstancesPerCall > 1 ? `${avgInstancesPerCall.toFixed(0)}x` : 'N/A';
      const speedupClass = getColorClass(avgInstancesPerCall, {excellent: 100, good: 50, ok: 25, warning: 10, critical: 5}, true);
      set('instancingspeedup', speedup, speedupClass);
    } else {
      set('instancingspeedup', 'N/A');
    }

    // Batch Analysis section
    const batchCountClass = getColorClass(metrics.totalBatches || 0, {excellent: 5, good: 20, ok: 50, warning: 100, critical: 200, severe: 500}, false);
    set('batchcount', (metrics.totalBatches || 0).toString(), batchCountClass);
    
    const textureSwapsClass = getColorClass(metrics.textureSwaps || 0, {excellent: 5, good: 20, ok: 50, warning: 100, critical: 200, severe: 500}, false);
    set('batchtexture', (metrics.textureSwaps || 0).toString(), textureSwapsClass);
    
    const shaderSwapsClass = getColorClass(metrics.shaderSwaps || 0, {excellent: 2, good: 10, ok: 20, warning: 50, critical: 100, severe: 200}, false);
    set('batchshader', (metrics.shaderSwaps || 0).toString(), shaderSwapsClass);
    
    const bufferFullClass = getColorClass(metrics.bufferFullBreaks || 0, {excellent: 0, good: 5, ok: 20, warning: 50, critical: 100, severe: 200}, false);
    set('batchbuffer', (metrics.bufferFullBreaks || 0).toString(), bufferFullClass);
    
    // State changes already displayed in render pipeline section, show manual breaks here if available
    set('batchstate', (metrics.stateChanges || 0).toString());
    
    const avgSpritesClass = getColorClass(metrics.avgSpritesPerBatch || 0, {excellent: 100, good: 50, ok: 30, warning: 15, critical: 5}, true);
    set('batchavgsprites', (metrics.avgSpritesPerBatch || 0).toFixed(0), avgSpritesClass);

    // Memory Tracking section
    const allocatedObjsClass = getColorClass(metrics.totalAllocatedObjects || 0, {excellent: 1000, good: 5000, ok: 10000, warning: 25000, critical: 50000, severe: 100000}, false);
    set('allocatedobjects', (metrics.totalAllocatedObjects || 0).toString(), allocatedObjsClass);
    
    const allocatedBytes = (metrics.totalAllocatedBytes || 0) / 1024;
    const allocatedBytesClass = getColorClass(allocatedBytes, {excellent: 100, good: 500, ok: 1024, warning: 5120, critical: 10240, severe: 51200}, false);
    set('allocatedbytes', `${allocatedBytes.toFixed(0)}KB`, allocatedBytesClass);
    
    const leaksClass = getColorClass(metrics.potentialLeaks || 0, {excellent: 0, good: 0, ok: 1, warning: 5, critical: 10, severe: 25}, false);
    set('potentialleaks', (metrics.potentialLeaks || 0).toString(), leaksClass);

    // Render Stats section
    const fillRateClass = getColorClass(metrics.fillRate || 0, {excellent: 1.5, good: 2.5, ok: 3.5, warning: 5.0, critical: 7.0, severe: 10.0}, false);
    set('fillrate', `${(metrics.fillRate || 0).toFixed(1)}x`, fillRateClass);
    
    const overdrawClass = getColorClass(metrics.overdrawPercentage || 0, {excellent: 50, good: 150, ok: 250, warning: 400, critical: 600, severe: 1000}, false);
    set('overdraw', `${(metrics.overdrawPercentage || 0).toFixed(0)}%`, overdrawClass);
    
    const pixelsMillion = (metrics.pixelsPerFrame || 0) / 1_000_000;
    const pixelsClass = getColorClass(pixelsMillion, {excellent: 5, good: 10, ok: 20, warning: 40, critical: 80, severe: 150}, false);
    set('pixelsframe', `${pixelsMillion.toFixed(1)}M`, pixelsClass);

    // Function Profile section
    const functionCallsClass = getColorClass(metrics.totalFunctionCalls || 0, {excellent: 100, good: 500, ok: 1000, warning: 2500, critical: 5000, severe: 10000}, false);
    set('functioncalls', (metrics.totalFunctionCalls || 0).toString(), functionCallsClass);
    
    const uniqueFuncsClass = getColorClass(metrics.uniqueFunctions || 0, {excellent: 10, good: 50, ok: 100, warning: 200, critical: 400, severe: 800}, false);
    set('uniquefuncs', (metrics.uniqueFunctions || 0).toString(), uniqueFuncsClass);
    
    set('hottestfunc', metrics.hottestFunction || '—');

    // Platform section
    if (metrics.batteryPercentage !== undefined) {
      const batteryClass = getColorClass(metrics.batteryPercentage * 100, {excellent: 80, good: 50, ok: 30, warning: 20, critical: 10, severe: 5}, true);
      set('battery', `${(metrics.batteryPercentage * 100).toFixed(0)}%`, batteryClass);
    } else {
      set('battery', '—');
    }
    
    set('charging', metrics.isCharging === undefined ? '—' : (metrics.isCharging ? 'Yes' : 'No'));
    
    const vsyncMissesClass = getColorClass(metrics.vsyncMisses || 0, {excellent: 0, good: 0, ok: 5, warning: 20, critical: 50, severe: 100}, false);
    set('vsyncmisses', (metrics.vsyncMisses || 0).toString(), vsyncMissesClass);
    
    set('refreshrate', `${metrics.displayRefreshRate || 60}Hz`);

    // Physics Deep section
    const broadPhaseClass = getColorClass(metrics.broadPhaseTime || 0, {excellent: 0.5, good: 1.0, ok: 2.0, warning: 4.0, critical: 8.0, severe: 15.0}, false);
    set('broadphase', `${(metrics.broadPhaseTime || 0).toFixed(2)}ms`, broadPhaseClass);
    
    const narrowPhaseClass = getColorClass(metrics.narrowPhaseTime || 0, {excellent: 1.0, good: 2.0, ok: 4.0, warning: 8.0, critical: 15.0, severe: 30.0}, false);
    set('narrowphase', `${(metrics.narrowPhaseTime || 0).toFixed(2)}ms`, narrowPhaseClass);
    
    const contactsClass = getColorClass(metrics.contactCount || 0, {excellent: 50, good: 200, ok: 500, warning: 1000, critical: 2500, severe: 5000}, false);
    set('contacts', (metrics.contactCount || 0).toString(), contactsClass);
    
    const islandsClass = getColorClass(metrics.islandCount || 0, {excellent: 5, good: 20, ok: 50, warning: 100, critical: 200, severe: 500}, false);
    set('islands', (metrics.islandCount || 0).toString(), islandsClass);
    
    const totalBodies = (metrics.sleepingBodies || 0) + (metrics.awakeBodies || 0);
    const sleepRatio = totalBodies > 0 ? (metrics.sleepingBodies || 0) / totalBodies * 100 : 0;
    const sleepRatioClass = getColorClass(sleepRatio, {excellent: 80, good: 60, ok: 40, warning: 20, critical: 10}, true);
    set('sleepratio', `${sleepRatio.toFixed(0)}%`, sleepRatioClass);

  }

  destroy(): void {
    if (this.updateTimer !== null) {
      clearInterval(this.updateTimer);
    }
    super.destroy(); // Call parent cleanup
  }
  
  private getMedian(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }
  
  private getPercentile(arr: number[], percentile: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Export current metrics to JSON file
   * @param additionalData Optional metadata to include
   */
  exportMetrics(additionalData?: any): string {
    const metrics = this.getMetrics();
    metrics.timestamp = Date.now();
    
    // Gather extended metrics from engine/world
    const world = (window as any).vectoriumCurrentWorld;
    const scene = (window as any).vectoriumCurrentScene;
    const memory = (performance as any).memory;
    
    const extendedMetrics = {
      // Frame budget analysis
      frameBudget: {
        target: 16.67, // 60 FPS
        current: metrics.frameTime,
        usage: (metrics.frameTime / 16.67) * 100,
        overhead: Math.max(0, metrics.frameTime - 16.67)
      },
      
      // Memory details
      memoryDetailed: memory ? {
        jsHeap: {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          usedMB: memory.usedJSHeapSize / (1024 * 1024),
          limitMB: memory.jsHeapSizeLimit / (1024 * 1024),
          gcPressure: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
          gcActivity: {
            totalEvents: this.gcEventCount,
            lastGCTime: this.lastGCTime,
            heapGrowthBytes: this.heapGrowth,
            heapGrowthMB: this.heapGrowth / (1024 * 1024),
            isStable: this.heapHistory.length >= 60 && 
                     Math.abs((this.heapHistory[this.heapHistory.length - 1] - this.heapHistory[Math.max(0, this.heapHistory.length - 60)]) / (1024 * 1024)) < 5,
            heapTrend: this.heapHistory.length >= 60 ? {
              samples: this.heapHistory.length,
              oldestMB: this.heapHistory[0] / (1024 * 1024),
              newestMB: this.heapHistory[this.heapHistory.length - 1] / (1024 * 1024),
              changeMB: (this.heapHistory[this.heapHistory.length - 1] - this.heapHistory[0]) / (1024 * 1024),
              minMB: Math.min(...this.heapHistory) / (1024 * 1024),
              maxMB: Math.max(...this.heapHistory) / (1024 * 1024),
              avgMB: (this.heapHistory.reduce((a, b) => a + b, 0) / this.heapHistory.length) / (1024 * 1024)
            } : null
          },
          note: 'Includes V8 engine, page code, Vectorium lib, DevTools, DOM, all JS objects'
        },
        gpuMemory: {
          vertexBuffer: metrics.vertexBufferSize,
          indexBuffer: metrics.indexBufferSize,
          textAtlas: metrics.textMemory,
          totalVRAM: metrics.vertexBufferSize + metrics.indexBufferSize + metrics.textMemory,
          note: 'GPU buffers and textures (separate from JS heap)'
        }
      } : {
        jsHeap: null,
        gpuMemory: {
          vertexBuffer: metrics.vertexBufferSize,
          indexBuffer: metrics.indexBufferSize,
          textAtlas: metrics.textMemory,
          totalVRAM: metrics.vertexBufferSize + metrics.indexBufferSize + metrics.textMemory,
          note: 'GPU buffers and textures (separate from JS heap)'
        }
      },
      
      // Physics extended
      physicsDetailed: {
        sleepingEntities: (metrics as any).sleepingBodies || 0,
        awakeEntities: (metrics as any).awakeBodies || 0,
        activeCollisionPairs: (metrics as any).collisionPairs || 0,
        spatialHashEfficiency: metrics.spatialHashCells > 0 ? 
          metrics.spatialHashMaxBucket / metrics.spatialHashCells : 0
      },
      
      // World/Scene stats
      worldStats: world ? {
        totalEntities: world.getTotalCount(),
        activeEntities: world.getActiveCount(),
        shapeEntities: world.getShapeEntityCount(),
        textEntities: world.getTextEntityCount()
      } : null,
      
      // Scene performance
      sceneStats: scene?.perfMetrics ? {
        updateTotal: scene.perfMetrics.updateTotal,
        updatePhysics: scene.perfMetrics.updatePhysics,
        updateAnimation: scene.perfMetrics.updateAnimation,
        updateEntitySync: scene.perfMetrics.updateEntitySync,
        renderTotal: scene.perfMetrics.renderTotal,
        renderBatch: scene.perfMetrics.renderBatch,
        renderCustom: scene.perfMetrics.renderCustom
      } : null,
      
      // Collector metrics
      inputMetrics: this.inputCollector.collect(),
      spikeMetrics: this.spikeCollector.collect(),
      assetMetrics: this.assetCollector.collect(),
      gpuMetrics: this.gpuCollector.collect(),
      networkMetrics: this.networkCollector.collect(),
      textureMetrics: this.textureCollector.collect(),
      diagnostics: {
        eventListeners: this.listenerCollector.collect(),
        longTasks: this.longTaskCollector.collect(),
        shaderCompiles: this.shaderCollector.collect()
      },
      
      // Advanced profiling metrics
      gpuTiming: {
        drawTime: metrics.gpuDrawTime,
        textTime: metrics.gpuTextTime,
        fallback: metrics.usingGPUTimingFallback,
        timings: this.gpuTimingCollector.collect()
      },
      batchAnalysis: {
        totalBatches: metrics.totalBatches,
        breaks: {
          texture: metrics.textureSwaps,
          shader: metrics.shaderSwaps,
          buffer: metrics.bufferFullBreaks,
          state: metrics.stateChanges
        },
        efficiency: {
          avgSpritesPerBatch: metrics.avgSpritesPerBatch
        },
        details: this.batchBreakCollector.collect()
      },
      memoryTracking: {
        allocatedObjects: metrics.totalAllocatedObjects,
        allocatedBytes: metrics.totalAllocatedBytes,
        potentialLeaks: metrics.potentialLeaks,
        allocationsByType: this.allocationTracker.collect()
      },
      renderStats: {
        fillRate: metrics.fillRate,
        overdrawPercent: metrics.overdrawPercentage,
        pixelsPerFrame: metrics.pixelsPerFrame,
        details: this.renderStatCollector.collect()
      },
      functionProfile: {
        totalCalls: metrics.totalFunctionCalls,
        uniqueFunctions: metrics.uniqueFunctions,
        hottestFunction: metrics.hottestFunction,
        hotPaths: this.functionProfiler.collect()
      },
      platform: {
        battery: metrics.batteryPercentage !== undefined ? (metrics.batteryPercentage * 100) : null,
        charging: metrics.isCharging,
        vsyncMisses: metrics.vsyncMisses,
        refreshRate: metrics.displayRefreshRate,
        details: this.platformCollector.collect()
      },
      physicsDeep: {
        broadPhaseTime: metrics.broadPhaseTime,
        narrowPhaseTime: metrics.narrowPhaseTime,
        contacts: metrics.contactCount,
        islands: metrics.islandCount,
        sleepRatio: (metrics.sleepingBodies && metrics.awakeBodies) ? (metrics.sleepingBodies / (metrics.sleepingBodies + metrics.awakeBodies) * 100) : 0,
        details: this.physicsDeepCollector.collect()
      }
    };
    
    const exportData = {
      metrics,
      extendedMetrics,
      metadata: {
        exportTime: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        },
        ...additionalData
      },
      // Include historical data
      frameTimeHistory: {
        samples: this.frameTimeHistory.length,
        min: Math.min(...this.frameTimeHistory),
        max: Math.max(...this.frameTimeHistory),
        avg: this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length,
        median: this.getMedian(this.frameTimeHistory),
        p95: this.getPercentile(this.frameTimeHistory, 0.95),
        p99: this.getPercentile(this.frameTimeHistory, 0.99),
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
    
    // Reset collectors
    this.inputCollector.reset();
    this.spikeCollector.reset();
    this.assetCollector.reset();
    this.gpuCollector.reset();
    this.networkCollector.reset();
    this.textureCollector.reset();
    this.listenerCollector.reset();
    this.longTaskCollector.reset();
    this.shaderCollector.reset();
    
    // Reset advanced collectors
    this.gpuTimingCollector.reset();
    this.batchBreakCollector.reset();
    this.allocationTracker.reset();
    this.renderStatCollector.reset();
    this.functionProfiler.reset();
    this.platformCollector.reset();
    this.physicsDeepCollector.reset();
    
    // Reset GC tracking for this measurement
    const startGCEvents = this.gcEventCount;
    const memory = (performance as any).memory;
    const startHeap = memory ? memory.usedJSHeapSize : 0;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const metrics = this.getMetrics();
        metrics.timestamp = Date.now();
        
        // Calculate GC activity during measurement
        const gcEventsDuring = this.gcEventCount - startGCEvents;
        const endHeap = memory ? memory.usedJSHeapSize : 0;
        const heapChangeMB = (endHeap - startHeap) / (1024 * 1024);
        
        console.log(`📊 Measurement complete:`);
        console.log(`   FPS: ${metrics.fps.toFixed(1)} (avg: ${this.getAverageFPS().toFixed(1)})`);
        console.log(`   Frame Time: ${metrics.frameTime.toFixed(2)}ms (budget: ${((metrics.frameTime/16.67)*100).toFixed(0)}%)`);
        console.log(`   Draw Calls: ${metrics.drawCalls} (WebGL: ${metrics.webglDrawCalls}, Text: ${metrics.textDrawCalls})`);
        console.log(`   Entities: ${metrics.entitiesProcessed} (Rendered: ${metrics.entitiesRendered})`);
        console.log(`   Physics: ${metrics.physicsTime.toFixed(2)}ms (Checks: ${(metrics.collisionChecks/1000).toFixed(1)}K)`);
        console.log(`   Memory: ${metrics.memory.toFixed(0)}MB`);
        console.log(`   Bottleneck: ${metrics.bottleneck.toUpperCase()}`);
        console.log(`   Quality Score: ${metrics.performanceScore.toFixed(0)}/100`);
        
        // Memory analysis
        if (memory) {
          const gcPressure = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
          console.log(`   GC Pressure: ${gcPressure.toFixed(0)}% (${(memory.usedJSHeapSize/(1024*1024)).toFixed(0)}MB / ${(memory.jsHeapSizeLimit/(1024*1024)).toFixed(0)}MB)`);
          console.log(`   GC Events: ${gcEventsDuring} during measurement`);
          console.log(`   Heap Change: ${heapChangeMB >= 0 ? '+' : ''}${heapChangeMB.toFixed(1)}MB`);
          
          // Memory leak warning
          if (heapChangeMB > 20) {
            console.warn(`   ⚠️ Heap grew by ${heapChangeMB.toFixed(1)}MB - possible memory leak!`);
          } else if (Math.abs(heapChangeMB) < 5) {
            console.log(`   ✓ Heap stable (${heapChangeMB >= 0 ? '+' : ''}${heapChangeMB.toFixed(1)}MB)`);
          }
        }
        
        // Auto-export with measurement metadata
        const jsonData = this.exportMetrics({
          measurementDuration: durationMs,
          sampleCount: this.frameTimeHistory.length,
          gcEventsDuringMeasurement: gcEventsDuring,
          heapChangeKB: heapChangeMB,
          heapStable: Math.abs(heapChangeMB) < 5
        });
        
        const result = { metrics, jsonData };
        if (callback) callback(metrics, jsonData);
        resolve(result);
      }, durationMs);
    });
  }
}
