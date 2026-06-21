**Optimering med vertexkomprimering**

Jeg bør foreslå at komprimere vertex-formatet ved at pakke både farve og UV i en vec4 uint8 og bruge normaliserede attributter for at reducere hukommelsesbåndbredde. Triangle strips kunne også hjælpe med færre noder. Hvis jeg bruger et delt index-buffer og instancing via vertex pulling fra teksturbuffer, hvor jeg uploader per-sprite data til en flydende tekstur, kan transformering og rotation beregnes i vertex-shaderen, hvilket kan give bedre ydeevne. Jeg skal være opmærksom på problemløsning med GPU-roteringsartefakter og bruge ANGLE_instanced_arrays.
### Summary proposal

You can hit 60 FPS at 600k by shifting more per-sprite work off the CPU and reducing CPU→GPU vertex bandwidth. The highest-impact changes (in order) are:
1. Move per-sprite attributes into a GPU-side lookup (texture or buffer texture) and draw with a single static quad (vertex pulling) so the CPU only issues one large draw and streams 4 vertices per sprite in the GPU, not 16 floats per sprite from the CPU.  
2. Reduce attribute size (pack where possible) to cut GPU memory bandwidth.  
3. Reduce per-sprite CPU math and branching by writing a tight, linear writer for any remaining CPU-side vertex fill and batching buffer updates (or eliminate them entirely using vertex pulling).  

Below I give a compact plan, concrete designs you can implement inside WebGL2 (browser-compatible), and trade-offs.

---

### 1. High-level architecture change (why it helps)

- Current cost: CPU computes 4 corners per sprite and writes 16 floats → high CPU time + large upload to GPU (vertex buffer bandwidth ~10ms).  
- New approach: keep a single static unit-quad VBO (4 vertices, small) + one big index buffer; place all per-sprite data in a GPU-accessible array (texture buffer or floating RGBA texture). The vertex shader reads per-sprite data using gl_InstanceID (instanced draw) or gl_VertexID (multi-draw) and constructs the quad on the GPU. That reduces CPU work to filling a compact per-sprite metadata buffer (position, size, rotation, uv, color) instead of expanding to four full vertices. GPU does the corner math in parallel — memory bandwidth and CPU cost fall dramatically. This is the core lever you’re missing.

Expected effect: move most of that 10ms render cost into the GPU and/or reduce CPU→GPU bandwidth so the CPU render step drops to <3ms on modern hardware. This makes 60 FPS at 600k reachable.

---

### 2. Two implementable GPU-pulling variants (practical, browser-safe)

Note: both use WebGL2 only, no SharedArrayBuffer or compute shaders.

Variant A — Float texture (RGBA32F) / Texel Fetch in vertex shader
- Upload sprite metadata as a floating texture (width = nextPow2(n), height = 1 or tiled). Each sprite consumes 1 or 2 texels:
  - Texel0: position.x, position.y, size, rotationPacked
  - Texel1: uvPacked, colorPacked, extraFlags, padding
- Use gl.drawArraysInstanced with instance count = spriteCount and a static unit quad VBO (4 vertices). In the vertex shader use texelFetch(uSpriteData, ivec2(instanceIndex, 0), 0) to read the sprite record.
- Compute the two basis vectors in the shader (vec2 ex = vec2(cos, sin)*hw; vec2 ey = vec2(-sin, cos)*hh) and generate the final vertex position by adding/subtracting them to the sprite center depending on vertex ID.
- Use normalized bytes for rotation or store cos/sin precomputed in the texture if you want absolute minimum trig in shader.

Why this is safe: WebGL2 exposes texelFetch in vertex shader on sampler2D/texture2D for textures created with TEXTURE_2D and float internal format, although precision and driver support vary — use RGBA32F and check OES_texture_float_linear as fallback.

Variant B — Texture Buffer Object style via 2D texture + integer indexing
- Same concept but store sprite data in a 2D RGBA8/16 texture (packed) to minimize upload size. Unpack in shader (normalize / decode). This reduces upload bandwidth and avoids float textures on platforms that have poor float support.

Which to pick:
- If float textures are reliably available and performance-tested on your target GPUs, Variant A is simplest and highest precision.  
- If you need smaller uploads and wider compatibility, use packed RGBA8/16 (Variant B) and decode in the shader.

Performance note: instancing previously was “78% slower” because you likely still sent full expanded vertex data or used expensive draw calls per-batch. This design uses one instanced draw call with a static VBO and compact per-sprite texture — drastically different and should be much faster.

---

### 3. Data packing and layout (minimize upload size)

Keep one Float32Array or Uint8Array that you upload once per frame with minimal fields. Example packed layout (one 32-bit float texel = 4 × 8-bit lanes or one 32-bit float):

Option (compact): 3 texels per sprite (RGBA32F)
- Texel0: pos.x (f32), pos.y (f32), size (f32), rot (f32) OR store rot as byte in Texel1
- Texel1: uv.x, uv.y, uv.w, uv.h (or atlas index + uv offset encoded)
- Texel2: color.rgba packed into 4 bytes or unpacked floats

Option (tight-packed RGBA8): 6 bytes per sprite + 2 bytes padding, store:
- pos.x, pos.y as 16-bit floats (f16) or 16-bit signed integers in world units (quantized)
- size as 16-bit uint
- rotation as uint8 (0-255)
- uv and color packed into the smallest representation that still preserves quality.

Packing benefits: reduce CPU→GPU upload bandwidth by 4–8× versus expanded vertex buffers.

---

### 4. Vertex shader sketch (conceptual)

