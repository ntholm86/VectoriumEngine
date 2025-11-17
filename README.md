# 🎮 Vectorium Engine

A high-performance, production-grade WebGL game engine built with TypeScript, featuring adaptive quality, object pooling, and batch rendering.

## 📦 Installation

### As an NPM Package
```bash
# Local installation (for now)
npm link vectorium-engine

# Or direct file path
npm install ../path/to/vectorium-engine
```

See [NPM_PACKAGE_GUIDE.md](NPM_PACKAGE_GUIDE.md) for complete usage instructions.

### Quick Start
```typescript
import { Vectorium, Scene } from 'vectorium-engine';

const engine = new Vectorium({
  canvas: document.getElementById('game'),
  width: 800,
  height: 600
});

class GameScene extends Scene {
  async load() {
    // Your game logic
  }
}

const scene = new GameScene();
engine.registerScene('game', scene);
await engine.loadScene('game');
engine.start();
```

## ✨ Features

### 🚀 **Performance First**
- **WebGL2/WebGL Batch Rendering**: Render 10,000+ sprites in a single draw call
- **Object Pooling**: Zero-allocation hot paths for particle systems
- **Adaptive Quality System**: Automatically adjusts graphics quality to maintain 60 FPS
- **TypedArray Pooling**: Reusable buffer management for zero GC pressure
- **Performance Monitoring**: Real-time FPS tracking with 60-sample rolling average

### 🎨 **Rendering**
- **WebGL2 Support**: Automatic fallback to WebGL 1.0
- **Batch Rendering**: Minimizes draw calls for optimal performance
- **Texture Management**: Efficient texture loading and caching
- **Sprite Rendering**: Full support for rotation, scaling, and alpha blending
- **Primitive Shapes**: Optimized rectangle rendering with color support

### 🧠 **Smart Detection**
- **Feature Detection**: Automatic detection of WebGL2, ImageBitmap, OffscreenCanvas
- **Browser Quirks**: Handles Safari, iOS, and mobile device limitations
- **GPU Tier Estimation**: Classifies device as high/medium/low performance
- **Optimal Config**: Generates best settings based on device capabilities

### 🎯 **Architecture**
- **Scene Management**: Easy scene loading and transitions
- **Entity System**: Clean component-based architecture
- **Type Safety**: Full TypeScript with strict mode
- **Modular Design**: Import only what you need
- **NPM Package**: Use in any project with full TypeScript support

## 🏗️ Core Systems

### 1. **FeatureDetector**
Detects browser capabilities and generates optimal engine configuration.

```typescript
const detector = new FeatureDetector();
const capabilities = detector.capabilities;
const config = detector.getOptimalConfig();
```

### 2. **WebGLBatchRenderer**
High-performance batch renderer supporting 10,000 sprites per batch.

```typescript
const renderer = new WebGLBatchRenderer(canvas, useWebGL2);
renderer.begin(width, height);
renderer.drawSprite(x, y, width, height, texture, rotation, scale, alpha);
renderer.drawRect(x, y, width, height, color, alpha);
renderer.end();
```

### 3. **PerformanceMonitor**
5-level adaptive quality system (Ultra → High → Medium → Low → Potato).

```typescript
const monitor = new PerformanceMonitor(targetFPS, 'high');
monitor.setAdaptiveQuality(true);
monitor.beginFrame();
// ... render ...
monitor.endFrame();
const metrics = monitor.getMetrics();
```

### 4. **Object Pooling**
Zero-allocation object reuse for high-performance particle systems.

```typescript
const pool = new ObjectPool<Particle>(() => new Particle(), 5000);
const particle = pool.acquire();
// ... use particle ...
pool.release(particle);
```

### 5. **Buffer Pooling**
TypedArray pooling for geometry and vertex data.

```typescript
const float32Pool = bufferPool.acquireFloat32Array(1000);
// ... use buffer ...
bufferPool.releaseFloat32Array(float32Pool);
```

## 🎮 Quick Start

```typescript
import { Vectorium } from './vectorium/core/Engine';
import { ShowcaseScene } from './showcase/ShowcaseScene';

// Create engine
const engine = new Vectorium({
  canvas: document.getElementById('game-canvas'),
  width: 800,
  height: 600,
  preferWebGL2: true,
  enableAdaptiveQuality: true,
  targetFPS: 60,
  debugMode: true
});

// Register and load scene
const scene = new ShowcaseScene();
engine.registerScene('showcase', scene);
await engine.loadScene('showcase');

// Start engine
engine.start();
```

## 📊 Performance Metrics

The showcase demo demonstrates:
- **600+ concurrent entities** (500 bouncing squares + 100 orbiting circles)
- **5000-particle capacity** with object pooling
- **Consistent 60 FPS** with adaptive quality
- **1-3 draw calls per frame** with batch rendering
- **<5MB memory footprint** with buffer pooling

## 🎯 Showcase Demo

The included showcase demonstrates all engine features:

