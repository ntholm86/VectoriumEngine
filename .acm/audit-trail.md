
---

## 2026-06-20 — ai-steward: Remove the unintegrated WASM physics module from the initialization path and defer its integration until the physics API is clarified, since the destination explicitly states the WASM physics module is not integrated into the main path.

**[!DECISION]** Proposed: Remove the unintegrated WASM physics module from the initialization path and defer its integration until the physics API is clarified, since the destination explicitly states the WASM physics module is not integrated into the main path.  
*Rationale:* The destination document explicitly identifies that 'The WASM physics module (`assembly/physics.ts`) is not integrated into the main path; that is one concrete place the gap shows.' The current code creates the misleading impression that WASM is fully integrated when it is actually orphaned. Removing this false integration path eliminates maintenance burden and prevents users from relying on unfinished infrastructure. This clarifies the actual state of the codebase and creates honest scaffolding for the real API work that is prioritized.  
*Risk:* low

**Prediction:** In the Engine.loadScene method, remove or comment out the call to `this.currentScene.world.initializeWasm()` and the associated console logging (lines that initialize WASM physics and log '✅ WASM Physics initialized'). Replace with a single informational log explaining that WASM physics is available but not yet integrated into the main rendering path, pending API surface clarification.  
*Expected outcome:* The destination document explicitly identifies that 'The WASM physics module (`assembly/physics.ts`) is not integrated into the main path; that is one concrete place the gap shows.' The current code creates the misleading impression that WASM is fully integrated when it is actually orphaned. Removing this false integration path eliminates maintenance burden and prevents users from relying on unfinished infrastructure. This clarifies the actual state of the codebase and creates honest scaffolding for the real API work that is prioritized.

**Lenses applied:**
- *Commander’s Intent:* Operator destination (`.trail/destination.md`) loaded — improvement selected against stated direction.
- *Code examination:* Repository files within scope scanned for structural improvements.

**Blind spot:** The assembly/ directory and physics.wasm compilation pipeline were not examined. The change assumes the WASM module exists but is simply not wired into the rendering or update loop; if it is also missing from the build entirely, additional cleanup of WasmPhysics.ts and WasmPhysicsBridge.ts imports would be needed.

**File:** `src/vectorium/core/Engine.ts`  
**Tokens:** SCAN 185796/379 — IMPL 6263/4096 — cycle est. $0.17155 USD  
**Harness session:** `.trail/sessions/01KVJCJNJ3W6NG96GY3XFQR7MH.jsonl`  

**Diff:**
```diff
None
```

*Staged for operator review. Not committed.*

---

## 2026-07-05 — identify-rendering-bug-vectorium

Read the ask as: stop work on vectoroids and use the vectorium demos (spawning entities/shapes) to identify the rendering bug before attempting a fix. The destination says vectorium is dormant after winning the benchmark, with API/harness robustness as the priority if work resumes; this run is scoped to diagnosis, not a fix.

**[!DECISION]** Focus diagnosis on the live demos (`bunnytest.html` for instanced sprites, a temporary shape scene for the SDF path) rather than code-only review, because the operator explicitly wants reproduction-first identification.

**Prediction:** Running `bunnytest.html` and spawning bunnies will expose either a visible rendering glitch or a console/WebGL error that points to the root cause. The shape path will serve as a control to separate "all WebGL broken" from "instanced sprite path broken."

**What happened:**
- `bunnytest.html` spawns and updates particles (active count grows, FPS high), but the instanced sprite draw produces no visible output and the browser console repeatedly warns: `WebGL: INVALID_OPERATION: uniformMatrix4fv: location is not from the associated program` and `uniform1i: location is not from the associated program`.
- The warnings originate in `WebGLBatchRenderer.begin()` on the next frame after `InstancedSpriteRenderer.render()` runs. `InstancedSpriteRenderer` calls `gl.useProgram(this.program)` directly, but it never updates `WebGLBatchRenderer.currentShaderProgram`. The parent renderer therefore believes its own program is still bound and skips `gl.useProgram()`, then tries to set uniforms on the wrong program.
- A temporary shape-only scene using `drawBulkShapesIndexed` rendered correctly (draw calls, vertices, triangles all present, no program-location warnings). This isolates the bug to the instanced sprite path and its interaction with the parent renderer's cached program state.
- `demo.html` spawning is also non-functional in its current form: `EntitySpawner.triggerSpawn()` has no registered callback because `EntitySpawnService` no longer exists and `Engine.enableClickToSpawn()` is never called. That is a separate harness gap, not the rendering bug itself.

**Blind spot:** The exact reason the instanced draw itself produces no visible output is not fully pinned. The program-state corruption is confirmed and is at minimum a co-bug; there may be an additional issue in the instanced VAO/static-buffer setup or in how `drawArraysInstanced` is issued. A fix should first make `InstancedSpriteRenderer` cooperate with `WebGLBatchRenderer`'s cached state, then re-verify visibility.

**Next candidate:** Make `InstancedSpriteRenderer` restore the parent renderer's program after drawing (or make `WebGLBatchRenderer.begin()` always call `gl.useProgram()` defensively), then re-run `bunnytest.html` to see if sprites appear. If they still do not, inspect the instanced VAO attribute bindings and static-buffer upload.

**Cost:** moderate — browser-based reproduction, multiple temporary test pages, console and WebGL state inspection, then cleanup of diagnostic changes.

---

## 2026-07-05 — fix-rendering-bug-vectorium

Read the ask as: proceed with fixing the rendering bug identified in the previous run, still using reproduction-first verification via the live demos.

**[!DECISION]** Apply the fix in `WebGLBatchRenderer.begin()` by resetting the cached WebGL state at the start of each frame, rather than modifying `InstancedSpriteRenderer` to restore state. This is the smallest change that fixes the confirmed program-state corruption and also defends against any other child-renderer state drift (buffers, blend mode, viewport).

**Prediction:** Resetting `currentShaderProgram`, `boundVertexBuffer`, `boundIndexBuffer`, `currentBlendMode`, and `currentViewport` to null at the top of `begin()` will force the renderer to rebind its own program and buffers every frame. The WebGL `INVALID_OPERATION` uniform-location warnings will disappear, and the instanced sprite path will produce correct output.

**What happened:**
- Applied the cache reset in `WebGLBatchRenderer.begin()` (src/vectorium/rendering/WebGLBatchRenderer.ts).
- Re-ran `bunnytest.html` and started the progressive bunnymark. The previous `INVALID_OPERATION: uniformMatrix4fv/uniform1i location is not from the associated program` warnings no longer appeared.
- The instanced sprite draw call executes without GL errors. To verify output in the headless/automated browser context (where `requestAnimationFrame` is throttled for background tabs), I manually invoked `renderer.begin() → scene.render() → renderer.end()` and read pixels from the canvas. Pixels at the first few sprite positions showed the expected bunny texture colors (brown/orange/white), confirming the instanced path now renders correctly.
- The shape-only control scene still renders correctly.
- `demo.html` spawning remains non-functional because `EntitySpawnService` was removed and no callback is registered; that is a separate harness issue, not part of this rendering bug.

**[!REALIZATION]** The "black canvas" seen in the automated browser read was not a remaining rendering bug. Once the program-state corruption was fixed, the instanced renderer produced correct texture-colored pixels when the frame was driven synchronously. The asynchronous `requestAnimationFrame` loop is throttled in the automated background-tab context, so the screen was not being composited between clears. In a normal foreground browser tab the sprites are expected to be visible.

**Blind spot:** The fix is defensive rather than architectural. A cleaner long-term design would make `InstancedSpriteRenderer` cooperate explicitly with the parent renderer's cache (e.g., via a restore callback). The current fix is minimal and correct for the observed symptom, but if more child renderers are added later, the same state-bypass risk could recur.

**Cost:** moderate — one production edit, extensive browser-based verification with temporary diagnostic globals/shader overrides, then cleanup.

---