- Use a static unit-quad with attribute aCorner (vec2: -1/-1, 1/-1, 1/1, -1/1) or compute corner from gl_VertexID.
- Read per-instance sprite record via texelFetch / textureLod with integer indexing.
- Compute cos/sin (or read cos/sin from sprite data if precomputed on CPU).
- Compute final position:
  - vec2 ex = vec2(cos, sin) * (size * 0.5);
  - vec2 ey = vec2(-sin, cos) * (size * 0.5);
  - vec2 pos = center + (aCorner.x * ex) + (aCorner.y * ey);
- Output gl_Position = uProjection * vec4(pos, 0, 1).

This does rotation math for 600k sprites fully on GPU, leveraging its massive parallelism.

---

### 5. Practical CPU-side steps to migrate

1. Create a static unit-quad VBO and a single index buffer for quads (shared for all sprites).
2. Implement a per-sprite metadata buffer builder that writes compact packed sprite records (TypedArray). Keep this builder tight, linear, and branchless. Avoid per-sprite allocation or complex branches.
3. Upload metadata buffer using texImage2D (or texSubImage2D) once per frame. If using RGBA32F, use texSubImage2D with Float32Array; if using RGBA8 packed, use Uint8Array.
4. Issue a single drawElementsInstanced call per material/texture atlas belt. Group sprites by texture atlas so each draw uses the correct sampler. (You still need batching by texture; group sprites into contiguous ranges per atlas.)
5. In the shader, fetch per-sprite metadata using the instance ID. If you cannot use gl_InstanceID for any reason, use gl_VertexID to derive instance index by dividing by 4 (vertex count per instance).
6. Optionally precompute cos/sin on CPU and upload as two floats (avoids trig per-vertex). Cost: more upload but still smaller than full expanded vertices.

Implementation detail: for atlas textures, pass a base index uniform per draw call and use sprite.metadata.atlasIndex to index the right atlas region. Keep the number of draw calls = number of atlases/materials.

---

### 6. Trade-offs, caveats, and fallbacks

- Trade-offs:
  - Complexity: more shader logic and packing/unpacking code on CPU and GPU.
  - Debugging: harder to inspect vertices in JS because they are generated in the shader.
  - Compatibility: float texture access in vertex shader must be validated on your target GPUs. Provide an RGBA8 packed fallback.
  - Texture batching: you still must group by texture/atlas to keep draw calls low.

- Fallback if vertex-pulling isn’t viable on a particular GPU:
  - Implement a hybrid: CPU writes 1 vertex-per-sprite (center + two small precomputed basis vectors stored in buffer interpreted as vertex attributes) then use a geometry in-shader to expand to quad — but WebGL2 doesn’t support geometry shaders, so alternative is to write fewer floats per vertex (e.g., store center + half-extents + packed rotation) and expand in vertex shader via instancing. The key is always “send less expanded data.”

- Memory/precision:
  - Quantize positions to 16-bit or 24-bit if world extents allow, to cut upload size. This is often acceptable for large numbers of sprites and reduces bandwidth further.
  - If using precomputed cos/sin values: store them as normalized int8/uint8 and unpack in shader to save upload bandwidth and avoid trig.

---

### 7. Quick prioritized checklist you can implement this sprint

1. Create a working prototype for a single atlas:
   - static quad VBO + index buffer
   - Float32Array per-sprite RGBA32F texels (pos x,y, size, rot; uv, color etc.)
   - Vertex shader texelFetch using gl_InstanceID to build quad
   - Single drawElementsInstanced per-atlas
2. Measure render CPU time vs baseline. Expect large drop in CPU vertex fill and upload time.
3. If performance good, replace RGBA32F with packed RGBA8 or f16 quantization to further reduce upload time.
4. Add grouping by atlas/texture to keep draw calls minimal.
5. Add fallbacks for devices that lack reliable float texture support: use packed RGBA8 decoding.

Estimated performance gains (empirical ranges):
- CPU vertex build + upload: down from ~10ms → ~1–3ms (depends on upload size, GPU driver)  
- Total frame: should fall under 16.6ms at 600k on a modern GPU if physics+animation remain near current numbers.

---

### 8. Concrete micro-optimizations (if you prefer to avoid shader-pulling)

If for some reason GPU pulling is not acceptable, these smaller optimizations may still help but are lower impact:
- Precompute cos/sin × hw and cos/sin × hh for identical sizes and rotation combos into small lookup tables keyed by (size, rotation) so you avoid per-sprite multiplies. This becomes a 2D table; but memory grows — use coarser bins and accept tiny visual quantization.
- Pack rotation into a single byte index into the cos/sin table to reduce cache misses.
- Group sprites by identical size/rotation/uv so you can reuse a small precomputed quad per group and memcpy that group into the VBO in bulk (faster than per-sprite arithmetic).
- Use navigator.gpu-friendly uploads: single gl.bufferSubData for the entire vertex buffer instead of many small writes; allocate ArrayBuffer and write sequentially (you likely already do this).
- Reduce attribute count: if color is constant per sprite batch, pass as uniform for that batch.

These reduce CPU load but cannot beat moving corner generation to the GPU.

---

### Final recommendation

Start with the GPU vertex-pulling approach (instanced draw + per-sprite metadata texture). It is the single architectural change that directly addresses the 10ms render floor by removing the CPU expansion of sprites and slashing vertex upload bandwidth. Implement a packed data format and group by atlas to keep draw calls minimal. Test float-texture vertex fetch on your target hardware and add a packed RGBA8 fallback. With that change you should reasonably reach 60 FPS at 600k and still scale toward 1M with acceptable degradation.

If you want, I can:
- produce a minimal WebGL2 shader + JS prototype (unit-quad, metadata texture, vertex shader code) you can drop into WebGLBatchRenderer.ts, or
- produce a tight CPU-side packing layout and encoder for RGBA8/RGBA32F along with upload code and shader unpack functions.

Which of the two would you like me to generate first?
