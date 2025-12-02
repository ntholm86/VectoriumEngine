/**
 * Advanced Performance Collectors
 * GPU timing, memory analysis, render stats, function profiling
 */

import { MetricsCollector } from './MetricsCollector';

// Type declaration for FinalizationRegistry (ES2021)
declare var FinalizationRegistry: any;

// =============================================================================
// GPU TIMING & QUERIES (WebGL2)
// =============================================================================

/**
 * GPU timing using WebGL2 timer queries (EXT_disjoint_timer_query_webgl2)
 * Measures actual GPU execution time vs CPU time
 */
export class GPUTimingCollector extends MetricsCollector {
  private gl: WebGL2RenderingContext | null = null;
  private ext: any = null; // EXT_disjoint_timer_query_webgl2
  private queries: Map<string, WebGLQuery> = new Map();
  private pendingQueries: Map<string, WebGLQuery> = new Map();
  private timings: Map<string, number[]> = new Map();
  private maxHistorySize = 60;
  private cpuFallback = false;
  private cpuTimings: Map<string, number> = new Map();
  
  initializeGL(gl: WebGL2RenderingContext): boolean {
    this.gl = gl;
    
    // DISABLED: WebGL2 only allows ONE active query at a time per target
    // The current usage tries to start 'draw' and 'text' simultaneously which fails
    // Use CPU fallback instead (performance.now() is accurate enough)
    console.warn('⚠️ GPU timing disabled (WebGL2 limitation), using CPU fallback');
    this.cpuFallback = true;
    return false;
    
    // Try to get timer query extension
    // this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    // 
    // if (!this.ext) {
    //   console.warn('⚠️ GPU timing not available, using CPU fallback');
    //   this.cpuFallback = true;
    //   return false;
    // }
    // 
    // return true;
  }
  
  startTiming(label: string): void {
    if (!this.enabled) return;
    
    if (this.cpuFallback) {
      this.cpuTimings.set(label, performance.now());
      return;
    }
    
    if (!this.gl || !this.ext) return;
    
    // Check if there's already an active or pending query for this label
    if (this.queries.has(label) || this.pendingQueries.has(label)) {
      return; // Skip if query already active or still waiting for previous result
    }
    
    const query = this.gl.createQuery();
    if (!query) return;
    
    this.queries.set(label, query);
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
  }
  
  endTiming(label: string): void {
    if (!this.enabled) return;
    
    if (this.cpuFallback) {
      const start = this.cpuTimings.get(label);
      if (start) {
        const duration = performance.now() - start;
        this.recordTiming(label, duration);
        this.cpuTimings.delete(label);
      }
      return;
    }
    
    if (!this.gl || !this.ext) return;
    
    // Only end query if we have an active query for this label
    const query = this.queries.get(label);
    if (!query) return;
    
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pendingQueries.set(label, query);
    this.queries.delete(label);
  }
  
  /**
   * Poll for query results (non-blocking)
   * Call this once per frame to collect available results
   */
  pollResults(): void {
    if (!this.enabled || this.cpuFallback) return;
    if (!this.gl || !this.ext) return;
    
    const toRemove: string[] = [];
    
    this.pendingQueries.forEach((query, label) => {
      const available = this.gl!.getQueryParameter(query, this.gl!.QUERY_RESULT_AVAILABLE);
      
      if (available) {
        // Check for disjoint (GPU was interrupted, result invalid)
        const disjoint = this.gl!.getParameter(this.ext!.GPU_DISJOINT_EXT);
        
        if (!disjoint) {
          const result = this.gl!.getQueryParameter(query, this.gl!.QUERY_RESULT);
          const timeMs = result / 1000000; // nanoseconds to milliseconds
          this.recordTiming(label, timeMs);
        }
        
        this.gl!.deleteQuery(query);
        toRemove.push(label);
      }
    });
    
    toRemove.forEach(label => this.pendingQueries.delete(label));
  }
  
  private recordTiming(label: string, timeMs: number): void {
    if (!this.timings.has(label)) {
      this.timings.set(label, []);
    }
    
    const history = this.timings.get(label)!;
    history.push(timeMs);
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }
  
