# 🎮 Vectorium Engine

A high-performance, production-ready WebGL sprite rendering engine built with TypeScript.

> **⚠️ Two performance numbers, two different jobs — read this before citing either one**
>
> | | General entities (`Scene`/`World`) | Bunnymark particle systems |
> |---|---|---|
> | **60 FPS ceiling** | **~500,000** (GPU-instanced path, synced, this machine) | **~3.2M** (GPU-physics) / ~1.8M (CPU-physics) |
> | **What it measures** | Real game objects — arbitrary per-entity rotation, shape, size, CPU-driven logic | A uniform, GPU-instanced particle storm — identical sprites, no per-entity rotation |
> | **Physics location** | CPU (`World.updateFrame`) | GPU (transform feedback) or CPU, selectable |
> | **Used by** | Your actual game code (e.g. the Asteroids demo) | `bunnytest.html` only |
> | **Bottleneck** | CPU instance-fill + physics (GPU trig since 2026-07-05 unification) | GPU fill rate / VRAM |
>
> **These are not contradictory** — both now share the same GPU-instancing technique (unified 2026-07-05: `InstancedShapeRenderer` gives general entities per-instance GPU-side rotation/size/color/shape). The particle path remains faster because it trades away per-entity flexibility and can move physics to the GPU. Never cite one number as if it describes the other path.

## 🏆 Performance Benchmarks

- **~500,000 generic entities @ 60 FPS** (GPU-synced, 2026-07-05, unified instanced path — up from ~300k before unification)
- **~3,200,000 particles @ 60 FPS** (GPU-physics bunnymark; see Benchmark Harness Flags below — a specialized configuration of the same instancing technique)
- **Single draw call** batch rendering with automatic state management
- **24-byte optimized vertex format** for maximum GPU cache efficiency
- **Zero-allocation rendering** with pre-allocated typed arrays
- **Hardware-accelerated color packing** using UNSIGNED_BYTE normalization

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
import { Vectorium, Scene, EngineConfig, VectoriumBuilder } from 'vectorium-engine';

const config = new EngineConfig();
config.width = 800;
config.height = 600;
// config.canvas = document.getElementById('game') as HTMLCanvasElement; // optional: provide your own canvas

class GameScene extends Scene {
  constructor() {
    super('game'); // Scene requires a name
  }

  async load() {
    // Your game logic
  }
}

const engine = new VectoriumBuilder(config)
  .withScene('game', new GameScene())
  .build();

await engine.loadScene('game');
engine.start();
```

## ✨ Core Features

### 🚀 **Ultra-High Performance**
- **ECS Architecture**: Entity Component System with SoA (Structure of Arrays) for cache-friendly data access
- **Batch Rendering**: Single draw call for 65k sprites with automatic batching
- **Optimized Vertex Format**: 24-byte layout (pos 8B + uv 8B + color 4B + padding 4B) maximizes GPU cache hits
- **UNSIGNED_BYTE Colors**: Hardware-accelerated normalization (25% smaller than float colors)
- **Pre-calculated Rotation Cache**: Integer degree lookups eliminate Math.cos/sin overhead
- **Zero-Allocation Rendering**: Pre-allocated Float32Array and Uint8Array views for vertex data
- **Frustum Culling**: Camera-based visibility testing with indexed rendering (zero-copy)
- **TypedArray Pooling**: Reusable buffer management for zero GC pressure during gameplay

### 🎨 **WebGL Rendering**
- **WebGL2/WebGL1 Support**: Automatic feature detection with graceful fallback
- **Optimized Batch Pipeline**: Minimizes state changes and draw calls
- **Smart Vertex Packing**: Interleaved format with byte-aligned color for GPU efficiency
- **Indexed Rendering**: Shared index buffer reduces memory bandwidth by 33%
- **Stream Optimization**: STREAM_DRAW for dynamic vertex data, STATIC_DRAW for indices

### 🧠 **Intelligent Systems**
- **Feature Detection**: Automatic WebGL2, extensions, and GPU tier detection
- **Adaptive Quality**: 5-level system (Ultra → High → Medium → Low → Potato) with automatic FPS-based adjustment
- **Performance Monitoring**: Real-time metrics with 60-sample rolling average
- **Browser Quirk Handling**: Safari, iOS, and mobile device compatibility layer

### 🎮 **Game Development Features**
- **State Machine System**: Type-safe finite state machines for game states, UI flows, and animations
- **Scene Management**: Hot-swappable scenes with lifecycle hooks (load/start/update/destroy)
- **Input Management**: Keyboard and mouse handling with state tracking
- **Camera System**: 2D camera with smooth movement and zoom

## 🏗️ Architecture

### **Entity Component System (ECS)**
Vectorium uses a high-performance ECS architecture with Structure of Arrays (SoA) data layout:

```typescript
// Entities are pure data containers - no logic
class MyEntity implements Entity {
  x = 0; y = 0;           // Position (required)
  size = 10;               // Size for rendering
  vx = 0; vy = 0;          // Velocity (optional)
  rotation = 0;            // Rotation in radians
  color = { r: 1, g: 0.5, b: 0 }; // RGB in 0-1 range
  alpha = 1.0;             // Transparency
}

