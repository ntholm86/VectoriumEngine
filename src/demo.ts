/**
 * 🚀 VECTORIUM ENGINE - WASM ECS DEMO
 * 🐰 Bunnymark Standard Configuration
 */

import { VectoriumBuilder } from './vectorium/core/EngineBuilder';
import { Scene } from './vectorium/core/Engine';
import { EngineConfig } from './vectorium/config/EngineConfig';

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
    
    const spawnIncrement = 10000;
    const spawnInterval = 100;
    const targetFPS = 60;
    
    console.log(`📊 Starting Bunnymark: ${spawnIncrement} bunnies every ${spawnInterval}ms until FPS < ${targetFPS}`);
    
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
        totalSpawned += spawnIncrement;
        
        // Wait for spawn interval
        await new Promise(resolve => setTimeout(resolve, spawnInterval));
        
        // Check FPS
        const metrics = performanceMonitor.getMetrics();
        const avgFPS = metrics.fps;
        
        console.log(`🐰 Spawned ${spawnIncrement} bunnies → Total: ${totalSpawned.toLocaleString()} @ ${avgFPS.toFixed(1)} FPS`);
        
        // Stop spawning if FPS drops below target or hit limit
        if (avgFPS < targetFPS || totalSpawned >= 500000) {
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
    const spawnIncrement = 10000;
    const centerX = 400;
    const centerY = 300;
    
    const spawnService = (this as any).spawnService;
    if (spawnService) {
      spawnService.spawn({
        position: { x: centerX, y: centerY },
        count: spawnIncrement,
        distribution: { type: 'circle', radius: 200 },
        visual: {
          type: 'sprite',
          texture: '/bunny.png'
        },
        size: 26,
        color: { r: 255, g: 255, b: 255 },
        physics: {
          velocity: 'random',
          speed: { min: 400, max: 600 },
          gravity: true,
          collision: false
        }
      });
    }
  }
}

function initDemo() {
  const config = new EngineConfig();
  config.width = 800;
  config.height = 600;
  config.debug(); // Enable all debug tools
  
  const engine = new VectoriumBuilder(config)
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
