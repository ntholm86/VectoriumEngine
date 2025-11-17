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
  fps: number;
  frameTime: number;
  drawCalls: number;
  webglDrawCalls: number;
  textDrawCalls: number;
  memory: number;
  textMemory: number;
  quality: QualityLevel;
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
  }

  endFrame(): void {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
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
    return {
      fps: this.getAverageFPS(),
      frameTime: this.getAverageFrameTime(),
      drawCalls: this.drawCalls,
      webglDrawCalls: this.webglDrawCalls,
      textDrawCalls: this.textDrawCalls,
      memory: this.getMemoryUsage(),
      textMemory: this.textMemory,
      quality: this.currentQuality
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
