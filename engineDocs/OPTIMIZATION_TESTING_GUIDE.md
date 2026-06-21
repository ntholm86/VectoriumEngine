# Vectorium Performance Optimization Testing Guide

## 🚀 New Optimization: Off-Screen Physics Culling

### What Was Changed

Added distance-based physics culling to skip updates for entities far from the viewport.

**Files Modified:**
- `src/vectorium/core/World.ts` - Added optional camera position parameters to `updatePhysics()`
- `src/vectorium/core/Engine.ts` - Added `physicsSkipDistanceMultiplier` configuration
- `PERFORMANCE_LOG.md` - Updated with new optimization

### How It Works

```typescript
// In World.updatePhysics()
const dx = entityX - cameraX;
const dy = entityY - cameraY;
const distSq = dx * dx + dy * dy;

if (distSq > (viewportWidth * skipMultiplier)²) {
  continue; // Skip physics for this entity
}
```

### Configuration

**Default:** `physicsSkipDistanceMultiplier = 2.0` (skip entities beyond 2x viewport distance)

**In code:**
```typescript
// Enable with multiplier
scene.setPhysicsSkipDistance(2.0);  // Skip beyond 2x viewport

// Disable completely (update all entities)
scene.setPhysicsSkipDistance(0);
```

### Testing Instructions

#### 1. Baseline Test (Optimization Disabled)
```typescript
scene.setPhysicsSkipDistance(0);  // Disable
// Spawn 400k entities
// Record: FPS, Physics Time, Total Update Time
```

#### 2. Conservative Test
```typescript
scene.setPhysicsSkipDistance(1.5);  // Skip beyond 1.5x viewport
// Same entity count
// Record: FPS, Physics Time, Total Update Time
```

#### 3. Balanced Test (Default)
```typescript
scene.setPhysicsSkipDistance(2.0);  // Skip beyond 2x viewport
// Same entity count
// Record: FPS, Physics Time, Total Update Time
```

#### 4. Aggressive Test
```typescript
scene.setPhysicsSkipDistance(3.0);  // Skip beyond 3x viewport
// Same entity count
// Record: FPS, Physics Time, Total Update Time
```

### Expected Results

| Multiplier | Physics Coverage | Expected Gain | Notes |
|------------|------------------|---------------|-------|
| **0 (disabled)** | 100% | Baseline | All entities updated |
| **1.5** | ~80% | 10-20% | Conservative, minimal visual impact |
| **2.0** | ~60% | 20-30% | **Recommended default** |
| **3.0** | ~40% | 30-50% | Aggressive, may see edge physics stutter |

### What to Watch For

**✅ Good Signs:**
- Physics time drops significantly (2.5ms → 1.0-1.5ms)
- FPS increases proportionally
- Entities outside viewport still bounce correctly when they re-enter

**❌ Potential Issues:**
- Entities "teleport" when entering viewport (physics skipped too aggressively)
- Edge entities behave oddly (multiplier too low)
- No performance gain (all entities within skip distance anyway)

### Recommended Test Scenario

**Setup:**
1. Spawn 400,000 entities across a 10x world area
2. Camera zoomed to 1x viewport
3. Entities bouncing in all directions

**This ensures:**
- Most entities are off-screen (90%+)
- Physics culling has maximum impact
- Easy to compare with baseline

### Combining with Other Optimizations

This optimization stacks with:
- ✅ Frustum culling (rendering) - Independent systems
- ✅ WASM physics - Works on remaining entities
- ✅ Batch rendering - Unaffected
- ✅ GPU rotation - Can be combined

### Performance Metrics to Track

```typescript
// In demo UI, display:
- Total Entities: 400,000
- Visible Entities: ~40,000 (with frustum culling)
- Physics Updates: ??? (new metric to add!)
  
// Expected at 2.0x multiplier:
Physics Updates: ~160,000 (40% of total)
```

## 🎯 Next Optimization: Vertex Color Packing

Your code already has the infrastructure (Uint8Array views, 24-byte format) but doesn't fully utilize it.

### The Fix

**Problem:** Current `drawBulkIndexed` writes colors as bytes correctly, but the vertex format still allocates space inefficiently.

**Solution:** Reduce vertex format from **32 bytes → 20 bytes**:
- Position: 8 bytes (2 floats) ✓
- TexCoord: 8 bytes (2 floats) ✓  
- **Color: 4 bytes (UNSIGNED_BYTE normalized)** ← Change this
- Total: 20 bytes (vs current 32 bytes)

**Expected Gain:** 37% less vertex data = ~10-15ms → ~7-9ms render time

### Already Implemented (Just Needs Activation)

The byte-level color writing is already in `drawBulkIndexed()` lines 711-746:
```typescript
// This code already exists and works!
const rByte = colorR[idx];
const gByte = colorG[idx];
const bByte = colorB[idx];
const aByte = Math.floor(alphas[idx] * 255);

this.batchVerticesU8[colorByteOffset++] = rByte;
this.batchVerticesU8[colorByteOffset++] = gByte;
this.batchVerticesU8[colorByteOffset++] = bByte;
this.batchVerticesU8[colorByteOffset++] = aByte;
```

## Summary

**Immediate Testing:**
1. Run baseline (multiplier = 0)
2. Run optimized (multiplier = 2.0)
3. Compare FPS and physics time
4. Adjust multiplier if needed

**Expected Impact at 400k entities:**
- **Physics time:** 2.5ms → 1.0-1.5ms (40-60% faster)
- **FPS:** 55 FPS → 65-75 FPS (~20% improvement)
- **Best case:** Could push 600k entities to 50+ FPS

Let me know the results! 🚀