  reset(): void {
    // Clear history but keep pending queries
    this.timings.clear();
    this.cpuTimings.clear();
  }
  
  collect() {
    const result: any = {
      usingCPUFallback: this.cpuFallback,
      timings: {}
    };
    
    this.timings.forEach((history, label) => {
      if (history.length > 0) {
        const avg = history.reduce((a, b) => a + b, 0) / history.length;
        const min = Math.min(...history);
        const max = Math.max(...history);
        result.timings[label] = { avg, min, max, samples: history.length };
      }
    });
    
    return result;
  }
}

// =============================================================================
// BATCH BREAK ANALYSIS
// =============================================================================

export interface BatchBreakReason {
  reason: 'texture' | 'shader' | 'buffer' | 'state' | 'manual';
  count: number;
}

/**
 * Tracks why batches are broken (texture swaps, shader switches, etc.)
 */
export class BatchBreakCollector extends MetricsCollector {
  private textureSwaps = 0;
  private shaderSwaps = 0;
  private bufferFullBreaks = 0;
  private stateChangeBreaks = 0;
  private manualFlushes = 0;
  private totalBatches = 0;
  private totalSprites = 0;
  
  recordTextureSwap(): void {
    if (!this.enabled) return;
    this.textureSwaps++;
  }
  
  recordShaderSwap(): void {
    if (!this.enabled) return;
    this.shaderSwaps++;
  }
  
  recordBufferFull(): void {
    if (!this.enabled) return;
    this.bufferFullBreaks++;
  }
  
  recordStateChange(): void {
    if (!this.enabled) return;
    this.stateChangeBreaks++;
  }
  
  recordManualFlush(): void {
    if (!this.enabled) return;
    this.manualFlushes++;
  }
  
  recordBatch(spriteCount: number = 0): void {
    if (!this.enabled) return;
    this.totalBatches++;
    this.totalSprites += spriteCount;
  }
  
  reset(): void {
    this.textureSwaps = 0;
    this.shaderSwaps = 0;
    this.bufferFullBreaks = 0;
    this.stateChangeBreaks = 0;
    this.manualFlushes = 0;
    this.totalBatches = 0;
    this.totalSprites = 0;
  }
  
  collect() {
    const avgSprites = this.totalBatches > 0 ? this.totalSprites / this.totalBatches : 0;
    return {
      totalBatches: this.totalBatches,
      textureSwaps: this.textureSwaps,
      shaderSwaps: this.shaderSwaps,
      bufferFullBreaks: this.bufferFullBreaks,
      stateChangeBreaks: this.stateChangeBreaks,
      manualFlushes: this.manualFlushes,
      // Percentage of batches broken by each reason
      textureSwapRate: this.totalBatches > 0 ? this.textureSwaps / this.totalBatches : 0,
      avgSpritesPerBatch: avgSprites
    };
  }
}

// =============================================================================
// MEMORY ALLOCATION TRACKING
// =============================================================================

/**
 * Tracks object allocations using weak references
 * Detects memory leaks and retention issues
 */
export class AllocationTracker extends MetricsCollector {
  private allocations: WeakMap<object, { type: string; timestamp: number; size: number }> = new WeakMap();
  private allocationCounts: Map<string, number> = new Map();
  private allocationSizes: Map<string, number> = new Map();
  private leakCandidates: Map<string, number> = new Map();
  private registry: any; // FinalizationRegistry
  
  constructor() {
    super();
    
    // Use FinalizationRegistry to detect when objects are garbage collected
    this.registry = new FinalizationRegistry((type: string) => {
      const count = this.allocationCounts.get(type) || 0;
      this.allocationCounts.set(type, Math.max(0, count - 1));
    });
  }
  
  trackAllocation(obj: object, type: string, estimatedSize: number = 0): void {
    if (!this.enabled) return;
    
    this.allocations.set(obj, {
      type,
      timestamp: Date.now(),
      size: estimatedSize
    });
    
    // Update counts
    const count = this.allocationCounts.get(type) || 0;
    this.allocationCounts.set(type, count + 1);
    
    const size = this.allocationSizes.get(type) || 0;
    this.allocationSizes.set(type, size + estimatedSize);
    
    // Register for finalization tracking
    this.registry.register(obj, type, obj);
  }
  
