/**
 * 🚀 SIMPLE BUNNYMARK - New DisplayObject API
 * 
 * PixiJS-style API - dead simple!
 */

import { VectoriumBuilder } from './vectorium/core/EngineBuilder';
import { Scene } from './vectorium/core/Engine';
import { Sprite } from './vectorium/display/Sprite';

class SimpleBunnymarkScene extends Scene {
  private bunnies: Sprite[] = [];
  private isSpawning: boolean = false;
  private targetBunnies: number = 0;
  private spawnPerFrame: number = 100;
  
  async load(): Promise<void> {
    console.log('🐰 Simple Bunnymark (DisplayObject API)');
    console.log('💡 Press F to spawn 1000 bunnies progressively');
    console.log('💡 Press SPACE to toggle physics');
  }
  
  /**
   * Start progressive bunny spawning
   */
  spawnBunnies(count: number): void {
    this.targetBunnies += count;
    this.isSpawning = true;
    console.log(`🎯 Target: ${this.targetBunnies} bunnies`);
  }
  
  /**
   * Spawn a batch of bunnies (called per frame)
   */
  private spawnBatch(count: number): void {
    const canvasWidth = 800;
    const canvasHeight = 600;
    
    for (let i = 0; i < count; i++) {
      // PixiJS-style creation!
      const bunny = Sprite.from('/bunny.png', this.world);
      
      // Set properties directly (just like PixiJS)
      bunny.x = Math.random() * canvasWidth;
      bunny.y = Math.random() * canvasHeight;
      bunny.vx = (Math.random() - 0.5) * 200;
      bunny.vy = (Math.random() - 0.5) * 200;
      bunny.scale = 26; // bunny sprite size
      
      // Enable physics
      bunny.physics = true;
      bunny.bounce = true;
      bunny.gravity = true;
      
      // Add to scene
      this.add(bunny);
      this.bunnies.push(bunny);
    }
  }
  
  /**
   * Toggle physics on all bunnies
   */
  togglePhysics(): void {
    const firstBunny = this.bunnies[0];
    if (!firstBunny) return;
    
    const newState = !firstBunny.physics;
    for (const bunny of this.bunnies) {
      bunny.physics = newState;
    }
    
    console.log(`Physics: ${newState ? 'ON' : 'OFF'}`);
  }
  
  update(_dt: number): void {
    // Progressive spawning
    if (this.isSpawning && this.bunnies.length < this.targetBunnies) {
      const remaining = this.targetBunnies - this.bunnies.length;
      const toSpawn = Math.min(this.spawnPerFrame, remaining);
      this.spawnBatch(toSpawn);
      
      if (this.bunnies.length >= this.targetBunnies) {
        this.isSpawning = false;
        console.log(`✅ Spawned ${this.targetBunnies} bunnies total`);
      }
    }
  }
}

// ============================================================================
// Launch Engine
// ============================================================================

(async () => {
  const scene = new SimpleBunnymarkScene('simple-bunnymark');
  
  const engine = new VectoriumBuilder()
    .withFullscreenCanvas({ width: 800, height: 600 })
    .withQuality('high')
    .enableDebugTools()
    .withScene('main', scene)
    .build();
  
  await engine.loadScene('main');
  engine.start();
  
  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      scene.spawnBunnies(1000);
    } else if (e.key === ' ') {
      scene.togglePhysics();
    }
  });
  
  console.log('✅ Simple Bunnymark ready!');
  console.log('   F = Spawn 1000 bunnies (progressively)');
  console.log('   SPACE = Toggle physics');
  console.log(`   📊 Spawning ${scene['spawnPerFrame']} bunnies per frame`);
})();
