/**
 * PixiJS v8 ParticleContainer bunnymark — like-for-like rival measurement.
 *
 * Mirrors vectorium's bunnytest as closely as PixiJS allows:
 * - 800x600 canvas, same /bunny.png, sprite 26px wide
 * - Same physics constants: gravity 2500 px/s², dt-based integration,
 *   perfect x-bounce, restitution 1.0 on y, spawn cluster at (10,10)
 * - CPU physics (PixiJS's standard bunnymark model — matches vectorium ?cpu=1)
 * - Measurement: identical GPU-synced protocol (1px readPixels per frame)
 *
 * Exposed as window.__pixi = { app, spawnTo, measure } for the automated harness.
 */

import { Application, Assets, Particle, ParticleContainer, Texture } from 'pixi.js';

const WIDTH = 800;
const HEIGHT = 600;
const GRAVITY = 2500;
const SPRITE_W = 26;
const SPRITE_H = 37;
const MAX_VEL = 400;
const RESTITUTION = 1.0;

interface BunnyState {
  particle: Particle;
  vx: number;
  vy: number;
}

async function init() {
  const app = new Application();
  await app.init({
    width: WIDTH,
    height: HEIGHT,
    background: 0x000000,
    preference: 'webgl', // same backend as vectorium for a fair comparison
    antialias: false,
    hello: false,
  });
  document.body.appendChild(app.canvas);

  const texture: Texture = await Assets.load('/bunny.png');

  const container = new ParticleContainer({
    dynamicProperties: {
      position: true,   // per-frame position updates only
      scale: false,
      rotation: false,
      color: false,
    },
  });
  app.stage.addChild(container);

  const bunnies: BunnyState[] = [];

  const halfW = SPRITE_W / 2;
  const halfH = SPRITE_H / 2;
  const minX = halfW, maxX = WIDTH - halfW;
  const minY = halfH, maxY = HEIGHT - halfH;

  function spawn(count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 10;
      const particle = new Particle({
        texture,
        x: 10 + Math.cos(angle) * radius,
        y: 10 + Math.sin(angle) * radius,
        anchorX: 0.5,
        anchorY: 0.5,
      });
      container.addParticle(particle);
      bunnies.push({
        particle,
        vx: Math.random() * MAX_VEL,
        vy: (Math.random() * MAX_VEL) - MAX_VEL / 2,
      });
    }
  }

  function update(dt: number): void {
    const g = GRAVITY * dt;
    for (let i = 0; i < bunnies.length; i++) {
      const b = bunnies[i];
      const p = b.particle;
      b.vy += g;
      let px = p.x + b.vx * dt;
      let py = p.y + b.vy * dt;
      if (px < minX || px > maxX) {
        px = Math.max(minX, Math.min(maxX, px));
        b.vx = -b.vx;
      }
      if (py < minY || py > maxY) {
        py = Math.max(minY, Math.min(maxY, py));
        b.vy = -b.vy * RESTITUTION;
      }
      p.x = px;
      p.y = py;
    }
    container.update();
  }

  // Drive physics from the shared ticker for normal viewing
  app.ticker.add((ticker) => {
    update(ticker.deltaMS / 1000);
  });

  /**
   * Synchronous, GPU-synced measurement — mirrors the vectorium harness exactly:
   * stop the ticker, drive N frames manually, force GPU completion with a
   * 1px readPixels after each render.
   */
  function measure(frames = 30): { count: number; frameMs: number; fps: number } {
    app.ticker.stop();
    const gl = (app.renderer as any).gl as WebGL2RenderingContext;
    const px = new Uint8Array(4);
    const dt = 1 / 60;

    const frame = () => {
      update(dt);
      app.renderer.render(app.stage);
      gl.readPixels(400, 30, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    };

    for (let f = 0; f < 5; f++) frame(); // warmup

    const t0 = performance.now();
    for (let f = 0; f < frames; f++) frame();
    const t1 = performance.now();
    app.ticker.start();

    const frameMs = (t1 - t0) / frames;
    return {
      count: bunnies.length,
      frameMs: +frameMs.toFixed(2),
      fps: +(1000 / frameMs).toFixed(1),
    };
  }

  function spawnTo(target: number): number {
    const need = target - bunnies.length;
    if (need > 0) spawn(need);
    return bunnies.length;
  }

  (window as any).__pixi = { app, spawnTo, measure, bunnies };
  console.log('🐰 PixiJS v8 bunnymark ready — __pixi.spawnTo(n), __pixi.measure()');
}

init();
