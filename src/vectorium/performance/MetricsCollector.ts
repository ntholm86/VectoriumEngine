/**
 * Base class for modular metric collectors
 * Each collector tracks a specific domain (render, physics, memory, etc.)
 */
export abstract class MetricsCollector {
  protected enabled = true;

  abstract reset(): void;
  abstract collect(): any;
  
  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }
  isEnabled(): boolean { return this.enabled; }
}

/**
 * Input lag tracking - measures time from input event to frame render
 */
export class InputMetricsCollector extends MetricsCollector {
  private lastInputTime = 0;
  private lastRenderTime = 0;
  private inputLagSamples: number[] = [];
  private maxSamples = 60;
  
  constructor() {
    super();
    this.setupInputTracking();
  }
  
  private setupInputTracking(): void {
    // Track common input events
    const events = ['mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup', 'touchstart', 'touchend'];
    events.forEach(event => {
      window.addEventListener(event, () => {
        this.lastInputTime = performance.now();
      }, { passive: true });
    });
  }
  
  recordFrameRender(): void {
    if (!this.enabled) return;
    
    this.lastRenderTime = performance.now();
    
    // Calculate input lag if we had recent input
    if (this.lastInputTime > 0 && this.lastRenderTime > this.lastInputTime) {
      const lag = this.lastRenderTime - this.lastInputTime;
      if (lag < 100) { // Only track reasonable lags (<100ms)
        this.inputLagSamples.push(lag);
        if (this.inputLagSamples.length > this.maxSamples) {
          this.inputLagSamples.shift();
        }
      }
      this.lastInputTime = 0; // Reset
    }
  }
  
  reset(): void {
    this.inputLagSamples = [];
  }
  
  collect() {
    if (this.inputLagSamples.length === 0) {
      return { inputLag: 0, inputLagMin: 0, inputLagMax: 0, inputLagP95: 0 };
    }
    
    const sorted = [...this.inputLagSamples].sort((a, b) => a - b);
    return {
      inputLag: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      inputLagMin: sorted[0],
      inputLagMax: sorted[sorted.length - 1],
      inputLagP95: sorted[Math.floor(sorted.length * 0.95)]
    };
  }
}

/**
 * Frame spike analysis - categorizes slow frames by severity
 */
export class FrameSpikeCollector extends MetricsCollector {
  private spikeFrames = 0;
  private severeSpikes = 0; // >33ms (drops below 30 FPS)
  private majorSpikes = 0;  // >20ms (drops below 50 FPS)
  private minorSpikes = 0;  // >16.67ms (drops below 60 FPS)
  private frameTimes: number[] = [];
  
  recordFrame(frameTime: number): void {
    if (!this.enabled) return;
    
    this.frameTimes.push(frameTime);
    
    if (frameTime > 33.33) {
      this.severeSpikes++;
      this.spikeFrames++;
    } else if (frameTime > 20) {
      this.majorSpikes++;
      this.spikeFrames++;
    } else if (frameTime > 16.67) {
      this.minorSpikes++;
      this.spikeFrames++;
    }
  }
  
  reset(): void {
    this.spikeFrames = 0;
    this.severeSpikes = 0;
    this.majorSpikes = 0;
    this.minorSpikes = 0;
    this.frameTimes = [];
  }
  
  collect() {
    const totalFrames = this.frameTimes.length;
    return {
      minorSpikes: this.minorSpikes,
      majorSpikes: this.majorSpikes,
      severeSpikes: this.severeSpikes,
      totalSpikes: this.spikeFrames,
      spikeRate: totalFrames > 0 ? (this.spikeFrames / totalFrames) * 100 : 0
    };
  }
}

/**
 * Asset loading time tracking
 */
export class AssetMetricsCollector extends MetricsCollector {
  private assetLoadTimes: Map<string, number> = new Map();
  private totalLoadTime = 0;
  private assetsLoaded = 0;
  private assetsCached = 0;
  
