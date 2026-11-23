/**
 * 🐰 PIXIJS BUNNYMARK — rival benchmark for like-for-like comparison
 *
 * Mirrors vectorium's bunnytest.html exactly:
 * - 800×600 canvas, same bunny.png (26×37)
 * - gravity 2500 px/s², restitution 1.0, dt-based physics
 * - spawn vx = rand*400, vy = rand*400-200 (same as GpuParticleSystem.burst)
 * - progressive spawn: 1000 bunnies per 25 ms
 * - stop condition: GPU-synced frame probe (1px readPixels) > 17 ms,
 *   2 consecutive breaches — identical to bunnytest.ts
 *
 * Uses PixiJS's fastest path (ParticleContainer, WebGL renderer).
 * NOTE: PixiJS runs physics on the CPU (as its official bunnymark does).
 * Compare against BOTH vectorium modes: default (GPU physics) and ?cpu=1.
 */

import { Application, Assets, Texture, ParticleContainer, Particle } from 'pixi.js';

const WIDTH = 800;
const HEIGHT = 600;
const GRAVITY = 2500;
const RESTITUTION = 1.0;
const SPRITE_W = 26;
const SPRITE_H = 37;
const SPAWN_INCREMENT = 1000;
const SPAWN_INTERVAL = 25;
const MAX_BUNNIES = 6500000;
const VEL_MAX = 400;

async function main() {
  const app = new Application();
  await app.init({
    width: WIDTH,
    height: HEIGHT,
    background: 0x1a1a2e,
    preference: 'webgl',        // WebGL2 — same backend class as vectorium
    antialias: false,
    hello: false,
  });
  document.getElementById('canvas-slot')!.appendChild(app.canvas);

  const texture: Texture = await Assets.load('/bunny.png');

  const container = new ParticleContainer({
    dynamicProperties: {
      position: true,   // positions change every frame
      scale: false,
      rotation: false,
      color: false,
    },
  });
  app.stage.addChild(container);

  // SoA velocity arrays (same layout idea as vectorium's CPU system)
  const velX = new Float32Array(MAX_BUNNIES);
  const velY = new Float32Array(MAX_BUNNIES);
  const particles: Particle[] = [];
  let count = 0;

  const halfW = SPRITE_W / 2;
  const halfH = SPRITE_H / 2;
  const minX = halfW, maxX = WIDTH - halfW;
  const minY = halfH, maxY = HEIGHT - halfH;

  function burst(n: number, cx: number, cy: number): void {
    const toSpawn = Math.min(n, MAX_BUNNIES - count);
    for (let i = 0; i < toSpawn; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 10;
      const p = new Particle({
        texture,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        anchorX: 0.5,
        anchorY: 0.5,
      });
      container.addParticle(p);
      particles.push(p);
      velX[count] = Math.random() * VEL_MAX;
      velY[count] = (Math.random() * VEL_MAX) - (VEL_MAX / 2);
      count++;
    }
  }

  function updatePhysics(dt: number): void {
    const g = GRAVITY * dt;
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      let vx = velX[i];
      let vy = velY[i] + g;
      let x = p.x + vx * dt;
      let y = p.y + vy * dt;
      if (x < minX || x > maxX) {
        x = Math.max(minX, Math.min(maxX, x));
        vx = -vx;
      }
      if (y < minY || y > maxY) {
        y = Math.max(minY, Math.min(maxY, y));
        vy = -vy * RESTITUTION;
      }
      p.x = x;
      p.y = y;
      velX[i] = vx;
      velY[i] = vy;
    }
  }

  // Physics driven by Pixi's ticker (the normal Pixi frame path)
  app.ticker.add((ticker) => {
    updatePhysics(ticker.deltaMS / 1000);
  });

  // GPU-synced frame probe — identical method to vectorium's bunnytest.ts
  const gl: WebGL2RenderingContext | WebGLRenderingContext = (app.renderer as any).gl;
  const probePixel = new Uint8Array(4);
  function measureSyncedFrameMs(): number {
    const t0 = performance.now();
    updatePhysics(1 / 60);
    app.render();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probePixel);
    return performance.now() - t0;
  }

  const statusEl = document.getElementById('status')!;
  let running = false;
  let totalSpawned = 0;

  async function runProgressiveTest(): Promise<void> {
    if (running) return;
    running = true;
    let consecutiveBreaches = 0;

    while (running) {
      const syncedFrameMs = measureSyncedFrameMs();
      const syncedFPS = 1000 / syncedFrameMs;

      statusEl.textContent =
        `${totalSpawned.toLocaleString()} bunnies — ${syncedFrameMs.toFixed(2)} ms/frame (${syncedFPS.toFixed(1)} FPS, GPU-synced)`;

      consecutiveBreaches = syncedFrameMs > 17 ? consecutiveBreaches + 1 : 0;

      if (consecutiveBreaches >= 2 || totalSpawned >= MAX_BUNNIES) {
        running = false;
        const result = `🏆 PIXI BUNNYMARK COMPLETE: ${totalSpawned.toLocaleString()} bunnies @ ${syncedFPS.toFixed(1)} FPS (GPU-synced: ${syncedFrameMs.toFixed(2)}ms/frame)`;
        console.log(result);
        statusEl.textContent = result;
        break;
      }

      burst(SPAWN_INCREMENT, 10, 10);
      totalSpawned += SPAWN_INCREMENT;

      await new Promise((resolve) => setTimeout(resolve, SPAWN_INTERVAL));
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      runProgressiveTest();
    }
  });

  // Diagnostic globals for automated benchmarking (dev only)
  (window as any).__pixiApp = app;
  (window as any).__pixiBench = { burst, updatePhysics, measureSyncedFrameMs, runProgressiveTest, getCount: () => count, getSpawned: () => totalSpawned, isRunning: () => running };
}

main();