// Scene automatically syncs entities to ECS World
scene.addEntity(new MyEntity());
```

**ECS Benefits:**
- **Cache-Friendly**: Component data stored in contiguous typed arrays (Float32Array, Uint8Array)
- **SIMD-Ready**: Array layout enables future SIMD optimizations
- **Zero Indirection**: Direct array access eliminates pointer chasing
- **Automatic Sync**: Entities transparently sync to optimized ECS storage

### **Optimized Vertex Format**

The engine uses a carefully optimized 24-byte vertex layout:

```
Vertex Layout (24 bytes):
┌──────────┬──────────┬─────────┬─────────┐
│ Position │    UV    │  Color  │ Padding │
│  8 bytes │  8 bytes │ 4 bytes │ 4 bytes │
└──────────┴──────────┴─────────┴─────────┘

Position: vec2 (2 floats) - x, y coordinates
UV:       vec2 (2 floats) - texture coordinates (unused but reserved)
Color:    vec4 (4 UNSIGNED_BYTE normalized) - RGBA in 0-255
Padding:  4 bytes alignment (GPU cache line optimization)
```

**Why UNSIGNED_BYTE for colors?**
- **25% smaller**: 4 bytes vs 16 bytes for float colors
- **Hardware accelerated**: GPU normalizes bytes → floats automatically
- **Better cache utilization**: More vertices fit in GPU L1/L2 cache
- **Bandwidth savings**: Critical for high entity counts (600k = 2.4M vertices)
- **No precision loss**: 8 bits per channel is more than sufficient for color

**Performance Impact:**
```
600k entities = 2.4M vertices = 57.6 MB vertex data
Float colors:   2.4M × 32 bytes = 76.8 MB (33% slower)
Byte colors:    2.4M × 24 bytes = 57.6 MB (optimal)
```

### **Batch Rendering Pipeline**

```typescript
// Simplified rendering flow
renderer.begin(width, height);

// Option A: No culling - render all entities
renderer.drawBulk(
  posX, posY, rotation, sizes,
  colorR, colorG, colorB, alphas,
  flags, totalCount
);

// Option B: Frustum culling - indexed rendering
const visibleCount = camera.cullEntities(posX, posY, sizes, totalCount, indices);
renderer.drawBulkIndexed(
  posX, posY, rotation, sizes,
  colorR, colorG, colorB, alphas,
  flags, indices, visibleCount
);

renderer.end();
```

**Key Optimizations:**
1. **Pre-allocated buffers**: No allocation during rendering
2. **Integer degree rotations**: Cached cos/sin lookups (0-359°)
3. **Inline corner calculation**: Eliminates temporary variables
4. **Byte-level color writes**: Direct Uint8Array access
5. **Shared index buffer**: Pre-calculated triangle indices (never changes)

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

## 🎮 Usage Guide

### **Basic Setup**

```typescript
import { Vectorium, Scene, Entity } from 'vectorium-engine';

// 1. Create engine instance
const engine = new Vectorium({
  canvas: document.getElementById('game-canvas'),
  width: 1920,
  height: 1080,
  preferWebGL2: true,
  targetFPS: 60,
  enableAdaptiveQuality: true,
  initialQuality: 'high'
});