## 2026-07-05 — benchmark-vectorium-post-fix

Read the ask as: run the bunnymark benchmark to confirm the rendering fix holds under load and report the results.

**[!DECISION]** Use the live `bunnytest.html` progressive bunnymark as the verification benchmark, since it exercises the exact instanced-sprite path that was broken. Run it to completion (frame-time ceiling) and record the final stable numbers.

**Prediction:** The progressive bunnymark will spawn entities until frame time exceeds ~17 ms, then stop. With the cache-reset fix in place, it should reach the same ~4M entity ceiling seen in prior runs without the previous `INVALID_OPERATION` warnings.

**What happened:**
- Started `bunnytest.html?v=15` fresh and triggered the progressive benchmark with `F`.
- The benchmark ran to its frame-time stop condition and stabilized at **4,122,000 rendered entities** at **~60–64 FPS** (frame time **15.5–16.2 ms**, within the 16.67 ms budget).
- Mid-run snapshots:
  - 1,555,000 entities @ **264.4 FPS**, 3.78 ms frame time
  - 3,651,000 entities @ **81.8 FPS**, 12.22 ms frame time
- No WebGL `INVALID_OPERATION` program-location warnings appeared during the run.
- Memory stabilized around **1.6 GB JS heap** and **~7 MB VRAM**.
- The bottleneck is now the 16.67 ms frame budget, not corrupted GL state.

**[!REALIZATION]** The benchmark numbers confirm the fix is load-bearing, not just cosmetic. The instanced sprite path now sustains multi-million-entity throughput, which was impossible while the parent renderer was setting uniforms on the wrong program every frame.

**Blind spot:** The benchmark was run in an automated browser context where the tab is backgrounded, so `requestAnimationFrame` is throttled. The FPS numbers above are from the engine's own internal timing, not composited screen frames. In a foreground tab the visual result should match these internal metrics.

**Cost:** light — 1 browser page, 1 benchmark run, ~2.5 minutes of wall-clock spawn time.

---

## 2026-07-05 — scorecard-vectorium

Read the ask as: create a full 10-item scorecard/rubric for vectorium, using the benchmark as one measurement, and record it in `.acm/orientation.md`.

**[!DECISION]** Use the work skill's scoring guidance: ~10 measurements chosen for vectorium's actual destination (performance-proven WebGL2 engine, dormant, API/harness robustness priority if resumed), cite evidence from the trail and codebase, and give one concrete improvement per item checked against destination constraints.

**Prediction:** The scorecard will show strong rendering/ECS architecture and weak test coverage/type safety, with API/harness robustness in the middle. The aggregate will land in the high 60s, and the plateau reading will point toward test/type/API work rather than further performance optimization.

**What happened:**
- Dispatched an Explore subagent to gather evidence across the codebase (rendering, type safety, tests, build, docs, memory, ECS, observability, maintainability).
- Built a 10-item scorecard and appended it to `.acm/orientation.md`.
- Scores:
  - Rendering correctness under load: 9/10
  - Raw rendering performance: 9/10
  - Type safety: 5/10
  - Test coverage: 2/10
  - API / harness robustness: 5/10
  - Build / dev experience: 8/10
  - Documentation: 7/10
  - Memory / resource management: 8/10
  - ECS / architecture: 8/10
  - Observability / debugging: 8/10
- Aggregate: 69/100.
- Plateau reading: the next climb is test coverage, type safety at renderer boundaries, and API/harness robustness — consistent with the destination's stated priority. Further bunnymark optimization is not the right next move.

**[!REALIZATION]** The scorecard makes the destination's "API/harness robustness" priority concrete: it shows up as three of the four lowest-scoring items (type safety, test coverage, API/harness), while performance is already high. This aligns the next work with the destination rather than drifting back into benchmark tuning.

**Blind spot:** The `any` count and test-file count came from a subagent's grep; I did not independently verify every match. The scores are plateau-relative and should be re-derived if the focus shifts.

**Cost:** moderate — 1 subagent, codebase scan, scorecard write, orientation update.

---

## 2026-07-05 — fix-sparse-entity-render-bug

Read the ask as: invisible-but-colliding bullets in the Asteroids game (game-portal) are an engine bug; find and fix it in vectorium, verify via the game. Rejected alternative: patching the game to work around it — operator explicitly scoped the fix to the engine.

**[!DECISION]** Root cause: Scene.renderECSBatch built visibleIndices as 0..getActiveCount(), but entity IDs are sparse after free-list recycling (destroyEntity pushes IDs to freeList). Any live entity with id >= activeEntityCount was silently excluded from rendering, while game-side collision (reads positionX/Y directly) kept working — exactly the invisible-but-colliding symptom. Constant particle/bullet churn in Asteroids makes ID sparsity routine. Fix: iterate 0..getTotalCount() (allocated high-water mark); destroyed slots are already skipped by the FLAG_VISIBLE check in drawBulkShapesIndexed/drawBulkSpritesIndexed. Also removed leftover per-frame console.log debug lines and a per-frame double Uint32Array allocation in the culling branch; visibleCount stat now reports activeCount.

**Prediction:** iterating the allocated range makes all live bullets render, nothing extra appears (flags-filtered), bunnymark path unchanged (no churn there, counts equal). Verified in-browser: burst-fired bullets all visible simultaneously (screenshot), score accruing, no GL errors. Build clean.

**[!REALIZATION]** This bug class is invisible to the bunnymark: the benchmark never destroys entities, so ID sparsity never occurs there. Two rendering-correctness bugs in two days (instanced-sprite GL state, now sparse-ID indexing) both lived in paths the benchmark does not exercise. The benchmark is a throughput rubric, not a correctness rubric.

**Blind spot:** the render loop now always scans up to the high-water mark, so a scene that once held N entities keeps scanning N slots after mass destruction. Irrelevant at game scale; unmeasured at bunnymark scale (but bunnymark never shrinks, so its numbers should hold). Next candidate: an entity-churn render regression test (create/destroy cycling, assert all live entities emit vertices).

**Cost:** moderate — ~18 tool ops, 4 engine files read deep, 1 file edited, engine rebuild, live browser verification via the game. No subagent.

### Mini-orient addendum (same run)

Trigger: recurring finding-class — second rendering-correctness defect in the same area within two days, surfacing the same day the scorecard rated "Rendering correctness under load" 9/10.

Arc claims (falsifiable):
1. Rendering-correctness defects in vectorium cluster at seams the bunnymark does not exercise: entity churn, child-renderer state, harness integration. If true, the next rendering bug will also reproduce only in a real-game usage pattern, not in bunnytest.html.
2. The scorecard's 9/10 rendering-correctness score was over-anchored to benchmark evidence. The score measured throughput correctness, not lifecycle correctness. It should be re-read as covering only the no-churn path until a churn regression test exists.

Cost lines across recent entries look proportionate to stakes; no ceremony creep observed.

---

## 2026-07-05 — gpu-particle-system-transform-feedback

**Interpretation.** Operator revived the engine with a new standing destination: "beat all the other canvas engines in performance and quality," with game-portal games as the demonstration layer and bunnymark as the flagship benchmark (more to come). This contradicts destination.md Layer 1 ("further bunnymark optimization — that question is answered"), so per the read-back rule the shift was narrated first and recorded as an appended Layer 2 in destination.md, quoting the operator verbatim, history preserved. Rejected reading: a one-off bunnymark tune — the operator framing is a standing pursuit.

**Examination (lenses: Purpose, Performance).** Profiled before optimizing (orientation item 2 demanded exactly this). Phase-split at 3M bunnies with hard GPU sync: JS physics 8.04 ms (69%), CPU submit/upload 3.60 ms (31%), GPU ~idle. [!REALIZATION] The code comment "Performance: GPU-bound" was false — the benchmark was CPU-bound: the hand-unrolled x16 physics loop plus a ~24 MB/frame position upload. The GPU sat idle while the CPU did work a vertex shader could do.

