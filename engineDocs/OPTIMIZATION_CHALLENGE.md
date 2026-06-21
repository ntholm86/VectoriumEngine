# Vectorium Engine - Performance Optimization Challenge

## Current Performance Baseline

**At 600,000 entities:**
- FPS: **48-50 (stable)**
- Frame Time: ~20ms
- Render Time: ~10ms
- Physics Time: ~3ms
- Animation Time: ~2ms

**At 1,000,000 entities:**
- FPS: **30 (stable)**
- Frame Time: ~33ms
- Render Time: ~21ms
- Physics Time: ~6ms
- Animation Time: ~1.6ms

## Architecture Overview

### 1. Rendering System (`WebGLBatchRenderer.ts`)
**Current Implementation:**
- Batch rendering with 65k sprites per batch (Uint16Array max)
- 24-byte vertex format: `position(8) + uv(8) + color(4) + padding(4)`
- CPU-side rotation calculation with cached sin/cos lookups (360 entries)
- Frustum culling integrated
- Pre-allocated projection matrix buffer
- Temporary corner variables for quad calculation

**Key Code Pattern:**
```typescript
// Vertex layout (16 bytes - NO UVs in current optimized version)
const stride = 16; // pos(8) + color(4) + padding(4)

// Corner calculation with temporary variables
const c0x = -hwCos + hhSin + x;
const c0y = -hwSin - hhCos + y;
const c1x = hwCos + hhSin + x;
const c1y = hwSin - hhCos + y;
// ... c2, c3
```

**Attempted & Failed Optimizations:**
- ❌ GPU instancing: 78% slower than batching
- ❌ GPU-side rotation: Rendering artifacts
- ❌ Inline corner calculations: Worse performance (register pressure)
- ❌ 16-byte vertex format without UVs: Removed texture support, not acceptable
- ❌ WebGL2 VAO: Added overhead, worse performance
- ❌ WebGL2 UBO: No improvement (27 FPS at 1M vs 30 FPS baseline)
- ❌ Batch size tuning (16k/32k/48k): No significant difference

### 2. ECS World System (`World.ts`)
**Current Implementation:**
- Structure of Arrays (SoA) pattern for cache locality
- Pre-allocated TypedArrays (zero runtime allocation)
- WASM physics engine
- Sin/cos lookup tables (3600 entries, 0.1° precision)
- Component flags bitmask system

**Key Code Pattern:**
```typescript
// Pure SoA - no objects per entity
private positionX: Float32Array;
private positionY: Float32Array;
private velocityX: Float32Array;
private velocityY: Float32Array;
private rotation: Uint16Array;  // Integer degrees 0-359
// ... all separate arrays
```

**Attempted & Failed Optimizations:**
- ❌ Spatial hashing: Rebuild cost too high (63→33 FPS)
- ❌ Physics culling (skip off-screen): Distance checks overhead
- ❌ Animation culling (skip off-screen): Visibility check overhead (47→30 FPS)
- ❌ Web Workers for physics: postMessage serialization overhead
- ❌ SIMD physics: Worse than WASM

### 3. Engine & Scene (`Engine.ts`)
**Current Implementation:**
- Pre-allocated frustum culling buffers
- Separate update/render phases
- Performance warning system
- Entity-to-ECS sync only for custom logic entities

**Key Optimization:**
- Most entities are pure data (no custom update/render)
- Only ~0-1% of entities have custom logic
- ECS systems handle 99%+ of entities

## What We Know Works

1. ✅ **Batch Rendering** (78% faster than instancing)
2. ✅ **CPU Rotation with Lookup Tables** (54% faster animations)
3. ✅ **WASM Physics** (massive speedup over JS)
4. ✅ **Structure of Arrays** (10-15x faster than OOP)
5. ✅ **Pre-allocated Buffers** (zero GC pressure)
6. ✅ **65k Batch Size** (maxed Uint16Array)
7. ✅ **Frustum Culling** (only render visible)
8. ✅ **24-byte Vertex Format** (with texture support)
9. ✅ **Temporary Corner Variables** (better than inline)
10. ✅ **Object Pooling for Projection Matrix** (stable FPS)

