# 🚀 Vectorium Engine - Quick Reference

## Core API Cheat Sheet

### Engine Initialization
```typescript
import { Vectorium } from './vectorium/core/Engine';

const engine = new Vectorium({
  canvas: HTMLCanvasElement,
  width: number,              // Default: 800
  height: number,             // Default: 600
  preferWebGL2: boolean,      // Default: true
  enableAdaptiveQuality: boolean,  // Default: true
  targetFPS: number,          // Default: 60
  debugMode: boolean          // Default: false
});
```

### Scene Management
```typescript
// Create scene
class MyScene extends Scene {
  constructor() {
    super('scene-name');
  }
  
  async load(): Promise<void> {
    // Initialize entities
  }
  
  update(dt: number): void {
    super.update(dt);
    // Scene logic
  }
  
  render(renderer: WebGLBatchRenderer): void {
    super.render(renderer);
    // Custom rendering
  }
}

// Register and load
engine.registerScene('name', scene);
await engine.loadScene('name');
engine.start();
```

### Entity Creation
```typescript
class MyEntity implements Entity {
  x: number;
  y: number;
  
  update(dt: number): void {
    // Update logic (dt in seconds)
  }
  
  render(renderer: WebGLBatchRenderer): void {
    // Draw sprite or rectangle
  }
  
  destroy(): void {
    // Cleanup
  }
}
```

## Rendering API

### Draw Rectangle
```typescript
renderer.drawRect(
  x: number,
  y: number,
  width: number,
  height: number,
  color: { r: number, g: number, b: number },  // 0-1 range
  alpha: number  // 0-1 range
);
```

### Draw Sprite
```typescript
renderer.drawSprite(
  x: number,
  y: number,
  width: number,
  height: number,
  texture: WebGLTexture,
  rotation: number,  // Radians
  scale: number,     // 1.0 = normal
  alpha: number      // 0-1 range
);
```

### Create Texture
```typescript
const texture = renderer.createTexture(
  image: HTMLImageElement | ImageBitmap
);
```

## Object Pooling

### Create Pool
```typescript
import { ObjectPool } from './vectorium/memory/Pooling';

const pool = new ObjectPool<MyClass>(
  () => new MyClass(),  // Factory function
  100                   // Initial size
);
```

### Use Pool
```typescript
// Acquire object
const obj = pool.acquire();

// Use object
obj.doSomething();

// Release back to pool
pool.release(obj);

// Get stats
const stats = pool.getStats();
// { available, inUse, total }
```

## Particle System

### Create System
```typescript
import { ParticleSystem } from './showcase/ParticleSystem';

const particles = new ParticleSystem(5000);  // Max particles
```

### Emit Particles
```typescript
particles.emit({
  x: number,
  y: number,
  count: number,
  life: number,      // Seconds
  speed: number,     // Pixels per second
  size: number,      // Particle size
  color: { r, g, b },
  spread: number     // Radians (Math.PI * 2 = 360°)
});
```

### Update and Render
```typescript
// In Scene
update(dt: number): void {
  particles.update(dt);
}

render(renderer: WebGLBatchRenderer): void {
  particles.render(renderer);
}
```

## Performance Monitoring

### Get Metrics
```typescript
const metrics = engine.getMetrics();

metrics.fps           // Current FPS
metrics.frameTime     // Frame time (ms)
metrics.drawCalls     // Draw calls per frame
metrics.memory        // Memory usage (MB)
metrics.quality       // Current quality level
```

### Quality Levels
```typescript
type QualityLevel = 
  | 'ultra'   // 1.0x scale, 5000 particles
  | 'high'    // 1.0x scale, 2000 particles
  | 'medium'  // 0.8x scale, 1000 particles
  | 'low'     // 0.6x scale, 500 particles
  | 'potato'; // 0.5x scale, 100 particles
```

## Input Handling

### Keyboard
```typescript
class MyScene extends Scene {
  private keys = new Set<string>();
  
  constructor() {
    super('my-scene');
    window.addEventListener('keydown', e => this.keys.add(e.key));
    window.addEventListener('keyup', e => this.keys.delete(e.key));
  }
  
  update(dt: number): void {
    if (this.keys.has('ArrowLeft')) {
      // Move left
    }
  }
}
```