  /**
   * Scan for potential leaks (objects alive for too long)
   */
  scanForLeaks(): void {
    if (!this.enabled) return;
    
    // Objects alive for > 30 seconds might be leaks
    this.leakCandidates.clear();
    
    this.allocationCounts.forEach((count, type) => {
      if (count > 100) { // More than 100 objects of same type
        this.leakCandidates.set(type, count);
      }
    });
  }
  
  reset(): void {
    this.allocationCounts.clear();
    this.allocationSizes.clear();
    this.leakCandidates.clear();
  }
  
  collect() {
    const totalObjects = Array.from(this.allocationCounts.values()).reduce((a, b) => a + b, 0);
    const totalSize = Array.from(this.allocationSizes.values()).reduce((a, b) => a + b, 0);
    
    return {
      totalObjects,
      totalSize,
      byType: Object.fromEntries(this.allocationCounts),
      sizeByte: Object.fromEntries(this.allocationSizes),
      leakCandidates: Object.fromEntries(this.leakCandidates)
    };
  }
}

// =============================================================================
// RENDER STATISTICS
// =============================================================================

/**
 * Detailed rendering statistics
 * Fill rate, overdraw estimation, pixel throughput
 */
export class RenderStatCollector extends MetricsCollector {
  private pixelsDrawn = 0;
  private pixelsOverdrawn = 0; // Estimated
  private screenPixels = 0;
  private drawCallPixels: number[] = [];
  
  setScreenResolution(width: number, height: number): void {
    this.screenPixels = width * height;
  }
  
  recordDrawCall(triangles: number, avgPixelsPerTriangle: number = 100): void {
    if (!this.enabled) return;
    
    const pixels = triangles * avgPixelsPerTriangle;
    this.pixelsDrawn += pixels;
    this.drawCallPixels.push(pixels);
    
    // Estimate overdraw (pixels beyond screen size)
    if (this.pixelsDrawn > this.screenPixels) {
      this.pixelsOverdrawn = this.pixelsDrawn - this.screenPixels;
    }
  }
  
  reset(): void {
    this.pixelsDrawn = 0;
    this.pixelsOverdrawn = 0;
    this.drawCallPixels = [];
  }
  
  collect() {
    const fillRate = this.screenPixels > 0 ? this.pixelsDrawn / this.screenPixels : 0;
    const overdrawRatio = this.pixelsDrawn > 0 ? this.pixelsOverdrawn / this.pixelsDrawn : 0;
    
    return {
      pixelsDrawn: this.pixelsDrawn,
      screenPixels: this.screenPixels,
      fillRate, // 1.0 = filled once, 2.0 = filled twice (overdraw)
      overdrawRatio, // 0.0 = no overdraw, 0.5 = 50% overdraw
      overdrawPercentage: overdrawRatio * 100
      // Note: drawCalls removed - tracked by PerformanceMonitor directly
    };
  }
}

// =============================================================================
// FUNCTION PROFILING
// =============================================================================

/**
 * Function call tracking and hot path detection
 */
export class FunctionProfiler extends MetricsCollector {
  private callCounts: Map<string, number> = new Map();
  private totalTimes: Map<string, number> = new Map();
  private selfTimes: Map<string, number> = new Map();
  private activeCalls: Map<string, number> = new Map();
  
  startFunction(name: string): void {
    if (!this.enabled) return;
    
    const count = this.callCounts.get(name) || 0;
    this.callCounts.set(name, count + 1);
    
    this.activeCalls.set(name, performance.now());
  }
  
  endFunction(name: string): void {
    if (!this.enabled) return;
    
    const start = this.activeCalls.get(name);
    if (start !== undefined) {
      const duration = performance.now() - start;
      
      const total = this.totalTimes.get(name) || 0;
      this.totalTimes.set(name, total + duration);
      
      this.activeCalls.delete(name);
    }
  }
  
  reset(): void {
    this.callCounts.clear();
    this.totalTimes.clear();
    this.selfTimes.clear();
    this.activeCalls.clear();
  }
  
