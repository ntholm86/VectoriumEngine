/**
 * 🚀 VECTORIUM ENGINE - PARTICLE CONTAINER BUNNYMARK
 * 🐰 Ultra-High Performance Mode (like PixiJS ParticleContainer)
 * 
 * Uses BunnymarkParticleSystem for maximum sprite performance
 * Target: 1,000,000+ bunnies @ 60 FPS
 */

import { VectoriumBuilder } from './vectorium/core/EngineBuilder';
import { Scene } from './vectorium/core/Engine';
import { EngineConfig } from './vectorium/config/EngineConfig';
import { BunnymarkParticleSystem, BunnymarkParticleConfig } from './vectorium/particles/BunnymarkParticleSystem';

class ParticleBunnymarkScene extends Scene {
  private particleSystem: BunnymarkParticleSystem | null = null;
  private isRunning = false;
  private totalSpawned = 0;
  
  async load(): Promise<void> {
    // Preload bunny texture
    await this.engine.textureManager.loadTexture('/bunny.png');
  }
  
  /**
   * Start the particle bunnymark benchmark
   */
  async startBenchmark(): Promise<void> {
    if (this.isRunning) return;
    
    const spawnIncrement = 10000;
    const spawnInterval = 100;
    const targetFPS = 60;
    
    if (!this.performanceMonitor || !this.engine) {
      console.error('Missing required services');
      return;
    }
    
    // Create optimized particle system
    const particleConfig: BunnymarkParticleConfig = {
      maxParticles: this.engine.config.maxEntities,
      canvasWidth: this.engine.config.width,
      canvasHeight: this.engine.config.height,
      gravity: 45,
      spriteWidth: 26,
      spriteHeight: 37,
      velocityRange: { min: 0, max: 600 }
    };
    
    this.particleSystem = new BunnymarkParticleSystem(particleConfig);
    
    this.isRunning = true;
    
    // Run progressive benchmark
    const runProgressiveTest = async () => {
      let spawnDelay: number = spawnInterval;
      
      while (this.isRunning) {
        // Check performance BEFORE spawning (measure stable state)
        const metrics = this.performanceMonitor.getMetrics();
        const avgFPS = metrics.fps;
        const frameTime = metrics.frameTime;
        
        // Stop spawning if frame time exceeds budget or hit limit
        if (frameTime > 17 || this.totalSpawned >= 8000000) {
          console.log('✅ BUNNYMARK COMPLETE!');
          console.log(`🏆 ${this.totalSpawned.toLocaleString()} bunnies @ ${avgFPS.toFixed(1)} FPS`);
          break;
        }
        
        // Adaptive spawning: slow down as we approach frame budget limit
        if (frameTime > 15.5) {
          spawnDelay = 0;
        } else {
          spawnDelay = spawnInterval;
        }
        
        // Spawn a batch
        await this.spawnBunnyBatch();
        this.totalSpawned += spawnIncrement;
        
        // Wait for adaptive spawn interval (let system stabilize)
        await new Promise(resolve => setTimeout(resolve, spawnDelay));
      }
    };
    
    runProgressiveTest();
  }
  
  private async spawnBunnyBatch(): Promise<void> {
    if (!this.particleSystem) return;
    
    const spawnIncrement = 10000;
    
    // Spawn at upper left corner
    const spawnX = 80;
    const spawnY = 80;
    
    // Burst spawn particles
    this.particleSystem.burst(spawnIncrement, spawnX, spawnY);
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
  // Create config
  const config = new EngineConfig();
  config.width = 800;
  config.height = 600;
  config.maxEntities = 8_000_000;
  config.instancedBatchSize = 2_000_000;
  config.enableDebugTools = true;
  
  // Create scene
  const scene = new ParticleBunnymarkScene('particle-bunnymark');
  
  // Build engine with config and scene
  const engine = new VectoriumBuilder(config)
    .withScene('particle-bunnymark', scene)
    .build();
  
  // Start engine
  engine.loadScene('particle-bunnymark').then(() => {
    engine.start();
    
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
