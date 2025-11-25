/**
 * SceneBehavior - Composable scene functionality
 * 
 * Behaviors provide reusable scene logic via composition instead of inheritance.
 * Inspired by Unity's MonoBehaviour and Unreal's ActorComponent.
 * 
 * Benefits:
 * - Mix and match behaviors without deep inheritance
 * - Reuse common patterns (camera follow, parallax, particle systems)
 * - Cleaner separation of concerns
 * - Easier testing and debugging
 * 
 * Usage:
 * ```typescript
 * class MyScene extends Scene {
 *   constructor() {
 *     super('my-scene');
 *     
 *     // Add behaviors
 *     this.addBehavior(new CameraFollowBehavior(playerEntity));
 *     this.addBehavior(new ParallaxBackgroundBehavior());
 *     this.addBehavior(new ParticleSystemBehavior());
 *   }
 * }
 * ```
 */

import type { Scene } from '../core/Scene';

export interface SceneBehavior {
  /**
   * Called when behavior is added to scene
   */
  onAttach?(scene: Scene): void;
  
  /**
   * Called when behavior is removed from scene
   */
  onDetach?(scene: Scene): void;
  
  /**
   * Called every frame before physics/animation update
   */
  onUpdate?(scene: Scene, dt: number): void;
  
  /**
   * Called every frame after update, before render
   */
  onLateUpdate?(scene: Scene, dt: number): void;
  
  /**
   * Called when scene is activated
   */
  onActivate?(scene: Scene): void;
  
  /**
   * Called when scene is deactivated
   */
  onDeactivate?(scene: Scene): void;
  
  /**
   * Optional name for debugging
   */
  readonly name?: string;
}

/**
 * Behavior manager for Scene
 */
export class SceneBehaviorManager {
  private behaviors: SceneBehavior[] = [];
  private scene: Scene;
  
  constructor(scene: Scene) {
    this.scene = scene;
  }
  
  /**
   * Add a behavior to the scene
   */
  add(behavior: SceneBehavior): void {
    if (this.behaviors.includes(behavior)) {
      console.warn('SceneBehaviorManager: Behavior already added');
      return;
    }
    
    this.behaviors.push(behavior);
    
    if (behavior.onAttach) {
      behavior.onAttach(this.scene);
    }
    
    if (this.scene.active && behavior.onActivate) {
      behavior.onActivate(this.scene);
    }
  }
  
  /**
   * Remove a behavior from the scene
   */
  remove(behavior: SceneBehavior): void {
    const index = this.behaviors.indexOf(behavior);
    if (index === -1) {
      return;
    }
    
    if (behavior.onDetach) {
      behavior.onDetach(this.scene);
    }
    
    this.behaviors.splice(index, 1);
  }
  
  /**
   * Remove all behaviors
   */
  clear(): void {
    this.behaviors.forEach(behavior => {
      if (behavior.onDetach) {
        behavior.onDetach(this.scene);
      }
    });
    this.behaviors = [];
  }
  
  /**
   * Call onUpdate on all behaviors
   */
  update(dt: number): void {
    for (const behavior of this.behaviors) {
      if (behavior.onUpdate) {
        try {
          behavior.onUpdate(this.scene, dt);
        } catch (error) {
          console.error(`Error in behavior "${behavior.name || 'unknown'}" onUpdate:`, error);
        }
      }
    }
  }
  
  /**
   * Call onLateUpdate on all behaviors
   */
  lateUpdate(dt: number): void {
    for (const behavior of this.behaviors) {
      if (behavior.onLateUpdate) {
        try {
          behavior.onLateUpdate(this.scene, dt);
        } catch (error) {
          console.error(`Error in behavior "${behavior.name || 'unknown'}" onLateUpdate:`, error);
        }
      }
    }
  }
  
  /**
   * Call onActivate on all behaviors
   */
  activate(): void {
    for (const behavior of this.behaviors) {
      if (behavior.onActivate) {
        try {
          behavior.onActivate(this.scene);
        } catch (error) {
          console.error(`Error in behavior "${behavior.name || 'unknown'}" onActivate:`, error);
        }
      }
    }
  }
  
  /**
   * Call onDeactivate on all behaviors
   */
  deactivate(): void {
    for (const behavior of this.behaviors) {
      if (behavior.onDeactivate) {
        try {
          behavior.onDeactivate(this.scene);
        } catch (error) {
          console.error(`Error in behavior "${behavior.name || 'unknown'}" onDeactivate:`, error);
        }
      }
    }
  }
  
  /**
   * Get all behaviors
   */
  getAll(): readonly SceneBehavior[] {
    return this.behaviors;
  }
  
  /**
   * Get behavior by type
   */
  get<T extends SceneBehavior>(type: new (...args: any[]) => T): T | undefined {
    return this.behaviors.find(b => b instanceof type) as T | undefined;
  }
  
  /**
   * Check if behavior exists
   */
  has<T extends SceneBehavior>(type: new (...args: any[]) => T): boolean {
    return this.behaviors.some(b => b instanceof type);
  }
}
