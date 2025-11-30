/**
 * 🚀 VECTORIUM ENGINE - PARTICLE CONTAINER BUNNYMARK
 * 🐰 Ultra-High Performance Mode (like PixiJS ParticleContainer)
 * 
 * Uses BunnymarkParticleSystem for maximum sprite performance
 * Target: 1,000,000+ bunnies @ 60 FPS
 */

import { VectoriumBuilder } from './vectorium/core/EngineBuilder';
import { Scene } from './vectorium/core/Engine';
import type { Vectorium } from './vectorium/core/Engine';
import { BUNNYMARK_CONFIG } from './vectorium/config/BunnymarkConfig';
import { BunnymarkParticleSystem, BunnymarkParticleConfig } from './vectorium/particles/BunnymarkParticleSystem';

class ParticleBunnymarkScene extends Scene {
  private particleSystem: BunnymarkParticleSystem | null = null;
  private isRunning = false;
  private totalSpawned = 0;
  private engine: Vectorium | null = null;
  
  async load(): Promise<void> {
    console.log('🐰 Particle Container Bunnymark (Ultra Mode)');
    console.log('📋 Using BunnymarkParticleSystem for 1M+ sprites');
    console.log('💡 Press F to start benchmark (Progressive)');
    
    // Preload bunny texture
    if (this.engine) {
      await this.engine.textureManager.loadTexture('/bunny.png');
      console.log('✅ Bunny texture preloaded');
    }
    
    // Camera is now simple properties (no Camera class)
    console.log(`📷 Camera at (${(this as any).cameraX}, ${(this as any).cameraY})`);
  }
  
  setEngine(engine: Vectorium): void {
    this.engine = engine;
  }
  
  /**
   * Start the particle bunnymark benchmark
   */
  async startBenchmark(): Promise<void> {
    if (this.isRunning) return;
    
    console.log(`📊 Starting Particle Bunnymark: ${BUNNYMARK_CONFIG.spawnIncrement} bunnies every ${BUNNYMARK_CONFIG.spawnInterval}ms until FPS < ${BUNNYMARK_CONFIG.targetFPS}`);
    
    // Get performance monitor
    const performanceMonitor = (this as any).performanceMonitor;
    
    if (!performanceMonitor || !this.engine) {
      console.error('Missing required services');
      return;
    }
    
    // Create optimized particle system
    const particleConfig: BunnymarkParticleConfig = {
      maxParticles: 3000000, // 2M max capacity
      canvasWidth: BUNNYMARK_CONFIG.canvas.width,
      canvasHeight: BUNNYMARK_CONFIG.canvas.height,
      gravity: BUNNYMARK_CONFIG.physics.gravity ? 980 : 0,
      spriteWidth: BUNNYMARK_CONFIG.entity.width,
      spriteHeight: BUNNYMARK_CONFIG.entity.height,
      velocityRange: BUNNYMARK_CONFIG.velocity
    };
    
    this.particleSystem = new BunnymarkParticleSystem(particleConfig);
    
    // Initialize WASM SIMD physics
    const wasmSuccess = await this.particleSystem.initializeWasm();
    if (wasmSuccess) {
      console.log('🚀 WASM SIMD + optimized interleave - expect 3M+ entities!');
    } else {
      console.log('⚠️ JavaScript fallback - expect 2.5M entities');
    }
    
    this.isRunning = true;
    
    // Run progressive benchmark
    const runProgressiveTest = async () => {
      let spawnDelay: number = BUNNYMARK_CONFIG.spawnInterval;
      
      while (this.isRunning) {
        // Check performance BEFORE spawning (measure stable state)
        const metrics = performanceMonitor.getMetrics();
        const avgFPS = metrics.fps;
        const frameTime = metrics.frameTime;
        
        console.log(`📊 Before spawn: ${this.totalSpawned.toLocaleString()} bunnies @ ${avgFPS.toFixed(1)} FPS (${frameTime.toFixed(2)}ms)`);
        
        // Stop spawning if frame time exceeds budget or hit limit
        if (frameTime > 17 || this.totalSpawned >= 5500000) {
          console.log('');
          console.log('✅ PARTICLE BUNNYMARK COMPLETE!');
          console.log(`🏆 Final Score: ${this.totalSpawned.toLocaleString()} bunnies @ ${avgFPS.toFixed(1)} FPS (${frameTime.toFixed(2)}ms)`);
          console.log('💡 Using ParticleSystem (like PixiJS ParticleContainer)');
          console.log('');
          break;
        }
        
        // Adaptive spawning: slow down as we approach frame budget limit
        if (frameTime > 15.5) { // Over 15.5ms - slow way down
          spawnDelay = 500;
        } else if (frameTime > 15) { // Over 15ms - slow down significantly
          spawnDelay = 300;
        } else if (frameTime > 14.5) { // Over 14.5ms - slow down
          spawnDelay = 200;
        } else {
          spawnDelay = BUNNYMARK_CONFIG.spawnInterval; // Normal speed
        }
        
        // Spawn a batch
        await this.spawnBunnyBatch();
        this.totalSpawned += BUNNYMARK_CONFIG.spawnIncrement;
        
        console.log(`🐰 Spawned ${BUNNYMARK_CONFIG.spawnIncrement} bunnies → delay: ${spawnDelay}ms`);
        
        // Wait for adaptive spawn interval (let system stabilize)
        await new Promise(resolve => setTimeout(resolve, spawnDelay));
      }
    };
    
    runProgressiveTest();
  }
  