// 2. Define entities (pure data containers)
class Sprite implements Entity {
  x = 0;
  y = 0;
  size = 16;
  vx = 100;  // velocity x (pixels/sec)
  vy = 100;  // velocity y
  rotation = 0;  // radians
  color = { r: 1, g: 0, b: 0 };  // 0-1 range
  alpha = 1.0;
}

// 3. Create scene and add entities
class GameScene extends Scene {
  async load() {
    // Spawn 1000 sprites
    for (let i = 0; i < 1000; i++) {
      const sprite = new Sprite();
      sprite.x = Math.random() * this.getWorldWidth();
      sprite.y = Math.random() * this.getWorldHeight();
      sprite.color = {
        r: Math.random(),
        g: Math.random(),
        b: Math.random()
      };
      this.addEntity(sprite);
    }
  }
}

// 4. Start engine
const scene = new GameScene('game', 1000000); // max 1M entities
engine.registerScene('game', scene);
await engine.loadScene('game');
engine.start();
```

### **Resolution Configuration** ✨

Vectorium provides a flexible resolution system with presets and custom dimensions:

```typescript
import { VectoriumBuilder } from 'vectorium-engine';

// Using resolution presets
const engine = new VectoriumBuilder()
  .withCanvas(document.getElementById('game-canvas'))
  .withResolution('FullHD')  // 1920×1080
  .withQuality('high')
  .enableDebugTools()
  .build();

// Available presets:
// 'HD'      → 1280×720
// 'FullHD'  → 1920×1080
// 'QHD'     → 2560×1440
// '4K'      → 3840×2160

// Or use custom dimensions:
  .withResolution({ width: 1600, height: 900 })

// Traditional approach (still supported):
  .withSize(1920, 1080)
```

**Scene Configuration with World Scale:**

```typescript
import { SceneBuilder } from 'vectorium-engine';

const scene = new SceneBuilder('game')
  .withCapacity(100000)           // Max entities
  .withWorldScale(1.5)            // World 1.5x larger than viewport
  .onLoad(async () => {
    console.log('Scene loaded!');
  })
  .onUpdate((dt) => {
    // Custom update logic
  })
  .build();

engine.registerScene('game', scene);
```

**World Scale Explained:**
- `worldScale = 1.0`: World bounds = viewport (entities bounce at screen edges)
- `worldScale > 1.0`: World bounds > viewport (larger physics space, enables camera movement)
- Example: With viewport 1920×1080 and worldScale 2.0, world is 3840×2160

### **Advanced Features**

**Camera:**
```typescript
const camera = scene.getCamera();
camera.setPosition(x, y);       // Move camera
```

**Performance Monitoring:**
```typescript
const metrics = engine.performanceMonitor.getMetrics();
console.log(`FPS: ${metrics.fps}`);
console.log(`Frame: ${metrics.frameTime}ms`);
console.log(`Quality: ${metrics.quality}`);  // auto-adjusted
console.log(`Draw calls: ${metrics.drawCalls}`);
```

**Custom Physics (opt-in):**
```typescript
class PhysicsEntity implements Entity {
  x = 0; y = 0; size = 10;
  vx = 0; vy = 0;
  
  // Opt-in to custom update
  static __needsUpdate = true;
  
  update(dt: number) {
    // Custom physics logic
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Bounce off walls
    if (this.x < 0 || this.x > 1920) this.vx *= -1;
    if (this.y < 0 || this.y > 1080) this.vy *= -1;
  }
}
```

**Batch Size Tuning:**
```typescript
renderer.setMaxBatchSize(65000);  // Max performance
renderer.setMaxBatchSize(32000);  // Lower memory
```

### **State Machine System**

Vectorium provides a type-safe, high-performance state machine system for managing game states, UI flows, and animations.

**Basic Usage:**
```typescript
import { Scene, StateMachine } from 'vectorium-engine';

class GameScene extends Scene {
  private gameState: StateMachine<'menu' | 'playing' | 'paused' | 'gameover'>;
  
  constructor() {
    super('game');
    
    // Create state machine with initial state
    this.gameState = this.createStateMachine<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
    
    // Setup state transitions and callbacks
    this.setupGameStates();
  }
  
