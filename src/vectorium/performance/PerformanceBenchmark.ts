/**
 * 🎯 Performance Benchmarking System
 * Automated performance testing with JSON export
 */

import type { PerformanceMonitor, PerformanceMetrics } from './PerformanceMonitor';
import type { EntitySpawnService, VisualType } from '../entities/EntitySpawnService';
import type { World } from '../core/World';

export interface BenchmarkConfig {
  name: string;
  description: string;
  duration: number; // seconds
  entityCount: number;
  tweened: boolean;
  collision: boolean;
  gravity: boolean;
  pattern: 'random' | 'grid' | 'circle' | 'spiral';
  shapeType?: 'circle' | 'square' | 'triangle' | 'star5';
}

export interface BenchmarkResult {
  timestamp: string;
  config: BenchmarkConfig;
  metrics: {
    // === Core Performance ===
    avgFPS: number;
    minFPS: number;
    maxFPS: number;
    avgFrameTime: number;
    p95FrameTime: number;
    p99FrameTime: number;
    
    // === Physics Metrics (CRITICAL) ===
    avgPhysicsTime: number;
    avgCollisionChecks: number;
    avgSpatialHashCells: number;
    avgSpatialHashMaxBucket: number;
    
    // === Essential Rendering ===
    avgDrawCalls: number;
    avgEntitiesProcessed: number;
    avgEntitiesRendered: number;
    
    // === Memory (Essential) ===
    peakMemory: number;
    avgMemory: number;
    
    // === Frame Stability ===
    frameTimeVariance: number;
    totalSpikes: number;
  };
  samples: PerformanceMetrics[];
}

export interface BenchmarkSuite {
  version: string;
  environment: {
    userAgent: string;
    platform: string;
    cores: number;
    memory: number;
    gpu?: string;
  };
  results: BenchmarkResult[];
}

/**
 * 🎯 Performance Benchmark Runner
 */
export class PerformanceBenchmark {
  private monitor: PerformanceMonitor;
  private spawnService: EntitySpawnService;
  private samples: PerformanceMetrics[] = [];
  private isRunning = false;
  
  constructor(monitor: PerformanceMonitor, spawnService: EntitySpawnService) {
    this.monitor = monitor;
    this.spawnService = spawnService;
  }
  
  /**
   * Run a single benchmark
   */
  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    console.log(`🎯 Starting benchmark: ${config.name}`);
    console.log(`   Entities: ${config.entityCount}, Duration: ${config.duration}s`);
    
    this.samples = [];
    this.isRunning = true;
    
    // Note: entities will be cleared by spawning new ones
    // World doesn't have a clear/reset method
    
    // Spawn entities based on pattern
    this.spawnEntitiesForBenchmark(config);
    
    // Collect samples for duration
    const startTime = performance.now();
    const endTime = startTime + (config.duration * 1000);
    
