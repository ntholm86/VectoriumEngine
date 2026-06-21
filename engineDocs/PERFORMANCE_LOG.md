# Vectorium Performance Optimization Log

## Tested Optimizations

### ✅ **WINS** (Implemented & Kept)

| Optimization | Impact | Result | Notes |
|--------------|--------|--------|-------|
| **Batch Size: 10k → 65k** | 82% fewer draw calls | 17 calls → 3 calls | Maxed out Uint16Array capacity |
| **Single Canvas Architecture** | Memory & compositing | Removed TextRenderer overlay | 4-8MB saved, one less composite |
| **WASM Physics** | Big win | Massive speedup | Replaced JS physics entirely |
| **Skip Empty Entity Loops** | CPU cycles | Added entitiesWithCustomUpdate/Render | Only iterate entities with custom logic |
| **Frustum Culling + Instancing** | Draw call efficiency | drawInstancedIndexed() | No copying visible entities to temp arrays |
| **Sin/Cos Lookup Tables** | 54% faster animations | 2.16ms → 1.00ms | 3600-entry tables, 0.1° precision |
| **Viewport Centralization** | Architecture | SOLID/KISS/YAGNI | Centralized resolution management |
| **Vertex Color Packing (24 bytes)** | 25% less data | 32→24 bytes per vertex | UNSIGNED_BYTE normalized colors, texture support intact |

### ❌ **FAILURES** (Tried & Rejected)

| Optimization | Why Failed | Result | Notes |
|--------------|------------|--------|-------|
| **SIMD Physics** | Worse performance | Slower than WASM | Overhead > benefit at this scale |
| **Web Workers (Physics)** | Overhead too high | Worse than main thread | postMessage serialization kills gains |
| **Physics Throttling (15Hz)** | Visual quality loss | 4x slower movement, stutter | Not worth CPU savings |
| **GPU Instancing** | Batch faster | 78% slower | 206 FPS (batch) vs 116 FPS (instanced) @ 100k entities |
| **GPU Rotation (v1)** | Rendering artifacts | Visual bugs, more entities visible | Shader works but produces incorrect visual output |
| **Spatial Hashing** | Overhead too high | 63 FPS → 33 FPS @ 400k | Grid rebuild cost > physics cost (physics is already O(n) boundary checks) |
| **Inline Corner Calculations** | Added overhead | 47 FPS → 42 FPS @ 600k | Micro-optimizations hurt macro performance |

### 🔄 **CURRENT PERFORMANCE** (Champion Configuration)

| Entity Count | FPS | Render Time | Notes |
|--------------|-----|-------------|-------|
| **400k entities** | 47 FPS | ~10-11ms | Stable, smooth |
| **600k entities** | 47 FPS | ~10.43ms | ✅ **BEST RESULT** - Unrivalled! |
| **Total Entities** | 601,000 | | Active + visible |

**Current Bottlenecks @ 600k:**
- Batch Rendering: 10.43ms (optimized with 24-byte format)
- Physics: ~2.0ms
- Animation: ~2.09ms
- Update Total: ~6.20ms

**Key to Success:**
- 24-byte vertex format (pos + uv + color as UNSIGNED_BYTE)
- Frustum culling keeping only visible entities rendered
- WASM physics with sin/cos lookup tables
- 65k batch size maximizing throughput

---

## Next Options to Try

### 🎯 **High Priority (Likely Wins)**

1. **Off-Screen Physics Culling** ⭐ NEW IMPLEMENTATION
   - Skip physics updates for entities far from viewport
   - Adjustable distance multiplier (0 = disabled, 2.0 = skip beyond 2x viewport)
   - Expected: 20-50% faster physics at high entity counts
   - Usage: `scene.setPhysicsSkipDistance(2.0)` or set to 0 to disable
   - Test at 400k entities with different multipliers: 0, 1.5, 2.0, 3.0

2. **Vertex Data Packing**
   - Pack RGBA into single uint32 (currently 4 separate values)
   - Use smaller vertex format (reduce bytes transferred to GPU)
   - Expected: 20-30% faster batch rendering

3. **GPU-Side Rotation**
   - Send rotation angle instead of pre-calculated sin/cos in vertex data
   - Calculate transform in vertex shader
   - Expected: Less vertex data = faster transfer

4. **Spatial Hashing for Physics** (Retry with better implementation)
   - Broad-phase collision detection (only check nearby entities)
   - Expected: 30-50% faster physics at high entity counts
   - Previous attempt failed due to high rebuild cost - need incremental updates

### 🤔 **Medium Priority (Maybe Wins)**

5. **Interleaved Vertex Buffer**
   - Single buffer instead of multiple attribute buffers
   - May improve GPU cache coherency
   
6. **Reduce Draw State Changes**
   - Batch by texture/shader state
   - Currently already minimal (3 draw calls)

7. **Float16 Vertex Attributes**
   - Half precision for positions/sizes where possible
   - Less data transfer, may lose precision

### ⚠️ **Low Priority (Risky/Complex)**

8. **GPU Compute Shaders**
   - Move physics entirely to GPU (WebGL2 compute)
   - Complex, may not work on all hardware

9. **Shared Array Buffers + Workers**
   - Avoid postMessage overhead
   - Requires SharedArrayBuffer (CORS headers)

---

## Testing Methodology

**Target:** 301k entities (current stable load)
**Metrics:** FPS, Update Time, Render Time breakdown
**Accept:** FPS same/better OR time reduction > 10%
**Reject:** FPS drop > 5% OR visual quality loss
