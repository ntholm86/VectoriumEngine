/**
 * Scene Builder - Simplified scene creation without class inheritance
 * 
 * Usage:
 */

import { Scene } from './Scene';
import { WebGLBatchRenderer } from '../rendering/WebGLBatchRenderer';
import { TextRenderer } from '../rendering/TextRenderer';

type LoadHandler = () => Promise<void> | void;
type UpdateHandler = (dt: number) => void;
type RenderHandler = (renderer: WebGLBatchRenderer, textRenderer: TextRenderer, textPool?: any) => void;

export class SceneBuilder {
  private name: string;
  private capacity: number = 100000;
  private worldBoundsMultiplier: number = 1.0;
  private loadHandler?: LoadHandler;
  private updateHandler?: UpdateHandler;
  private renderHandler?: RenderHandler;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Set entity capacity (max entities in scene)
   */
  withCapacity(capacity: number): this {
    this.capacity = capacity;
    return this;
  }

  /**
   * Set world bounds multiplier for physics
   * 
   * When worldScale = 1.0: World bounds = viewport (entities bounce at screen edges)
   * When worldScale > 1.0: World bounds > viewport (larger physics space, requires culling)
   * 
   * @example
   * .withWorldScale(1.5)  // World is 1.5x larger than viewport
   */
  withWorldScale(multiplier: number): this {
    this.worldBoundsMultiplier = multiplier;
    return this;
  }

  /**
   * Set load callback (called once when scene loads)
   */
  onLoad(handler: LoadHandler): this {
    this.loadHandler = handler;
    return this;
  }

  /**
   * Set update callback (called every frame)
   */
  onUpdate(handler: UpdateHandler): this {
    this.updateHandler = handler;
    return this;
  }

  /**
   * Set render callback (called after entity rendering)
   */
  onRender(handler: RenderHandler): this {
    this.renderHandler = handler;
    return this;
  }

  /**
   * Build and return the configured Scene instance
   */
  build(): Scene {
    // Create anonymous scene class with custom handlers
    const handlers = {
      load: this.loadHandler,
      update: this.updateHandler,
      render: this.renderHandler
    };

    class CustomScene extends Scene {
      async load(): Promise<void> {
        if (handlers.load) {
          await handlers.load();
        }
      }

      update(dt: number): void {
        super.update(dt);
        if (handlers.update) {
          handlers.update(dt);
        }
      }

      render(renderer: WebGLBatchRenderer, textRenderer: TextRenderer, textPool?: any): void {
        super.render(renderer, textRenderer, textPool);
        if (handlers.render) {
          handlers.render(renderer, textRenderer, textPool);
        }
      }
    }

    return new CustomScene(this.name, this.capacity, this.worldBoundsMultiplier);
  }
}

/**
 * Quick factory function for simple scenes
 */
export function createScene(
  name: string,
  options: {
    capacity?: number;
    worldScale?: number;
    onLoad?: LoadHandler;
    onUpdate?: UpdateHandler;
    onRender?: RenderHandler;
  } = {}
): Scene {
  const builder = new SceneBuilder(name);
  
  if (options.capacity) builder.withCapacity(options.capacity);
  if (options.worldScale) builder.withWorldScale(options.worldScale);
  if (options.onLoad) builder.onLoad(options.onLoad);
  if (options.onUpdate) builder.onUpdate(options.onUpdate);
  if (options.onRender) builder.onRender(options.onRender);
  
  return builder.build();
}
