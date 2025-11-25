/**
 * ISpawnableScene - Interface for scenes with entity spawning capabilities
 * 
 * Scenes implementing this interface automatically get EntitySpawner callbacks
 * without manual registration in Engine.
 */

export interface ISpawnableScene {
  /**
   * Remove the last N entities from the scene
   */
  removeLast(count: number): void;
  
  /**
   * Clear all entities from the scene
   */
  clear(): void;
}

/**
 * Type guard to check if a scene implements ISpawnableScene
 */
export function isSpawnableScene(scene: any): scene is ISpawnableScene {
  return scene &&
         typeof scene.removeLast === 'function' &&
         typeof scene.clear === 'function';
}