**[!DECISION]** One change: new engine module `GpuParticleSystem` (src/vectorium/systems/GpuParticleSystem.ts) — WebGL2 transform-feedback physics. State [x,y,vx,vy] lives in ping-pong GPU buffers; update pass = vertex shader with RASTERIZER_DISCARD writing via transform feedback; render pass = one instanced draw reading positions straight from the state buffer (stride 16). Zero CPU physics, zero per-frame upload, one draw call. Alternatives rejected: WASM SIMD physics (still pays the upload; history shows WASM already tried and removed from this path) and double-buffered upload overlap (halves, not eliminates). bunnytest.html uses the GPU system by default, `?cpu=1` keeps the CPU system for A/B. Exported from index.ts for game use.

**Prediction vs outcome.** Predicted ~0 ms CPU and ceiling moving to the 6.5M config cap. Measured (identical serialized harness, readPixels-synced, 6.5M particles): CPU system 53.3 ms/frame (18.7 FPS, physics alone 16.05 ms) → GPU system 20.3-26.9 ms/frame (37-49 FPS), CPU cost ~0.01 ms. The progressive benchmark reached the 6,500,000 hard cap for the first time (previous best: 4,122,000). Rendering visually confirmed (screenshot, bunny pile under gravity, no GL errors).

**[!REVERSAL]** Mid-run false alarm: first pixel-verification showed a black canvas and I briefly treated it as a design failure. Root cause was my own harness calling `renderer.begin()` without width/height, collapsing the viewport to 0x0. The engine path was correct all along. Harness bugs can impersonate engine bugs — verify the harness before the hypothesis.

**[!REALIZATION] Benchmark methodology.** The engine's internal frameTime only measures CPU-side work; with GPU physics it reads ~0.03 ms even at 6.5M, so the progressive stop condition (frameTime > 17) can no longer stop the GPU path — it ran to the entity cap. Honest numbers now require GPU-synced measurement (readPixels 1px), which is how all figures above were taken; `gl.finish()` is a no-op under ANGLE and must not be trusted. The wall is now pure GPU fill rate (~6 Gpix/frame of blended overdraw at 6.5M x 26px sprites). Consequence for the "beat other engines" leg: like-for-like comparisons must use the same sync method on the same hardware — engine-internal FPS counters (ours or theirs) are not comparable claims.

**Reflection.** Falsifiable claim: on this hardware the 60 FPS ceiling for 26px blended sprites is ~5M regardless of any further CPU work — only overdraw reduction (smaller sprites, opaque paths, depth-test tricks) moves it. Blind spot: GpuParticleSystem has no unit test and its GL-state interaction with WebGLBatchRenderer's cache is exactly the seam the 2026-07-05 orientation flagged ("any new child renderer that bypasses the cached state") — begin() resets defensively each frame, and measurements show no corruption, but a churn+GPU-particles mixed scene is untested. Expert pushback anticipated: "transform-feedback particles are not engine parity — PixiJS bunnymark does CPU physics, so cross-engine comparisons must state the physics location." Correct — comparisons should be published in both modes; the `?cpu=1` path exists for exactly that.

**Across-trail triggers evaluated.** Deeper audit requested? No. Recurring finding-class? Yes — benchmark-blind-spot class recurs (churn invisible to bunnymark yesterday; CPU-side frameTime blindness today): mini-orient runs below. Contradicts a prior [!REALIZATION]? Yes, resolves one — "the bottleneck is the 16.67 ms frame budget" (benchmark-vectorium-post-fix) was true only of the CPU path; the real bottlenecks were CPU physics+upload, now GPU fill. Silence imminent? No.

**Candidate next moves (operator to rule):** (1) adopt a second benchmark: entity-churn stress (create/destroy cycling) — covers the correctness seam AND the game-usage pattern; (2) overdraw-reduction experiment (depth-tested opaque-pass rendering) to push past ~5M at 60 FPS; (3) a game-portal "particle storm" game using GpuParticleSystem to demonstrate the new capability; (4) like-for-like PixiJS bunnymark run on this hardware for the first "beat the rival" datapoint.

**Cost:** heavy — ~35 tool ops, 1 new module (+exports, +harness wiring), 2 builds, ~10 instrumented browser measurement rounds, screenshot verification. No subagent. Diagnostic globals (`__engine`/`__scene`) left in bunnytest.ts deliberately — they are the repeat-benchmark harness now, dev-page only.

### Mini-orient addendum (same run)

Trigger: recurring finding-class — "the benchmark cannot see X" now has three instances (entity churn, GL-state seams, CPU-only frame timing).

Arc claims (falsifiable):
1. Vectorium's measurement layer systematically reports CPU-side numbers as if they were frame truth. Any future performance claim not taken with an explicit GPU sync will overstate the engine. Testable: internal frameTime at 6.5M GPU-path says ~0.03 ms; synced truth is ~20-27 ms.
2. The performance frontier has moved off the CPU for the flagship benchmark. Further CPU micro-optimization of the bunnymark path (more unrolling, WASM) is now waste; the frontier is GPU fill/overdraw and benchmark breadth.
3. Cost trend across the last 5 entries rises (light -> moderate -> heavy) with stakes rising in step — revival + architectural change justifies it; no ceremony creep detected.

Orientation update appended separately.

---

## 2026-07-05 — pixijs-rival-benchmark

Read "I heard PixiJS ParticleContainer can run millions of bunnies — is that correct?" as: establish the actual competitive bar on this hardware, like-for-like — not a trivia answer. This converts candidate move #4 from the previous entry. [!DECISION] Built a permanent rival harness (pixitest.html + src/pixitest.ts, PixiJS v8.19 ParticleContainer, already a devDependency): same 800x600 canvas, same /bunny.png, same physics constants (gravity 2500, dt-based, same bounce), WebGL backend (not WebGPU) for fairness, position-only dynamic properties (pixi's fastest config), and the identical GPU-synced measurement protocol (1px readPixels/frame, ticker stopped, manual frames).

Predicted pixi would land near vectorium's CPU path per-entity but degrade earlier due to per-bunny Particle JS objects. Outcome: it degraded much earlier than predicted.

**Measured (same session, same machine, synced):**
| Bunnies | PixiJS v8 | Vectorium CPU | Vectorium GPU |
|---|---|---|---|
| 150k | 16.4 ms (61 FPS) | 7.0 ms (142) | 6.8 ms (146) |
| 500k | 54.3 ms (18) | 12.1 ms (83) | 9.9 ms (101) |
| 1M | 112.6 ms (9) | 24.6 ms (41) | 11.3 ms (89) |
| 3M | — | 54.8 ms (18) | 20.0 ms (50) |
| 6.5M | — | 99.0 ms (10) | 33.0 ms (30) |

60 FPS ceilings (synced, this machine): PixiJS ~150k; vectorium CPU ~600k; vectorium GPU ~2.2-2.4M. Vectorium GPU is ~10x pixi at 1M and ~15x by ceiling. Pixi rendering visually verified via pixel readback (bunny pile present).

**Answer to the operator's question:** "millions of bunnies" in PixiJS marketing/demos does not survive synced measurement on this machine — 1M runs at ~9 FPS. Such claims typically come from unsynced internal FPS counters (the same trap our own profiler had), beefier GPUs, or stripped-down variants. On like-for-like terms vectorium wins every rung, in both CPU and GPU modes.

Blind spots: (1) pixi's Particle path may not be its absolute fastest possible usage (a hand-rolled pixi custom shader could do better — but then it's not "PixiJS" anymore, it's raw WebGL); (2) single machine, single browser (Chromium/ANGLE) — the claim is hardware-scoped; (3) run-to-run variance observed on vectorium GPU at 6.5M (20-33 ms across sessions, thermal/driver) — same-session ladder is internally consistent, cross-session absolute numbers drift.

