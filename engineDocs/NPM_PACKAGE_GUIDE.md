# 📦 Using Vectorium as an NPM Package

## Installation

### Local Installation (for now)
Since Vectorium isn't published to npm yet, you can use it locally:

#### Option 1: npm link (Recommended for Development)
```bash
# In the Vectorium engine directory (C:\git\Game12)
npm run build
npm link

# In your game project directory
npm link vectorium-engine
```

#### Option 2: Direct File Path
```bash
# In your game project directory
npm install ../path/to/Game12
```

#### Option 3: Publish to npm (Future)
Once published:
```bash
npm install vectorium-engine
```

---

## Quick Start

### 1. Basic Setup

```typescript
import { Vectorium, Scene } from 'vectorium-engine';
import type { Entity } from 'vectorium-engine';

// Create your game scene
class MyGameScene extends Scene {
  constructor() {
    super('my-game');
  }

  async load(): Promise<void> {
    // Load assets, create entities
    console.log('Scene loaded!');
  }

  update(dt: number): void {
    super.update(dt);
    // Your game logic here
  }
}

// Initialize engine
const canvas = document.getElementById('game') as HTMLCanvasElement;
const engine = new Vectorium({
  canvas,
  width: 800,
  height: 600,
  preferWebGL2: true,
  enableAdaptiveQuality: true,
  targetFPS: 60
});

// Load and start
const scene = new MyGameScene();
engine.registerScene('game', scene);
await engine.loadScene('game');
engine.start();
```

---

## Complete Example

### Your Project Structure
```
my-game/
├── src/
│   ├── main.ts
│   ├── scenes/
│   │   └── GameScene.ts
│   └── entities/
│       ├── Player.ts
│       └── Enemy.ts
├── index.html
├── package.json
└── tsconfig.json
```

### main.ts
```typescript
import { Vectorium } from 'vectorium-engine';
import { GameScene } from './scenes/GameScene';

const canvas = document.getElementById('game') as HTMLCanvasElement;

const engine = new Vectorium({
  canvas,
  width: 800,
  height: 600,
  preferWebGL2: true,
  enableAdaptiveQuality: true,
  targetFPS: 60,
  debugMode: true
});

const gameScene = new GameScene();
engine.registerScene('game', gameScene);

async function start() {
  await engine.loadScene('game');
  engine.start();
}

start().catch(console.error);
```

### scenes/GameScene.ts
```typescript
import { Scene } from 'vectorium-engine';
import type { Entity } from 'vectorium-engine';
import { WebGLBatchRenderer } from 'vectorium-engine';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

export class GameScene extends Scene {
  private player: Player;
  private enemies: Enemy[] = [];

  constructor() {
    super('game');
  }

  async load(): Promise<void> {
    // Create player
    this.player = new Player(400, 300);
    this.addEntity(this.player);

    // Create enemies
    for (let i = 0; i < 5; i++) {
      const enemy = new Enemy(100 + i * 150, 100);
      this.enemies.push(enemy);
      this.addEntity(enemy);
    }
  }

  update(dt: number): void {
    super.update(dt);
    
    // Game logic
    this.checkCollisions();
  }

  private checkCollisions(): void {
    // Collision detection logic
  }
}
```

### entities/Player.ts
```typescript
import type { Entity } from 'vectorium-engine';
import { WebGLBatchRenderer } from 'vectorium-engine';

export class Player implements Entity {
  x: number;
  y: number;
  private width = 32;
  private height = 32;
  private velocityX = 0;
  private velocityY = 0;
  private speed = 300;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    
    // Setup keyboard controls
    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      switch(e.key) {
        case 'ArrowLeft': this.velocityX = -this.speed; break;
        case 'ArrowRight': this.velocityX = this.speed; break;
        case 'ArrowUp': this.velocityY = -this.speed; break;
        case 'ArrowDown': this.velocityY = this.speed; break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch(e.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
          this.velocityX = 0;
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          this.velocityY = 0;
          break;
      }
    });
  }

  update(dt: number): void {
    // Update position
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;

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
      { r: 0, g: 1, b: 0 },
      1.0
    );
  }

  destroy(): void {
    // Cleanup
  }
}
```

