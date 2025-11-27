/**
 * 🚀 VECTORIUM ENGINE - WASM ECS DEMO
 * 
 * UNIFIED OPTIMIZATION PIPELINE:
 * ✅ WASM Physics (5-10x faster, zero-copy shared memory)
 * ✅ Spatial Hash Grid (O(n) collision detection vs O(n²))
 * ✅ Temporal Coherence (contact caching, warm starting)
 * ✅ Island-based Sleeping (Box2D technique)
 * ✅ Batch Rendering (65,000 entities per draw call)
 * ✅ Cache-optimized ECS (SoA data layout)
 * ✅ SIMD-friendly data structures
 * 
 * TARGET: 500,000 shapes @ 60 FPS
 */

import { VectoriumBuilder } from './vectorium/core/EngineBuilder';
import { Scene } from './vectorium/core/Engine';
import { EntitySpawner } from './vectorium/debug/EntitySpawner';
import { EntitySpawnService, type SpawnConfig } from './vectorium/entities/EntitySpawnService';

/**
 * Main Demo Scene - Showcases WASM ECS Architecture
 */
class WasmDemoScene extends Scene {
  private entitySpawner!: EntitySpawner;
  private spawnService!: EntitySpawnService;

  override async onLoad(): Promise<void> {
    console.log('🎮 Demo Scene Loaded');
    console.log('🎯 Target: 500,000 shapes @ 60 FPS with WASM acceleration');

    // Initialize spawn service
    this.spawnService = this.getService(EntitySpawnService);
    
    // Create entity spawner UI panel
    this.entitySpawner = new EntitySpawner(this, this.inputManager);
    
    // Register spawn callback to handle entity creation
    this.entitySpawner.registerSpawnCallback((x: number, y: number, config: SpawnConfig) => {
      this.spawnService.spawnEntities(config.count, x, y, config);
    });
    
    // Register cleanup callbacks
    this.entitySpawner.registerCallbacks({
      remove1K: () => this.removeLast(1000),
      clearAll: () => this.clear()
    });
  }

  override update(dt: number): void {
    super.update(dt);
    // EntitySpawner handles click-to-spawn automatically via Engine.enableClickToSpawn()
  }

  override render(renderer: any, textRenderer: any, textPool?: any): void {
    super.render(renderer, textRenderer, textPool);
  }

  /**
   * Remove last N entities (for cleanup testing)
   */
  removeLast(count: number): void {
    for (let i = 0; i < count && this.world.count > 0; i++) {
      const lastId = this.world.count - 1;
      this.world.removeEntity(lastId);
    }
    console.log(`🗑️ Removed ${count} entities (total: ${this.world.count})`);
  }

  /**
   * Clear all entities
   */
  clear(): void {
    this.world.clear();
    console.log('🧹 Cleared all entities');
  }
}

/**
 * Initialize the demo
 */
function initDemo() {
  const engine = new VectoriumBuilder()
    .withFullscreenCanvas()
    .withQuality('high')
    .withTargetFPS(60)
    .enableDebugTools()
    .withScene('wasm-demo', new WasmDemoScene('wasm-demo'))
    .build();
  
  // Start engine
  engine.loadScene('wasm-demo').then(() => {
    engine.start();
    console.log('🎮 WASM ECS Demo running!');
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}