  collect() {
    const functions: any[] = [];
    
    this.callCounts.forEach((count, name) => {
      const totalTime = this.totalTimes.get(name) || 0;
      const avgTime = count > 0 ? totalTime / count : 0;
      
      functions.push({
        name,
        calls: count,
        totalTime,
        avgTime,
        selfTime: this.selfTimes.get(name) || totalTime
      });
    });
    
    // Sort by total time (hot paths)
    functions.sort((a, b) => b.totalTime - a.totalTime);
    
    return {
      totalFunctions: functions.length,
      totalCalls: Array.from(this.callCounts.values()).reduce((a, b) => a + b, 0),
      hotPaths: functions.slice(0, 10), // Top 10
      functions: functions.slice(0, 50) // Top 50 for export
    };
  }
}

// =============================================================================
// PLATFORM METRICS
// =============================================================================

/**
 * Platform-specific metrics
 * Battery, thermal, vsync, display
 */
export class PlatformMetricsCollector extends MetricsCollector {
  private batteryLevel = -1;
  private isCharging = false;
  private thermalState: string = 'unknown';
  private vsyncMisses = 0;
  private displayRefreshRate = 60;
  
  async initBatteryAPI(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        this.batteryLevel = battery.level;
        this.isCharging = battery.charging;
        
        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
        });
        
        battery.addEventListener('chargingchange', () => {
          this.isCharging = battery.charging;
        });
      } catch (e) {
        // Battery API not available
      }
    }
  }
  
  recordFrame(frameTime: number): void {
    if (!this.enabled) return;
    
    // Detect vsync misses (frame took significantly longer than refresh rate)
    const expectedFrameTime = 1000 / this.displayRefreshRate;
    if (frameTime > expectedFrameTime * 1.5) {
      this.vsyncMisses++;
    }
  }
  
  setDisplayRefreshRate(hz: number): void {
    this.displayRefreshRate = hz;
  }
  
  reset(): void {
    this.vsyncMisses = 0;
  }
  
  collect() {
    return {
      batteryLevel: this.batteryLevel,
      isCharging: this.isCharging,
      batteryPercentage: this.batteryLevel * 100,
      thermalState: this.thermalState,
      vsyncMisses: this.vsyncMisses,
      displayRefreshRate: this.displayRefreshRate,
      isMobile: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent),
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 1
    };
  }
}

// =============================================================================
// PHYSICS DEEP DIVE
// =============================================================================

/**
 * Detailed physics metrics
 * Broad phase, narrow phase, islands, contacts
 */
export class PhysicsDeepCollector extends MetricsCollector {
  private broadPhaseTime = 0;
  private narrowPhaseTime = 0;
  private contactCount = 0;
  private islandCount = 0;
  private sleepingBodies = 0;
  private awakeBodies = 0;
  private constraintIterations = 0;
  
  recordBroadPhase(timeMs: number): void {
    if (!this.enabled) return;
    this.broadPhaseTime = timeMs;
  }
  
  recordNarrowPhase(timeMs: number): void {
    if (!this.enabled) return;
    this.narrowPhaseTime = timeMs;
  }
  
  recordContacts(count: number): void {
    if (!this.enabled) return;
    this.contactCount = count;
  }
  
  recordIslands(count: number): void {
    if (!this.enabled) return;
    this.islandCount = count;
  }
  
  recordBodyStates(sleeping: number, awake: number): void {
    if (!this.enabled) return;
    this.sleepingBodies = sleeping;
    this.awakeBodies = awake;
  }
  
  recordConstraintIterations(iterations: number): void {
    if (!this.enabled) return;
    this.constraintIterations = iterations;
  }
  
  reset(): void {
    // Don't reset per-frame metrics, they'll be overwritten
  }
  
  collect() {
    return {
      broadPhaseTime: this.broadPhaseTime,
      narrowPhaseTime: this.narrowPhaseTime,
      contactCount: this.contactCount,
      islandCount: this.islandCount,
      sleepingBodies: this.sleepingBodies,
      awakeBodies: this.awakeBodies,
      totalBodies: this.sleepingBodies + this.awakeBodies,
      sleepRatio: (this.sleepingBodies + this.awakeBodies) > 0 
        ? this.sleepingBodies / (this.sleepingBodies + this.awakeBodies)
        : 0,
      constraintIterations: this.constraintIterations
    };
  }
}