### entities/Enemy.ts
```typescript
import type { Entity } from 'vectorium-engine';
import { WebGLBatchRenderer } from 'vectorium-engine';

export class Enemy implements Entity {
  x: number;
  y: number;
  private width = 40;
  private height = 40;
  private velocityX = 100;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dt: number): void {
    // Move back and forth
    this.x += this.velocityX * dt;

    if (this.x < 0 || this.x > 800 - this.width) {
      this.velocityX *= -1;
    }
  }

  render(renderer: WebGLBatchRenderer): void {
    renderer.drawRect(
      this.x,
      this.y,
      this.width,
      this.height,
      { r: 1, g: 0, b: 0 },
      1.0
    );
  }

  destroy(): void {
    // Cleanup
  }
}
```

### index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Vectorium Game</title>
  <style>
    body {
      margin: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #1a1a2e;
    }
    canvas {
      border: 2px solid #00ff00;
    }
  </style>
</head>
<body>
  <canvas id="game" width="800" height="600"></canvas>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### package.json
```json
{
  "name": "my-vectorium-game",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "vectorium-engine": "file:../Game12"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

---

## Available APIs

### Core Engine
```typescript
import { Vectorium, Scene } from 'vectorium-engine';
import type { Entity, EngineConfig } from 'vectorium-engine';
```

### Rendering
```typescript
import { WebGLBatchRenderer } from 'vectorium-engine';
import type { Sprite } from 'vectorium-engine';
```

### Memory Management
```typescript
import { ObjectPool, BufferPool, bufferPool } from 'vectorium-engine';
```

### Performance
```typescript
import { PerformanceMonitor } from 'vectorium-engine';
import type { QualityLevel, PerformanceMetrics } from 'vectorium-engine';
```

### Feature Detection
```typescript
import { FeatureDetector } from 'vectorium-engine';
import type { BrowserCapabilities } from 'vectorium-engine';
```

---

## Advanced Usage

### Using Object Pooling
```typescript
import { ObjectPool } from 'vectorium-engine';

class Bullet implements Entity {
  x = 0;
  y = 0;
  active = false;

  activate(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.active = true;
  }

  // ... other Entity methods
}

const bulletPool = new ObjectPool<Bullet>(
  () => new Bullet(),
  (bullet) => { bullet.active = false; },
  100
);

// Use bullets
const bullet = bulletPool.acquire();
bullet.activate(100, 200);

// Return to pool when done
bulletPool.release(bullet);
```

### Using Performance Monitor
```typescript
import { PerformanceMonitor } from 'vectorium-engine';

const perfMonitor = new PerformanceMonitor(60, 'high');
perfMonitor.setAdaptiveQuality(true);

// In game loop
perfMonitor.beginFrame();
// ... render ...
perfMonitor.endFrame();

const metrics = perfMonitor.getMetrics();
console.log(`FPS: ${metrics.fps}`);
```

### Using Feature Detection
```typescript
import { FeatureDetector } from 'vectorium-engine';

const detector = new FeatureDetector();
const capabilities = detector.capabilities;

if (capabilities.hasWebGL2) {
  console.log('WebGL2 supported!');
}

const config = detector.getOptimalConfig();
console.log('Optimal quality:', config.initialQuality);
```

---

## Build Your Package

If you want to modify Vectorium and rebuild:

```bash
# In the Vectorium directory
npm run build

# This creates:
# - dist/vectorium.js (bundled module)
# - dist/index.d.ts (TypeScript definitions)
```

---

## Publishing (Future)

When ready to publish to npm:

```bash
# Update version in package.json
npm version patch  # or minor, major

# Publish
npm publish
```

---

## TypeScript Support

Vectorium is fully typed! Your IDE will provide:
- ✅ Full IntelliSense
- ✅ Type checking
- ✅ Auto-completion
- ✅ Documentation hints

---

## Tree Shaking

Vectorium uses ES modules, so unused code will be tree-shaken in your build:

```typescript
// Only imports what you use
import { Vectorium, Scene } from 'vectorium-engine';
// PerformanceMonitor, ObjectPool, etc. won't be included if unused
```

---

## Next Steps

1. **Install Vectorium** using `npm link` or file path
2. **Create your game** following the examples above
3. **Run development server** with `npm run dev`
4. **Build for production** with `npm run build`

For complete API documentation, see:
- `README.md` - Engine overview
- `QUICK_REFERENCE.md` - API cheat sheet
- `docs/EXTENDING.md` - Advanced patterns

---

**Happy Game Development! 🎮**
