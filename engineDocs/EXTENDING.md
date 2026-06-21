# 🛠️ Extending Vectorium Engine

A guide for building your own games with the Vectorium engine.

---

## 📋 Table of Contents
1. [Creating a New Scene](#creating-a-new-scene)
2. [Building Custom Entities](#building-custom-entities)
3. [Adding Custom Particle Effects](#adding-custom-particle-effects)
4. [Texture Loading and Management](#texture-loading-and-management)
5. [Input Handling](#input-handling)
6. [Performance Optimization Tips](#performance-optimization-tips)
7. [Advanced Rendering Techniques](#advanced-rendering-techniques)

---

## 1. Creating a New Scene

### Basic Scene Template

```typescript
import { Scene, Entity } from '../vectorium/core/Engine';
import { WebGLBatchRenderer } from '../vectorium/rendering/WebGLBatchRenderer';

export class MyGameScene extends Scene {
  constructor() {
    super('my-game');
  }

  async load(): Promise<void> {
    // Initialize your game objects here
    const player = new Player(400, 300);
    this.addEntity(player);

    const enemy = new Enemy(600, 200);
    this.addEntity(enemy);
  }

  update(dt: number): void {
    super.update(dt);
    
    // Add scene-level logic here
    // e.g., collision detection, win conditions, etc.
  }

  render(renderer: WebGLBatchRenderer): void {
    super.render(renderer);
    
    // Add scene-level rendering here
    // e.g., background, UI overlays, etc.
  }

  destroy(): void {
    // Cleanup scene-specific resources
    super.destroy();
  }
}
```

### Loading Your Scene

```typescript
import { Vectorium } from './vectorium/core/Engine';
import { MyGameScene } from './scenes/MyGameScene';

const engine = new Vectorium({
  canvas: document.getElementById('game-canvas'),
  width: 800,
  height: 600,
  preferWebGL2: true,
  enableAdaptiveQuality: true,
  targetFPS: 60
});

const scene = new MyGameScene();
engine.registerScene('my-game', scene);
await engine.loadScene('my-game');
engine.start();
```

---

## 2. Building Custom Entities

### Entity Template

```typescript
import { Entity } from '../vectorium/core/Engine';
import { WebGLBatchRenderer } from '../vectorium/rendering/WebGLBatchRenderer';

export class Player implements Entity {
  x: number;
  y: number;
  private velocityX = 0;
  private velocityY = 0;
  private width = 32;
  private height = 32;
  private speed = 200; // pixels per second
  private color = { r: 0, g: 1, b: 0 }; // Green

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dt: number): void {
    // Update position
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;

    // Apply friction
    this.velocityX *= 0.9;
    this.velocityY *= 0.9;

    // Keep in bounds
    this.x = Math.max(0, Math.min(800 - this.width, this.x));
    this.y = Math.max(0, Math.min(600 - this.height, this.y));
  }

  render(renderer: WebGLBatchRenderer): void {
    renderer.drawRect(
      this.x,
      this.y,
      this.width,
      this.height,
      this.color,
      1.0 // alpha
    );
  }

  // Custom methods
  moveLeft(): void {
    this.velocityX = -this.speed;
  }

  moveRight(): void {
    this.velocityX = this.speed;
  }

  moveUp(): void {
    this.velocityY = -this.speed;
  }

  moveDown(): void {
    this.velocityY = this.speed;
  }

  destroy(): void {
    // Cleanup entity resources
  }
}
```

### Entity with Sprite Rendering

```typescript
import { Entity } from '../vectorium/core/Engine';
import { WebGLBatchRenderer } from '../vectorium/rendering/WebGLBatchRenderer';

export class Enemy implements Entity {
  x: number;
  y: number;
  private width = 48;
  private height = 48;
  private rotation = 0;
  private texture: WebGLTexture | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  async loadTexture(renderer: WebGLBatchRenderer): Promise<void> {
    const image = new Image();
    image.src = '/assets/enemy.png';
    await new Promise((resolve) => {
      image.onload = resolve;
    });
    this.texture = renderer.createTexture(image);
  }

  update(dt: number): void {
    // Rotate sprite
    this.rotation += dt * 2; // 2 radians per second

    // Move in circle
    this.x = 400 + Math.cos(this.rotation) * 200;
    this.y = 300 + Math.sin(this.rotation) * 200;
  }

  render(renderer: WebGLBatchRenderer): void {
    if (this.texture) {
      renderer.drawSprite(
        this.x,
        this.y,
        this.width,
        this.height,
        this.texture,
        this.rotation,
        1.0, // scale
        1.0  // alpha
      );
    }
  }

  destroy(): void {
    // Note: Textures are managed by WebGL context
    // No manual cleanup needed
  }
}
```

---

## 3. Adding Custom Particle Effects

### Explosion Effect

```typescript
import { ParticleSystem } from '../showcase/ParticleSystem';

export class ExplosionEffect {
  private particleSystem: ParticleSystem;

  constructor(particleSystem: ParticleSystem) {
    this.particleSystem = particleSystem;
  }

  explode(x: number, y: number): void {
    this.particleSystem.emit({
      x,
      y,
      count: 200,
      life: 2.0,
      speed: 300,
      size: 6,
      color: { r: 1, g: 0.5, b: 0 }, // Orange
      spread: Math.PI * 2 // 360 degrees
    });
  }
}
```

### Trail Effect

```typescript
export class TrailEffect {
  private particleSystem: ParticleSystem;
  private lastEmit = 0;

  constructor(particleSystem: ParticleSystem) {
    this.particleSystem = particleSystem;
  }

  update(x: number, y: number, dt: number): void {
    this.lastEmit += dt;
    
    // Emit every 50ms
    if (this.lastEmit > 0.05) {
      this.particleSystem.emit({
        x,
        y,
        count: 5,
        life: 0.5,
        speed: 50,
        size: 4,
        color: { r: 0.5, g: 0.5, b: 1 }, // Light blue
        spread: Math.PI * 0.5 // 90 degrees
      });
      this.lastEmit = 0;
    }
  }
}
```

---

## 4. Texture Loading and Management

### Texture Atlas (Sprite Sheet)

```typescript
export class TextureAtlas {
  private texture: WebGLTexture;
  private sprites = new Map<string, {
    x: number;
    y: number;
    width: number;
    height: number;
  }>();

  constructor(texture: WebGLTexture) {
    this.texture = texture;
  }

  defineSprite(
    name: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    this.sprites.set(name, { x, y, width, height });
  }

  getSprite(name: string) {
    return this.sprites.get(name);
  }

  getTexture(): WebGLTexture {
    return this.texture;
  }
}
```

### Async Texture Loader

```typescript
export class TextureLoader {
  private cache = new Map<string, WebGLTexture>();
  private renderer: WebGLBatchRenderer;

  constructor(renderer: WebGLBatchRenderer) {
    this.renderer = renderer;
  }

  async load(path: string): Promise<WebGLTexture> {
    // Check cache
    if (this.cache.has(path)) {
      return this.cache.get(path)!;
    }

    // Load image
    const image = new Image();
    image.src = path;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    // Create texture
    const texture = this.renderer.createTexture(image);
    this.cache.set(path, texture);

    return texture;
  }

  async loadMultiple(paths: string[]): Promise<WebGLTexture[]> {
    return Promise.all(paths.map(path => this.load(path)));
  }

  get(path: string): WebGLTexture | undefined {
    return this.cache.get(path);
  }
}
```

---

## 5. Input Handling

### Keyboard Input Manager

```typescript
export class KeyboardInput {
  private keys = new Map<string, boolean>();

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.set(e.key, true);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.set(e.key, false);
  };

  isPressed(key: string): boolean {
    return this.keys.get(key) || false;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}

// Usage in Scene
export class GameScene extends Scene {
  private keyboard = new KeyboardInput();
  private player: Player;

  update(dt: number): void {
    super.update(dt);

    if (this.keyboard.isPressed('ArrowLeft')) {
      this.player.moveLeft();
    }
    if (this.keyboard.isPressed('ArrowRight')) {
      this.player.moveRight();
    }
    if (this.keyboard.isPressed(' ')) {
      this.player.shoot();
    }
  }

  destroy(): void {
    this.keyboard.destroy();
    super.destroy();
  }
}
```

### Touch/Mouse Input

```typescript
export class PointerInput {
  x = 0;
  y = 0;
  isDown = false;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    canvas.addEventListener('mousedown', this.handleDown);
    canvas.addEventListener('mouseup', this.handleUp);
    canvas.addEventListener('mousemove', this.handleMove);
    canvas.addEventListener('touchstart', this.handleTouchStart);
    canvas.addEventListener('touchend', this.handleTouchEnd);
    canvas.addEventListener('touchmove', this.handleTouchMove);
  }

  private handleDown = (): void => {
    this.isDown = true;
  };

  private handleUp = (): void => {
    this.isDown = false;
  };

  private handleMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.x = e.clientX - rect.left;
    this.y = e.clientY - rect.top;
  };

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    this.isDown = true;
    this.updateTouchPosition(e.touches[0]);
  };

  private handleTouchEnd = (): void => {
    this.isDown = false;
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    this.updateTouchPosition(e.touches[0]);
  };

  private updateTouchPosition(touch: Touch): void {
    const rect = this.canvas.getBoundingClientRect();
    this.x = touch.clientX - rect.left;
    this.y = touch.clientY - rect.top;
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleDown);
    this.canvas.removeEventListener('mouseup', this.handleUp);
    this.canvas.removeEventListener('mousemove', this.handleMove);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
  }
}
```

---

## 6. Performance Optimization Tips

### 1. Object Pooling for Bullets

```typescript
import { ObjectPool } from '../vectorium/memory/Pooling';

class Bullet implements Entity {
  x = 0;
  y = 0;
  velocityX = 0;
  velocityY = 0;
  active = false;

  activate(x: number, y: number, angle: number, speed: number): void {
    this.x = x;
    this.y = y;
    this.velocityX = Math.cos(angle) * speed;
    this.velocityY = Math.sin(angle) * speed;
    this.active = true;
  }

  update(dt: number): void {
    if (!this.active) return;
    
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;

    // Deactivate if off-screen
    if (this.x < 0 || this.x > 800 || this.y < 0 || this.y > 600) {
      this.active = false;
    }
  }

  render(renderer: WebGLBatchRenderer): void {
    if (!this.active) return;
    renderer.drawRect(this.x, this.y, 4, 4, { r: 1, g: 1, b: 0 }, 1);
  }

  destroy(): void {
    this.active = false;
  }
}

export class BulletManager {
  private pool = new ObjectPool<Bullet>(() => new Bullet(), 100);
  private bullets: Bullet[] = [];

  spawn(x: number, y: number, angle: number, speed: number): void {
    const bullet = this.pool.acquire();
    bullet.activate(x, y, angle, speed);
    this.bullets.push(bullet);
  }

  update(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.update(dt);
      
      if (!bullet.active) {
        this.bullets.splice(i, 1);
        this.pool.release(bullet);
      }
    }
  }

  render(renderer: WebGLBatchRenderer): void {
    for (const bullet of this.bullets) {
      bullet.render(renderer);
    }
  }
}
```

### 2. Spatial Partitioning for Collision

```typescript
export class SpatialGrid {
  private cellSize: number;
  private grid = new Map<string, Entity[]>();

  constructor(cellSize: number = 50) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.grid.clear();
  }

  insert(entity: Entity, width: number, height: number): void {
    const minX = Math.floor(entity.x / this.cellSize);
    const minY = Math.floor(entity.y / this.cellSize);
    const maxX = Math.floor((entity.x + width) / this.cellSize);
    const maxY = Math.floor((entity.y + height) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(entity);
      }
    }
  }

  getNearby(entity: Entity, width: number, height: number): Entity[] {
    const nearby = new Set<Entity>();
    const minX = Math.floor(entity.x / this.cellSize);
    const minY = Math.floor(entity.y / this.cellSize);
    const maxX = Math.floor((entity.x + width) / this.cellSize);
    const maxY = Math.floor((entity.y + height) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        const entities = this.grid.get(key);
        if (entities) {
          entities.forEach(e => nearby.add(e));
        }
      }
    }

    return Array.from(nearby);
  }
}
```

### 3. Frustum Culling

```typescript
export function isInView(
  entityX: number,
  entityY: number,
  entityWidth: number,
  entityHeight: number,
  viewWidth: number,
  viewHeight: number,
  margin: number = 50
): boolean {
  return (
    entityX + entityWidth >= -margin &&
    entityX <= viewWidth + margin &&
    entityY + entityHeight >= -margin &&
    entityY <= viewHeight + margin
  );
}

// Usage in Entity
render(renderer: WebGLBatchRenderer): void {
  if (!isInView(this.x, this.y, this.width, this.height, 800, 600)) {
    return; // Skip rendering off-screen entities
  }
  
  renderer.drawRect(this.x, this.y, this.width, this.height, this.color, 1);
}
```

---

## 7. Advanced Rendering Techniques

### Custom Shader (Advanced)

```typescript
// Modify WebGLBatchRenderer to support custom shaders
export interface CustomShader {
  vertexSource: string;
  fragmentSource: string;
}

// Wavy effect shader
const wavyShader: CustomShader = {
  vertexSource: `
    attribute vec2 a_position;
    attribute vec2 a_texcoord;
    attribute vec4 a_color;
    
    uniform mat4 u_projection;
    uniform float u_time;
    
    varying vec2 v_texcoord;
    varying vec4 v_color;
    
    void main() {
      vec2 pos = a_position;
      pos.y += sin(a_position.x * 0.1 + u_time) * 10.0;
      
      gl_Position = u_projection * vec4(pos, 0.0, 1.0);
      v_texcoord = a_texcoord;
      v_color = a_color;
    }
  `,
  fragmentSource: `
    precision mediump float;
    
    uniform sampler2D u_texture;
    varying vec2 v_texcoord;
    varying vec4 v_color;
    
    void main() {
      gl_FragColor = texture2D(u_texture, v_texcoord) * v_color;
    }
  `
};
```

### Post-Processing Effect

```typescript
export class PostProcessor {
  private framebuffer: WebGLFramebuffer;
  private texture: WebGLTexture;
  private gl: WebGLRenderingContext;

  constructor(gl: WebGLRenderingContext, width: number, height: number) {
    this.gl = gl;
    
    // Create framebuffer
    this.framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

    // Create texture for framebuffer
    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Attach texture to framebuffer
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture,
      0
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  begin(): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
  }

  end(): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  applyBloom(): void {
    // Apply bloom shader to this.texture
    // Render full-screen quad with bloom effect
  }
}
```

---

## 🎯 Example: Complete Game

### Space Shooter Example

```typescript
import { Scene, Entity, Vectorium } from '../vectorium/core/Engine';
import { WebGLBatchRenderer } from '../vectorium/rendering/WebGLBatchRenderer';
import { ParticleSystem } from '../showcase/ParticleSystem';
import { KeyboardInput } from '../input/KeyboardInput';
import { BulletManager } from '../entities/BulletManager';

class SpaceShooterScene extends Scene {
  private keyboard = new KeyboardInput();
  private player: Player;
  private enemies: Enemy[] = [];
  private bulletManager = new BulletManager();
  private particleSystem: ParticleSystem;
  private score = 0;

  constructor() {
    super('space-shooter');
  }

  async load(): Promise<void> {
    // Initialize player
    this.player = new Player(400, 500);
    this.addEntity(this.player);

    // Initialize particle system
    this.particleSystem = new ParticleSystem(5000);

    // Spawn enemies
    for (let i = 0; i < 5; i++) {
      const enemy = new Enemy(100 + i * 150, 100);
      this.enemies.push(enemy);
      this.addEntity(enemy);
    }
  }

  update(dt: number): void {
    super.update(dt);

    // Player input
    if (this.keyboard.isPressed('ArrowLeft')) {
      this.player.moveLeft();
    }
    if (this.keyboard.isPressed('ArrowRight')) {
      this.player.moveRight();
    }
    if (this.keyboard.isPressed(' ')) {
      this.player.shoot(this.bulletManager);
    }

    // Update systems
    this.bulletManager.update(dt);
    this.particleSystem.update(dt);

    // Collision detection
    this.checkCollisions();
  }

  render(renderer: WebGLBatchRenderer): void {
    super.render(renderer);
    this.bulletManager.render(renderer);
    this.particleSystem.render(renderer);
  }

  private checkCollisions(): void {
    // Check bullet-enemy collisions
    for (const enemy of this.enemies) {
      // Collision logic here
    }
  }

  destroy(): void {
    this.keyboard.destroy();
    super.destroy();
  }
}

// Start the game
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const engine = new Vectorium({
  canvas,
  width: 800,
  height: 600,
  preferWebGL2: true,
  enableAdaptiveQuality: true,
  targetFPS: 60
});

const scene = new SpaceShooterScene();
engine.registerScene('space-shooter', scene);
await engine.loadScene('space-shooter');
engine.start();
```

---

## 📚 Additional Resources

### Recommended Reading
- **WebGL Programming Guide** by Kouichi Matsuda
- **Game Engine Architecture** by Jason Gregory
- **Real-Time Rendering** by Tomas Akenine-Möller

### Online Resources
- [MDN WebGL Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial)
- [WebGL2 Fundamentals](https://webgl2fundamentals.org/)
- [Game Programming Patterns](https://gameprogrammingpatterns.com/)

---

**Happy Game Development with Vectorium! 🎮**