### Mouse
```typescript
class MyScene extends Scene {
  private mouseX = 0;
  private mouseY = 0;
  private mouseDown = false;
  
  constructor() {
    super('my-scene');
    window.addEventListener('mousemove', e => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    window.addEventListener('mousedown', () => {
      this.mouseDown = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
  }
}
```

## Math Utilities

### Angles
```typescript
const radians = degrees * (Math.PI / 180);
const degrees = radians * (180 / Math.PI);
```

### Distance
```typescript
const dx = x2 - x1;
const dy = y2 - y1;
const distance = Math.sqrt(dx * dx + dy * dy);
```

### Direction
```typescript
const angle = Math.atan2(dy, dx);
const vx = Math.cos(angle) * speed;
const vy = Math.sin(angle) * speed;
```

### Collision (AABB)
```typescript
function collides(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean {
  return x1 < x2 + w2 &&
         x1 + w1 > x2 &&
         y1 < y2 + h2 &&
         y1 + h1 > y2;
}
```

## Color Utilities

### RGB to HSL
```typescript
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  // r, g, b in 0-1 range
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  if (max === min) return [0, 0, l];
  
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  
  return [h, s, l];
}
```

### HSL to RGB
```typescript
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  // h in 0-1 range (360° = 1.0)
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  if (s === 0) return [l, l, l];
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  
  return [
    hue2rgb(p, q, h + 1/3),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1/3)
  ];
}
```

## Common Patterns

### Update with Delta Time
```typescript
// Position
this.x += this.velocityX * dt;
this.y += this.velocityY * dt;

// Rotation
this.rotation += this.rotationSpeed * dt;

// Timer
this.timer -= dt;
if (this.timer <= 0) {
  // Do something
}
```

### Keep in Bounds
```typescript
// Clamp position
this.x = Math.max(0, Math.min(maxX, this.x));
this.y = Math.max(0, Math.min(maxY, this.y));

// Bounce on edges
if (this.x < 0 || this.x > maxX) {
  this.velocityX *= -1;
}
if (this.y < 0 || this.y > maxY) {
  this.velocityY *= -1;
}

// Wrap around
if (this.x < 0) this.x = maxX;
if (this.x > maxX) this.x = 0;
```

### Interpolation (Lerp)
```typescript
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Smooth movement
this.x = lerp(this.x, targetX, 0.1);
```

## Performance Tips

### ✅ DO
- Use object pooling for frequently created objects
- Batch rendering by texture
- Pre-allocate arrays with known size
- Use TypedArrays for large datasets
- Check if entity is in view before rendering
- Keep update logic simple and fast

### ❌ DON'T
- Create objects in update loop
- Use `new` in hot paths
- Search entire entity list every frame
- Do complex calculations unnecessarily
- Allocate large arrays dynamically
- Ignore adaptive quality warnings

## Debugging

### Enable Debug Mode
```typescript
const engine = new Vectorium({
  debugMode: true  // Shows debug overlay
});
```

### Console Logging
```typescript
// In Engine.ts, renderDebugInfo() logs to console
// Open browser DevTools (F12) to see:
// - FPS
// - Draw calls
// - Memory usage
```

### Performance Profiling
```typescript
console.time('update');
// ... code to measure ...
console.timeEnd('update');
```

## Quick Start Template

```typescript
import { Vectorium, Scene, Entity } from './vectorium/core/Engine';
import { WebGLBatchRenderer } from './vectorium/rendering/WebGLBatchRenderer';

class MyEntity implements Entity {
  x = 400;
  y = 300;
  
  update(dt: number): void {
    // Your logic
  }
  
  render(renderer: WebGLBatchRenderer): void {
    renderer.drawRect(this.x, this.y, 50, 50, { r: 1, g: 0, b: 0 }, 1);
  }
  
  destroy(): void {}
}

class MyScene extends Scene {
  constructor() {
    super('my-scene');
  }
  
  async load(): Promise<void> {
    this.addEntity(new MyEntity());
  }
}

const engine = new Vectorium({
  canvas: document.createElement('canvas'),
  width: 800,
  height: 600
});

document.body.appendChild(engine.canvas);

const scene = new MyScene();
engine.registerScene('my-scene', scene);
await engine.loadScene('my-scene');
engine.start();
```

---

**For more details, see:**
- `README.md` - Full documentation
- `docs/EXTENDING.md` - Advanced examples
- `docs/BUILD_SUMMARY.md` - Architecture details

**Vectorium Engine - Built for Performance** 🚀
