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