  private setupGameStates() {
    // Enter callbacks - called when entering a state
    this.gameState.onEnter('menu', () => {
      console.log('Showing menu');
      this.showMenu();
    });
    
    this.gameState.onEnter('playing', () => {
      console.log('Game started!');
      this.spawnPlayer();
      this.spawnEnemies();
    });
    
    // Update callbacks - called every frame while in state
    this.gameState.onUpdate('playing', (dt) => {
      this.updateGameplay(dt);
      
      // Check for pause
      if (this.inputManager?.isKeyJustPressed('Escape')) {
        this.gameState.transition('paused');
      }
    });
    
    // Exit callbacks - called when leaving a state
    this.gameState.onExit('playing', () => {
      console.log('Game paused');
    });
    
    // Define valid transitions (optional)
    this.gameState
      .allowTransition('menu', 'playing')
      .allowTransition('playing', 'paused')
      .allowTransition('paused', 'playing')
      .allowTransition('playing', 'gameover')
      .allowTransition('gameover', 'menu');
  }
  
  private startGame() {
    this.gameState.transition('playing');
  }
  
  update(dt: number) {
    super.update(dt);
    
    // State machine automatically calls update callback for current state
  }
}
```

**Advanced Features:**

```typescript
// Time-based transitions
this.gameState.onUpdate('intro', (dt) => {
  if (this.gameState.getStateTime() > 3.0) {
    this.gameState.transition('gameplay');
  }
});

// Return to previous state
if (this.inputManager?.isKeyJustPressed('Backspace')) {
  this.gameState.returnToPreviousState();
}

// Check current state
if (this.gameState.isInState('playing')) {
  // Game logic
}

// Check multiple states
if (this.gameState.isInAnyState('playing', 'paused')) {
  this.renderGame();
}

// Get debug info
const debug = this.gameState.getDebugInfo();
console.log(`Current: ${debug.currentState}, Time: ${debug.stateTime}s`);
```

**Animation State Machine:**
```typescript
class Player {
  private animState = new StateMachine<'idle' | 'walk' | 'run' | 'jump'>('idle');
  
  constructor() {
    this.animState
      .allowTransition('idle', 'walk')
      .allowTransition('walk', 'run')
      .allowTransition('walk', 'idle')
      .allowTransition('run', 'walk')
      .allowTransition('idle', 'jump')
      .allowTransition('walk', 'jump')
      .allowTransition('run', 'jump')
      .allowTransition('jump', 'idle');
    
    this.animState.onEnter('jump', () => {
      this.playAnimation('jump');
      this.velocity.y = -500;
    });
    
    this.animState.onUpdate('jump', (dt) => {
      if (this.isGrounded()) {
        this.animState.transition('idle');
      }
    });
  }
  