  recordAssetLoad(assetId: string, loadTime: number, fromCache: boolean): void {
    if (!this.enabled) return;
    
    this.assetLoadTimes.set(assetId, loadTime);
    this.totalLoadTime += loadTime;
    this.assetsLoaded++;
    if (fromCache) this.assetsCached++;
  }
  
  reset(): void {
    this.assetLoadTimes.clear();
    this.totalLoadTime = 0;
    this.assetsLoaded = 0;
    this.assetsCached = 0;
  }
  
  collect() {
    return {
      assetsLoaded: this.assetsLoaded,
      assetsFailed: 0, // Not currently tracked, but required by interface
      assetsCached: this.assetsCached,
      cacheHitRate: this.assetsLoaded > 0 ? (this.assetsCached / this.assetsLoaded) : 0,
      avgLoadTime: this.assetsLoaded > 0 ? this.totalLoadTime / this.assetsLoaded : 0,
      totalLoadTime: this.totalLoadTime
    };
  }
}

/**
 * GPU utilization estimation (from frame time variance)
 */
export class GPUMetricsCollector extends MetricsCollector {
  private gpuDrawTimes: number[] = [];
  private maxSamples = 120;
  
  recordFrame(frameTime: number, gpuDrawTime: number = 0): void {
    if (!this.enabled) return;
    
    this.gpuDrawTimes.push(gpuDrawTime);
    if (this.gpuDrawTimes.length > this.maxSamples) {
      this.gpuDrawTimes.shift();
    }
  }
  
  reset(): void {
    this.gpuDrawTimes = [];
  }
  
  collect() {
    if (this.gpuDrawTimes.length < 10) {
      return { gpuUtilization: 0, gpuBottleneck: false };
    }
    
    // Calculate GPU utilization based on actual GPU draw time
    const avg = this.gpuDrawTimes.reduce((a, b) => a + b, 0) / this.gpuDrawTimes.length;
    const variance = this.gpuDrawTimes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / this.gpuDrawTimes.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avg;
    
    // Estimate GPU utilization based on GPU draw time (0-1 scale)
    // If GPU draw time is near frame budget, GPU is bottleneck
    const utilization = Math.min(1.0, avg / 16.67);
    
    // GPU bottleneck if high utilization + low variance (consistent GPU load)
    const gpuBottleneck = utilization > 0.70 && cv < 0.3 && avg > 11; // >11ms GPU time = 66% of frame
    
    return {
      gpuUtilization: utilization,
      gpuBottleneck,
      frameTimeCV: cv
    };
  }
}

/**
 * Network statistics tracking
 */
export class NetworkMetricsCollector extends MetricsCollector {
  private bytesSent = 0;
  private bytesReceived = 0;
  private packetsLost = 0;
  private roundTripTimes: number[] = [];
  private maxRTTSamples = 30;
  
  recordSend(bytes: number): void {
    if (!this.enabled) return;
    this.bytesSent += bytes;
  }
  
  recordReceive(bytes: number): void {
    if (!this.enabled) return;
    this.bytesReceived += bytes;
  }
  
  recordPacketLoss(): void {
    if (!this.enabled) return;
    this.packetsLost++;
  }
  
  recordRoundTrip(rtt: number): void {
    if (!this.enabled) return;
    this.roundTripTimes.push(rtt);
    if (this.roundTripTimes.length > this.maxRTTSamples) {
      this.roundTripTimes.shift();
    }
  }
  
  reset(): void {
    this.bytesSent = 0;
    this.bytesReceived = 0;
    this.packetsLost = 0;
    this.roundTripTimes = [];
  }
  
  collect() {
    const avgRTT = this.roundTripTimes.length > 0
      ? this.roundTripTimes.reduce((a, b) => a + b, 0) / this.roundTripTimes.length
      : 0;
    
    return {
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      packetsLost: this.packetsLost,
      avgRTT,
      bandwidth: this.bytesSent + this.bytesReceived
    };
  }
}

/**
 * Texture atlas metrics
 */
export class TextureMetricsCollector extends MetricsCollector {
  private atlasSize = 0;
  private atlasUsed = 0;
  private textureUploads = 0;
  private uploadBytes = 0;
  
