# Orientation — vectorium

_Dated 2026-07-05. Current claims based on the last few audit-trail entries._

## Current claims

1. **The instanced-sprite rendering bug is fixed.** The root cause was `WebGLBatchRenderer` trusting its cached `currentShaderProgram` after `InstancedSpriteRenderer` switched programs directly via `gl.useProgram()`. Resetting the cache at the start of each frame in `begin()` eliminated the `INVALID_OPERATION` uniform-location warnings and restored correct sprite output.

2. **Performance ceiling is unchanged by the fix.** The progressive bunnymark still tops out at ~4.12M entities at ~60 FPS (frame time ~15.5–16.2 ms). The bottleneck is the 16.67 ms frame budget, not GL state corruption.

3. **Benchmarking should be a standing measurement for vectorium.** Because the engine's primary claim is performance, the progressive bunnymark result (entities at 60 FPS) is a natural rubric item. Future changes that touch rendering, the ECS update path, or memory layout should re-run this benchmark and report the delta.

## Watch for

- Any new child renderer that bypasses `WebGLBatchRenderer`'s cached state. The current fix is defensive; a more robust long-term design would make child renderers cooperate explicitly with the cache.
- Cost creep in runs that do not touch performance-critical paths. The destination says the engine is dormant and further bunnymark optimization is not the goal; benchmark runs should be scoped to verification, not optimization.
- The `demo.html` harness gap (`EntitySpawnService` removed, no spawn callback registered) if the operator wants interactive spawning restored — that is a separate API/harness issue, not a rendering bug.

---

## Scorecard — 2026-07-05

_Temporary plateau diagnostic. Scores describe the current shape of the codebase, not a standing target. Void if destination or focus shifts._

| # | Measurement | Score | Evidence | One improvement |
|---|-------------|-------|----------|-----------------|
| 1 | **Rendering correctness under load** | 9/10 | `bunnytest.html` progressive bunnymark reaches 4,122,000 entities @ ~60–64 FPS with no GL errors after the `WebGLBatchRenderer.begin()` cache-reset fix (audit-trail `fix-rendering-bug-vectorium`, `benchmark-vectorium-post-fix`). | Add a regression test that asserts no `INVALID_OPERATION` warnings during an instanced draw frame. |
| 2 | **Raw rendering performance** | 9/10 | 24-byte packed vertex format, 65K sprite batches, rotation cache, instanced path with static buffers; mid-run snapshot at 1.55M entities showed 264 FPS (3.78 ms/frame) (`benchmark-vectorium-post-fix`). | Profile where the 16.67 ms ceiling is actually spent (CPU upload vs GPU draw) before optimizing further. |
| 3 | **Type safety** | 5/10 | `tsconfig.json` has `strict: true`, but ~98 `any` usages across 21 files (`WebGLBatchRenderer.textureManager`, `Scene._textureManager`, `PerformanceMonitor.renderer`, `demo.ts` cast). | Replace the highest-leverage `any` types with interfaces (`ITextureManager`, `IRenderer`) starting with renderer ↔ texture-manager boundary. |
| 4 | **Test coverage** | 2/10 | Only `StateMachine.test.ts` exists; `vitest.config.ts` uses `node` environment; `tsconfig.build.json` excludes `*.test.ts`. No rendering, ECS, physics, or performance tests. | Add one headless WebGL/Canvas render smoke test and one ECS `World` lifecycle test. |
| 5 | **API / harness robustness** | 5/10 | `IEngine.ts` and `ISpawnableScene.ts` exist, but `demo.html` spawning is broken because `EntitySpawnService` was removed and no callback is registered (`identify-rendering-bug-vectorium`). WASM physics is optional but module path is hardcoded with weak error recovery. | Restore or replace the `demo.html` spawn callback path; add a fallback for missing WASM module. |
| 6 | **Build / dev experience** | 8/10 | `package.json` has clean multi-stage build (`build:wasm`, `build:lib`, `build:types`), Vite dev on port 3000, sourcemaps, `npm link` support. | Document how to run tests in watch mode and how to consume the built library. |
| 7 | **Documentation** | 7/10 | 52 `engineDocs` files cover architecture, performance iterations, FAQ; README has quick start and claims. Inline comments explain strategy but lack parameter/return docs. | Generate or write an API reference for public exports; add JSDoc to `WebGLBatchRenderer` public methods. |
| 8 | **Memory / resource management** | 8/10 | SoA typed arrays pre-allocated in `World.ts`, VRAM optimizations in `InstancedSpriteRenderer`, GC tracking in `PerformanceMonitor`, object/buffer pooling exists. | Add a heap-leak detection test that runs the bunnymark for N frames and asserts stable heap growth. |
| 9 | **ECS / architecture** | 8/10 | Solid SoA pattern, entity recycling via free list, subsystem counters for O(1) early exits, scene/world separation. | Consider deferred entity deletion to avoid mid-frame lifecycle issues. |
| 10 | **Observability / debugging** | 8/10 | Adaptive quality levels, 9 metrics collectors, debug UI panels (`EntitySpawner`, `UIPanelManager`), emoji-prefixed logs. | Add a one-click "export performance timeline" button to the profiler. |