Mini-orient signals checked at append time: open item converted (this run) but the arc-claims from the last mini-orient are confirmed, not contradicted — orientation gets a one-line datapoint addendum, no rewrite. Next: publish-grade comparison would need multi-run medians and a second machine; also candidate: churn benchmark (still open), WebGPU-backend pixi comparison (pixi v8 supports it; vectorium has no WebGPU path — a real gap the "beat everything" destination will eventually hit).

Cost: moderate — 2 new benchmark files, ~8 tool ops, 3 measurement ladders in-browser. No subagent.

---

## 2026-07-05 — fair-benchmark-audit-sprite-aspect

Read the ask as: an external AI challenged the 6.5M number as potentially "gamified" (GPU compute physics, tiny sprites, no per-sprite dynamics); the operator wants the comparison made airtight under identical circumstances — and asked "I thought we were rendering sprites?" Rejected reading: defend the number as-is; a claim needing asterisks is a quality defect under the destination.

**Audit of the critique, point by point:**
1. Sprite reality: CONFIRMED REAL — full bunny.png texture, alpha-blended quads, unique per-bunny positions. Not tiny, not static.
2. [!REALIZATION] But a genuine unfairness found IN OUR FAVOR: the instanced shader scaled quads by scalar a_size → vectorium drew 26x26 squashed bunnies (676 px) vs pixi natural 26x37 (962 px) — ~30% less fill-rate work. Exactly what a hostile reviewer would find.
3. Physics location: the critique is right that GPU-physics vs CPU-physics rows are different claims. Already separated (?cpu=1); both published.
4. Per-sprite rotation/scale/alpha: NEITHER side has them — pixi harness is ParticleContainer position-only dynamics, its fastest mode, matching our path. Same circumstances. Named limitation: vectorium instanced path currently CANNOT do per-instance rotation (no attribute) — future benchmark rung.

**[!DECISION]** One change: aspect-correct sprite rendering. u_aspect uniform in InstancedSpriteRenderer (default 1 = no behavior change for other callers), aspectY threaded through WebGLBatchRenderer.drawInstancedSprites; GpuParticleSystem u_size scalar → vec2(26,37). Both vectorium paths now draw true 26x37 bunnies — identical pixels to pixi.

**Prediction vs outcome:** predicted fill-bound rungs slow ~proportionally to +42% pixels. WRONG in absolute terms — fresh-page ladders came out FASTER than yesterday's stale-session numbers despite bigger sprites. [!REALIZATION] Session freshness (driver/GC/thermal accumulation across measurement rounds) dominates a 42% fill change at these sprite sizes. Consequence: publishable numbers must come from fresh same-session triplets, which this run did (all three ladders back-to-back, fresh pages).

**Fair numbers (fresh same-session, 26x37 sprites both sides, GPU-synced, this machine):**
| Bunnies | PixiJS v8 | Vectorium CPU-physics | Vectorium GPU-physics |
|---|---|---|---|
| 150k | 15.5 ms (64 FPS) | 1.65 ms (606) | 1.78 ms (562) |
| 500k | 56.9 ms (18) | 5.33 ms (188) | 3.60 ms (278) |
| 1M | 113.6 ms (9) | 9.10 ms (110) | 5.66 ms (177) |
| 2M | — | 18.3 ms (55) | 10.8 ms (92) |
| 3M | — | 25.9 ms (39) | 14.6 ms (69) |
| 6.5M | — | 54.5 ms (18) | 33.7 ms (30) |

60 FPS ceilings: PixiJS ~150k; vectorium CPU-physics ~1.8M (the like-for-like "true engine performance" row: CPU physics, full-size sprites — 12x pixi); vectorium GPU-physics ~3.2M (labeled separately as the GPU-resident row). Pixi numbers reproduced within 6% of yesterday (15.5 vs 16.4 ms @150k) — pixi was stale-insensitive; vectorium was not (its frames touch far more memory).

**Direct answers to the critiquing AI:** physics on CPU or GPU? Both, measured and labeled separately — the 12x claim uses CPU physics. Average bunny size? 26x37 = 962 texels, full-resolution texture, alpha-blended, identical on both sides. Rotation/scale/alpha per sprite? Neither side, by both engines' fastest-path design; a rotation rung is future work. The critique's "real game strain" point (collision, state machines, mixed textures) is correct and matches our own churn-benchmark open item.

Blind spot: the fresh-vs-stale variance (up to 2x at high counts) is now the biggest threat to any published number; multi-run medians with cooldown gaps are needed before public claims. Next candidates: (1) churn benchmark (still open, now doubly justified); (2) per-instance rotation attribute + rotation benchmark rung; (3) scripted fresh-run benchmark protocol (medians, cooldowns) instead of hand-driven ladders.

Cost: moderate-heavy — 4 engine files edited (aspect fix), 1 build, 3 fresh measurement ladders, pixel verification. No subagent.

---

## 2026-07-05 — operator-observation-12kfps-and-6.5m-cap

Operator asked to trail two things: (1) observed "6.5 million bunnies on CPU path with +12k FPS"; (2) why the cap is 6.5M.

(1) The +12k FPS reading is the documented broken telemetry (orientation claim 3), observed live by the operator: the profiler FPS derives from a CPU-side frame timer that never waits for the GPU and reads near-zero during/after harness-driven sessions (values of 2,500-28,571 "FPS" appeared in overlays this session). Honest GPU-synced numbers at 6.5M: CPU-physics path 54.5 ms (~18 FPS), GPU-physics path 33.7 ms (~30 FPS). What was real: 6.5M bunnies existing, simulating, and rendering. The profiler FPS/frameTime display is now actively misleading operators, not just benchmarks — upgraded from a methodology note to a UI defect. Candidate fix: either sync the displayed frame time (1px readPixels once per second — cheap) or label the display "CPU frame time" explicitly.

(2) The 6.5M cap is ENGINE_CONFIG.maxEntities = 6_500_000 (EngineConfig.ts) — a pre-allocation constant sizing ~30 SoA typed arrays in World, the bunnymark arrays, and the GPU ping-pong state buffers (208 MB VRAM at 6.5M; ~0.8-1 GB RAM+VRAM total). Historically set just above the git-history best of 6.1M bunnies. Not an architectural wall: raising it is one line + linear memory. Not worth raising now — the synced 60 FPS ceiling (~3.2M, fill-rate-bound) is far below the cap, so a higher cap buys slideshow headlines, not claims.

No code changed. Tier 2 — the realization worth keeping is the reclassification of the profiler FPS display as a UI defect.
Cost: light — 2 file reads, 1 grep, no builds, no browser.

---

## 2026-07-05 — remove-hardcoded-cap-find-real-limit

Read "hardcoded caps are no good — 6.5M is not the engine actual limit" as destination-level guidance: limits are discovered, not declared. Recorded as a confirmed constraint in destination.md (read back to operator in-run). Rejected reading: bump 6.5M to a bigger constant — same mistake, higher shelf.

**[!DECISION]** One change: capacity is now a `?max=N` URL parameter in bunnytest. GPU path takes any N (self-contained VRAM, 32 B/particle, loud OUT_OF_MEMORY throw added to GpuParticleSystem instead of silent GL error). CPU path clamps to config.maxEntities with a console warning because InstancedSpriteRenderer static buffers are sized by it — honest clamp, not silent. Hardcoded 6500000 stop condition removed. (Noted in passing: the harness had gained a GPU-synced stop probe since last read — the orientation "watch for" item about the dead stop condition appears already addressed by another writer.)

**Prediction vs outcome:** predicted linear scaling past 6.5M with the wall at VRAM allocation. Half right — the wall is nastier than an allocation failure:
| Bunnies | synced frame | FPS | notes |
|---|---|---|---|
| 10M | 80.9 ms | 12.4 | renders, no errors |
| 20M | 99.0 ms | 10.1 | renders |
| 30M | 157.5 ms | 6.3 | renders |
| 50M | 274.1 ms | 3.6 | renders, pixels verified (49/50 strip), 1.6 GB state VRAM |
| 100M | 972 ms | 1.03 | allocation SUCCEEDS (3.2 GB, driver overcommit) but pixels go black-strip and frame time explodes — PCIe paging, not compute |

