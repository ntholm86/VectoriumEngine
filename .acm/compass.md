# Compass — vectorium

_Last updated: 2026-05-03 (run: engine-typed-interface)_  
_Derived from: five-run arc, read against vision.md._

---

## Current claims

**1. The typed-engine migration is nearly complete.**  
`engine`, `animationSystem`, and `performanceMonitor` are now all typed on `Scene` with proper setters. `(scene as any).engine` in Engine.ts is gone. `IEngine.ts` cleanly breaks the circular-import constraint. The remaining `any`s in Scene.ts's injection surface are `_setTextureManager(any)` parameter and `private _textureManager: any` — two lines, one run.

**2. Harness is operational; 30/30 tests pass.** (closed)

**3. The original game's requirements are the missing design input; the usability proof does not yet exist.**  
Vision: "can I now build that game with vectorium?" No run has examined what the original game required. The API surface is getting typed — but typed against what the *benchmark demo* uses, not against what a *game* would need. `IEngine` exposes textureManager, config, performanceMonitor. Whether inputManager, spawnService, or other services belong in the contract is unknown without the original game's requirements.

**4. The WASM physics integration gap has been flagged four times but never examined.**  
Unchanged from prior compass.

---

## What the next runs should test

1. **Type `_setTextureManager`** — change `private _textureManager: any` to `private _textureManager: TextureManager | null` and `_setTextureManager(textureManager: TextureManager)`. Closes the last `any` in Scene.ts's injection surface. One-run clean-up.
2. **Determine WASM physics integration status** — read `assembly/physics.ts` vs main update loop. Four-run-old unknown: classify as feature gap, deferral, or dead code.
3. **Name the original game's API requirements** — Hunch question. Without it, typed API improvements are validated against the benchmark demo only, not the actual intended use.

---

## Loop-effectiveness notes

Five runs. The structural risk (cosmetic fixes instead of root fix) was named — and this run acted on the root. `IEngine` required creating a new interface file and touching four files; it was the right move. The remaining `any` in Scene.ts is shallower and can be closed in the next run. The loop is now close to exhausting the "typed service surface" class of findings — the next structural question will be whether the typed surface is complete for the *original game*, not just the benchmark.

---

## Addendum — 2026-07-04 (auditonomy v3.0.0, verify-before-cleanup run)

**New arc-claim (6):** A recalled "tens of millions, no-sprite, physics-driven swarm" build does not exist anywhere in this repo — not on `back-to-scratch`, `master`, or `refactor`, not in any commit message, not in any doc. Live-verified current ceiling (this machine, this session): ~4.17M *sprite-rendered* entities at the ~60 FPS boundary in `bunnytest.html`'s progressive benchmark — real and fast, but not the no-sprite claim. The one genuine non-textured draw path in the live code is the SDF shape-rendering branch of `WebGLBatchRenderer.ts` (circles/triangles, `u_hasTexture=0`), used for the separate "Shapes" ECS category, unmeasured at particle-swarm scale. This does not change claims 1-5 above; it adds a sixth data point specifically about the requested cleanup's safety: nothing found here changes the assessment that the dead `RenderSystem.ts` path (flagged in the prior run) is safe to remove.

**Watch for:** if the operator confirms (from their own video files) that a no-sprite build genuinely existed, the next run should treat any such recovered detail as new-build guidance (a fresh implementation seeded from the existing SDF shape path), not as something to search for further in this repo — the search here was thorough enough that continuing to look for it in-repo would be diminishing returns.

---

## Correction — 2026-07-04 (operator pushback)

**A framing this loop kept repeating was wrong, corrected by the operator directly.** Across this session's runs, live/manual browser verification (an agent or the operator driving `bunnytest.html` by hand, reading the profiler) was described as a stopgap — "no repo-native way to check that claim without a human driving it by hand." Operator corrected this explicitly: **"it does rely on you running browser test manually - that IS HOW we test it."** Manual/interactive browser verification is the operator's deliberate, accepted test methodology for this engine, not a gap standing in for missing Playwright/e2e infrastructure.

**What this changes:** "harness robustness" in destination.md's stated priority should not be read as "add automated browser/e2e test coverage" — that was this loop's own unstated assumption, never confirmed, and now explicitly rejected. Future runs should not propose adding Playwright/Puppeteer/headless browser test tooling as if fixing a deficiency; if automated e2e coverage is ever wanted, it must come from the operator as a new ask, not from this loop inferring it from the absence of tests.

**Unaffected:** the `StateMachine.test.ts` unit-test findings, the dead `demo.html` finding, and the 9-file cleanup are all still accurate — this correction is scoped to the *interpretation* of "no automated coverage exists," not to any of the factual findings themselves.