  recordAtlasSize(size: number): void {
    this.atlasSize = size;
  }
  
  recordAtlasUsage(used: number): void {
    this.atlasUsed = used;
  }
  
  recordTextureUpload(bytes: number): void {
    if (!this.enabled) return;
    this.textureUploads++;
    this.uploadBytes += bytes;
  }
  
  reset(): void {
    this.textureUploads = 0;
    this.uploadBytes = 0;
  }
  
  collect() {
    const fragmentation = this.atlasSize > 0 
      ? ((this.atlasSize - this.atlasUsed) / this.atlasSize) * 100 
      : 0;
    
    return {
      atlasSize: this.atlasSize / (1024 * 1024), // MB
      atlasUsed: this.atlasUsed / (1024 * 1024), // MB
      fragmentation,
      textureUploads: this.textureUploads,
      uploadBytes: this.uploadBytes / (1024 * 1024) // MB
    };
  }
}

/**
 * Event listener leak detection
 */
export class EventListenerCollector extends MetricsCollector {
  private listenerCount = 0;
  // Reserved for future detailed tracking
  // private listenersByType: Map<string, number> = new Map();
  private lastCount = 0;
  private growthFrames = 0;
  
  scan(): void {
    if (!this.enabled) return;
    
    // This is an approximation - we can't directly count event listeners
    // but we can track if they're growing
    // In a real implementation, you'd wrap addEventListener/removeEventListener
    
    // For now, track DOM elements which is a proxy for potential listener bloat
    const elementCount = document.getElementsByTagName('*').length;
    
    if (elementCount > this.lastCount) {
      this.growthFrames++;
    } else {
      this.growthFrames = 0;
    }
    
    this.lastCount = elementCount;
    this.listenerCount = elementCount; // Proxy metric
  }
  
  reset(): void {
    this.growthFrames = 0;
  }
  
  collect() {
    const potentialLeak = this.growthFrames > 60; // Growing for 1 second
    
    return {
      domElementCount: this.listenerCount,
      potentialListenerLeak: potentialLeak,
      growthFrames: this.growthFrames
    };
  }
}

/**
 * Long task detection (>50ms blocking main thread)
 */
export class LongTaskCollector extends MetricsCollector {
  private longTasks = 0;
  private longTaskDurations: number[] = [];
  private totalLongTaskTime = 0;
  
  recordTask(duration: number): void {
    if (!this.enabled) return;
    
    if (duration > 50) {
      this.longTasks++;
      this.longTaskDurations.push(duration);
      this.totalLongTaskTime += duration;
    }
  }
  
  reset(): void {
    this.longTasks = 0;
    this.longTaskDurations = [];
    this.totalLongTaskTime = 0;
  }
  
  collect() {
    return {
      longTasks: this.longTasks,
      totalLongTaskTime: this.totalLongTaskTime,
      avgLongTaskDuration: this.longTasks > 0 ? this.totalLongTaskTime / this.longTasks : 0,
      maxLongTask: this.longTaskDurations.length > 0 ? Math.max(...this.longTaskDurations) : 0
    };
  }
}

/**
 * Shader compilation time tracking
 */
export class ShaderMetricsCollector extends MetricsCollector {
  private shaderCompiles = 0;
  private totalCompileTime = 0;
  private compileTimes: Map<string, number> = new Map();
  
  recordCompile(shaderId: string, compileTime: number): void {
    if (!this.enabled) return;
    
    this.shaderCompiles++;
    this.totalCompileTime += compileTime;
    this.compileTimes.set(shaderId, compileTime);
  }
  
  reset(): void {
    this.shaderCompiles = 0;
    this.totalCompileTime = 0;
    this.compileTimes.clear();
  }
  
  collect() {
    return {
      shaderCompiles: this.shaderCompiles,
      totalCompileTime: this.totalCompileTime,
      avgCompileTime: this.shaderCompiles > 0 ? this.totalCompileTime / this.shaderCompiles : 0
    };
  }
}