**Aggregate: 69/100**

**Plateau reading:** The engine's rendering and ECS architecture are strong and the immediate bug is fixed. The low-hanging ceiling is test coverage and type safety at the renderer boundaries. The destination says vectorium is dormant and API/harness robustness is the priority if work resumes — that points at items 3, 4, and 5 as the next plateau to climb, not further performance work.

---

## Mini-orient addendum — 2026-07-05 (fix-sparse-entity-render-bug)

**New claim:** Rendering-correctness defects cluster at seams the bunnymark never exercises (entity churn, child-renderer state, harness integration). A second such bug was found and fixed today: Scene.renderECSBatch indexed 0..activeCount, but IDs are sparse after free-list recycling, so live entities with high IDs were never rendered while still colliding.

**Scorecard correction:** Item 1 (Rendering correctness under load, 9/10) is over-scoped — its evidence covers only the no-churn benchmark path. Read it as "throughput-path correctness" until an entity-churn render regression test exists. That test is now the highest-leverage item under measurement 4 (test coverage).

**Watch for:** any render path that derives an iteration bound from an entity *count* instead of the allocated ID range or an explicit live-index list.

---

## Mini-orient addendum — 2026-07-05 (gpu-particle-system-transform-feedback)

**Destination shifted:** engine revived; new Layer 2 in destination.md — "beat all the other canvas engines in performance and quality," games as demonstration layer. Per the plateau rule, the 2026-07-05 scorecard is now VOID (destination shifted); its per-item evidence remains useful history but the aggregate is not a standing target.

**Current claims:**
1. The bunnymark was CPU-bound, not GPU-bound: physics 8 ms + upload 3.6 ms vs GPU ~idle at 3M (measured, hard-synced). Fixed by GpuParticleSystem (transform feedback): CPU ~0.01 ms at 6.5M; progressive benchmark now reaches the 6.5M cap (previous best 4.12M); synced full-frame 20-27 ms at 6.5M.
2. The frontier is now GPU fill rate / overdraw. CPU micro-optimization of this path is waste.
3. Measurement integrity: engine-internal frameTime is CPU-only and now reads ~0 on the GPU path. All performance claims must use GPU-synced measurement (readPixels 1px; gl.finish is a no-op under ANGLE). Cross-engine comparisons must use the same sync method and state where physics runs (`?cpu=1` exists for like-for-like).

**Watch for:**
- The progressive benchmark stop condition (frameTime > 17) is dead for the GPU path — it runs to the entity cap. Needs a GPU-synced stop condition before the next headline number is published.
- GpuParticleSystem x WebGLBatchRenderer state seam in mixed scenes (churn + GPU particles) — untested.
- Benchmark blind-spot finding-class (3 instances now): before trusting any benchmark result, ask what the benchmark structurally cannot see.

