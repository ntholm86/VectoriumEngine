/**
 * ConfigEventSystem - Typed event system for runtime configuration changes
 * 
 * Replaces generic callbacks with specific event types, allowing subscribers
 * to know exactly what changed and respond appropriately.
 * 
 * Usage:
 * ```typescript
 * // Subscribe to specific changes
 * config.on('rendering.resolution', (value) => {
 *   console.log('Resolution changed:', value);
 * });
 * 
 * // Subscribe to category changes
 * config.on('quality', (settings) => {
 *   console.log('Quality settings changed:', settings);
 * });
 * 
 * // Unsubscribe
 * const unsubscribe = config.on('debug.showStats', handler);
 * unsubscribe();
 * ```
 */

export type ConfigEventType =
  // Rendering events
  | 'rendering.resolution'
  | 'rendering.clearColor'
  | 'rendering.antialias'
  | 'rendering.pixelRatio'
  | 'rendering'
  
  // Quality events
  | 'quality.targetFPS'
  | 'quality.enableAdaptiveQuality'
  | 'quality.maxEntities'
  | 'quality.particleQuality'
  | 'quality'
  
  // Physics events
  | 'physics.enabled'
  | 'physics.gravity'
  | 'physics.timeStep'
  | 'physics.maxVelocity'
  | 'physics.damping'
  | 'physics.restitution'
  | 'physics'
  
  // Debug events
  | 'debug.showStats'
  | 'debug.showBounds'
  | 'debug.showPhysics'
  | 'debug.showSpatialHash'
  | 'debug'
  
  // Camera events
  | 'camera.minZoom'
  | 'camera.maxZoom'
  | 'camera.smoothing'
  | 'camera.bounds'
  | 'camera.cullingMargin'
  | 'camera'
  
  // World events
  | 'world.boundsMultiplier'
  | 'world';

export type ConfigEventHandler<T = any> = (value: T) => void;
export type UnsubscribeFunction = () => void;

export class ConfigEventEmitter {
  private listeners = new Map<ConfigEventType, Set<ConfigEventHandler>>();
  
  /**
   * Subscribe to configuration change events
   * Returns unsubscribe function
   */
  on<T = any>(event: ConfigEventType, handler: ConfigEventHandler<T>): UnsubscribeFunction {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(handler as ConfigEventHandler);
    
    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }
  
  /**
   * Unsubscribe from configuration change events
   */
  off<T = any>(event: ConfigEventType, handler: ConfigEventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as ConfigEventHandler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }
  
  /**
   * Subscribe to an event that fires only once
   */
  once<T = any>(event: ConfigEventType, handler: ConfigEventHandler<T>): void {
    const onceHandler: ConfigEventHandler<T> = (value) => {
      handler(value);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }
  
  /**
   * Emit a configuration change event
   */
  emit(event: ConfigEventType, value: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(value);
        } catch (error) {
          console.error(`Error in config event handler for '${event}':`, error);
        }
      });
    }
  }
  
  /**
   * Remove all listeners for a specific event or all events
   */
  removeAllListeners(event?: ConfigEventType): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
  
  /**
   * Get the number of listeners for a specific event
   */
  listenerCount(event: ConfigEventType): number {
    return this.listeners.get(event)?.size ?? 0;
  }
  
  /**
   * Get all events that have listeners
   */
  eventNames(): ConfigEventType[] {
    return Array.from(this.listeners.keys());
  }
}