  handleInput(input: InputState) {
    if (input.space && this.isGrounded()) {
      this.animState.transition('jump');
    } else if (input.speed > 200) {
      this.animState.transition('run');
    } else if (input.speed > 0) {
      this.animState.transition('walk');
    } else {
      this.animState.transition('idle');
    }
  }
}
```

**Key Features:**
- **Type Safety**: Union types ensure only valid states can be used
- **Zero Allocation**: Callback reuse with no dynamic allocation in hot path
- **Lifecycle Hooks**: onEnter, onUpdate, onExit for complete control
- **State Validation**: Optional transition rules prevent invalid state changes
- **State Timing**: Track time spent in each state for time-based logic
- **Previous State**: Built-in history for "back" functionality
- **Fluent API**: Method chaining for clean declarative setup
- **Error Handling**: Automatic try-catch with logging for callbacks

See `demo-state-machine.html` for a complete working example with menu, gameplay, pause, and game over states.

## 📊 Performance Analysis

### **Benchmark Harness Flags** (`bunnytest.html`)

| Flag | Effect |
|------|--------|
| `?cpu=1` | Use the CPU-physics particle system (`BunnymarkParticleSystem`) instead of the default GPU transform-feedback system (`GpuParticleSystem`). Use for like-for-like comparisons against CPU-physics engines. |
| `?max=N` | Override particle capacity (e.g. `?max=20000000`). GPU path takes any N (32 B/particle VRAM); CPU path clamps to `config.maxEntities`. |

Measurement rule: engine-internal frame time is **CPU-side only** — for true frame cost, use a GPU-synced probe (1px `readPixels` after render; `gl.finish()` is a no-op under ANGLE). Publishable numbers come from fresh same-session runs.

### **Rival Comparison — the general gaming path** (2026-07-05)

Each engine measured on its **idiomatic game-object path** (not particle stunts): entities with per-entity drift, wall bounce, and continuous rotation, updated the way a real game written in that engine would do it. Same machine, same 800×600 canvas, same GPU-synced protocol. Harnesses: `entity-bench.html`, `pixi-general.html`, `phaser-general.html`.

| Engine (idiomatic path) | 60 FPS ceiling | Frame time @ 100k entities |
|---|---|---|
| **Vectorium** (`World` + instanced shapes) | **~500,000** | **3.8 ms (265 FPS)** |
| PixiJS v8 (`Container` + `Sprite`) | ~100,000 | 16.2 ms (62 FPS) |
| Phaser 3 (`GameObjects.Image`) | ~85,000 | 18.2 ms (55 FPS) |

**~5× PixiJS and ~6× Phaser at the 60 FPS ceiling.** Known asymmetry, stated openly: vectorium renders SDF shapes (26 px circles) while the rivals render the 26×37 bunny texture — comparable screen area, different fragment work. The structural difference being measured is real, though: SoA typed arrays + engine-integrated physics + GPU-instanced rendering vs. per-object JS scene graphs. On the particle path (`ParticleContainer` vs `GpuParticleSystem`) vectorium's lead is larger still — see below.

### **Benchmark Results**
> **Re-measured 2026-07-05** with a GPU-synced protocol (1px `readPixels` per frame; engine-internal FPS is CPU-side only and reads misleadingly high — see the measurement rule above). Harness: `entity-bench.html` (drives `Scene`/`World` directly, not the specialized bunnymark particle systems).
>
> **After path unification (InstancedShapeRenderer, same day):** the general entity path now renders via GPU instancing — per-instance rotation/size/color/shape computed in the vertex shader, 20 B/instance upload, no CPU corner math. 60 FPS ceiling moved from ~300k to **~500k**.

```
Entity Count  │ FPS (unified/instanced) │ FPS (pre-unification CPU batcher)
───────────────┐─────────────────────────┐─────────────────────────────────
100,000      │ 263.5 (3.8ms)           │ 159.6 (6.27ms)
300,000      │ 105.4 (9.5ms)           │ 61.1 (16.38ms)  ← old ceiling
500,000      │ 61.2 (16.3ms)  ← new ceiling │ 40.1 (24.94ms)
600,000      │ 52.2 (19.2ms)           │ 33.7 (29.66ms)
1,000,000    │ 33.6 (29.8ms)           │ —
```

The original table (unverified assumptions, kept for history — do not cite as current):
```
Entity Count  │ FPS  │ Frame Time │ Vertices  │ Memory
──────────────┼──────┼────────────┼───────────┼─────────
1,000        │ 60   │ 2.1ms      │ 4,000     │ 96 KB
10,000       │ 60   │ 2.8ms      │ 40,000    │ 960 KB
100,000      │ 60   │ 5.2ms      │ 400,000   │ 9.6 MB
600,000      │ 60   │ 14.5ms     │ 2,400,000 │ 57.6 MB
```

### **Critical Performance Findings**

> The tables below compare relative trade-offs (format, batch size) measured against the historical, now-invalidated 600k/60FPS anchor. The *direction* of each finding (packed bytes > float colors, integer degrees > float radians, larger batches > smaller) is architecturally plausible and unchanged, but the absolute FPS numbers should be re-measured, not cited as current.

**1. Vertex Format Impact (600k entities)**
```
Format                    │ Size    │ FPS  │ Performance
─────────────────────────┼─────────┼──────┼─────────────
Float colors (vec4)      │ 32 bytes│ 40   │ -33% (SLOW)
Packed bytes (normalized)│ 24 bytes│ 60   │ Optimal ✓
```

**2. Rotation Cache Impact**
- **Integer degrees (0-359)**: Pre-cached cos/sin → Zero overhead
- **Float radians**: Math.cos/sin per entity → 15% slower
- **Recommendation**: Use integer degrees for animations

**3. Memory Bandwidth Analysis**
```
600k entities/frame @ 60 FPS = 36M entities/sec
24 bytes/vertex × 4 vertices = 96 bytes/entity
96 bytes × 36M = 3.3 GB/sec bandwidth requirement