**Datapoint addendum (2026-07-05, pixijs-rival-benchmark):** First rival measurement confirms claim 3's methodology matters: PixiJS v8 ParticleContainer, synced, this machine: ~150k bunnies @ 60 FPS; 1M @ ~9 FPS. Vectorium GPU: ~2.2-2.4M @ 60 FPS, 6.5M @ 30 FPS. First "beat the rival" datapoint: won at every rung (~10x at 1M). Rival harness is permanent: pixitest.html + src/pixitest.ts. Named gap: pixi v8 has a WebGPU backend, vectorium does not.

**Correction addendum (2026-07-05, fair-benchmark-audit-sprite-aspect):** The pixijs-rival-benchmark datapoint above used vectorium bunnies drawn as 26x26 squares (instanced shader scalar size) vs pixi 26x37 — unfair in vectorium favor. Fixed (u_aspect / vec2 u_size); fair fresh-session numbers: pixi ~150k @60FPS unchanged; vectorium CPU-physics ~1.8M @60FPS (12x, the like-for-like row); vectorium GPU-physics ~3.2M @60FPS (separate row — GPU-resident physics is a different claim class). New measurement rule: publishable numbers only from fresh same-session triplets; stale sessions degraded vectorium up to 2x at high counts. Open: churn benchmark, rotation rung (instanced path lacks per-instance rotation), scripted median-based benchmark protocol.

---

## Mini-orient — 2026-07-05 (end-of-day arc read; supersedes claims above where they conflict)

Read window: the 9 entries this loop wrote today (sparse-ID fix -> profiler relabel).

**Arc claims:**
1. **Measurement honesty is now the engine differentiator, not just hygiene.** 5 of 9 entries center on it (GPU-synced protocol, fair sprite aspect, fresh-session rule, envelope-vs-headline split, profiler relabel). Falsifiable: vectorium numbers survive adversarial audit — the external "gamified benchmark" critique strengthened the claim (12x like-for-like) instead of denting it.
2. **The destination matured from dormant to dense in one day** (revival Layer 2, historical Layer 3, architectural boundaries). Evidence it works: two consecutive bare asks resolved from trail+destination alone, no operator correction.
3. **Prediction honesty check: 2 of 4 material predictions were wrong or half-wrong** (fill-rate prediction beaten by session-freshness effect; cap-wall was paging, not allocation) — both flagged in-entry. No suspiciously clean runs. One [!REVERSAL] (harness begin() misuse) properly marked.
4. **Cost trend matches stakes:** heavy mid-day (GPU particle system, 3 benchmark ladders), deliberately light after the operator's cost signal ("Fable 5 is expensive"). No ceremony creep detected.

**Watch for:**
- Operator rulings queue: setCullingEnabled no-op (remove vs. reimplement), opt-in GPU-synced profiler probe. Surface once per run, max — do not nag.
- Remaining gaps by boundary: headless-GL pixel smoke test (quality), per-instance rotation rung (benchmark breadth), scripted median protocol (measurement).
- Trail entry density: 10 entries in one day on one file — if pace holds, a derived summary (full-suite orient) becomes worth its cost.

---

## Scorecard — 2026-07-05 (v2, post-revival)

_Temporary plateau diagnostic. Scores describe the current shape of the codebase against the LAYERED destination (revival + historical + architectural boundaries), not a standing target. The 2026-07-05 v1 scorecard (69/100, pre-revival) is superseded — its destination no longer exists in this form; kept as history, not as a baseline to beat._

