/**
 * 🚀 VECTORIUM ENGINE - WASM ECS DEMO
 * 🐰 Bunnymark Standard Configuration
 */

import { VectoriumBuilder } from './vectorium/core/EngineBuilder';
import { Scene } from './vectorium/core/Engine';
import { BUNNYMARK_CONFIG } from './vectorium/config/BunnymarkConfig';

class WasmDemoScene extends Scene {
  private spawnTimer = 0;
  private totalSpawned = 0;
  private isRunning = false;
  private fpsHistory: number[] = [];
  
  async load(): Promise<void> {
    console.log('🐰 Bunnymark Standard Demo');
    console.log(`📋 Configuration: ${BUNNYMARK_CONFIG.canvas.width}x${BUNNYMARK_CONFIG.canvas.height} canvas`);
    console.log(`📊 Press E and click "Bunnymark (Progressive)" to start`);
    // DON'T start automatically - wait for user to click button
  }
  
  startBenchmark(): void {
    console.log(`📊 Progressive spawn: ${BUNNYMARK_CONFIG.spawnIncrement} bunnies every ${BUNNYMARK_CONFIG.spawnInterval}ms until FPS < ${BUNNYMARK_CONFIG.targetFPS}`);
    this.isRunning = true;
    this.totalSpawned = 0;
    this.fpsHistory = [];
  }
  
  update(dt: number): void {
    super.update(dt);
    
    if (!this.isRunning) return;
    
    // Track FPS with moving average (last 60 frames)
    const currentFPS = 1 / dt;
    this.fpsHistory.push(currentFPS);
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }
    
    // Use average FPS to avoid single-frame drops
    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    
    // Progressive spawn until FPS drops below target
    this.spawnTimer += dt;
    const spawnIntervalSeconds = BUNNYMARK_CONFIG.spawnInterval / 1000;
    
    if (this.spawnTimer >= spawnIntervalSeconds) {
      this.spawnTimer = 0;
      
      if (avgFPS >= BUNNYMARK_CONFIG.targetFPS && this.totalSpawned < 500000) {
        this.spawnBunnyBatch();
      } else if (this.totalSpawned > 0) {
        console.log('');
        console.log('✅ BUNNYMARK STANDARD COMPLETE!');
        console.log(`🏆 Final Score: ${this.totalSpawned.toLocaleString()} bunnies @ ${avgFPS.toFixed(1)} FPS`);
        console.log('');
        this.isRunning = false;
      }
    }
  }
  
  private spawnBunnyBatch(): void {
    const centerX = BUNNYMARK_CONFIG.canvas.width / 2;
    const centerY = BUNNYMARK_CONFIG.canvas.height / 2;
    
    // Spawn batch using spawn service (injected by engine)
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
        size: BUNNYMARK_CONFIG.entity.width, // Use sprite width
        physics: {
          velocity: 'random',
          speed: BUNNYMARK_CONFIG.velocity,
          gravity: true,
          collision: false
        }
      });
      
      this.totalSpawned += BUNNYMARK_CONFIG.spawnIncrement;
      console.log(`🐰 Spawned ${BUNNYMARK_CONFIG.spawnIncrement} bunnies → Total: ${this.totalSpawned.toLocaleString()}`);
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