    return new Promise((resolve) => {
      const sampleInterval = setInterval(() => {
        if (!this.isRunning || performance.now() >= endTime) {
          clearInterval(sampleInterval);
          this.isRunning = false;
          
          // Analyze results
          const result = this.analyzeSamples(config);
          console.log(`✅ Benchmark complete: ${result.metrics.avgFPS.toFixed(1)} FPS (avg)`);
          resolve(result);
        } else {
          // Collect sample
          const metrics = this.monitor.getMetrics();
          this.samples.push({ ...metrics, timestamp: Date.now() });
        }
      }, 100); // Sample every 100ms
    });
  }
  
  /**
   * Run multiple benchmarks
   */
  async runSuite(configs: BenchmarkConfig[]): Promise<BenchmarkSuite> {
    const results: BenchmarkResult[] = [];
    
    for (const config of configs) {
      const result = await this.runBenchmark(config);
      results.push(result);
      
      // Delay between benchmarks (configurable)
      await this.delay(BENCHMARK_CONFIG.delayBetweenTests * 1000);
    }
    
    return {
      version: '1.0.0',
      environment: this.getEnvironmentInfo(),
      results
    };
  }
  
  /**
   * Spawn entities based on benchmark config with variety
   */
  private spawnEntitiesForBenchmark(config: BenchmarkConfig): void {
    const centerX = 1920 / 2; // Default canvas width
    const centerY = 1080 / 2; // Default canvas height
    
    // Determine physics mode based on collision and gravity flags
    const physicsMode: 'none' | 'gravity' | 'collision' | 'full' = 
      config.collision && config.gravity ? 'full' :
      config.collision ? 'collision' :
      config.gravity ? 'gravity' :
      'none';
    
    // 🎨 Variety of shapes (21 different SDF shapes)
    const shapes: VisualType[] = [
      'circle', 'square', 'triangle', 'star5', 'star6',
      'hexagon', 'pentagon', 'octagon', 'diamond', 'heart',
      'pentagram', 'vesica', 'moon', 'cross', 'egg',
      'roundedx', 'pie', 'arc', 'ring', 'trapezoid', 'horseshoe'
    ];
    
    // 🎬 Animation configurations (rotation speeds and pulse rates)
    const animationConfigs = [
      { rotation: 0, pulse: 0, wobble: 0 },          // Static
      { rotation: 100, pulse: 0, wobble: 0 },        // Slow rotation (deg/sec)
      { rotation: 200, pulse: 0, wobble: 0 },        // Medium rotation
      { rotation: 300, pulse: 0, wobble: 0 },        // Fast rotation
      { rotation: 0, pulse: 1.0, wobble: 0 },        // Slow pulse
      { rotation: 0, pulse: 2.0, wobble: 0 },        // Fast pulse
      { rotation: 150, pulse: 1.5, wobble: 0 },      // Rotate + Pulse
      { rotation: -200, pulse: 0, wobble: 0 },       // Reverse rotation
      { rotation: 0, pulse: 3.0, wobble: 0 },        // Very fast pulse
      { rotation: 0, pulse: 0, wobble: 1.0 },        // Wobble
      { rotation: 100, pulse: 0, wobble: 1.5 },      // Rotate + Wobble
      { rotation: 0, pulse: 1.0, wobble: 1.0 }       // Pulse + Wobble
    ];
    
    // Get direct access to World arrays for performance
    const world = (this.spawnService as any).world as World;
    const rotationSpeedArray = world.getRotationSpeed();
    const pulseSpeedArray = (world as any).pulseSpeed as Float32Array;
    const wobbleSpeedArray = (world as any).wobbleSpeed as Float32Array;
    const animTypeArray = (world as any).animationType as Uint8Array;
    
    // Spawn entities in batches with variety
    const batchSize = 50; // Spawn 50 at a time for variety
    const numBatches = Math.ceil(config.entityCount / batchSize);
    
    for (let batch = 0; batch < numBatches; batch++) {
      const entitiesToSpawn = Math.min(batchSize, config.entityCount - (batch * batchSize));
      
      // Cycle through shapes and animations
      const shapeIndex = batch % shapes.length;
      const animIndex = batch % animationConfigs.length;
      const visualType = shapes[shapeIndex];
      const anim = animationConfigs[animIndex];
      
      // Spawn batch with current shape/animation combo
      const entities = this.spawnService.spawnEntities(
        entitiesToSpawn,
        centerX,
        centerY,
        {
          physicsMode,
          visualType
        }
      );
      
      // Apply animation to spawned entities (direct array access for performance)
      for (const entityId of entities) {
        if (anim.rotation !== 0) {
          rotationSpeedArray[entityId] = anim.rotation;
        }
        if (anim.pulse !== 0) {
          animTypeArray[entityId] = 1; // Pulse animation
          pulseSpeedArray[entityId] = anim.pulse;
        }
        if (anim.wobble !== 0) {
          animTypeArray[entityId] = 2; // Wobble animation
          wobbleSpeedArray[entityId] = anim.wobble;
        }
      }
    }
  }
  
  /**
   * Analyze collected samples
   */
  private analyzeSamples(config: BenchmarkConfig): BenchmarkResult {
    if (this.samples.length === 0) {
      throw new Error('No samples collected');
    }
    
    // Extract arrays for analysis
    const fps = this.samples.map(s => s.fps);
    const frameTime = this.samples.map(s => s.frameTime);
    const drawCalls = this.samples.map(s => s.drawCalls);
    const webglDrawCalls = this.samples.map(s => s.webglDrawCalls);
    const textDrawCalls = this.samples.map(s => s.textDrawCalls);
    const vertices = this.samples.map(s => s.verticesRendered);
    const triangles = this.samples.map(s => s.trianglesRendered);
    const batchEff = this.samples.map(s => s.batchEfficiency);
    const stateChanges = this.samples.map(s => s.stateChanges);
    const physicsTime = this.samples.map(s => s.physicsTime);
    const gravityTime = this.samples.map(s => s.gravityTime);
    const collisionBuildTime = this.samples.map(s => s.collisionBuildTime);
    const collisionDetectTime = this.samples.map(s => s.collisionDetectTime);
    const boundaryTime = this.samples.map(s => s.boundaryTime);
    const collisionChecks = this.samples.map(s => s.collisionChecks);
    const spatialCells = this.samples.map(s => s.spatialHashCells);
    const spatialMaxBucket = this.samples.map(s => s.spatialHashMaxBucket);
    const memory = this.samples.map(s => s.memory);
    const vertexBufferSize = this.samples.map(s => s.vertexBufferSize);
    const indexBufferSize = this.samples.map(s => s.indexBufferSize);
    const textureMemory = this.samples.map(s => s.textureMemory);
    const bufferUploadSize = this.samples.map(s => s.bufferUploadSize);
    const gpuUtil = this.samples.map(s => s.gpuUtilization);
    const gpuDrawTime = this.samples.map(s => s.gpuDrawTime || 0);
    const gpuTextTime = this.samples.map(s => s.gpuTextTime || 0);
    const entitiesProcessed = this.samples.map(s => s.entitiesProcessed);
    const entitiesRendered = this.samples.map(s => s.entitiesRendered);
    const timePerEntity = this.samples.map(s => s.timePerEntity);
    const inputLag = this.samples.map(s => s.inputLag || 0);
    const inputLagP95 = this.samples.map(s => s.inputLagP95 || 0);
    const fillRate = this.samples.map(s => s.fillRate || 0);
    const overdraw = this.samples.map(s => s.overdrawPercentage || 0);
    const totalBatches = this.samples.map(s => s.totalBatches || 1);
    const textureSwaps = this.samples.map(s => s.textureSwaps || 0);
    const shaderSwaps = this.samples.map(s => s.shaderSwaps || 0);
    const spritesPerBatch = this.samples.map(s => s.avgSpritesPerBatch || 0);
    const instancedDrawCalls = this.samples.map(s => s.instancedDrawCalls || 0);
    const instanceCount = this.samples.map(s => s.instanceCount || 0);
    const vsyncMisses = this.samples.map(s => s.vsyncMisses || 0);
    const batteryPct = this.samples.map(s => s.batteryPercentage || 100);
    
    // Calculate core statistics
    const avgFPS = this.average(fps);
    const minFPS = Math.min(...fps);
    const maxFPS = Math.max(...fps);
    const avgFrameTime = this.average(frameTime);
    const p95FrameTime = this.percentile(frameTime, 95);
    const p99FrameTime = this.percentile(frameTime, 99);
    
    // Frame stability
    const frameTimeVariance = this.variance(frameTime);
    const frameTimeMin = Math.min(...frameTime);
    const frameTimeMax = Math.max(...frameTime);
    
    // Count spikes
    const minorSpikes = this.samples.reduce((sum, s) => sum + (s.minorSpikes || 0), 0);
    const majorSpikes = this.samples.reduce((sum, s) => sum + (s.majorSpikes || 0), 0);
    const severeSpikes = this.samples.reduce((sum, s) => sum + (s.severeSpikes || 0), 0);
    const totalSpikes = this.samples.reduce((sum, s) => sum + (s.totalSpikes || 0), 0);
    const spikeRate = (totalSpikes / this.samples.length) * 60; // spikes per second
    
    // Performance score (weighted average, clamped 0-100)
    const fpsScore = Math.min(avgFPS / 60, 1) * 40; // 40% weight
    const spikeScore = (1 - Math.min(severeSpikes / this.samples.length, 1)) * 30; // 30% weight
    const efficiencyScore = Math.max(0, Math.min(1, this.average(batchEff))) * 30; // 30% weight, clamped 0-1
    const performanceScore = Math.max(0, Math.min(100, Math.round(fpsScore + spikeScore + efficiencyScore)));
    
    // Determine bottleneck
    const avgGPUUtil = this.average(gpuUtil);
    const gpuBottleneck = avgGPUUtil > 0.85;
    const bottleneck: 'cpu' | 'gpu' | 'memory' | 'balanced' = 
      gpuBottleneck ? 'gpu' :
      avgFrameTime > 16 && avgGPUUtil < 0.5 ? 'cpu' :
      memory.some(m => m > 1000) ? 'memory' :
      'balanced';
    
    // Platform info
    const isCharging = this.samples.some(s => s.isCharging === true);
    const displayRefreshRate = this.samples.find(s => s.displayRefreshRate)?.displayRefreshRate || 60;
    const gpuInstancingEnabled = this.samples.some(s => s.gpuInstancingEnabled === true);
    
    return {
      timestamp: new Date().toISOString(),
      config,
      metrics: {
        // Core Performance
        avgFPS,
        minFPS,
        maxFPS,
        avgFrameTime,
        p95FrameTime,
        p99FrameTime,
        
        // Physics Metrics (CRITICAL)
        avgPhysicsTime: this.average(physicsTime),
        avgCollisionChecks: Math.round(this.average(collisionChecks)),
        avgSpatialHashCells: Math.round(this.average(spatialCells)),
        avgSpatialHashMaxBucket: Math.round(this.average(spatialMaxBucket)),
        
        // Essential Rendering
        avgDrawCalls: this.average(drawCalls),
        avgEntitiesProcessed: Math.round(this.average(entitiesProcessed)),
        avgEntitiesRendered: Math.round(this.average(entitiesRendered)),
        
        // Memory (Essential)
        peakMemory: Math.max(...memory),
        avgMemory: this.average(memory),
        
        // Frame Stability
        frameTimeVariance,
        totalSpikes
      },
      samples: this.samples
    };
  }
  
  /**
   * Get environment info
   */
  private getEnvironmentInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cores: navigator.hardwareConcurrency || 0,
      memory: (navigator as any).deviceMemory || 0,
      gpu: this.getGPUInfo()
    };
  }
  
  /**
   * Get GPU info (if available)
   */
  private getGPUInfo(): string | undefined {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return undefined;
    
    const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return undefined;
    
    return (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  }
  
  /**
   * Save results to JSON file (browser download)
   */
  saveToFile(suite: BenchmarkSuite, filename = 'benchmark-results.json'): void {
    const json = JSON.stringify(suite, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  /**
   * Append result to measurements.json (for tracking over time)
   */
  async appendToMeasurements(result: BenchmarkResult): Promise<void> {
    try {
      // Read existing measurements
      const response = await fetch('/src/vectorium/performance/measurements.json');
      let measurements: BenchmarkResult[] = [];
      
      if (response.ok) {
        const text = await response.text();
        if (text.trim()) {
          measurements = JSON.parse(text);
        }
      }
      
      // Prepend new result (newest first)
      measurements.unshift(result);
      
      // Keep only last 100 measurements
      if (measurements.length > 100) {
        measurements = measurements.slice(0, 100);
      }
      
      // Save to file via server API
      const saveResponse = await fetch('/api/save-measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurements)
      });
      
      if (saveResponse.ok) {
        console.log('✅ Measurement saved to measurements.json:', result.config.name);
      } else {
        throw new Error('Failed to save measurement');
      }
      
    } catch (error) {
      console.error('❌ Failed to save measurement:', error);
      console.log('📊 Measurement data (copy to measurements.json manually):');
      console.log(JSON.stringify(result, null, 2));
    }
  }
  
  /**
   * Utility: Calculate average
   */
  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }
  
  /**
   * Utility: Calculate variance
   */
  private variance(arr: number[]): number {
    if (arr.length === 0) return 0;
    const avg = this.average(arr);
    const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }
  
  /**
   * Utility: Calculate percentile
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  /**
   * Utility: Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 🎯 BENCHMARK CONFIGURATION
 * Centralized config for easy tuning
 */
const BENCHMARK_CONFIG = {
  // Test duration per increment (seconds)
  testDuration: 1,
  
  // Delay between tests (seconds)  
  delayBetweenTests: 0.25,
  
  // Incremental spawning pattern (aggressive scaling)
  increments: [500, 2500, 5000, 10000, 20000, 50000],
  
  // Physics modes for each suite
  suites: {
    collision: { collision: true, gravity: false },  // Collision only
    gravity: { collision: false, gravity: true },     // Gravity only
    fullPhysics: { collision: true, gravity: true },  // Both
    render: { collision: false, gravity: false }      // Neither
  }
};

/**
 * 🏭 BENCHMARK SUITE GENERATOR
 * Creates test configs from centralized configuration
 */
function generateIncrementalSuite(
  baseName: string,
  description: string,
  physics: { collision: boolean; gravity: boolean },
  pattern: 'random' | 'circle' | 'grid' | 'spiral' = 'circle',
  shapeType: 'circle' | 'square' | 'triangle' | 'star5' = 'circle',
  tweened: boolean = true
): BenchmarkConfig[] {
  const increments = BENCHMARK_CONFIG.increments;
  const configs: BenchmarkConfig[] = [];
  
  increments.forEach((targetCount, index) => {
    // First test spawns the target count, subsequent tests add the difference
    const spawnCount = index === 0 ? targetCount : (targetCount - increments[index - 1]);
    
    configs.push({
      name: `${baseName} ${targetCount}`,
      description: index === 0 
        ? `${targetCount} ${description}`
        : `${targetCount} ${description} (+${spawnCount})`,
      duration: BENCHMARK_CONFIG.testDuration,
      entityCount: spawnCount,
      tweened,
      collision: physics.collision,
      gravity: physics.gravity,
      pattern: pattern,
      shapeType: shapeType
    });
  });
  
  return configs;
}

/**
 * 🎯 Predefined benchmark suites
 */
export const BENCHMARK_SUITES = {
  /**
   * Collision only - no gravity
   */
  collisionScaling: generateIncrementalSuite(
    'Collision',
    'tweened circles with collision only',
    BENCHMARK_CONFIG.suites.collision
  ),
  
  /**
   * Gravity only - no collision
   */
  gravityScaling: generateIncrementalSuite(
    'Gravity',
    'tweened circles with gravity only',
    BENCHMARK_CONFIG.suites.gravity
  ),
  
  /**
   * Full physics - collision + gravity
   */
  fullPhysics: generateIncrementalSuite(
    'Full Physics',
    'tweened circles with collision + gravity',
    BENCHMARK_CONFIG.suites.fullPhysics
  ),
  
  /**
   * Rendering only - no physics
   */
  renderScaling: generateIncrementalSuite(
    'Render',
    'moving circles (no physics)',
    BENCHMARK_CONFIG.suites.render,
    'random',
    'circle',
    false
  )
};