| # | Measurement | Score | Evidence | One improvement (checked against confirmed constraints) |
|---|-------------|-------|----------|-----------------------------------------------------------|
| 1 | **Benchmark leadership** (destination: "beat all other canvas engines") | 8/10 | Fair like-for-like vs PixiJS v8 ParticleContainer, same sprites, GPU-synced: vectorium CPU-physics ~1.8M vs pixi ~150k @ 60FPS (12x) — `pixijs-rival-benchmark` + `fair-benchmark-audit-sprite-aspect` entries. Not 10: only one rival measured, one machine, no breadth benchmark yet (destination explicitly wants "other benchmarks too"). | Add a second rival (Phaser or Two.js) and a second benchmark type (churn, not just static spawn) — no constraint blocks this, it's pure backlog. |
| 2 | **Measurement honesty / methodology** | 9/10 | GPU-synced protocol adopted after discovering `gl.finish()` is a no-op under ANGLE; profiler UI relabeled "CPU FPS/CPU Frame Time" after it showed fabricated "+12k FPS" to the operator (`profiler-honest-labels-and-miniorient`); fresh-vs-stale session rule documented after 2x variance found. Not 10: the stronger fix (opt-in GPU-synced live probe) is a named, unactioned candidate awaiting operator sign-off. | Ship the opt-in GPU-synced probe behind a debug flag (off by default) — respects the performance boundary (no cost unless explicitly enabled) while closing the gap. |
| 3 | **Rendering correctness under entity churn** | 8/10 | Sparse-ID bug found and fixed (`fix-sparse-entity-render-bug`); regression test now pins it structurally (`Scene.churn.test.ts`, 2 tests, fails if the old count-bound reappears). Not 10: test covers index/flag semantics only, no pixel-level/GL-level churn test exists yet. | Add a headless-GL (e.g. gl via node + mock canvas or a browser-run vitest) smoke test asserting non-zero draw calls after churn — closes the pixel-level gap named in the churn-test entry's own blind spot. |
| 4 | **Architectural boundary compliance** (operator: DRY/KISS/YAGNI/solve-by-design) | 5/10 | One design-level win: `renderECSBatch`'s duplicated dead-branch collapsed, the exact spot the sparse-ID bug hid (`quality-boundaries-and-renderecsbatch-consolidation`). But 97 `any`/`as any` usages remain across 21 files (PerformanceMonitor.ts alone: 40+), and `setCullingEnabled()` is a known, named, still-unresolved no-op — a transparency violation left standing. | Resolve the `setCullingEnabled` no-op first (cheapest named debt, already flagged twice) — remove the API or reimplement real culling; either satisfies solve-by-design, doing nothing does not. |
| 5 | **No-hardcoded-caps compliance** (fresh operator boundary) | 9/10 | The 6.5M constant removed in favor of `?max=N`; empirically walked to the real wall (50M working, 100M paging collapse) instead of declaring a number (`remove-hardcoded-cap-find-real-limit`). Not 10: `config.maxEntities` still exists as a real allocation-sizing default for the CPU/static-buffer path — appropriate (a default isn't a cap) but not yet distinguished from a cap anywhere in code comments. | Add a one-line code comment at `EngineConfig.maxEntities` distinguishing "default allocation size" from "hard cap" so a future reader doesn't reintroduce the conflation this session dissolved. |
| 6 | **Test coverage** | 3/10 | Still only 2 test files (`StateMachine.test.ts`, `Scene.churn.test.ts`), 32 tests total, node-environment only — up from 1 file / 30 tests this morning, and the new file targets the highest-risk class (render correctness), not just easiest-to-test. | Add a WASM physics or GpuParticleSystem unit test next — GpuParticleSystem has zero tests and is now the flagship rendering path (named blind spot in `gpu-particle-system-transform-feedback`). |
| 7 | **Quality non-negotiables held** (historical: textures/text/physics/shapes not sacrificeable) | 9/10 | All still functional and exercised today: Asteroids (shapes, physics, particles) played live post-consolidation; bunnymark textures verified pixel-level after the aspect-ratio fix. No regression traded for any performance win this session — matches the historical accept/reject rule (`enginedocs-history-destination-layer3`). | None needed at 9/10 — holding steady is the win; revisit only if a future perf change tempts a trade. |
| 8 | **API / harness robustness** | 4/10 | Unchanged since the pre-revival scorecard: `demo.html` spawn callback still broken (`EntitySpawnService` removed, no replacement registered — noted, not touched, in 3+ entries). New duality: CPU (`BunnymarkParticleSystem`) vs GPU (`GpuParticleSystem`) particle systems now coexist with near-identical but not-unified APIs (`render(renderer, textureManager, ...)` signature duplicated, not shared via interface). | Extract a shared `IParticleSystem` interface for the CPU/GPU particle systems — pure DRY/consistency win, no performance cost (compile-time only), directly serves the fresh architectural boundary. |
| 9 | **Documentation currency** | 5/10 | engineDocs (~41 files) is rich and now feeds the destination directly (Layer 3), but contains verdicts the current architecture has already falsified — e.g. PERFORMANCE_LOG.md's "GPU instancing: 78% slower, rejected" is now the flagship path (`enginedocs-history-destination-layer3` [!REALIZATION]). Nothing in the docs folder itself flags this yet. | Add one short note atop PERFORMANCE_LOG.md (or a new engineDocs file) marking historical verdicts as dated-not-eternal, pointing to the current GpuParticleSystem as the supersession — cheap, prevents a future reader (human or agent) from being misled by stale "failed" verdicts. |
| 10 | **Build / dev experience** | 8/10 | Unchanged and solid: clean multi-stage build, all builds green this session (5+ rebuilds, all clean), `npm link` workflow intact, bunnytest/pixitest harnesses both dev-served without friction. | Document the `?cpu=1` / `?max=N` harness flags in README or a benchmark-protocol doc so the next person (or agent) doesn't have to read source to discover them. |

**Aggregate: 68/100** — nominally flat vs. the superseded v1 (69/100), but the composition is different: this scorecard measures against a much larger destination (rival benchmarking, measurement honesty, architectural boundaries) that v1 didn't test for at all. Read as "holding the line while the bar rose," not stagnation.

**Plateau reading:** the day's work (measurement honesty, cap removal, one DRY fix, one regression test) opened more debt than it closed — every new capability (GPU particle system, rival harness) arrived without its own test or without full API unification. That is expected of a revival's first day, not a warning sign, provided the next few runs close what today opened rather than open more. The two cheapest, most load-bearing next moves by boundary-fit: (a) resolve `setCullingEnabled` (transparency, one line either way), (b) `IParticleSystem` interface (DRY, zero performance cost). Both satisfy "performance and quality overrule" trivially since neither touches a hot path.

---

## Mini-orient — 2026-07-05 (session-close check; backstop fired at 6 entries)

Trigger: backstop counter (6 entries since last mini-orient) + natural arc boundary (operator asked "are we done").

**Arc claims since last mini-orient:**
1. The revival day's shape held: scorecard v2 (68/100) executed 5 of 9 improvement items same-day, remainder named not abandoned.
2. Repo hygiene closed a real gap: 6 themed commits pushed, resolving pre-existing uncommitted legacy-scaffolding deletions that predated this session.
3. Documentation-honesty became its own finding-class today, distinct from measurement-honesty: two README numbers were each individually true but under-explained, requiring a second pass (clarify-two-benchmark-numbers) after the first fix. Lesson banked: verification and communication are separate failure modes.
4. **Not yet true "done":** uncommitted work exists (README.md's two follow-up fixes, entity-bench.html/ts, .acm trail) since the last push (0b9a6ce). This is the one fact that answers "are we done" honestly — not yet, at minimum a commit is outstanding.

**Open operator rulings, unchanged, still queued (surface once, not nagging further):**
- pixi-bunnymark.ts/html: orphaned duplicate with a hardcoded cap — keep or delete?
- Whether to invest in closing the 300k-vs-3.2M general-entity-path gap (a named, evidenced, unscoped project).

**Watch for:** if the operator says "done" without addressing the outstanding commit, that is their call to make (uncommitted local work is not itself broken), not a thing to push back on unprompted.
