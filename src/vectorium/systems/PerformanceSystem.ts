/**
 * Performance Monitoring System
 * Tracks FPS, frame time, and metrics - opt-in only
 */

import { BaseSystem } from '../core/System';
import { PerformanceMonitor } from '../tools/PerformanceMonitor';

export interface PerformanceSystemConfig {
  targetFPS?: number;
  initialQuality?: 'ultra' | 'high' | 'medium' | 'low' | 'potato';
  adaptiveQuality?: boolean;
}

export class PerformanceSystem extends BaseSystem {
  readonly name = 'PerformanceSystem';
  
  public monitor!: PerformanceMonitor;
  
  constructor(private config: PerformanceSystemConfig = {}) {
    super();
  }
  
  init(engine: any): void {
    super.init(engine);
    
    this.monitor = new PerformanceMonitor(
      this.config.targetFPS ?? 60,
      this.config.initialQuality ?? 'high'
    );
    
    if (this.config.adaptiveQuality !== false) {
      this.monitor.setAdaptiveQuality(true);
    }
    
    // If RenderSystem exists, link them
    const renderSystem = engine.getSystem('RenderSystem');
    if (renderSystem) {
      this.monitor.setRenderer(renderSystem.renderer);
      renderSystem.renderer.setPerformanceMonitor(this.monitor);
    }
    
    console.log('PerformanceSystem initialized');
  }
  
  update(dt: number): void {
    if (this.monitor) {
      this.monitor.beginFrame();
    }
  }
  
  render(): void {
    if (this.monitor) {
      this.monitor.endFrame();
    }
  }
  
  getMetrics() {
    return this.monitor?.getMetrics() ?? {
      fps: 0,
      frameTime: 0,
      quality: 'high' as const
    };
  }
  
  destroy(): void {
    super.destroy();
  }
}
