/**
 * 🚀 VECTORIUM ENGINE - PARTICLE CONTAINER BUNNYMARK
 */

import { VectoriumBuilder } from './vectorium/core/EngineBuilder';
import { Scene } from './vectorium/core/Engine';
import { EngineConfig } from './vectorium/core/EngineConfig';
import { BunnymarkParticleSystem, BunnymarkParticleConfig } from './vectorium/systems/BunnymarkParticleSystem';
import { BUNNYMARK_CONFIG } from './vectorium/core/BunnymarkConfig';

class ParticleBunnymarkScene extends Scene {
  private particleSystem: BunnymarkParticleSystem | null = null;
  private isRunning = false;
  private totalSpawned = 0;
  
  async load(): Promise<void> {
    await this.engine!.textureManager.loadTexture('/bunny.png');
  }
  
  async startBenchmark(): Promise<void> {
    if (this.isRunning) return;
    
    const spawnIncrement = BUNNYMARK_CONFIG.spawnIncrement;
    const spawnInterval = BUNNYMARK_CONFIG.spawnInterval;
    
    const particleConfig: BunnymarkParticleConfig = {
      maxParticles: this.engine!.config.maxEntities,
      canvasWidth: this.engine!.config.width,
      canvasHeight: this.engine!.config.height,
      gravity: 2500,
      spriteWidth: 26,
      spriteHeight: 37,
      velocityRange: { min: 0, max: 400 },
      restitution: 1.0 
    };
    
    this.particleSystem = new BunnymarkParticleSystem(particleConfig);    
    this.isRunning = true;
    
    const runProgressiveTest = async () => {
      let spawnDelay: number = spawnInterval;
      
      while (this.isRunning) {
        const metrics = this.engine!.performanceMonitor.getMetrics();
        const avgFPS = metrics.fps;
        const frameTime = metrics.frameTime;
        
        if (frameTime > 17 || this.totalSpawned >= 6500000) {
          console.log('✅ BUNNYMARK COMPLETE!');
          console.log(`🏆 ${this.totalSpawned.toLocaleString()} bunnies @ ${avgFPS.toFixed(1)} FPS`);
          break;
        }
        
        await this.spawnBunnyBatch();
        this.totalSpawned += spawnIncrement;
        
        await new Promise(resolve => setTimeout(resolve, spawnDelay));
      }
    };
    
    runProgressiveTest();
  }
  
  private async spawnBunnyBatch(): Promise<void> {
    if (!this.particleSystem) return;
    
    const spawnIncrement = BUNNYMARK_CONFIG.spawnIncrement;
    this.particleSystem.burst(spawnIncrement, 10, 10);
  }
  
  update(dt: number): void {
    super.update(dt);
    
    if (this.particleSystem && this.isRunning) {
      this.particleSystem.update(dt);
      
      this.perfMetrics.ecsActiveEntities = this.particleSystem.getActiveCount();
      this.perfMetrics.ecsTotalEntities = this.particleSystem.getActiveCount();
    }
  }
  
  render(renderer: any, camera: any): void {
    super.render(renderer, camera);
    
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
  const config = new EngineConfig();
  config.profileOnly();
  
  const scene = new ParticleBunnymarkScene('particle-bunnymark');
  
  const engine = new VectoriumBuilder(config)
    .withScene('particle-bunnymark', scene)
    .build();
  
  engine.loadScene('particle-bunnymark').then(() => {
    engine.start();
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') {
        scene.startBenchmark();
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initParticleDemo);
} else {
  initParticleDemo();
}
