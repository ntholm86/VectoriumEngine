// 🍭 Using new syntax sugar imports!
import { VectoriumBuilder } from './vectorium/core/EngineBuilder';
import { Scene } from './vectorium/core/Engine';
import { DebugTextRenderer } from './vectorium/utils/DebugTextRenderer';

/**
 * 🎮 VECTORIUM DEMO
 */

class DemoScene extends Scene {
  override render(renderer: any, textRenderer: any, textPool?: any): void {
    super.render(renderer, textRenderer, textPool);
    // DebugTextRenderer.renderSamples(textRenderer);
  }
}

function initDemo() {
  const engine = new VectoriumBuilder()
    .withFullscreenCanvas()
    .withQuality('high')
    .withTargetFPS(60)
    .enableDebugTools()
    .withScene('demo', new DemoScene('demo'))
    .build();
  
  // Start engine
  engine.loadScene('demo').then(() => {
    engine.start();
  });
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}
