/**
 * 🚀 VECTORIUM ENGINE - WASM ECS DEMO
 * 🐰 Bunnymark Standard Configuration
 */

import { VectoriumBuilder } from './vectorium/core/EngineBuilder';
import { Scene } from './vectorium/core/Engine';
import { BUNNYMARK_CONFIG } from './vectorium/config/BunnymarkConfig';

class WasmDemoScene extends Scene {
  private isRunning = false;
  
  async load(): Promise<void> {
    console.log('🐰 Bunnymark Standard Demo');
  }
  
  // Standard bunnymark - no custom update logic needed
  
  /**
   * Start the bunnymark benchmark
   */
  async startBenchmark(): Promise<void> {
    if (this.isRunning) return;
    
    console.log(`📊 Starting Bunnymark: ${BUNNYMARK_CONFIG.spawnIncrement} bunnies every ${BUNNYMARK_CONFIG.spawnInterval}ms until FPS < ${BUNNYMARK_CONFIG.targetFPS}`);
    
    // Get required services (injected by engine during loadScene)
    const spawnService = (this as any).spawnService;
    const performanceMonitor = (this as any).performanceMonitor;
    
    if (!performanceMonitor || !spawnService) {
      console.error('Missing required services for benchmark', { performanceMonitor: !!performanceMonitor, spawnService: !!spawnService });
      return;
    }
    
    this.isRunning = true;
    
    // Run progressive benchmark
    let totalSpawned = 0;
    const runProgressiveTest = async () => {
      while (this.isRunning) {
        // Spawn a batch
        await this.spawnBunnyBatch();
        totalSpawned += BUNNYMARK_CONFIG.spawnIncrement;
        
        // Wait for spawn interval
        await new Promise(resolve => setTimeout(resolve, BUNNYMARK_CONFIG.spawnInterval));
        
        // Check FPS
        const metrics = performanceMonitor.getMetrics();
        const avgFPS = metrics.fps;
        
        console.log(`🐰 Spawned ${BUNNYMARK_CONFIG.spawnIncrement} bunnies → Total: ${totalSpawned.toLocaleString()} @ ${avgFPS.toFixed(1)} FPS`);
        
        // Stop spawning if FPS drops below target or hit limit
        if (avgFPS < BUNNYMARK_CONFIG.targetFPS || totalSpawned >= 500000) {
          console.log('');
          console.log('✅ BUNNYMARK STANDARD COMPLETE!');
          console.log(`🏆 Final Score: ${totalSpawned.toLocaleString()} bunnies @ ${avgFPS.toFixed(1)} FPS`);
          console.log('💡 Bunnies will continue bouncing - observe the max entities at 60 FPS!');
          console.log('');
          break;
        }
      }
    };
    
    runProgressiveTest();
  }
  
  private async spawnBunnyBatch(): Promise<void> {
    const centerX = BUNNYMARK_CONFIG.canvas.width / 2;
    const centerY = BUNNYMARK_CONFIG.canvas.height / 2;
    
    const spawnService = (this as any).spawnService;
    if (spawnService) {
      spawnService.spawn({
        position: { x: centerX, y: centerY },
        count: BUNNYMARK_CONFIG.spawnIncrement,
        distribution: { type: 'circle', radius: 200 },
        visual: {
          type: 'sprite',
          texture: '/bunny.png'
        },
        size: BUNNYMARK_CONFIG.entity.width,
        physics: {
          velocity: 'random',
          speed: BUNNYMARK_CONFIG.velocity,
          gravity: BUNNYMARK_CONFIG.physics.gravity,
          collision: BUNNYMARK_CONFIG.physics.collision
        }
      });
    }
  }
}

function initDemo() {
  const engine = new VectoriumBuilder()
    .withFullscreenCanvas({
      width: BUNNYMARK_CONFIG.canvas.width,
      height: BUNNYMARK_CONFIG.canvas.height
    })
    .withQuality('high')
    .withTargetFPS(BUNNYMARK_CONFIG.targetFPS)
    .enableDebugTools()
    .withScene('wasm-demo', new WasmDemoScene('wasm-demo'))
    .build();
  
  // Start engine
  engine.loadScene('wasm-demo').then(() => {
    engine.start();
    console.log('🎮 Bunnymark Standard Demo running!');
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}