  private async spawnBunnyBatch(): Promise<void> {
    if (!this.particleSystem) return;
    
    // Spawn at world origin (camera is at 0,0 so this will be screen center)
    const centerX = BUNNYMARK_CONFIG.canvas.width / 2;
    const centerY = BUNNYMARK_CONFIG.canvas.height / 2;
    
    // Debug first spawn
    if (this.totalSpawned === 0) {
      console.log(`🎯 Spawning at world (${centerX}, ${centerY})`);
      console.log(`   Camera at (${(this as any).cameraX}, ${(this as any).cameraY})`);
    }
    
    // Burst spawn particles
    this.particleSystem.burst(BUNNYMARK_CONFIG.spawnIncrement, centerX, centerY);
  }
  
  update(dt: number): void {
    super.update(dt);
    
    // Update particle system (handles physics and bouncing internally)
    if (this.particleSystem && this.isRunning) {
      this.particleSystem.update(dt);
      
      // Update ECS metrics with particle count for debug panel
      this.perfMetrics.ecsActiveEntities = this.particleSystem.getActiveCount();
      this.perfMetrics.ecsTotalEntities = this.particleSystem.getActiveCount();
    }
  }
  
  render(renderer: any, camera: any): void {
    super.render(renderer, camera);
    
    // Camera is now just an object with x, y, zoom properties
    // Render particles using optimized sprite rendering
    if (this.particleSystem && this.isRunning && this.engine) {
      this.particleSystem.render(
        renderer,
        this.engine.textureManager,
        this.cameraX,
        this.cameraY,
        this.cameraZoom
      );
    }
  }
}

function initParticleDemo() {
  const scene = new ParticleBunnymarkScene('particle-bunnymark');
  
  const engine = new VectoriumBuilder()
    .withFullscreenCanvas({
      width: BUNNYMARK_CONFIG.canvas.width,
      height: BUNNYMARK_CONFIG.canvas.height
    })
    .withQuality('high')
    .withTargetFPS(BUNNYMARK_CONFIG.targetFPS)
    .enableDebugTools()
    .withScene('particle-bunnymark', scene)
    .build();
  
  // Store engine reference in scene before loading
  scene.setEngine(engine);
  
  // Start engine
  engine.loadScene('particle-bunnymark').then(() => {
    engine.start();
    console.log('🎮 Particle Bunnymark Demo running!');
    
    // Add keyboard listener for starting benchmark
    document.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') {
        scene.startBenchmark();
      }
    });
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initParticleDemo);
} else {
  initParticleDemo();
}
