/**
 * 🚀 VECTORIUM ENGINE - PARTICLE CONTAINER BUNNYMARK
 */

import { VectoriumBuilder } from './vectorium/core/EngineBuilder';
import { Scene } from './vectorium/core/Engine';
import { EngineConfig } from './vectorium/core/EngineConfig';
import { BunnymarkParticleSystem, BunnymarkParticleConfig } from './vectorium/systems/BunnymarkParticleSystem';
import { GpuParticleSystem } from './vectorium/systems/GpuParticleSystem';
import type { IParticleSystem } from './vectorium/systems/IParticleSystem';
import { BUNNYMARK_CONFIG } from './vectorium/core/BunnymarkConfig';

class ParticleBunnymarkScene extends Scene {
  private particleSystem: IParticleSystem | null = null;
  private isRunning = false;
  private totalSpawned = 0;
  
  async load(): Promise<void> {
    await this.engine!.textureManager.loadTexture('/bunny.png');
  }
  
  async startBenchmark(): Promise<void> {
    if (this.isRunning) return;
    
    const spawnIncrement = BUNNYMARK_CONFIG.spawnIncrement;
    const spawnInterval = BUNNYMARK_CONFIG.spawnInterval;
    
    // No hardcoded caps: capacity is discovered, not declared. ?max=N overrides.
    // GPU path allocates its own VRAM (32 B/particle) and takes any N.
    // CPU path static GPU buffers are sized by config.maxEntities, so it clamps.
    const params = new URLSearchParams(location.search);
    const useCpu = params.has('cpu');
    const requestedMax = Number(params.get('max')) || this.engine!.config.maxEntities;
    const maxParticles = useCpu
      ? Math.min(requestedMax, this.engine!.config.maxEntities)
      : requestedMax;
    if (maxParticles < requestedMax) {
      console.warn(`⚠️ CPU path clamped to config.maxEntities=${this.engine!.config.maxEntities.toLocaleString()} (static buffer capacity). Use the GPU path for higher counts.`);
    }
    
    const particleConfig: BunnymarkParticleConfig = {
      maxParticles,
      canvasWidth: this.engine!.config.width,
      canvasHeight: this.engine!.config.height,
      gravity: 2500,
      spriteWidth: 26,
      spriteHeight: 37,
      velocityRange: { min: 0, max: 400 },
      restitution: 1.0 
    };
    
    // GPU transform-feedback physics by default; ?cpu=1 forces the CPU system for A/B comparison
    if (useCpu) {
      this.particleSystem = new BunnymarkParticleSystem(particleConfig);
      console.log('🐢 CPU particle system (BunnymarkParticleSystem)');
    } else {
      const gl = (this.engine!.renderer as any).gl as WebGL2RenderingContext;
      this.particleSystem = new GpuParticleSystem(gl, particleConfig);
      console.log('⚡ GPU particle system (transform feedback)');
    }
    this.isRunning = true;
    
    // GPU-SYNCED frame probe: engine-internal frameTime is CPU-only and reads ~0
    // on the GPU-physics path, so the stop condition must measure true frame cost.
    // A 1px readPixels drains the GPU pipeline (gl.finish is a no-op under ANGLE).
    const gl = (this.engine!.renderer as any).gl as WebGL2RenderingContext;
    const probePixel = new Uint8Array(4);
    const measureSyncedFrameMs = (): number => {
      const renderer = this.engine!.renderer as any;
      const w = this.engine!.config.width;
      const h = this.engine!.config.height;
      const t0 = performance.now();
      this.particleSystem!.update(1 / 60);
      renderer.begin(w, h);
      this.render(renderer, null);
      renderer.end?.();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probePixel);
      return performance.now() - t0;
    };
    
    const runProgressiveTest = async () => {
      let spawnDelay: number = spawnInterval;
      let consecutiveBreaches = 0;
      
      while (this.isRunning) {
        const syncedFrameMs = measureSyncedFrameMs();
        const syncedFPS = 1000 / syncedFrameMs;
        
        // Require 2 consecutive over-budget probes so a single GC/driver spike
        // doesn't end the benchmark early.
        consecutiveBreaches = syncedFrameMs > 17 ? consecutiveBreaches + 1 : 0;
        
        if (consecutiveBreaches >= 2 || this.totalSpawned >= maxParticles) {
          console.log('✅ BUNNYMARK COMPLETE!');
          console.log(`🏆 ${this.totalSpawned.toLocaleString()} bunnies @ ${syncedFPS.toFixed(1)} FPS (GPU-synced: ${syncedFrameMs.toFixed(2)}ms/frame)`);
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
    
    // Diagnostic globals for automated profiling (dev only)
    (window as any).__engine = engine;
    (window as any).__scene = scene;
    
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
