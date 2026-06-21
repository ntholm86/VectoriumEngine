### Summary of the task
You want a concrete, prioritized investigation and remediation plan to recover the lost performance (30 FPS → 21 FPS at 1M entities) from the Vectorium engine, plus targeted experiments and small code patches to isolate the regression (especially the Uint32Array change and batch sizing).

---

### Quick diagnosis and highest‑impact hypothesis
- The profile in the doc clearly points to vertex transform math as the dominant cost (~42% of frame time). The Uint32 index change and batch-size tuning are the most likely regressors because they change memory footprint, cache behavior, and GPU/driver work per draw.
- Highest‑priority suspect: switching indices to Uint32 increases memory bandwidth, likely causing CPU/GPU cache pressure and larger GPU uploads; also may force different code paths in the driver (WebGL/WebGL2 differences).
- Secondary suspects: non-obvious allocations or subarray use in bufferSubData, and batch size not tuned to the platform cache behavior.

---

### Prioritized test matrix (run these in order; each test is quick, isolates one variable)
1. Baseline re-run (sanity)
   - Measure: 1M entities, current engine (32k batch, Uint32), capture CPU/GPU timeline.
   - Metrics: FPS, frame time breakdown, main hot functions, GC counts, allocations.

2. Uint32 vs Uint16 (isolate index type)
   - Test A: Force Uint16 indices and maxBatchSize = 16,383 (original). If WebGL1 limits force this, run with same draw call count as best you can (split into more batches).
   - Test B: Keep batch = 32,768 but use Uint16 and split large batches into two sequential draws (so index buffers stay Uint16).
   - Measure delta in FPS and per-frame allocation/transfer bytes.
   - Expected outcome: if Uint32 is primary cause, FPS improves significantly with Uint16.

3. Batch size sweep (A/B)
   - Values: 16384, 24576 (~24k), 32768, 49152 (~48k), 65536 (if WebGL2 available).
   - For each: record FPS, CPU main thread time, GPU upload time, #draw calls.
   - Plot FPS vs batch size to find the sweet spot for this hardware/browser.

4. Buffer upload pattern check (avoid subarray allocations)
   - Replace bufferSubData(..., this.batchVertices.subarray(...)) with:
     - Option A (preferred): use a dedicated Float32Array view for the used range and call gl.bufferSubData with that typed view without creating new subarrays each frame (maintain a persistent view object and .set into it).
     - Option B: if subarray is unavoidable, measure whether subarray actually allocates; use Chrome DevTools timeline to see allocations.
   - Measure: FPS and JS allocations per frame.

5. Hidden allocation sweep
   - Run DevTools memory profiler while running.
   - Check:
     - Are small short-lived arrays, objects or strings being created in the hot loops (e.g., Math.min allocations—unlikely, but check).
     - Are string-keyed lookups or temporary objects created inside the inner loop (avoid any function returning objects).
   - Fix any allocation source with inline scalar logic or reuse of preallocated objects/arrays.

6. Disable per-frame expensive operations
   - Temporarily stub out expensive work in inner loops (e.g., color writes, rotation math) to confirm where time goes.
   - Use binary search approach: disable half of inner operations and see effect, then narrow down.

---

### Concrete, safe code changes to try immediately
1. Quick toggle to compare Uint32 vs Uint16 without big refactor
```typescript
// Add a runtime switch and build both index buffers once during init:
if (useUint32) {
  this.indexType = gl.UNSIGNED_INT;
  this.batchIndices = new Uint32Array(maxIndexCount);
} else {
  this.indexType = gl.UNSIGNED_SHORT;
  this.batchIndices = new Uint16Array(maxIndexCount);
}
// prefill indices for both, store both buffers, then bind the appropriate one for draw.
```
- Rationale: while Uint16 limits batch to ~16k quads, you can keep draw logic identical and simply increase number of draws to match. This isolates whether type-change impacts runtime.

