/**
 * PixiJS v8 GENERAL-PATH benchmark — the path pixi games actually use.
 *
 * NOT ParticleContainer: standard Container + Sprite scene graph, per-entity
 * position/rotation updated from a plain JS game loop — exactly how a real
 * pixi game moves its objects. Bunny texture (26×37), gravity-free drift +
 * wall bounce + continuous rotation, 800×600.
 *
 * Measurement: identical GPU-synced protocol (ticker stopped, manual frames,
 * 1px readPixels). window.__pixigen = { spawnTo, measure }.
 */

import { Application, Assets, Container, Sprite, Texture } from 'pixi.js';

const WIDTH = 800;
const HEIGHT = 600;

interface Bunny {
  sprite: Sprite;
  vx: number;
  vy: number;
  spin: number; // rad/s
}

async function init() {
  const app = new Application();
  await app.init({
    width: WIDTH,
    height: HEIGHT,
    background: 0x000000,
    preference: 'webgl',
    antialias: false,
    hello: false,
  });
  document.body.appendChild(app.canvas);

  const texture: Texture = await Assets.load('/bunny.png');
  const container = new Container();
  app.stage.addChild(container);

  const bunnies: Bunny[] = [];

  function spawnTo(target: number): number {
    while (bunnies.length < target) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = Math.random() * WIDTH;
      sprite.y = Math.random() * HEIGHT;
      container.addChild(sprite);
      bunnies.push({
        sprite,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        spin: (Math.random() - 0.5) * 6.28,
      });
    }
    return bunnies.length;
  }

  function update(dt: number): void {
    for (let i = 0; i < bunnies.length; i++) {
      const b = bunnies[i];
      const s = b.sprite;
      let x = s.x + b.vx * dt;
      let y = s.y + b.vy * dt;
      if (x < 0 || x > WIDTH) { b.vx = -b.vx; x = Math.max(0, Math.min(WIDTH, x)); }
      if (y < 0 || y > HEIGHT) { b.vy = -b.vy; y = Math.max(0, Math.min(HEIGHT, y)); }
      s.x = x;
      s.y = y;
      s.rotation += b.spin * dt;
    }
  }

  app.ticker.add((t) => update(t.deltaMS / 1000));

  function measure(frames = 20): { count: number; frameMs: number; fps: number } {
    app.ticker.stop();
    const gl = (app.renderer as any).gl as WebGL2RenderingContext;
    const px = new Uint8Array(4);
    const dt = 1 / 60;
    const frame = () => {
      update(dt);
      app.renderer.render(app.stage);
      gl.readPixels(400, 300, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    };
    for (let f = 0; f < 5; f++) frame();
    const t0 = performance.now();
    for (let f = 0; f < frames; f++) frame();
    const t1 = performance.now();
    app.ticker.start();
    const frameMs = (t1 - t0) / frames;
    return { count: bunnies.length, frameMs: +frameMs.toFixed(2), fps: +(1000 / frameMs).toFixed(1) };
  }

  (window as any).__pixigen = { app, spawnTo, measure };
  console.log('🐰 PixiJS general-path benchmark ready — __pixigen.spawnTo(n), __pixigen.measure()');
}

init();