**[!REALIZATION]** The machine's true limit is not an allocation error: the driver overcommits VRAM silently and pages over PCIe, so "it allocated" does not mean "it works." Real limit on this machine: between 50M (working, verified pixels) and 100M (paging collapse). The honest headline: **50,000,000 bunnies simulated and rendered at 3.6 FPS — 7.7x the old cap — with zero errors**; 60 FPS ceiling unchanged at ~3.2M (fill-rate, unaffected by cap removal, exactly as predicted last run).

Blind spot: OUT_OF_MEMORY guard never fired (overcommit bypasses it) — a paging-detection heuristic (frame-time cliff per added chunk) would catch the real wall programmatically; not built, noted. Also untested: context-loss recovery if the OS reclaims the overcommitted memory mid-run.

Next candidates: unchanged from prior entries (churn benchmark, rotation rung, scripted median protocol) plus: paging-cliff detection in the progressive benchmark so it reports "memory wall" as a distinct stop reason from "frame budget".

Cost: moderate — 2 files edited, 1 build, 3 measurement rounds including a deliberate walk into the memory wall. No subagent.

---

## 2026-07-05 — enginedocs-history-destination-layer3

Operator corrected the benchmark framing — bunnymark means "what can it handle while maintaining 60 FPS" — and directed a read of engineDocs (~41 files) as the source of historical requirements and destination. Dispatched an Explore subagent for the digest; read OPTIMIZATION_CHALLENGE.md directly (operator had it open).

Appended Layer 3 to destination.md (read back in-run): the 60 FPS metric as the only headline (max-count-at-any-FPS is envelope data); the MassCanvas origin (MMO, 1000+ players, 60 FPS desktop / 30 mobile, NO-HTML constraint); quality non-negotiables (textures, text, shapes, physics, transparent ECS, zero-allocation, "reject on visual quality loss"); the historical change-acceptance rule (accept only if FPS same/better or >10% time cut; reject on >5% FPS drop or quality loss).

**[!REALIZATION] Verdicts expire.** PERFORMANCE_LOG.md recorded "GPU instancing: 78% slower than batching" as a rejection — the same technique is now the flagship path after the zero-copy/static-buffer redesign. Failed-optimization verdicts are dated facts about a specific design, not eternal truths about a technique. This matters for the docs full of "attempted & failed" lists (spatial hashing, SIMD, workers): each may deserve a revisit under the new architecture.

Reframed under the honest metric: historical best 601k @ 60 FPS -> today CPU-physics 1.8M, GPU-physics 3.2M @ 60 FPS (GPU-synced). The 50M figure from the cap-removal run stays labeled as memory-envelope data.

Blind spot: subagent digest covered ~12 files deeply, skimmed the rest; specific per-file claims (esp. INDUSTRY_BENCHMARK_COMPARISON methodology) not independently verified against primary text. Next candidates: mobile-target measurement (30 FPS tier exists in destination but no mobile datapoint this era), and re-audit of the "attempted & failed" list under the current architecture.

Cost: light-moderate — 1 subagent (research only), 2 file reads, 2 trail/destination appends. 

---

## 2026-07-05 — quality-boundaries-and-renderecsbatch-consolidation

Operator set architectural boundaries: DRY/KISS/YAGNI/solve-by-design/make-bugs-impossible/simplicity/clarity/consistency/transparency, with PERFORMANCE and QUALITY overruling all. Recorded verbatim-in-spirit in destination.md (read back in-run). Also flagged cost-consciousness ("Fable 5 is expensive") — run kept to one change.

**[!DECISION]** One change, chosen because it is where the boundaries and the week's bug history intersect: Scene.renderECSBatch had two byte-identical branches (shouldCull / !shouldCull) — the dead split is where the sparse-ID bug hid, because every fix had to be applied twice and the culling branch never actually culled (pure YAGNI violation pretending to be a feature). Collapsed to a single path; renamed the loop bound totalCount -> idRange so the count-vs-ID-bound confusion (the week's recurring bug class) is named in the code itself, with the invariant documented at the declaration. Rejected alternative: a broad sweep of the ~98 `any` usages — high token cost, low leverage per token, and no bug class attached.

**Prediction vs outcome:** predicted ~45 lines removed, identical behavior. Outcome: build clean, bundle -1.2 kB, Asteroids verified live (played, scored 170, shapes/ship/bullets render, churn path exercised). Hot loops untouched — performance boundary respected by construction.

Transparency debt created and named: `cullingEnabled` field and public `setCullingEnabled()` are now no-ops (the branch they governed was already dead before this run — it did the same thing on both sides). Removing public API is an operator decision: flag, do not delete silently. Candidate next: remove or reimplement real culling behind it.

Blind spot: no automated regression test pins renderECSBatch behavior — the churn render test remains the top open test item; this consolidation makes it cheaper to write (one path to pin, not two).

Cost: light-moderate — 1 file consolidated, 1 build, 1 live game verification, 2 appends. No subagent.

---

## 2026-07-05 — churn-render-regression-test

Bare ask ("use the work skill"). Best hunch from trail open items, proceeded as explicit assumption: the churn render regression test — top open item across three entries, serves the fresh quality boundary (test coverage weakest axis), and converts the week's bug class into a permanent guard. Alternatives passed over: setCullingEnabled ruling (blocked on operator), benchmark protocol (larger).

**[!DECISION]** Wrote Scene.churn.test.ts (2 tests, node env, stub renderer, no WebGL): (1) sparse-ID case — 100 created, first 60 destroyed, so ALL live IDs >= activeCount; asserts every live entity appears in the draw call and destroyed ones do not. The precondition assertion (min live ID >= activeCount) makes the test structurally incapable of passing under the old count-bound bug. (2) recycle case — 5 create/destroy waves, asserts exactly the 50 live entities render.

Predicted stub-renderer approach works in node; it did. New suite: 32/32 green (was 30 StateMachine-only). First render-correctness test in the codebase.

Blind spot: the test pins index/flag semantics, not pixels — a shader- or GL-level regression stays invisible to it; a headless-GL smoke test remains open. Next: operator ruling on setCullingEnabled no-op is still the cheapest open decision.

Cost: light — 1 test file, 2 test runs. No subagent, no builds.

---

## 2026-07-05 — profiler-honest-labels-and-miniorient

Bare ask. Hunch executed as explicit assumption: fix the profiler FPS display defect (misled the operator with "+12k FPS" — transparency boundary violation, flagged 2 entries ago). [!DECISION] Chose zero-cost honest relabeling over the 1 Hz readPixels sync probe: labels now read "CPU FPS" / "CPU Frame Time" / "(CPU-side)" section headers with explanatory tooltips. The sync probe adds a deliberate GPU stall to debug sessions — stronger fix, but it trades performance for it, and the performance boundary says that trade needs operator sign-off. Offered as opt-in candidate.

Predicted relabel-only, no behavior change: build clean, 32/32 tests green, bundle +0.2 kB (label text).

Mini-orient ran this run (backstop tripped at 7 entries + churn-test stretch closed) — appended to orientation.md: measurement honesty as differentiator, destination now dense enough for bare-ask navigation, 2/4 predictions wrong and flagged (honest arc), cost trend matches stakes. Watch: operator rulings queue, remaining boundary gaps, trail density approaching derived-summary territory.

Cost: light — 1 file relabeled, 1 build, 1 test run, 2 appends. No subagent.

---

## 2026-07-05 — scorecard-v2-post-revival

Read "rate it, from work skill, since destination has changed" as: a scoring request, distinct from a plain examination — produce ~10 measurements chosen for the CURRENT (layered) destination, not the pre-revival one. The prior scorecard (`scorecard-vectorium`, 69/100) was already marked void by the gpu-particle-system mini-orient when the destination shifted; this is a fresh scorecard, not a delta against it.

