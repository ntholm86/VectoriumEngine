/**
 * Phaser 3 GENERAL-PATH benchmark — the path Phaser games actually use.
 *
 * Standard Scene + GameObjects.Image, per-entity position/rotation updated
 * in the scene's update loop — idiomatic Phaser. Bunny texture, drift +
 * wall bounce + continuous rotation, 800×600, WebGL renderer.
 *
 * Measurement: GPU-synced protocol (game loop stopped, manual step +
 * renderer.snapshot-free 1px readPixels). window.__phaser = { spawnTo, measure }.
 */

import Phaser from 'phaser';

const WIDTH = 800;
const HEIGHT = 600;

interface Bunny {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  spin: number;
}

class BenchScene extends Phaser.Scene {
  public bunnies: Bunny[] = [];

  preload() {
    this.load.image('bunny', '/bunny.png');
  }

  spawnTo(target: number): number {
    while (this.bunnies.length < target) {
      const img = this.add.image(Math.random() * WIDTH, Math.random() * HEIGHT, 'bunny');
      this.bunnies.push({
        img,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        spin: (Math.random() - 0.5) * 6.28,
      });
    }
    return this.bunnies.length;
  }

  step(dt: number): void {
    const bunnies = this.bunnies;
    for (let i = 0; i < bunnies.length; i++) {
      const b = bunnies[i];
      const img = b.img;
      let x = img.x + b.vx * dt;
      let y = img.y + b.vy * dt;
      if (x < 0 || x > WIDTH) { b.vx = -b.vx; x = Math.max(0, Math.min(WIDTH, x)); }
      if (y < 0 || y > HEIGHT) { b.vy = -b.vy; y = Math.max(0, Math.min(HEIGHT, y)); }
      img.x = x;
      img.y = y;
      img.rotation += b.spin * dt;
    }
  }

  update(_time: number, deltaMs: number): void {
    this.step(deltaMs / 1000);
  }
}

const scene = new BenchScene('bench');

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#000000',
  scene,
  audio: { noAudio: true },
  banner: false,
});

function measure(frames = 20): { count: number; frameMs: number; fps: number } {
  game.loop.sleep(); // stop RAF loop
  const renderer = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  const gl = renderer.gl;
  const px = new Uint8Array(4);
  const dt = 1 / 60;

  const frame = () => {
    scene.step(dt);
    renderer.preRender();
    scene.sys.render(renderer as any);
    renderer.postRender();
    gl.readPixels(400, 300, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };

  for (let f = 0; f < 5; f++) frame();
  const t0 = performance.now();
  for (let f = 0; f < frames; f++) frame();
  const t1 = performance.now();
  game.loop.wake();

  const frameMs = (t1 - t0) / frames;
  return { count: scene.bunnies.length, frameMs: +frameMs.toFixed(2), fps: +(1000 / frameMs).toFixed(1) };
}

(window as any).__phaser = {
  game,
  scene,
  spawnTo: (n: number) => scene.spawnTo(n),
  measure,
};
console.log('🎮 Phaser general-path benchmark ready — __phaser.spawnTo(n), __phaser.measure()');
