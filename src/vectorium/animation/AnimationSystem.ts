/**
 * Vectorium AnimationSystem - Batch-Optimized
 * Updates frame-based animations and tweens using batch processing
 * 
 * OPTIMIZATION: Group entities by animation type and process in batches
 * - Same animation = process together (cache-friendly)
 * - Vectorized tween calculations (SIMD-friendly)
 * - Reduces branch mispredictions
 */

import type { World } from '../core/World';
import type { AnimationManager } from './AnimationManager';

export class AnimationSystem {
  private world: World;
  private animManager: AnimationManager;
  
  // 🚀 BATCH OPTIMIZATION: Group entities by animation/tween type
  private readonly BATCH_SIZE = 512; // Process 512 entities per batch
  private animationBatches: Map<number, number[]> = new Map(); // animId -> entity indices
  private tweenBatches: Map<number, number[]> = new Map(); // tweenId -> entity indices

  constructor(world: World, animManager: AnimationManager) {
    this.world = world;
    this.animManager = animManager;
  }

  /**
   * Update all frame animations and tweens
   */
  update(dt: number): void {
    const dtMs = dt * 1000;  // Convert to milliseconds
    
    this.updateFrameAnimations(dtMs);
    this.updateTweens(dtMs);
  }

  /**
   * Update frame-based animations - BATCH OPTIMIZED
   * Group entities by animation type and process together
   */
  private updateFrameAnimations(dtMs: number): void {
    const frameAnimIds = this.world.getFrameAnimIds();
    const frameIndices = this.world.getFrameIndices();
    const frameTimes = this.world.getFrameTimes();
    const animLoop = this.world.getAnimLoop();
    const flags = this.world.getFlags();
    
    const entityCount = this.world.getCount();
    const FLAG_ACTIVE = 1 << 0;
    
    // 🚀 BATCH OPTIMIZATION: Group entities by animation type
    this.animationBatches.clear();
    for (let i = 0; i < entityCount; i++) {
      if (!(flags[i] & FLAG_ACTIVE)) continue;
      
      const animId = frameAnimIds[i];
      if (animId === 0) continue;
      
      if (!this.animationBatches.has(animId)) {
        this.animationBatches.set(animId, []);
      }
      this.animationBatches.get(animId)!.push(i);
    }
    
    // Process each batch (all entities with same animation together)
    for (const [animId, indices] of this.animationBatches) {
      const anim = this.animManager.getFrameAnimationById(animId);
      if (!anim) continue;
      
      // Cache animation properties (avoid repeated lookups)
      const frameCount = anim.frames.length;
      const frameDurations = anim.frameDurations;
      
      // 🚀 VECTORIZED PROCESSING: Process all entities with this animation
      for (let idx = 0; idx < indices.length; idx++) {
        const i = indices[idx];
        
        // Advance time
        frameTimes[i] += dtMs;
        
        // Check if we need to advance frame
        const currentFrame = frameIndices[i];
        const frameDuration = frameDurations[currentFrame];
        
        if (frameTimes[i] >= frameDuration) {
          frameTimes[i] -= frameDuration;
          
          // Advance to next frame
          let nextFrame = currentFrame + 1;
          
          if (nextFrame >= frameCount) {
            if (animLoop[i]) {
              nextFrame = 0;  // Loop
            } else {
              nextFrame = frameCount - 1;  // Stop at last frame
              frameAnimIds[i] = 0;  // Stop animation
            }
          }
          
          frameIndices[i] = nextFrame;
        }
      }
    }
  }

  /**
   * Update tweens - BATCH OPTIMIZED
   * Group entities by tween type and process together
   */
  private updateTweens(dtMs: number): void {
    const tweenIds = this.world.getTweenIds();
    const tweenTimes = this.world.getTweenTimes();
    const tweenActive = this.world.getTweenActive();
    const tweenStartValues = this.world.getTweenStartValues();
    const tweenEndValues = this.world.getTweenEndValues();
    const flags = this.world.getFlags();
    
    const entityCount = this.world.getCount();
    const FLAG_ACTIVE = 1 << 0;
    
    // Get component arrays for property updates
    const posX = this.world.getX();
    const posY = this.world.getY();
    const scales = this.world.getScale();
    const sizes = this.world.getSizes();
    const alphas = this.world.getAlpha();
    
    // 🚀 BATCH OPTIMIZATION: Group entities by tween type
    this.tweenBatches.clear();
    for (let i = 0; i < entityCount; i++) {
      if (!(flags[i] & FLAG_ACTIVE)) continue;
      if (!tweenActive[i]) continue;
      
      const tweenId = tweenIds[i];
      if (tweenId === 0) continue;
      
      if (!this.tweenBatches.has(tweenId)) {
        this.tweenBatches.set(tweenId, []);
      }
      this.tweenBatches.get(tweenId)!.push(i);
    }
    
    // Process each batch (all entities with same tween together)
    for (const [tweenId, indices] of this.tweenBatches) {
      const tween = this.animManager.getTweenById(tweenId);
      if (!tween) continue;
      
      // Cache tween properties (avoid repeated lookups)
      const duration = tween.duration;
      const easingFunc = tween.easing;
      const properties = tween.properties;
      const propCount = properties.length;
      
      // 🚀 VECTORIZED PROCESSING: Process all entities with this tween
      for (let idx = 0; idx < indices.length; idx++) {
        const i = indices[idx];
        
        // Advance time
        tweenTimes[i] += dtMs;
        
        // Calculate progress (0-1)
        const progress = Math.min(tweenTimes[i] / duration, 1.0);
        
        // Apply easing (single call per entity)
        const easedProgress = easingFunc(progress);
        
        // 🚀 BATCH UPDATE: Update all properties for this entity
        const baseIndex = i * 4;
        for (let p = 0; p < propCount; p++) {
          const propIndex = properties[p];
          const startValue = tweenStartValues[baseIndex + p];
          const endValue = tweenEndValues[baseIndex + p];
          const currentValue = startValue + (endValue - startValue) * easedProgress;
          
          // Apply to component array (branch-free property access)
          switch (propIndex) {
            case 0: posX[i] = currentValue; break;
            case 1: posY[i] = currentValue; break;
            case 2: scales[i] = currentValue; break;
            case 3: sizes[i] = currentValue; break;
            case 4: alphas[i] = currentValue; break;
          }
        }
        
        // Check if complete
        if (progress >= 1.0) {
          // Reverse the tween (ping-pong animation)
          const baseIndex = i * 4;
          for (let p = 0; p < propCount; p++) {
            const temp = tweenStartValues[baseIndex + p];
            tweenStartValues[baseIndex + p] = tweenEndValues[baseIndex + p];
            tweenEndValues[baseIndex + p] = temp;
          }
          tweenTimes[i] = 0; // Restart
        }
      }
    }
  }
}
