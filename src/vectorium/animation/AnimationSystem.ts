/**
 * Vectorium AnimationSystem - Phase 1
 * Updates frame-based animations and tweens
 * 
 * This is called by Scene.ts each frame to advance animations
 */

import type { World } from '../core/World';
import type { AnimationManager } from './AnimationManager';

export class AnimationSystem {
  private world: World;
  private animManager: AnimationManager;

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
   * Update frame-based animations
   */
  private updateFrameAnimations(dtMs: number): void {
    const frameAnimIds = this.world.getFrameAnimIds();
    const frameIndices = this.world.getFrameIndices();
    const frameTimes = this.world.getFrameTimes();
    const animLoop = this.world.getAnimLoop();
    const flags = this.world.getFlags();
    
    const entityCount = this.world.getCount();
    const FLAG_ACTIVE = 1 << 0;
    
    for (let i = 0; i < entityCount; i++) {
      // Skip inactive entities
      if (!(flags[i] & FLAG_ACTIVE)) continue;
      
      const animId = frameAnimIds[i];
      if (animId === 0) continue;  // No animation
      
      // Get animation definition
      const anim = this.animManager.getFrameAnimationById(animId);
      if (!anim) continue;
      
      // Advance time
      frameTimes[i] += dtMs;
      
      // Check if we need to advance frame
      const currentFrame = frameIndices[i];
      const frameDuration = anim.frameDurations[currentFrame];
      
      if (frameTimes[i] >= frameDuration) {
        frameTimes[i] -= frameDuration;
        
        // Advance to next frame
        let nextFrame = currentFrame + 1;
        
        if (nextFrame >= anim.frames.length) {
          if (animLoop[i]) {
            nextFrame = 0;  // Loop
          } else {
            nextFrame = anim.frames.length - 1;  // Stop at last frame
            frameAnimIds[i] = 0;  // Stop animation
          }
        }
        
        frameIndices[i] = nextFrame;
      }
    }
  }

  /**
   * Update tweens
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
    
    for (let i = 0; i < entityCount; i++) {
      // Skip inactive entities
      if (!(flags[i] & FLAG_ACTIVE)) continue;
      if (!tweenActive[i]) continue;
      
      const tweenId = tweenIds[i];
      if (tweenId === 0) continue;
      
      // Get tween definition
      const tween = this.animManager.getTweenById(tweenId);
      if (!tween) continue;
      
      // Advance time
      tweenTimes[i] += dtMs;
      
      // Calculate progress (0-1)
      let progress = Math.min(tweenTimes[i] / tween.duration, 1.0);
      
      // Apply easing
      const easedProgress = tween.easing(progress);
      
      // Update properties
      const baseIndex = i * 4;
      for (let p = 0; p < tween.properties.length; p++) {
        const propIndex = tween.properties[p];
        const startValue = tweenStartValues[baseIndex + p];
        const endValue = tweenEndValues[baseIndex + p];
        const currentValue = startValue + (endValue - startValue) * easedProgress;
        
        // Apply to component array
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
        tweenActive[i] = 0;
        tweenIds[i] = 0;
      }
    }
  }
}