## The Challenge

**Can you achieve 60 FPS at 600,000 entities?**

Current bottleneck at 600k:
- Render: ~10ms (60% of frame time)
- Physics: ~3ms
- Animation: ~2ms

**Current render path:**
```typescript
// In WebGLBatchRenderer.drawBulkIndexed()
for (let i = 0; i < count; i++) {
  if ((flags[i] & FLAG_VISIBLE) === 0) continue;
  
  // Calculate 4 corners
  const hw = sizes[i] * 0.5;
  const hh = sizes[i] * 0.5;
  const rot = rotation[i];
  const cos = this.cosCache[rot];
  const sin = this.sinCache[rot];
  
  const hwCos = hw * cos;
  const hwSin = hw * sin;
  const hhCos = hh * cos;
  const hhSin = hh * sin;
  
  // Store in temporary variables
  const c0x = -hwCos + hhSin + x;
  const c0y = -hwSin - hhCos + y;
  // ... c1, c2, c3
  
  // Write to vertex buffer (4 vertices × 4 floats each)
  const baseIndex = spriteCount * 16;
  this.batchVertices[baseIndex] = c0x;
  this.batchVertices[baseIndex + 1] = c0y;
  // ... etc
}
```

## Constraints

1. **Must maintain texture support** (24-byte format minimum)
2. **Must be browser-compatible** (no SharedArrayBuffer, no compute shaders)
3. **Cannot break visual quality** (no missing rotations, no artifacts)
4. **Must support 1M+ entities** (not just optimize for 600k)

## Areas to Explore

### Unexplored Optimizations:

1. **WebGL2 Features Not Yet Tried:**
   - Transform feedback?
   - Multiple render targets?
   - Persistent mapped buffers?
   - Texture buffer objects?

2. **Vertex Format Alternatives:**
   - Pack rotation as normalized byte?
   - Use vertex pulling instead of attributes?
   - Store sprite data in textures?

3. **Rendering Architecture:**
   - Indirect drawing?
   - Multi-draw commands?
   - Geometry shaders (if available)?
   - Different primitive types?

4. **CPU-Side Optimizations:**
   - SIMD.js manual optimization?
   - Better memory layout for cache?
   - Skip redundant calculations?
   - Pre-compute more data?

5. **Hybrid Approaches:**
   - Combine batching with instancing?
   - Use different paths for static vs dynamic sprites?
   - Level-of-detail for distant sprites?

## Testing Environment

- **Browser:** Chrome/Edge (WebGL2 available)
- **Hardware:** Modern GPU
- **Target:** 60 FPS at 600k entities minimum
- **Stretch Goal:** 40+ FPS at 1M entities

## Deliverables

If you can improve performance:
1. Show FPS improvement at 600k and 1M entities
2. Explain what changed and why it works
3. Demonstrate it doesn't break existing functionality
4. Document any trade-offs or limitations

## Current Code Structure

```
src/vectorium/
├── rendering/
│   ├── WebGLBatchRenderer.ts    ← Main bottleneck (10ms render)
│   ├── VertexFormat.ts
│   └── GPURotationVertexFormat.ts
├── core/
│   ├── Engine.ts                ← Orchestrates everything
│   ├── World.ts                 ← ECS system (3ms physics + 2ms anim)
│   ├── Camera.ts
│   └── Viewport.ts
├── wasm/
│   └── WasmPhysics.ts          ← Already optimized
├── memory/
│   └── Pooling.ts              ← Used for projection matrix
└── performance/
    └── PerformanceMonitor.ts
```

## The Real Question

**What are we missing?** 

The render time of ~10ms seems to be the hard floor. We've tried:
- Different batch sizes (no change)
- Different vertex formats (worse or breaks features)
- GPU-side rotation (visual bugs)
- VAOs (overhead)
- UBOs (no benefit)
- Instancing (78% slower)

Is there a fundamental architectural change needed? A WebGL feature we haven't leveraged? A mathematical trick for faster corner calculations?

**Good luck! 🚀**