GPU L2 Cache: ~2MB (RTX 3060)
Vertex data size: 57.6MB → Cache misses inevitable
Solution: Minimize vertex size (24B is optimal)
```

**4. Batch Size Impact**
- **65k batch** (max): Optimal for large scenes
- **48k batch**: 12% slower (more draw calls)
- **32k batch**: 20% slower
- **16k batch**: 35% slower (excessive state changes)

### **Architecture Decisions**

**Why ECS with SoA?**
```typescript
// Bad: Array of Structures (AoS) - cache unfriendly
entities: Array<{x, y, vx, vy, size, color, alpha}> // 32+ bytes scattered

// Good: Structure of Arrays (SoA) - cache friendly
posX: Float32Array      // Tightly packed, prefetch friendly
posY: Float32Array      // GPU can process in SIMD
colorR: Uint8Array      // Minimal memory bandwidth
colorG: Uint8Array
colorB: Uint8Array
```

**Benefits:**
- **CPU cache hits**: Processing positions only loads position arrays
- **GPU cache hits**: Tightly packed vertex data improves L1/L2 utilization
- **SIMD potential**: Contiguous arrays enable future SIMD vectorization
- **Less bandwidth**: Only load what you need for each system

## 🎯 Demo

Run the included performance demo:

```bash
npm install
npm run dev
```

**Demo Features:**
- Interactive entity spawning (1k to 1M+ entities)
- Real-time performance metrics
- Frustum culling toggle
- Batch size tuning (16k to 65k)
- Quality level visualization
- Draw call monitoring

**Controls:**
- **+1K / +10K / +100K buttons**: Add entities
- **-1K / -10K / -100K buttons**: Remove entities
- **Clear**: Remove all entities
- **Frustum Culling toggle**: Enable/disable camera culling
- **Batch size slider**: Adjust max batch size (observe FPS impact)

## 🏗️ Project Structure

```
vectorium/
├── src/
│   ├── vectorium/
│   │   ├── core/
│   │   │   ├── Engine.ts              # Main engine (Scene, ECS integration)
│   │   │   ├── World.ts               # ECS World (SoA storage)
│   │   │   ├── Camera.ts              # Frustum culling
│   │   │   ├── Viewport.ts            # Screen calculations
│   │   │   └── FeatureDetector.ts     # WebGL detection
│   │   ├── rendering/
│   │   │   ├── WebGLBatchRenderer.ts  # Optimized batch renderer
│   │   │   ├── TextRenderer.ts        # 2D text rendering
│   │   │   └── VertexFormat.ts        # Vertex layout definitions
│   │   ├── performance/
│   │   │   └── PerformanceMonitor.ts  # FPS tracking, adaptive quality
│   │   ├── memory/
│   │   │   └── Pooling.ts             # Object & buffer pooling
│   │   └── physics/
│   │       └── (future WASM physics)
│   ├── demo.ts                        # Performance demo
│   └── index.ts                       # Public API exports
├── docs/
│   ├── ECS_ARCHITECTURE.md            # ECS design details
│   ├── PERFORMANCE_IMPROVEMENTS.md    # Optimization history
│   └── VERTEX_PACKING_ARCHITECTURE.md # Vertex format analysis
└── README.md                          # This file
```

## 🔧 Engine Configuration

```typescript
interface VectoriumConfig {
  canvas: HTMLCanvasElement;
  width: number;                      // Canvas width
  height: number;                     // Canvas height
  preferWebGL2?: boolean;             // Use WebGL2 (default: true)
  targetFPS?: number;                 // Target frame rate (default: 60)
  enableAdaptiveQuality?: boolean;    // Auto-adjust quality (default: true)
  initialQuality?: QualityLevel;      // 'ultra'|'high'|'medium'|'low'|'potato'
  debugMode?: boolean;                // Console logging (default: false)
}

type QualityLevel = 'ultra' | 'high' | 'medium' | 'low' | 'potato';
```

**Quality Level Impact:**
- **Ultra**: All effects, full resolution
- **High**: Standard quality (default)
- **Medium**: Reduced effects
- **Low**: Minimal effects
- **Potato**: Bare minimum for stability

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
