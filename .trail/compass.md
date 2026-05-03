# Compass — vectorium

_Last updated: 2026-05-03 (run: scene-animationsystem-any-cast-fix)_  
_Derived from: four-run arc (hunch + statemachine-import-fix + statemachine-tests-all-green + scene-animationsystem-any-cast-fix), read against vision.md._

---

## Current claims

**1. The loop has confirmed the root diagnosis; the migration toward typed services is underway but shallow.**  
Hunch and the first Improve run both converged on "`(any)` injection / no typed API for scene subclasses" from independent entry points. Three subsequent runs have made incremental progress: StateMachine import fixed, vitest added (30/30), one `any`-cast removed from Scene.update(). The structural problem — `engine: any`, `_setTextureManager(any)`, and the missing typed surface for subclasses to discover services — has not been closed.

**2. Harness is operational; 30/30 tests pass.**  
Compass claim 2 is closed. vitest installed, StateMachine.ts validation order fixed, test bugs corrected. The harness gap is gone.

**3. Scene.ts is in a partially-migrated state — the migration direction is clear.**  
`animationSystem` and `performanceMonitor` are typed protected properties with typed setters. `engine` is typed as `any` with no internal consumer. `_setTextureManager` takes `any`. `demo.ts` (a Scene subclass) still accesses `(this as any).performanceMonitor` — unnecessary because the base class already declares it typed. Each run should close one more instance.

**4. The WASM physics integration gap has been flagged three times but never examined.**  
Hunch, first Improve, and this compass all note it. `assembly/physics.ts` is not wired into the main update loop; main physics path is `SpatialHash.ts` only. Status unknown: feature gap, deliberate deferral, or dead code. Cannot stay unknown if API surface work begins.

**5. The original game's requirements are the missing design input; the usability proof does not yet exist.**  
Vision names it: "can I now build that game with vectorium?" No run has examined what the original game required. Without that grounding, "API surface work" remains abstract — the loop can reduce `any`-casts but cannot validate that the result is actually usable for the intended purpose.

---

## What the next runs should test

1. **Fix `(this as any).performanceMonitor` in demo.ts** — same inconsistency class as the animationSystem fix, one file over. `performanceMonitor` is already a typed protected field on Scene; WasmDemoScene casts to `any` to read it. Zero-risk two-line change.
2. **Fix `engine: any` → typed setter pattern** — requires defining an `IEngine` interface (to avoid circular imports: Engine.ts → Scene.ts → Engine.ts). Pattern is `_setEngine(engine: IEngine)` matching `_setAnimationSystem` and `_setPerformanceMonitor`. This closes the last `(scene as any)` cast in Engine.ts.
3. **Determine WASM physics integration status** — one-run examination of `assembly/physics.ts` against the main update loop. Classify: feature gap, deferral, or dead code. Forecloses a persistent unknown.
4. **Name the original game's API requirements** — Hunch question. Grounds "API surface work" in concrete game requirements.

---

## Loop-effectiveness notes

Four runs, genuine findings each time, one-change discipline holding. The arc shows a real migration in progress. The risk now is incremental cosmetic fixes accumulating without closing the structural gap: `engine: any` and the subclass service discovery problem are the root issues; reducing `any` in adjacent places is useful but does not substitute. The compass should track whether the structural fix (typed engine interface + typed Scene service surface) is actually getting closer, or whether the loop is staying comfortable in the shallower fixes.