2. Avoid per-frame subarray allocation
```typescript
// Create a persistent view at init:
this._vertexUploadView = new Float32Array(this.maxBatchVertices); // full capacity

// When filling vertices, write into batchVertices (your main buffer).
// When uploading:
gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._vertexUploadView.subarray(0, usedCount));
```
- Better: maintain one persistent Float32Array and copy only the used range into it with .set (this avoids creating a new subarray object every frame):
```typescript
this._vertexUploadView.set(this.batchVerticesFloat32, 0); // then upload whole view or used slice without creating new objects
gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._vertexUploadView);
```

3. Minimize local variable count in very hot loops
- Revert the pre-calculated 8-local approach if it caused register spills. Keep a minimal number of locals: reuse variables rather than allocate many named temporaries.

4. Replace Math.min in inner loop with inline branch
```typescript
let end = start + this.maxBatchSize;
if (end > indexCount) end = indexCount;
```
- Avoid function call overhead which may be JIT optimized but is worth testing.

5. Profile-friendly instrumentation toggles
- Add a dev flag to collect per-frame timing for: culling, transform, buffer upload, draw calls. Log or expose via a small in-game overlay.

---

### Profiling and measurement recipe (how you should measure each test)
- Use Chrome DevTools Performance trace (record ~5 seconds for stable averages).
- Collect:
  - JS CPU flame chart, show function hotness and allocations.
  - Memory allocations timeline (short-lived allocations / GC spikes).
  - WebGL calls timeline (to see bufferSubData and drawElements timings).
- For GPU metrics, use Chrome's "Record allocation timeline" + "GPU" sections or platform GPU profiler (if available) to see VS/FS timings and upload bandwidth.

Key numbers to capture per run:
- Average FPS and stdev (run 3×)
- JS main thread time per frame (ms)
- WebGL bufferSubData time per frame and bytes uploaded
- Number of draw calls per frame
- Allocations and GC frequency per second

Compare runs as deltas (not absolute).

---

### Mid-term architectural moves (if tests confirm CPU/GPU bandwidth issues)
1. Instanced rendering (drawElementsInstanced)
   - Immediate 1–2× reduction in draw calls. Requires packing per-instance attributes into buffers or textures.
   - Constraint: fewer texture switches; consider texture atlas to unify textures.

2. GPU-side vertex generation (vertex pulling or transform-from-entity-buffer)
   - Store entity state in a texture or structured buffer and expand quad in vertex shader. Eliminates massive CPU vertex assembly and big uploads.
   - Highest complexity but biggest potential win at 1M entities.

3. WebAssembly + SIMD for CPU transform math
   - If CPU remains bottleneck after other fixes, port transform math to Wasm SIMD for parallel transforms.

4. WEBGL_multi_draw (if available)
   - Use extension to issue many indexed draws in one call; reduces CPU overhead for many small draws.

---

### Short checklist you can action in the next 48 hours
1. Reproduce baseline with tracing (DevTools) — collect one canonical trace. (30–60 min)
2. Implement quick Uint16/Uint32 toggle + run 3× (30–90 min)
3. Run batch-size sweep (automate and log) and plot FPS vs batch (1–2 hours)
4. Replace per-frame subarray usage with a persistent view and test (30–60 min)
5. Re-run DevTools trace and compare flame charts to see if vertex transform or upload time changed (30–60 min)
6. If Uint32 is confirmed culprit, evaluate two fixes: (A) reduce batch size and keep Uint32, (B) rework to use Uint16 with more draws; choose based on measured throughput (1–2 hours)

---

### Expected outcomes and decision points
- If FPS improves significantly with Uint16: index memory increase with Uint32 was the main cause — pick a strategy: stay with smaller batches + Uint16 or move to WebGL2 and evaluate 65k+ batches with Uint32 and instancing.
- If batch-size sweep yields a distinct peak (e.g., 24k), use that as a platform-tuned default and implement adaptive batch sizing.
- If bufferSubData / subarray allocations are visible, switching to a persistent upload buffer will remove GC pressure and improve frame stability.
- If transforms still dominate after above fixes, prioritize instanced rendering or GPU-side vertex generation.

---

If you want, I’ll:
- produce the exact minimal code patch for the Uint16/Uint32 toggle and the persistent upload view (ready-to-drop into your repo), and
- generate a small script to automate the batch-size sweep and log FPS/time stats so you can graph results quickly.

Tell me which of those two you'd like first and I'll produce the patch.
