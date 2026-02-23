/**
 * System interface for modular engine architecture
 * Systems are opt-in plugins that extend engine functionality
 */

export interface System {
  readonly name: string;
  
  /**
   * Initialize the system with engine context
   */
  init(engine: any): void;
  
  /**
   * Update logic (called every frame)
   */
  update?(dt: number): void;
  
  /**
   * Render logic (called every frame after update)
   */
  render?(): void;
  
  /**
   * Cleanup when system is removed
   */
  destroy?(): void;
}

/**
 * Base system implementation with common lifecycle
 */
export abstract class BaseSystem implements System {
  abstract readonly name: string;
  protected engine: any = null;
  
  init(engine: any): void {
    this.engine = engine;
  }
  
  destroy(): void {
    this.engine = null;
  }
}
