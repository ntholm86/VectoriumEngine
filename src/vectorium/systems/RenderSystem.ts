/**
 * WebGL Rendering System
 * Handles all WebGL rendering - opt-in only
 */

import { BaseSystem } from '../core/System';
import { WebGLBatchRenderer } from '../rendering/WebGLBatchRenderer';
import { TextureManager } from '../rendering/TextureManager';
import { FeatureDetector } from '../core/FeatureDetector';

export interface RenderSystemConfig {
  preferWebGL2?: boolean;
}

export class RenderSystem extends BaseSystem {
  readonly name = 'RenderSystem';
  
  public renderer!: WebGLBatchRenderer;
  public textureManager!: TextureManager;
  private featureDetector!: FeatureDetector;
  private canvas!: HTMLCanvasElement;
  
  constructor(private config: RenderSystemConfig = {}) {
    super();
  }
  
  init(engine: any): void {
    super.init(engine);
    
    this.canvas = engine.canvas;
    this.featureDetector = new FeatureDetector();
    
    const useWebGL2 = this.config.preferWebGL2 !== false && 
                      this.featureDetector.capabilities.hasWebGL2;
    
    this.renderer = new WebGLBatchRenderer(this.canvas, useWebGL2);
    this.textureManager = new TextureManager(
      this.renderer.getContext() as WebGL2RenderingContext
    );
    this.renderer.setTextureManager(this.textureManager);
    
    console.log(`RenderSystem: WebGL${useWebGL2 ? '2' : '1'}`);
  }
  
  render(): void {
    if (!this.renderer) return;
    
    // Systems don't render by default - scenes do
    // This is just here to handle begin/end if needed
  }
  
  destroy(): void {
    if (this.renderer) {
      this.renderer.destroy();
    }
    super.destroy();
  }
}
