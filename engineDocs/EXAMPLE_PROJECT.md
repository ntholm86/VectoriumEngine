# 🎮 Vectorium Engine - NPM Package Example

This example shows how to use Vectorium as an npm package in your own game project.

## Project Structure

```
my-game/
├── src/
│   ├── main.ts           # Entry point
│   ├── scenes/
│   │   └── GameScene.ts  # Game scene
│   └── entities/
│       ├── Player.ts     # Player entity
│       └── Enemy.ts      # Enemy entity
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts (optional)
```

## Installation

### 1. Create Your Project
```bash
mkdir my-game
cd my-game
npm init -y
```

### 2. Install Dependencies
```bash
npm install typescript vite --save-dev
```

### 3. Link Vectorium Engine
```bash
# In the Vectorium engine directory (C:\git\Game12)
npm run build
npm link

# Back in your game directory
npm link vectorium-engine
```

Or install directly:
```bash
npm install ../path/to/Game12
```

## Quick Setup

### package.json
```json
{
  "name": "my-game",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "vectorium-engine": "^1.0.0"
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
  </style>
</head>
<body>
  <canvas id="game" width="800" height="600"></canvas>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### src/main.ts
```typescript
import { Vectorium, Scene, WebGLBatchRenderer } from 'vectorium-engine';
import type { Entity } from 'vectorium-engine';

// Simple player entity
class Player implements Entity {
  x: number;
  y: number;
  private vx = 0;
  private vy = 0;
  private speed = 300;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.vx = -this.speed;
      if (e.key === 'ArrowRight') this.vx = this.speed;
      if (e.key === 'ArrowUp') this.vy = -this.speed;
      if (e.key === 'ArrowDown') this.vy = this.speed;
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.vx = 0;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') this.vy = 0;
    });
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = Math.max(0, Math.min(768, this.x));
    this.y = Math.max(0, Math.min(568, this.y));
  }

  render(renderer: WebGLBatchRenderer): void {
    renderer.drawRect(this.x, this.y, 32, 32, { r: 0, g: 1, b: 0 }, 1);
  }

  destroy(): void {}
}

// Game scene
class GameScene extends Scene {
  constructor() {
    super('game');
  }

  async load(): Promise<void> {
    const player = new Player(400, 300);
    this.addEntity(player);
  }
}

// Initialize engine
const canvas = document.getElementById('game') as HTMLCanvasElement;
const engine = new Vectorium({
  canvas,
  width: 800,
  height: 600,
  preferWebGL2: true,
  targetFPS: 60
});

// Start game
const scene = new GameScene();
engine.registerScene('game', scene);
await engine.loadScene('game');
engine.start();

console.log('Game started! Use arrow keys to move.');
```

## Run Your Game

```bash
npm run dev
```

Open `http://localhost:5173` and use arrow keys to move!

## Next Steps

1. **Add more entities** (enemies, bullets, power-ups)
2. **Create multiple scenes** (menu, gameplay, game over)
3. **Add collision detection**
4. **Load textures** for sprites
5. **Add particle effects**
6. **Implement scoring system**

See `NPM_PACKAGE_GUIDE.md` for complete examples!

---

**Happy coding! 🚀**
