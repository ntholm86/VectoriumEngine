/**
 * General-entity benchmark — exercises the actual Scene/World ECS render
 * path (WebGLBatchRenderer.drawBulkShapesIndexed via Scene.renderECSBatch),
 * NOT the specialized bunnymark particle systems (BunnymarkParticleSystem /
 * GpuParticleSystem). This is what README.md's "600,000 entities @ 60 FPS"
 * claim is actually describing — a generic game entity (shape, moving,
 * no physics/collision), not a textured particle-storm benchmark.
 *
 * Measurement protocol matches the rest of today's session: GPU-synced via
 * a 1px readPixels after render (gl.finish() is a no-op under ANGLE).
 */

import { VectoriumBuilder } from './vectorium/core/EngineBuilder';
import { Scene } from './vectorium/core/Engine';
import { EngineConfig } from './vectorium/core/EngineConfig';

const WIDTH = 800;
const HEIGHT = 600;

class EntityBenchScene extends Scene {
  async load(): Promise<void> {
    // no-op: entities are spawned on demand from the console harness
  }
}

function init() {
  const config = new EngineConfig();
  config.width = WIDTH;
  config.height = HEIGHT;

  const scene = new EntityBenchScene('entity-bench', 10_000_000);

  const engine = new VectoriumBuilder(config)
    .withScene('entity-bench', scene)
    .build();

  engine.loadScene('entity-bench').then(() => {
    engine.start();

    const world = scene.getWorld();
    const renderer = (engine as any).renderer;
    const gl = renderer.gl as WebGL2RenderingContext;
    const probePixel = new Uint8Array(4);

    function spawnTo(target: number): number {
      const current = world.getTotalCount();
      const need = target - current;
      for (let i = 0; i < need; i++) {
        const x = Math.random() * WIDTH;
        const y = Math.random() * HEIGHT;
        const vx = (Math.random() - 0.5) * 80;
        const vy = (Math.random() - 0.5) * 80;
        const id = world.createEntity(x, y, vx, vy);
        world.setShapeType(id, 1); // circle — generic non-textured entity
        // Real-game workload parity: continuous per-entity rotation,
        // integrated by the engine (idiomatic vectorium usage).
        world.setRotationSpeed(id, (Math.random() - 0.5) * 360);
      }
      return world.getTotalCount();
    }

    /** One fully GPU-synced frame: physics + render + hard sync. */
    function frame(dt: number): void {
      scene.update(dt);
      renderer.begin(WIDTH, HEIGHT);
      scene.render(renderer);
      renderer.end?.();
      gl.readPixels(400, 300, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probePixel);
    }

    function measure(frames = 20): { count: number; frameMs: number; fps: number } {
      const dt = 1 / 60;
      for (let f = 0; f < 5; f++) frame(dt); // warmup
      const t0 = performance.now();
      for (let f = 0; f < frames; f++) frame(dt);
      const t1 = performance.now();
      const frameMs = (t1 - t0) / frames;
      return {
        count: world.getActiveCount(),
        frameMs: +frameMs.toFixed(2),
        fps: +(1000 / frameMs).toFixed(1),
      };
    }

    (window as any).__entitybench = { engine, scene, world, spawnTo, measure };
    console.log('🧪 General-entity benchmark ready — __entitybench.spawnTo(n), __entitybench.measure()');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