### Visual Elements
- **500 Bouncing Squares**: Random velocities, edge collision, rotation
- **100 Orbiting Circles**: Rainbow gradient, circular motion
- **Particle System**: Click for explosions, drag for streams

### Interactive Features
- **Click anywhere**: Creates 100-particle explosion
- **Hold mouse button**: Continuous particle stream (10 particles/50ms)
- **Auto-adjusts quality**: Maintains 60 FPS by dropping quality levels

## 🏗️ Architecture Overview

```
vectorium/
├── core/
│   ├── Engine.ts          # Main engine coordinator
│   └── FeatureDetector.ts # Browser capability detection
├── rendering/
│   └── WebGLBatchRenderer.ts  # Batch rendering system
├── memory/
│   └── Pooling.ts         # Object and buffer pooling
└── performance/
    └── PerformanceMonitor.ts  # Adaptive quality system
```

## 🔧 Configuration

```typescript
interface EngineConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  preferWebGL2: boolean;        // Use WebGL2 if available
  useImageBitmap: boolean;      // Use ImageBitmap API
  useWorkers: boolean;          # Use Web Workers for loading
  targetFPS: number;            // Target frame rate (60)
  maxTextureSize: number;       // Max texture dimension (2048)
  enableAdaptiveQuality: boolean; // Auto-adjust quality
  initialQuality: QualityLevel; // 'ultra'|'high'|'medium'|'low'|'potato'
  debugMode: boolean;           // Show debug info
}
```

## 🎨 Quality Levels

| Level  | Resolution Scale | Max Particles | Features        |
|--------|-----------------|---------------|-----------------|
| Ultra  | 1.0x            | 5000          | All enabled     |
| High   | 1.0x            | 2000          | All enabled     |
| Medium | 0.8x            | 1000          | Reduced effects |
| Low    | 0.6x            | 500           | Minimal effects |
| Potato | 0.5x            | 100           | Only essentials |

## 🚀 Running the Demos

### Standard Showcase Demo
```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

### 🔥 Stress Test Demo (NEW!)
Open `http://localhost:5173/stress-test.html` in your browser.

**The Stress Test lets you:**
- Spawn up to **1 MILLION+ entities** on a massive canvas
- Watch real-time FPS and memory usage
- Test your GPU's limits with 6 spawn patterns (random, grid, circle, spiral, wave, explosion)
- Enable auto-spawn to continuously add entities
- See adaptive quality automatically adjust performance
- Find out if your GPU can handle millions of sprites!

**Controls:**
- `+ 1,000 / 5,000 / 10,000 / 50,000` - Spawn entities
- `- 1,000 / 5,000 / CLEAR ALL` - Remove entities
- `CHANGE PATTERN` - Cycle through spawn patterns
- `START/STOP AUTO` - Continuous spawning

### Build for Production
```bash
npm run build
```

## 🌐 Browser Support

- ✅ Chrome 60+ (WebGL2)
- ✅ Firefox 51+ (WebGL2)
- ✅ Safari 15+ (WebGL2 on iOS 15+)
- ✅ Edge 79+
- ⚠️ Mobile browsers (auto-detects and optimizes)

## 📖 API Reference

### Vectorium Engine

```typescript
class Vectorium {
  constructor(config: EngineConfig);
  registerScene(name: string, scene: Scene): void;
  loadScene(name: string): Promise<void>;
  start(): void;
  stop(): void;
  resize(width: number, height: number): void;
  getMetrics(): EngineMetrics;
  destroy(): void;
}
```

### Scene

```typescript
class Scene {
  constructor(name: string);
  async load(): Promise<void>;
  update(dt: number): void;
  render(renderer: WebGLBatchRenderer): void;
  addEntity(entity: Entity): void;
  removeEntity(entity: Entity): void;
  clear(): void;
  destroy(): void;
}
```

### Entity Interface

```typescript
interface Entity {
  x: number;
  y: number;
  update(dt: number): void;
  render(renderer: WebGLBatchRenderer): void;
  destroy(): void;
}
```

## 🎓 Design Principles

1. **Zero-Allocation Hot Paths**: Object pooling eliminates GC pressure
2. **Batch Everything**: Minimize draw calls for maximum performance
3. **Adaptive Quality**: Maintain smooth framerate on any device
4. **Type Safety**: Full TypeScript with strict mode
5. **Browser Quirks**: Handle Safari, iOS, and mobile edge cases
6. **Modular Architecture**: Use only what you need

## 🏆 Inspired By

Built following patterns from:
- **PixiJS**: Batch rendering architecture
- **Three.js**: BufferGeometry and pooling strategies
- **Phaser**: Scene management and lifecycle
- **Unity**: Component-based entity system

## 📄 License

MIT License - Feel free to use in your projects!

## 👤 Author

**Nils Wendelboe Holmager**

Copyright (c) 2024-2025 Nils Wendelboe Holmager

## 🤝 Contributing

This is a showcase engine demonstrating production-grade patterns. Feel free to extend it for your own projects!

---

**Built with ❤️ using TypeScript, WebGL2, and modern web APIs**