**[!DECISION]** Chose 10 measurements weighted toward what actually changed today: benchmark leadership, measurement honesty (new — the day's dominant theme), churn correctness, architectural boundary compliance (new operator boundary), no-hardcoded-caps (new), test coverage, quality non-negotiables held, API/harness robustness, documentation currency, build/dev experience. Verified fresh evidence rather than reusing memory: grepped current `any`/`as any` count (97 across 21 files, PerformanceMonitor.ts ~40+) and confirmed only 2 test files exist before scoring items 4 and 6.

Each item's improvement suggestion checked against confirmed constraints — none propose a hot-path cost, matching "performance and quality overrule everything." Two flagged as cheapest/highest-leverage: resolve `setCullingEnabled` no-op (transparency debt, twice-named, still open), and extract `IParticleSystem` shared interface across CPU/GPU particle systems (DRY, zero runtime cost).

**Aggregate: 68/100**, nominally flat vs the void 69/100 — explicitly read as "holding the line while the bar rose," since this scorecard tests against a destination roughly 3x larger (rival benchmarking + measurement honesty + architectural boundaries didn't exist as measurement axes this morning). Recorded, not treated as a target to beat next time — per the plateau rule, this too is void the moment focus shifts again.

No code changed this run — pure measurement. Cost: light — 3 greps, 1 orientation append (the scorecard), 1 trail append.

---

## 2026-07-05 — scorecard-v2-todo-batch

Read "complete vectorium todo... reach that plateau" as: execute the scorecard v2 improvement column — and as the operator ruling on the open setCullingEnabled question (the scorecard item said doing nothing does not satisfy; the operator said do the todo).

**[!DECISION]** Executed the 5 bounded items; explicitly deferred the 4 project-sized ones rather than half-doing them:
1. (Item 4) setCullingEnabled RESOLVED by removal per YAGNI — it never culled (governed a byte-identical branch). Removed: Scene field+method, Engine.loadScene call, both README code examples (which promised "only render visible entities" — false advertising for a no-op).
2. (Item 8) IParticleSystem interface extracted (systems/IParticleSystem.ts) — both particle systems now implement it, bunnytest types against it, exported from index.ts. Compile-time only, zero runtime cost.
3. (Item 5) EngineConfig.maxEntities comment: default allocation size, NOT a performance cap — limits are discovered, never declared.
4. (Item 9) PERFORMANCE_LOG.md verdicts-are-dated banner added, citing the GPU-instancing overturn as proof, instructing re-test before rejecting techniques.
5. (Item 10) README benchmark-harness section: ?cpu=1 / ?max=N flags + the GPU-synced measurement rule documented.

Predicted all-green with no behavior change beyond the API removal: build clean, 32/32 tests, Asteroids verified live post-change (ship/asteroids/collision working — a life was even lost to an asteroid mid-verification; score 0 was misses, confirmed visually, not a render break). [!REVERSAL]-adjacent note: initial IParticleSystem imports were placed mid-file (legal but unclear); moved to file tops before commit under the clarity boundary.

**Deferred (project-sized, named, not forgotten):** second rival benchmark + churn benchmark rung (item 1), opt-in GPU-synced profiler probe (item 2), headless-GL pixel smoke test (item 3), GpuParticleSystem unit test (item 6 — blocked on a GL context strategy for tests; the churn-test stub approach does not transfer).

Plateau status vs scorecard v2: items 4, 5, 8, 9, 10 improved; items 1, 2, 3, 6 unchanged (project-sized). Re-scoring now would be premature — the deferred items are the remaining distance to the plateau.

Cost: moderate — 9 files touched (2 API removals, 1 new interface, 3 doc fixes, 1 comment, 2 wiring), 1 build, 1 test run, 1 live game verification. No subagent.

---

## 2026-07-05 — meaningful-commits-and-push

Read "meaningful commits and push" literally, but first audited working-tree state since much of it predated this conversation. Found 9 deleted legacy files (System.ts, VectoriumCore.ts, EntitySpawnService.ts, entities/factories.ts, old particles/BunnymarkParticleSystem.ts, ExampleBehaviors.ts, PerformanceSystem.ts, RenderSystem.ts, SceneBehavior.ts) already removed in the working tree but never committed. Verified before including them: grepped all current src for references (none, only stale comments), and found corroborating evidence in .acm/compass.md (a prior session, "auditonomy v3.0.0", had already flagged RenderSystem.ts as dead/safe-to-remove, and the branch is literally named back-to-scratch) — concluded these were pre-existing intentional cleanup, safe to finalize.

**[!DECISION]** Structured 6 commits by theme rather than one dump, matching today's own DRY/clarity boundary applied to git history itself: (1) legacy scaffolding removal + pixi.js dep, (2) sparse-ID render fix + branch consolidation + culling API removal + regression test, (3) GPU particle system + shared interface + aspect fix + cap removal, (4) profiler honesty relabel, (5) PixiJS rival benchmark harness + stale-verdict doc note, (6) .acm/ trail state. Verified build + full test suite green before and after staging, then pushed to the already-tracked origin/back-to-scratch (no force, no branch surprises).

**[!REALIZATION]** Found an untracked, superseded duplicate: src/pixi-bunnymark.ts + pixi-bunnymark.html — an earlier, cruder version of today's pixitest.ts rival harness, with a hardcoded `MAX_BUNNIES = 6500000` that directly contradicts the no-hardcoded-caps boundary set this session. Not referenced anywhere else. Left deliberately UNCOMMITTED and untouched rather than silently deleting unfamiliar work or silently folding it in — flagged to the operator for a keep/delete ruling.

**Also found (worth a correction note, not acted on):** .acm/compass.md (a different, pre-existing skill's file) records an explicit operator correction from 2026-07-04: manual/interactive browser driving IS the accepted test methodology here, and future runs should NOT propose adding Playwright/e2e test infrastructure as if fixing a gap. This session's own scorecard item 3 ("add a headless-GL/browser-run vitest smoke test") sits close to that line — noted as a boundary check for the next run to weigh before executing that specific backlog item, not reversed here since it wasn't executed this run.

Pushed: 6 commits, 50b6d64..0b9a6ce, origin/back-to-scratch. Build clean, 32/32 tests green both before staging and after the push.

Cost: moderate — repo audit (git status/diff/grep across ~30 files), 6 staged commits, 1 build, 1 test run, 1 push. No subagent.

---

## 2026-07-05 — readme-performance-claims-audit

Read "is README.md correct in its performance claims" as a verification audit, not a rewrite request — check what is cheaply verifiable, fix what is definitely wrong, name what is merely stale/unverified rather than guessing at it.

**Findings, by confidence:**

1. **DEFINITELY WRONG, fixed:** headline said "600,000 entities @ 60 FPS (10M+ vertices/frame)" — the README's own benchmark table two sections down says 600k entities = 2,400,000 vertices (4/quad). 10M+ was an unexplained ~4x overclaim contradicting the doc's own data. Corrected to "2.4M+ vertices/frame, 4 vertices/entity."

2. **DEFINITELY WRONG, fixed and independently verified via `tsc --noEmit` against real src types:** the flagship Quick Start example did not compile. Three real errors: (a) `new Vectorium({canvas, width, height})` — `Vectorium`'s constructor requires an `EngineConfig` class instance (it has methods like `debug()`), a plain object literal fails structural typing; (b) `document.getElementById('game')` returns `HTMLElement | null`, not `HTMLCanvasElement` — type mismatch even if (a) were fixed; (c) `new GameScene()` — `Scene`'s constructor requires a `name: string` with no default, so a subclass with no constructor cannot be instantiated with zero arguments. Ran the ORIGINAL snippet through `tsc` first to confirm all 3 errors precisely, then the CORRECTED snippet (using `EngineConfig` + `VectoriumBuilder`, the same pattern bunnytest.ts/pixitest.ts actually use in this repo) to confirm zero errors. This is the first README code sample in this repo verified by an actual compiler rather than by reading.

**Flagged, not fixed — needs an operator decision, not a guess:** the "600,000 entities @ 60 FPS / 14.5ms" general-purpose ECS batch-rendering table (and its sibling Vertex-Format/Rotation-Cache/Batch-Size sub-tables) is the historical pre-revival number (matches engineDocs' "601,000 @ 60 FPS — Unrivalled" almost exactly) and is a DIFFERENT code path from today's bunnymark-specific particle systems (Scene/World's general `drawBulkShapesIndexed`/`drawBulkSpritesIndexed` path, not `BunnymarkParticleSystem`/`GpuParticleSystem`). It was almost certainly measured with the same CPU-only unsynced FPS counter fixed today, and predates today's `Scene.renderECSBatch` changes (sparse-ID fix, branch consolidation). Not proven wrong — genuinely unverified. Named rather than silently assumed correct or silently rewritten.

Blind spot: did not verify the "Architecture Decisions" section's qualitative claims (SoA cache-friendliness, etc.) — those are structural/architectural facts unlikely to have rotted, lower priority than numeric benchmark claims.

Next candidate (operator's call, project-sized): run a fresh GPU-synced benchmark of the general Scene/World entity path (not the specialized particle systems) to confirm or correct the 600k table — same rigor already applied to the bunnymark numbers today.

Cost: light-moderate — read ~150 README lines, grepped/read 4 source files, wrote and tsc-verified 2 throwaway snippets (then deleted them), 2 README edits, 1 build, 1 test run. No subagent.

---

## 2026-07-05 — general-entity-benchmark-verified-600k-was-wrong

Operator pushed back on the prior audit's "flagged, not fixed" item: "is 600k @ 60fps correct? I thought performance was higher." Read intent as: stop flagging, actually measure the general Scene/World entity path (not the bunnymark particle systems) with today's GPU-synced protocol, and correct the README with the real number either way.

**[!DECISION]** Built entity-bench.html/src/entity-bench.ts: a minimal harness driving the real Scene/World/WebGLBatchRenderer path directly (world.createEntity + setShapeType, Scene.update/render), GPU-synced via 1px readPixels per frame — same protocol as every other benchmark today. Kept as a permanent harness (like pixitest.ts), not a throwaway.

**Prediction:** expected the operator's instinct ("performance was higher") to be right in spirit but the specific 600k/14.5ms table to be stale/optimistic given it's the same unsynced-FPS-counter era as the other historical claims found today.

**What happened — the operator was right that something was off, but in the OPPOSITE direction than hoped:** GPU-synced measurement shows the true 60 FPS ceiling for generic (non-textured, shape) entities on this machine is **~300,000**, not 600,000. Ladder: 280k=65.1 FPS, 300k=61.1 FPS (crossover), 340k=52.7 FPS, 600k=33.7 FPS — less than half the claimed FPS at the claimed count. Phase-split at 600k: update 6.07ms, CPU render-submit 20.86ms (corner/rotation calc + SDF batching in `drawBulkShapesIndexed` — the bottleneck), GPU-sync 3.63ms. Visually verified (screenshot, entity count, zero GL errors) — real, not a measurement artifact.

**[!REALIZATION]** The specialized bunnymark particle systems (GpuParticleSystem, ~3.2M @ 60 FPS) and the general Scene/World entity path (~300k @ 60 FPS) are TWO DIFFERENT, unequally-optimized pipelines. The GPU-instanced/transform-feedback work done today only benefits particle-system users; a typical game entity (a shape or sprite added via `world.createEntity`, like Asteroids' ship/asteroids/bullets) still goes through the older CPU-bound SDF/batch path and never received that speedup. The README's headline number conflated "the engine" as a monolith when it is actually two performance classes.

Corrected README.md: headline now states ~300k for generic entities (GPU-synced, dated) alongside the ~3.2M GPU-particle figure, both labeled by which path they measure. Replaced the Benchmark Results table with the real ladder, kept the original table below marked explicitly "unverified assumptions, kept for history — do not cite as current." Added a caveat above the Vertex-Format/Rotation-Cache/Batch-Size sub-tables noting their absolute numbers share the same invalidated anchor even though their qualitative direction (packed bytes > float, etc.) is still architecturally plausible. Fixed one incidental markdown fence-spacing bug introduced by the prior edit.

Blind spot: did not attempt to CLOSE the gap (optimize the general entity path to match the particle path's technique) — that is a real, now well-evidenced next candidate, but a project, not this run's scope. Also did not re-verify the Vertex-Format/Rotation-Cache/Batch-Size sub-tables' numbers directly (flagged, not measured) — same discipline as before: don't guess, name it.

Cost: moderate — 1 new benchmark harness (2 files, kept permanently), ~6 measurement rounds across 2 page loads, 1 screenshot, 2 README sections corrected, build+test verification. No subagent.

---

## 2026-07-05 — clarify-two-benchmark-numbers-readme-callout

Operator remained confused after the prior fix's brief mention: "we had 6.5M bunnies, why only 300k now?" Read this as direct evidence the prior README edit did not communicate the distinction clearly enough — a documentation-clarity failure, not a new measurement question (the numbers themselves were already correct and trailed).

**[!DECISION]** Explained directly in chat first (comparison table: what each path measures, physics location, who uses it, bottleneck), then made the README itself unmistakable rather than relying on scattered mentions: added a prominent comparison callout immediately after the H1, before any specific number is stated, so a reader hits the explanation before either number. One correction: my first pass used an h3 inside a blockquote, skipping a heading level (h1->h3) — caught by the markdown linter, converted to bold text instead, matching the file's own existing informal-heading style (already full of MD036 bold-as-heading patterns).

**[!REALIZATION]** A number can be individually correct and verified (as both 300k and 3.2M were, per the prior two trail entries) and still cause confusion if the DOCUMENT doesn't explain why two true numbers about "the same engine" differ by 10x. Verification and communication are separate failure modes — this session fixed the first without fully fixing the second on the first attempt. Worth carrying forward: after correcting a number, ask "would a reader with no session context understand why this differs from the other number nearby?", not just "is this number now true?"

No new measurements taken this run — pure documentation clarity fix, informed entirely by prior trail entries and today's already-established facts.

Cost: light — 1 README section rewritten, 1 lint-driven correction, no builds/tests needed (docs only).

---

## 2026-07-05 — unify-render-paths-instanced-shapes

Operator: frustrated that bunnytest and Scene/World are two paths; believed bunnymark optimization had optimized the whole engine (this morning's measurement proved it had not); wants ONE path that handles everything, configurable for benchmarks — "unless this is stupid."

**Interpretation + architectural ruling (Tier 3).** Judged the proposal correct for RENDERING and incorrect for PHYSICS, and said so before acting: rendering unification is exactly right (the general path's bottleneck was CPU corner/rotation math + 80 B/entity vertex upload — precisely what instancing removes, already proven at 3.2M on this engine); physics unification is not (game code must read/write positions CPU-side every frame — Asteroids collision does — which GPU-resident transform-feedback state cannot serve). Result: one render technique everywhere; GPU physics stays an opt-in particle configuration = the operator's own "configure it for bunnymark" framing.

**[!DECISION]** Built InstancedShapeRenderer (static unit quad + per-instance [x,y,rotDeg,size,packedMeta] @ 20 B/instance, VS does rotation/scale/camera, FS reuses the SDF library extracted to shaders/sdfShapes.ts as single source of truth — DRY + guaranteed visual parity). WebGLBatchRenderer gains ONE public entry point drawEntities() (instanced on WebGL2, legacy CPU batcher fallback on WebGL1 only) + supportsInstancedEntities getter; Scene.renderECSBatch now makes a single call and no longer fills the index array on the instanced path. Metadata packing kept byte-identical to legacy ([R8|G8|B8|A3|Shape5]).

**Prediction vs outcome.** Predicted ceiling ~300k -> >=700k. Outcome: **~500k @ 60 FPS** (450k=63.9, 500k=61.2, 550k=56.8) — +67%, real but short of prediction. 600k: 29.7 -> 18.8 ms; 1M now 33.6 FPS (previously the 600k rate). Remaining cost at high counts: World.updateFrame physics (~6ms @ 600k) + per-instance fill loop + GPU — the CPU corner-math term is gone but physics and fill remain, which the prediction underweighted. Honest gap noted, not smoothed over.

**Verified:** entity-bench fresh-page ladder (GPU-synced), pixel strip 60/60 non-black, zero GL errors; Asteroids played live — ship visibly rotated mid-flight, asteroids/bullets correct, crisp SDF shapes (screenshot). Churn regression tests caught the contract change exactly as designed (stub had the old entry point), updated to pin drawEntities; 32/32 green. README updated to ~500k with before/after table. Two commits pushed (da8c8d6 feat, 7499e0a docs+harness+trail), 0b9a6ce..7499e0a.

**[!REALIZATION]** The churn test failing on the API change was the test WORKING — it forced the new path to prove the sparse-ID invariant before landing. Guard tests pay for themselves fastest during redesigns, not during maintenance.

Blind spots: (1) legacy drawBulkShapesIndexed is now WebGL1-fallback-only dead weight on WebGL2 — removal candidate once WebGL1 support is explicitly ruled on; (2) textured-sprite general entities still use drawBulkSpritesIndexed — same unification applies, not done this run (scope); (3) 3-bit alpha quantization inherited from legacy packing — parity-preserving but coarse; a future format could widen it. Next candidates: sprite-path unification, then re-audit the physics side (updateFrame ~6ms @ 600k is the next bottleneck term).

Cost: heavy — 2 new files, 3 files rewired, 1 test updated, 2 builds, 2 test runs, 3 measurement rounds, live game verification, 2 commits + push. No subagent.

---

## 2026-07-05 — rival-benchmark-general-gaming-path

Operator: "how does my engine ACTUALLY compare against pixi.js and others — not bunnymark, the actual gaming path." Read as: the destination's "beat all other canvas engines" claim must be proven on each engine's idiomatic game-object path, with the real-game workload (movement + rotation), same synced protocol.

**[!DECISION]** Three harnesses, one workload (drift + wall bounce + continuous per-entity rotation, 800x600, GPU-synced): entity-bench (vectorium World + instanced shapes, rotation via engine-integrated setRotationSpeed — idiomatic), pixi-general (PixiJS v8 Container+Sprite, JS update loop — idiomatic), phaser-general (Phaser 3 GameObjects.Image, scene update — idiomatic; Phaser installed as devDependency). Each engine does the workload the way its own users would write it — that IS the comparison, architecture included.

**Results (fresh pages, pixel-verified, zero GL errors):**
| Engine | 60 FPS ceiling | @100k |
|---|---|---|
| Vectorium | ~500k (500k = 62.4 FPS w/ rotation) | 3.8 ms (265 FPS) |
| PixiJS v8 | ~100k (100k = 61.7) | 16.2 ms |
| Phaser 3 | ~85k (interpolated; 100k = 54.8) | 18.2 ms |

**5x PixiJS, ~6x Phaser on the path games actually use.** Notably vectorium's rotation is free (GPU-side trig since unification) — the rotation workload cost rivals real CPU time but vectorium nothing measurable vs the rotation-free ladder earlier today.

Honest asymmetries, stated in README not hidden: (1) vectorium draws SDF circles, rivals draw the 26x37 bunny texture — comparable coverage, different fragment work; (2) vectorium physics runs in engine typed arrays, rivals in per-object JS loops — this is the architectural difference being measured, not an unfairness, but a reader should know both. Phaser measure() drives renderer.preRender/sys.render/postRender manually — verified rendering via pixel readback before trusting it.

README gains a "Rival Comparison — the general gaming path" section. Committed + pushed (83833ec).

Blind spots: single machine/browser as always; Phaser ceiling interpolated between 50k/100k rungs rather than bisected on a fresh page; no Two.js/Kontra/etc — "others" currently = the two biggest, more can join via the same harness pattern. Next candidates: publish-grade medians protocol, sprite-path unification (would let vectorium run this exact benchmark with textures for full symmetry).

Cost: heavy-ish — 4 new files, 1 dep install, 3 ladders + verification rounds, README update, commit+push. No subagent.

## 2026-07-06 - fix-dead-spawn-callback-and-profiler-metric-collision

Bare ask ("identify the bug yourself and verify it - there may be several bugs, use the work skill"). Read from orientation.md's own "Watch for" list: the demo.html spawn-callback gap was already named twice (identify-rendering-bug-vectorium, meaningful-commits-and-push entries) as a real, unresolved harness bug, distinct from a rendering bug - the cheapest, already-diagnosed starting point rather than fresh speculative hunting.

**[!DECISION] Bug 1 - dead spawn callback, verified before touching code.** Opened demo.html live, clicked the canvas repeatedly: Active entity count stayed 0, zero console output (silent failure, not even an error). Traced the chain: Engine.enableClickToSpawn() -> EntitySpawner.triggerSpawn() -> checks this.onSpawnCallback -> grep confirmed registerSpawnCallback() is defined but has exactly one call site (itself) anywhere in src - nothing ever registers it, since EntitySpawnService was deleted as legacy scaffolding in a prior session. Considered restoring the full deleted EntitySpawnService (recovered via git show 1e833cb~1) but its scope (texture caching, trig LUTs, tween/animation system, text rendering) is a genuine project, not a bug fix - the panel promises 21 shape types + sprite + text + animation, none of which are equal-sized problems. Scoped the real fix to shape-type spawning only (21 options, all mapped exactly via the existing ShapeType enum - zero guessing), and made sprite/text/animation FAIL LOUDLY (console.warn naming the gap) instead of silently, converting "100% broken, invisibly" into "core case works, edges named."

**[!REALIZATION]** First implementation attempt referenced `Engine.SPAWN_SHAPE_MAP` - get_errors reported zero problems, but live-clicking threw `ReferenceError: Engine is not defined` (the class is actually named `Vectorium`). Static analysis missed a real runtime bug that live verification caught immediately - the same lesson this repo's own orientation.md already carries about benchmarks ("ask what the benchmark structurally cannot see") applies to get_errors too: it is not a substitute for running the code.

**[!DECISION] Bug 2 - found opportunistically while verifying Bug 1's fix, not hunted separately.** Screenshot after the Bug 1 fix showed ECS METRICS "Active: 0" next to "Shapes: 100" - inconsistent. Tested whether "Active" meant "entities under active physics" (a plausible non-bug reading, since physicsMode was "none" in the first check) by re-running with physicsMode=full: Active stayed 0, Shapes read 200. Ruled out the benign reading, traced the real cause: two DOM elements both carry data-metric="active" (the header "Entities" stat and the ECS METRICS breakdown row), and PerformanceMonitor's set() helper uses querySelector (singular) - only the first DOM match ever updates. Fixed by giving the breakdown row its own data-metric="ecsactive" key plus a matching set() call.

**Verified together:** npm run build clean (wasm+lib+types), npm test 32/32 green, live re-test (star5 shapes, physicsMode=full): Active and Shapes both read 100 in agreement, screenshot confirms correct rendering with physics running. Committed as eb5bb45.

Blind spot: did not audit the rest of PerformanceMonitor.ts's ~30 other data-metric bindings for the same duplicate-key pattern - this was found by lucky visual inspection of one screenshot, not a systematic sweep. A quick grep for duplicate data-metric values across the file would be cheap and is a good next candidate if more profiler trust is wanted.

Cost: moderate - repo history dig (git show on a deleted file), 2 files changed, 1 self-caught runtime bug in my own fix, ~10 live browser verification rounds, 1 build, 1 test run, 2 screenshots, 1 commit. No subagent.
